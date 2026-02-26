/*
  # Activity Log – Database Triggers

  ## Purpose
  Automatically insert rows into `activity_logs` whenever key records are
  created or updated in the core tables.  This ensures that events happening
  through edge functions, direct DB writes, or background jobs are all
  captured without any application-level changes.

  ## Triggers created

  ### reservations
  - AFTER INSERT  → "reservation_created"
  - AFTER UPDATE  → "reservation_updated" (status / time / party_size change)
  - AFTER DELETE  → "reservation_deleted"

  ### abandoned_reservations
  - AFTER INSERT  → "booking_abandoned"

  ### crew_sessions
  - AFTER INSERT  → "crew_login"

  ### gift_cards
  - AFTER INSERT  → "gift_card_created"
  - AFTER UPDATE  → "gift_card_redeemed"  (when status changes to used)
                    "gift_card_updated"   (any other update)

  ## Notes
  - Triggers fire with SECURITY DEFINER so they can always write to
    activity_logs regardless of the calling role.
  - All trigger functions are wrapped in exception handlers so a logging
    failure never blocks the original operation.
*/

-- ─────────────────────────────────────────────
-- Helper: write one log row (called from each trigger fn)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_activity(
  p_event_type  text,
  p_actor_type  text,
  p_actor_id    text,
  p_actor_name  text,
  p_entity_type text,
  p_entity_id   text,
  p_description text,
  p_metadata    jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO activity_logs
    (event_type, actor_type, actor_id, actor_name,
     entity_type, entity_id, description, metadata)
  VALUES
    (p_event_type, p_actor_type, p_actor_id, p_actor_name,
     p_entity_type, p_entity_id, p_description, p_metadata);
EXCEPTION WHEN OTHERS THEN
  -- Never let logging block the main operation
  NULL;
END;
$$;

-- ─────────────────────────────────────────────
-- reservations – INSERT
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_reservation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_type text;
BEGIN
  v_actor_type := COALESCE(NEW.booking_method, 'system');
  IF v_actor_type NOT IN ('admin','crew','online','manual','free','stripe') THEN
    v_actor_type := 'system';
  END IF;
  IF v_actor_type IN ('manual','free','stripe') THEN
    v_actor_type := 'online';
  END IF;

  PERFORM log_activity(
    'reservation_created',
    v_actor_type,
    NULL,
    NULL,
    'reservation',
    NEW.id::text,
    'Reservierung erstellt: ' || NEW.customer_name ||
      ' (' || NEW.party_size || ' Gäste) am ' || NEW.reservation_date ||
      ' um ' || NEW.reservation_time,
    jsonb_build_object(
      'customer_name',   NEW.customer_name,
      'customer_email',  NEW.customer_email,
      'party_size',      NEW.party_size,
      'reservation_date',NEW.reservation_date,
      'reservation_time',NEW.reservation_time,
      'status',          NEW.status,
      'payment_status',  NEW.payment_status,
      'booking_method',  NEW.booking_method
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_reservation_insert ON reservations;
CREATE TRIGGER trg_after_reservation_insert
  AFTER INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION trg_reservation_created();

-- ─────────────────────────────────────────────
-- reservations – UPDATE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_reservation_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changes jsonb := '{}';
  v_desc    text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  IF OLD.reservation_time IS DISTINCT FROM NEW.reservation_time OR
     OLD.reservation_date IS DISTINCT FROM NEW.reservation_date THEN
    v_changes := v_changes || jsonb_build_object(
      'time', jsonb_build_object(
        'from', OLD.reservation_date || ' ' || OLD.reservation_time,
        'to',   NEW.reservation_date || ' ' || NEW.reservation_time
      )
    );
  END IF;
  IF OLD.party_size IS DISTINCT FROM NEW.party_size THEN
    v_changes := v_changes || jsonb_build_object('party_size', jsonb_build_object('from', OLD.party_size, 'to', NEW.party_size));
  END IF;
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    v_changes := v_changes || jsonb_build_object('payment_status', jsonb_build_object('from', OLD.payment_status, 'to', NEW.payment_status));
  END IF;

  IF v_changes = '{}' THEN
    RETURN NEW;
  END IF;

  v_desc := 'Reservierung aktualisiert: ' || NEW.customer_name;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_desc := v_desc || ' – Status: ' || OLD.status || ' → ' || NEW.status;
  END IF;

  PERFORM log_activity(
    'reservation_updated',
    'system',
    NULL,
    NULL,
    'reservation',
    NEW.id::text,
    v_desc,
    jsonb_build_object(
      'customer_name', NEW.customer_name,
      'changes',       v_changes
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_reservation_update ON reservations;
CREATE TRIGGER trg_after_reservation_update
  AFTER UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION trg_reservation_updated();

-- ─────────────────────────────────────────────
-- reservations – DELETE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_reservation_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_activity(
    'reservation_deleted',
    'system',
    NULL,
    NULL,
    'reservation',
    OLD.id::text,
    'Reservierung gelöscht: ' || OLD.customer_name ||
      ' (' || OLD.party_size || ' Gäste) am ' || OLD.reservation_date,
    jsonb_build_object(
      'customer_name',   OLD.customer_name,
      'customer_email',  OLD.customer_email,
      'party_size',      OLD.party_size,
      'reservation_date',OLD.reservation_date,
      'reservation_time',OLD.reservation_time,
      'status',          OLD.status
    )
  );
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_reservation_delete ON reservations;
CREATE TRIGGER trg_after_reservation_delete
  AFTER DELETE ON reservations
  FOR EACH ROW EXECUTE FUNCTION trg_reservation_deleted();

-- ─────────────────────────────────────────────
-- reservation_tables – INSERT (table assignment)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_table_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table_num text;
  v_cust_name text;
BEGIN
  SELECT table_number INTO v_table_num FROM tables WHERE id = NEW.table_id;
  SELECT customer_name INTO v_cust_name FROM reservations WHERE id = NEW.reservation_id;

  PERFORM log_activity(
    'table_assigned',
    COALESCE(NEW.assigned_by_type, 'system'),
    NEW.assigned_by_id::text,
    NEW.assigned_by_name,
    'reservation',
    NEW.reservation_id::text,
    'Tisch ' || COALESCE(v_table_num, NEW.table_id::text) ||
      ' zugewiesen an ' || COALESCE(v_cust_name, 'Reservierung'),
    jsonb_build_object(
      'table_id',         NEW.table_id,
      'table_number',     v_table_num,
      'reservation_id',   NEW.reservation_id,
      'assigned_by_type', NEW.assigned_by_type,
      'assigned_by_name', NEW.assigned_by_name
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_table_assigned ON reservation_tables;
CREATE TRIGGER trg_after_table_assigned
  AFTER INSERT ON reservation_tables
  FOR EACH ROW EXECUTE FUNCTION trg_table_assigned();

-- ─────────────────────────────────────────────
-- abandoned_reservations – INSERT
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_booking_abandoned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_activity(
    'booking_abandoned',
    'online',
    NULL,
    NULL,
    'abandoned_reservation',
    NEW.id::text,
    'Buchung abgebrochen: ' || COALESCE(NEW.customer_name, 'Unbekannt') ||
      ' am ' || COALESCE(NEW.reservation_date::text, '?'),
    jsonb_build_object(
      'customer_name',   NEW.customer_name,
      'customer_email',  NEW.customer_email,
      'reservation_date',NEW.reservation_date,
      'party_size',      NEW.party_size,
      'abandonment_stage', NEW.abandonment_stage
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_booking_abandoned ON abandoned_reservations;
CREATE TRIGGER trg_after_booking_abandoned
  AFTER INSERT ON abandoned_reservations
  FOR EACH ROW EXECUTE FUNCTION trg_booking_abandoned();

-- ─────────────────────────────────────────────
-- crew_sessions – INSERT (crew login)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_crew_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_crew_name text;
BEGIN
  SELECT name INTO v_crew_name FROM crew_users WHERE id = NEW.crew_user_id;

  PERFORM log_activity(
    'crew_login',
    'crew',
    NEW.crew_user_id::text,
    v_crew_name,
    'crew_session',
    NEW.id::text,
    'Crew-Login: ' || COALESCE(v_crew_name, 'Unbekannt'),
    jsonb_build_object(
      'crew_user_id', NEW.crew_user_id,
      'crew_name',    v_crew_name,
      'expires_at',   NEW.expires_at
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_crew_login ON crew_sessions;
CREATE TRIGGER trg_after_crew_login
  AFTER INSERT ON crew_sessions
  FOR EACH ROW EXECUTE FUNCTION trg_crew_login();

-- ─────────────────────────────────────────────
-- gift_cards – INSERT
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_gift_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_activity(
    'gift_card_created',
    'system',
    NULL,
    NULL,
    'gift_card',
    NEW.id::text,
    'Gutschein erstellt: ' || NEW.code || ' über €' || NEW.original_amount ||
      ' für ' || COALESCE(NEW.recipient_name, NEW.recipient_email, 'Unbekannt'),
    jsonb_build_object(
      'code',            NEW.code,
      'original_amount', NEW.original_amount,
      'recipient_name',  NEW.recipient_name,
      'recipient_email', NEW.recipient_email,
      'purchaser_name',  NEW.purchaser_name,
      'status',          NEW.status,
      'payment_status',  NEW.payment_status
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_gift_card_insert ON gift_cards;
CREATE TRIGGER trg_after_gift_card_insert
  AFTER INSERT ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION trg_gift_card_created();

-- ─────────────────────────────────────────────
-- gift_cards – UPDATE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_gift_card_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event text;
  v_desc  text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status AND
     OLD.current_balance IS NOT DISTINCT FROM NEW.current_balance AND
     OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'used' AND OLD.status != 'used' THEN
    v_event := 'gift_card_redeemed';
    v_desc  := 'Gutschein eingelöst: ' || NEW.code ||
               ' (Restguthaben: €' || NEW.current_balance || ')';
  ELSIF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.payment_status = 'completed' THEN
    v_event := 'gift_card_paid';
    v_desc  := 'Gutschein-Zahlung bestätigt: ' || NEW.code || ' über €' || NEW.original_amount;
  ELSE
    v_event := 'gift_card_updated';
    v_desc  := 'Gutschein aktualisiert: ' || NEW.code;
  END IF;

  PERFORM log_activity(
    v_event,
    'system',
    NULL,
    NULL,
    'gift_card',
    NEW.id::text,
    v_desc,
    jsonb_build_object(
      'code',            NEW.code,
      'status',          NEW.status,
      'current_balance', NEW.current_balance,
      'original_amount', NEW.original_amount,
      'payment_status',  NEW.payment_status
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_gift_card_update ON gift_cards;
CREATE TRIGGER trg_after_gift_card_update
  AFTER UPDATE ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION trg_gift_card_updated();
