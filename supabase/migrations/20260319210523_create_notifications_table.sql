/*
  # Create in-app notifications table

  ## Summary
  Creates a shared notifications table for admin in-app alerts.

  ## New Tables

  ### notifications
  - `id` (uuid, primary key)
  - `type` (text) - 'payment_paid' | 'online_reservation' | 'gift_card_purchased'
  - `title` (text) - short notification title
  - `message` (text) - notification body
  - `related_id` (uuid, nullable) - ID of the related reservation or gift card
  - `is_read` (boolean, default false) - global read state (shared across all admins)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Authenticated admins can SELECT all notifications
  - Authenticated admins can INSERT notifications
  - Authenticated admins can UPDATE (to mark as read)
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
