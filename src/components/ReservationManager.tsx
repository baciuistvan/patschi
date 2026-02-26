import { useState, useEffect, useRef } from 'react';
import { supabase, Reservation, Table, Room } from '../lib/supabase';
import { Calendar, Clock, Users, Mail, Phone, CheckCircle, XCircle, DollarSign, ChevronDown, ChevronUp, Trash2, Plus, Edit2, Printer, RefreshCw, Search, Copy, Send, AlertCircle, Info, List, LayoutGrid } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ReservationFloorPlanView } from './ReservationFloorPlanView';

type ReservationWithTable = Reservation & {
  table?: Table;
  reservation_tables?: Array<{ table_id: string; tables: Table }>;
};

export function ReservationManager() {
  const { t } = useLanguage();

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [reservations, setReservations] = useState<ReservationWithTable[]>([]);
  const [allReservationsForConflicts, setAllReservationsForConflicts] = useState<ReservationWithTable[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'date' | 'monthly' | 'payment_link'>('monthly');
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithTable | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [newReservation, setNewReservation] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: 2,
    reservation_date: '',
    reservation_time: '',
    room_id: '',
    special_requests: '',
    status: 'confirmed' as const,
    payment_status: 'unpaid' as const,
    payment_amount: 0,
  });
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationWithTable | null>(null);
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [multipleDays, setMultipleDays] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [paidWithCash, setPaidWithCash] = useState(false);
  const [cashAmount, setCashAmount] = useState(0);
  const [dayAmounts, setDayAmounts] = useState<Record<string, number>>({});
  const [bookingMethod, setBookingMethod] = useState<'free' | 'manual'>('free');
  const [tableRoomFilter, setTableRoomFilter] = useState<string | null>(null);
  const [isCreatingWithPaymentLink, setIsCreatingWithPaymentLink] = useState(false);
  const [resendingEmailFor, setResendingEmailFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [unpaidPaymentLinkCount, setUnpaidPaymentLinkCount] = useState(0);
  const [copyingLinkFor, setCopyingLinkFor] = useState<string | null>(null);
  const [regeneratingLinkFor, setRegeneratingLinkFor] = useState<string | null>(null);
  const [showBadgeGuide, setShowBadgeGuide] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'floor-plan'>('list');
  const [showViewMenu, setShowViewMenu] = useState(false);

  const createFormRef = useRef<HTMLDivElement>(null);
  const editFormRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showCreateForm && createFormRef.current) {
      createFormRef.current.scrollTop = 0;
    }
  }, [showCreateForm]);

  useEffect(() => {
    if (showEditForm && editFormRef.current) {
      editFormRef.current.scrollTop = 0;
    }
  }, [showEditForm]);

  useEffect(() => {
    loadReservations();
    loadRooms();
    loadAllTables();
  }, [filter, selectedDate]);

  useEffect(() => {
    if (rooms.length > 0 && !tableRoomFilter) {
      setTableRoomFilter(rooms[0].id);
    }
  }, [rooms]);

  useEffect(() => {
    if (newReservation.room_id) {
      loadTables(newReservation.room_id);
    }
  }, [newReservation.room_id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    }

    if (showViewMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showViewMenu]);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setRooms(data);
  };

  const loadTables = async (roomId: string) => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('table_number');
    if (data) setTables(data);
  };

  const loadAllTables = async () => {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('table_number');
    if (data) setAllTables(data);
  };

  const getReservedTablesForDateTime = (date: string, time: string, excludeReservationId?: string): Set<string> => {
    const reservedTableIds = new Set<string>();

    // Calculate the time range for the input reservation (default 2 hour duration)
    const inputStart = new Date(`${date}T${time}`);
    const inputEnd = new Date(inputStart.getTime() + 120 * 60000); // 2 hours in milliseconds

    // Use allReservationsForConflicts instead of filtered reservations
    allReservationsForConflicts.forEach(res => {
      // Skip the reservation being edited
      if (excludeReservationId && res.id === excludeReservationId) {
        return;
      }

      // Skip cancelled reservations
      if (res.status === 'cancelled') {
        return;
      }

      // Check if reservation is on the same date
      if (res.reservation_date !== date) {
        return;
      }

      // Calculate the time range for this existing reservation
      const resStart = new Date(`${res.reservation_date}T${res.reservation_time}`);
      const resDuration = res.duration_minutes || 120;
      const resEnd = new Date(resStart.getTime() + resDuration * 60000);

      // Check for time overlap: two time ranges overlap if one starts before the other ends
      const hasOverlap = inputStart < resEnd && inputEnd > resStart;

      if (hasOverlap) {
        if (res.reservation_tables && Array.isArray(res.reservation_tables)) {
          res.reservation_tables.forEach((rt: any) => {
            reservedTableIds.add(rt.table_id);
          });
        }
      }
    });

    return reservedTableIds;
  };

  const loadReservations = async () => {
    let query = supabase
      .from('reservations')
      .select('*, reservation_tables(*, tables(*))')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    const today = formatDateLocal(new Date());

    if (filter === 'today') {
      query = query.eq('reservation_date', today);
    } else if (filter === 'upcoming') {
      query = query.gte('reservation_date', today);
    } else if (filter === 'date' && selectedDate) {
      query = query.eq('reservation_date', selectedDate);
    } else if (filter === 'payment_link') {
      query = query.not('payment_link_url', 'is', null).neq('payment_status', 'paid');
    }

    const { data, error } = await query;

    let formatted: any[] = [];

    if (!error && data) {
      formatted = data.map(r => ({
        ...r,
        reservation_tables: r.reservation_tables as any,
      }));
    } else if (error) {
      console.error('Error loading reservations:', error);
    }

    // For payment_link filter, also load abandoned reservations with payment links sent
    if (filter === 'payment_link') {
      const { data: abandonedData, error: abandonedError } = await supabase
        .from('abandoned_reservations')
        .select('*')
        .eq('payment_link_sent', true)
        .is('recovery_reservation_id', null)
        .order('reservation_date', { ascending: true });

      if (!abandonedError && abandonedData) {
        // Convert abandoned reservations to reservation format
        const abandonedFormatted = abandonedData.map(a => ({
          id: a.id,
          customer_name: a.customer_name,
          customer_email: a.customer_email,
          customer_phone: a.customer_phone,
          reservation_date: a.reservation_date,
          reservation_time: a.reservation_time,
          party_size: a.party_size,
          room_id: a.room_id,
          status: 'pending' as const,
          payment_status: 'unpaid',
          booking_method: 'payment_link',
          created_at: a.created_at,
          notes: 'Zahlungslink gesendet - wartet auf Zahlung',
          reservation_tables: [],
          is_abandoned: true, // Flag to identify abandoned reservations
        }));
        formatted = [...formatted, ...abandonedFormatted];

        // Sort by date and time
        formatted.sort((a, b) => {
          const dateCompare = a.reservation_date.localeCompare(b.reservation_date);
          if (dateCompare !== 0) return dateCompare;
          return a.reservation_time.localeCompare(b.reservation_time);
        });
      }
    }

    setReservations(formatted);

    // Load ALL reservations for conflict checking (without filters)
    const { data: allData } = await supabase
      .from('reservations')
      .select('*, reservation_tables(*, tables(*))')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (allData) {
      const allFormatted = allData.map(r => ({
        ...r,
        reservation_tables: r.reservation_tables as any,
      }));
      setAllReservationsForConflicts(allFormatted);
    }

    // Count unpaid payment link reservations (including abandoned)
    const unpaidCount = formatted.filter(r =>
      (r.payment_link_url && r.payment_status !== 'paid') || r.is_abandoned
    ).length;
    setUnpaidPaymentLinkCount(unpaidCount);

    if (filter === 'monthly' && formatted.length > 0) {
      const monthKeys = new Set<string>();
      formatted.forEach(reservation => {
        const date = new Date(reservation.reservation_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthKeys.add(monthKey);
      });
      setExpandedMonths(monthKeys);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setFilter('date');
    setShowDatePicker(false);
  };

  const handleUpdateStatus = async (reservationId: string, status: Reservation['status']) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', reservationId);

    if (!error) {
      loadReservations();
      setSelectedReservation(null);
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);

    if (!reservation) {
      alert('Reservierung nicht gefunden.');
      return;
    }

    const isOnlineBooking = (reservation as any).booking_method === 'stripe' ||
                           (reservation as any).payment_method === 'stripe' ||
                           (reservation as any).stripe_payment_intent_id;

    // Different confirmation messages for online vs regular bookings
    let confirmMessage = t('reservations.confirm_delete');

    if (isOnlineBooking) {
      const amount = (reservation as any).deposit_amount || 0;
      confirmMessage = `⚠️ WARNUNG: Dies ist eine BEZAHLTE Online-Reservierung!\n\n` +
                      `Betrag: €${amount.toFixed(2)}\n` +
                      `Stripe Payment ID: ${(reservation as any).stripe_payment_intent_id || 'N/A'}\n\n` +
                      `Das Löschen dieser Reservierung:\n` +
                      `• Entfernt die Reservierung aus dem System\n` +
                      `• Erstattet NICHT automatisch die Zahlung bei Stripe\n` +
                      `• Sie müssen die Erstattung manuell in Stripe vornehmen\n\n` +
                      `Sind Sie sicher, dass Sie diese Reservierung löschen möchten?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    // Extra confirmation for paid reservations
    if (isOnlineBooking) {
      const finalConfirm = confirm(
        'LETZTE BESTÄTIGUNG:\n\n' +
        'Haben Sie die Zahlung bereits in Stripe erstattet oder werden Sie dies manuell tun?\n\n' +
        'Klicken Sie OK um fortzufahren oder Abbrechen um abzubrechen.'
      );

      if (!finalConfirm) {
        return;
      }
    }

    setIsUpdating(true);

    try {
      const isAbandoned = (reservation as any).is_abandoned;
      console.log('Deleting reservation:', reservationId, isAbandoned ? '(ABANDONED)' : isOnlineBooking ? '(PAID ONLINE BOOKING)' : '(regular booking)');

      // Delete from the appropriate table
      const tableName = isAbandoned ? 'abandoned_reservations' : 'reservations';
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', reservationId);

      if (deleteError) {
        console.error('Error deleting reservation:', deleteError);
        alert('Fehler beim Löschen der Reservierung: ' + deleteError.message);
        return;
      }

      console.log('Reservation deleted successfully from', tableName);

      // Show different success messages
      if (isOnlineBooking) {
        alert('✓ Reservierung wurde gelöscht.\n\nBitte denken Sie daran, die Zahlung manuell in Stripe zu erstatten, falls noch nicht geschehen.');
      } else {
        alert('Reservierung erfolgreich gelöscht.');
      }

      await loadReservations();
      setSelectedReservation(null);
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      alert('Fehler beim Löschen der Reservierung: ' + (error.message || 'Bitte versuchen Sie es erneut.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResendPaymentEmail = async (reservationId: string) => {
    setResendingEmailFor(reservationId);
    try {
      const { data, error } = await supabase.functions.invoke('resend-payment-link-email', {
        body: { reservationId }
      });

      if (error) {
        console.error('Error resending payment email:', error);
        alert('Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.');
      } else if (data.success) {
        alert('Zahlungsemail wurde erfolgreich erneut gesendet!');
      } else {
        alert('Fehler beim Senden der E-Mail: ' + (data.error || 'Unbekannter Fehler'));
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setResendingEmailFor(null);
    }
  };

  const handleCreateReservationWithPaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingWithPaymentLink(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: newReservation.customer_name,
          customer_email: newReservation.customer_email,
          customer_phone: newReservation.customer_phone,
          party_size: newReservation.party_size,
          reservation_date: newReservation.reservation_date,
          reservation_time: newReservation.reservation_time,
          special_requests: newReservation.special_requests,
          duration_minutes: 120,
          table_ids: selectedTables,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment link');
      }

      let message = `Reservierung mit Zahlungslink erstellt! Buchungsnummer: ${data.booking_code}\n\nZahlungslink: ${data.payment_link_url}`;

      if (data.email_sent) {
        message += `\n\n✓ E-Mail mit Zahlungslink wurde erfolgreich an ${newReservation.customer_email} gesendet.`;
      } else {
        message += `\n\n⚠ WARNUNG: E-Mail konnte nicht gesendet werden!`;
        if (data.email_error === 'RESEND_API_KEY not configured') {
          message += `\nBitte Resend API Key in Supabase konfigurieren.`;
        } else if (data.email_error) {
          message += `\nFehler: ${data.email_error}`;
        }
        message += `\n\nBitte senden Sie den Zahlungslink manuell an den Kunden:\n${data.payment_link_url}`;
      }

      alert(message);

      setShowCreateForm(false);
      setSelectedTables([]);
      setMultipleDays(false);
      setSelectedDays([]);
      setPaidWithCash(false);
      setCashAmount(0);
      setBookingMethod('free');
      setNewReservation({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        party_size: 2,
        reservation_date: '',
        reservation_time: '',
        room_id: '',
        special_requests: '',
        status: 'confirmed',
        payment_status: 'unpaid',
        payment_amount: 0,
      });
      loadReservations();
    } catch (error: any) {
      alert('Fehler beim Erstellen der Reservierung: ' + error.message);
    } finally {
      setIsCreatingWithPaymentLink(false);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    const datesToBook: string[] = [];
    if (multipleDays) {
      datesToBook.push(newReservation.reservation_date);
      selectedDays.forEach(day => {
        if (!datesToBook.includes(day)) {
          datesToBook.push(day);
        }
      });
    } else {
      datesToBook.push(newReservation.reservation_date);
    }

    datesToBook.sort();

    // Check availability for each date if tables are selected
    if (selectedTables.length > 0) {
      for (const date of datesToBook) {
        // Get existing reservations for this date/time
        const { data: existingReservations } = await supabase
          .from('reservations')
          .select('id')
          .eq('reservation_date', date)
          .eq('reservation_time', newReservation.reservation_time)
          .in('status', ['confirmed', 'pending']);

        if (existingReservations && existingReservations.length > 0) {
          // Get booked table IDs
          const { data: reservationTables } = await supabase
            .from('reservation_tables')
            .select('table_id')
            .in('reservation_id', existingReservations.map(r => r.id));

          const bookedTableIds = reservationTables?.map(rt => rt.table_id) || [];

          // Check if any of the selected tables are already booked
          const conflictingTables = selectedTables.filter(tableId => bookedTableIds.includes(tableId));

          if (conflictingTables.length > 0) {
            // Get table numbers for the conflicting tables
            const { data: conflictTables } = await supabase
              .from('tables')
              .select('table_number, custom_label')
              .in('id', conflictingTables);

            const tableNames = conflictTables?.map(t => t.custom_label || `Tisch ${t.table_number}`).join(', ') || 'Ausgewählte Tische';

            alert(`ACHTUNG: ${tableNames} ${conflictingTables.length === 1 ? 'ist' : 'sind'} bereits für ${date} um ${newReservation.reservation_time} Uhr gebucht!\n\nBitte wählen Sie andere Tische oder eine andere Zeit.`);
            return;
          }
        }
      }
    }

    const isPerDayMode = paidWithCash && multipleDays && selectedDays.length > 0;

    for (const date of datesToBook) {
      const perDayAmount = isPerDayMode ? (dayAmounts[date] ?? 0) : (paidWithCash ? cashAmount : 0);
      const { data: reservation, error } = await supabase.from('reservations').insert([{
        customer_name: newReservation.customer_name,
        customer_email: newReservation.customer_email,
        customer_phone: newReservation.customer_phone,
        party_size: newReservation.party_size,
        reservation_date: date,
        reservation_time: newReservation.reservation_time,
        special_requests: newReservation.special_requests,
        status: 'confirmed',
        payment_status: paidWithCash ? 'paid' : 'unpaid',
        payment_amount: perDayAmount,
        payment_method: paidWithCash ? 'cash' : 'none',
        duration_minutes: 120,
        stripe_payment_intent_id: null,
        booking_method: bookingMethod === 'free' ? 'free' : (paidWithCash ? 'manual' : 'free'),
      }]).select().single();

      if (!error && reservation && selectedTables.length > 0) {
        const tableLinks = selectedTables.map(tableId => ({
          reservation_id: reservation.id,
          table_id: tableId,
        }));
        await supabase.from('reservation_tables').insert(tableLinks);

        const { data: assignedTables } = await supabase
          .from('reservation_tables')
          .select('table_id, tables(table_number)')
          .eq('reservation_id', reservation.id);

        const tableNumbers = assignedTables?.map((rt: any) => rt.tables?.table_number).filter(Boolean) || [];

        try {
          await supabase.functions.invoke('notify-admins-new-reservation', {
            body: {
              reservation: {
                id: reservation.id,
                customer_name: reservation.customer_name,
                party_size: reservation.party_size,
                reservation_date: reservation.reservation_date,
                reservation_time: reservation.reservation_time,
                table_numbers: tableNumbers,
                special_requests: reservation.special_requests,
              }
            }
          });
        } catch (notifyError) {
          console.error('Error notifying admins:', notifyError);
        }
      }
    }

    setShowCreateForm(false);
    setSelectedTables([]);
    setMultipleDays(false);
    setSelectedDays([]);
    setDayAmounts({});
    setPaidWithCash(false);
    setCashAmount(0);
    setBookingMethod('free');
    setNewReservation({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      party_size: 2,
      reservation_date: '',
      reservation_time: '',
      room_id: '',
      special_requests: '',
      status: 'confirmed',
      payment_status: 'unpaid',
      payment_amount: 0,
    });
    loadReservations();
  };

  const handleUpdatePayment = async (reservationId: string, paymentStatus: 'unpaid' | 'paid' | 'refunded', amount?: number) => {
    const updates: any = { payment_status: paymentStatus };
    if (amount !== undefined) {
      updates.payment_amount = amount;
    }

    const { error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', reservationId);

    if (!error) {
      loadReservations();
      setSelectedReservation(null);
    }
  };

  const handleMarkPaymentLinkAsPaid = async () => {
    if (!editingReservation || isUpdating) return;

    setIsUpdating(true);

    const updates: any = {
      payment_status: 'paid',
      status: 'confirmed'
    };

    const { error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', editingReservation.id);

    if (error) {
      console.error('Error marking payment as paid:', error);
      alert('Fehler beim Aktualisieren des Zahlungsstatus');
    } else {
      // Update the editingReservation state to reflect the change
      setEditingReservation({
        ...editingReservation,
        payment_status: 'paid',
        status: 'confirmed'
      });
      loadReservations();
      alert('Zahlung wurde als bezahlt markiert und Status auf bestätigt gesetzt');
    }

    setIsUpdating(false);
  };

  const handleEditReservation = (reservation: ReservationWithTable) => {
    setEditingReservation(reservation);

    const assignedTables: string[] = [];
    let roomIdFromTables = '';
    if (reservation.reservation_tables && reservation.reservation_tables.length > 0) {
      reservation.reservation_tables.forEach((rt: any) => {
        assignedTables.push(rt.table_id);
        if (!roomIdFromTables && rt.tables?.room_id) {
          roomIdFromTables = rt.tables.room_id;
        }
      });
    }

    const finalRoomId = roomIdFromTables || reservation.table?.room_id || '';

    setNewReservation({
      customer_name: reservation.customer_name,
      customer_email: reservation.customer_email || '',
      customer_phone: reservation.customer_phone || '',
      party_size: reservation.party_size,
      reservation_date: reservation.reservation_date,
      reservation_time: reservation.reservation_time,
      room_id: finalRoomId,
      special_requests: reservation.special_requests || '',
      status: reservation.status,
      payment_status: reservation.payment_status,
      payment_amount: reservation.payment_amount || 0,
    });

    setSelectedTables(assignedTables);
    if (finalRoomId) {
      setTableRoomFilter(finalRoomId);
    }

    // Set payment method based on existing reservation
    const bookingMethodFromDb = (reservation as any).booking_method;
    const paymentMethodFromDb = (reservation as any).payment_method;

    if (bookingMethodFromDb === 'online' || bookingMethodFromDb === 'payment_link' || paymentMethodFromDb === 'stripe') {
      setBookingMethod('free');
      setPaidWithCash(false);
      setCashAmount(0);
    } else if (bookingMethodFromDb === 'manual' || (reservation.payment_status === 'paid' && reservation.payment_amount && reservation.payment_amount > 0)) {
      setBookingMethod('manual');
      setPaidWithCash(true);
      setCashAmount(reservation.payment_amount || 0);
    } else if (reservation.payment_amount && reservation.payment_amount > 0) {
      setBookingMethod('manual');
      setPaidWithCash(false);
      setCashAmount(0);
    } else {
      setBookingMethod('free');
      setPaidWithCash(false);
      setCashAmount(0);
    }

    setShowEditForm(true);
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReservation || isUpdating) return;

    setIsUpdating(true);
    try {
      const originalBookingMethod = (editingReservation as any).booking_method;
      const originalPaymentMethod = (editingReservation as any).payment_method;

      let paymentStatus;
      let paymentAmount;
      let finalBookingMethod;
      let paymentMethod;

      if (originalBookingMethod === 'online' || originalBookingMethod === 'payment_link' || originalPaymentMethod === 'stripe') {
        paymentStatus = editingReservation.payment_status;
        paymentAmount = editingReservation.payment_amount;
        finalBookingMethod = originalBookingMethod;
        paymentMethod = originalPaymentMethod;
      } else {
        paymentStatus = bookingMethod === 'free' ? 'unpaid' : (paidWithCash ? 'paid' : 'unpaid');
        paymentAmount = bookingMethod === 'free' ? 0 : (paidWithCash ? cashAmount : 0);
        finalBookingMethod = bookingMethod === 'free' ? 'free' : (paidWithCash ? 'manual' : 'free');
        paymentMethod = paidWithCash ? 'cash' : 'none';
      }

      const updateData: any = {
        customer_name: newReservation.customer_name,
        customer_email: newReservation.customer_email,
        customer_phone: newReservation.customer_phone,
        party_size: newReservation.party_size,
        reservation_date: newReservation.reservation_date,
        reservation_time: newReservation.reservation_time,
        special_requests: newReservation.special_requests,
        status: 'confirmed',
        payment_status: paymentStatus,
        payment_amount: paymentAmount,
        booking_method: finalBookingMethod,
      };

      if (originalBookingMethod === 'online' || originalBookingMethod === 'payment_link' || originalPaymentMethod === 'stripe') {
        updateData.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', editingReservation.id)
        .select();

      if (error) {
        console.error('Database error:', error);
        alert('Fehler beim Aktualisieren der Reservierung: ' + error.message);
        return;
      }

      // Update table assignments
      const { error: deleteError } = await supabase
        .from('reservation_tables')
        .delete()
        .eq('reservation_id', editingReservation.id);

      if (deleteError) {
        console.error('Error deleting old table assignments:', deleteError);
      }

      if (selectedTables.length > 0) {
        const tableLinks = selectedTables.map(tableId => ({
          reservation_id: editingReservation.id,
          table_id: tableId,
        }));
        const { error: insertError } = await supabase.from('reservation_tables').insert(tableLinks);
        if (insertError) {
          console.error('Error inserting new table assignments:', insertError);
          alert('Fehler beim Zuweisen der Tische: ' + insertError.message);
          return;
        }
      }

      alert('Reservierung erfolgreich aktualisiert!');

        if (selectedDays.length > 0) {
          const additionalReservations = selectedDays.map(date => ({
            customer_name: newReservation.customer_name,
            customer_email: newReservation.customer_email,
            customer_phone: newReservation.customer_phone,
            party_size: newReservation.party_size,
            reservation_date: date,
            reservation_time: newReservation.reservation_time,
            special_requests: newReservation.special_requests,
            status: 'confirmed',
            payment_status: paymentStatus,
            payment_amount: paymentAmount,
            booking_method: finalBookingMethod,
          }));

          const { data: newReservationsData, error: insertError } = await supabase
            .from('reservations')
            .insert(additionalReservations)
            .select();

          if (!insertError && newReservationsData && selectedTables.length > 0) {
            const allTableLinks = newReservationsData.flatMap(reservation =>
              selectedTables.map(tableId => ({
                reservation_id: reservation.id,
                table_id: tableId,
              }))
            );
            await supabase.from('reservation_tables').insert(allTableLinks);
          }
        }

        setShowEditForm(false);
        setEditingReservation(null);
        setSelectedTables([]);
        setMultipleDays(false);
        setSelectedDays([]);
        setPaidWithCash(false);
        setCashAmount(0);
        setBookingMethod('free');
        setNewReservation({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          party_size: 2,
          reservation_date: '',
          reservation_time: '',
          room_id: '',
          special_requests: '',
          status: 'confirmed',
          payment_status: 'unpaid',
          payment_amount: 0,
        });
        await loadReservations();
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-900/20 text-green-400 border-green-500';
      case 'cancelled':
        return 'bg-red-900/20 text-red-400 border-red-500';
      case 'completed':
        return 'bg-blue-900/20 text-blue-400 border-blue-500';
      default:
        return 'bg-yellow-900/20 text-yellow-400 border-yellow-500';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-400';
      case 'refunded':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getFilteredReservations = () => {
    if (!searchQuery.trim()) {
      return reservations;
    }

    const query = searchQuery.toLowerCase().trim();
    return reservations.filter((reservation) => {
      const bookingCode = (reservation as any).booking_code?.toLowerCase() || '';
      const customerName = reservation.customer_name.toLowerCase();

      return bookingCode.includes(query) || customerName.includes(query);
    });
  };

  const groupReservationsByMonth = () => {
    const grouped: { [key: string]: ReservationWithTable[] } = {};
    const filteredReservations = getFilteredReservations();

    filteredReservations.forEach((reservation) => {
      const date = new Date(reservation.reservation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(reservation);
    });

    return Object.keys(grouped).sort().reverse().map(monthKey => ({
      monthKey,
      monthName: new Date(monthKey + '-01').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      reservations: grouped[monthKey]
    }));
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const copyPaymentLink = async (paymentLinkUrl: string, reservationId: string) => {
    try {
      setCopyingLinkFor(reservationId);
      await navigator.clipboard.writeText(paymentLinkUrl);
      setTimeout(() => setCopyingLinkFor(null), 2000);
    } catch (error) {
      console.error('Error copying payment link:', error);
      alert('Fehler beim Kopieren des Zahlungslinks');
    }
  };

  const resendPaymentLinkEmail = async (reservationId: string) => {
    try {
      setResendingEmailFor(reservationId);

      const { data, error } = await supabase.functions.invoke('resend-payment-link-email', {
        body: { reservationId }
      });

      if (error) throw error;

      alert('Zahlungslink-E-Mail erfolgreich erneut gesendet!');
    } catch (error) {
      console.error('Error resending payment link email:', error);
      alert('Fehler beim erneuten Senden der E-Mail');
    } finally {
      setResendingEmailFor(null);
    }
  };

  const regeneratePaymentLink = async (reservationId: string) => {
    if (!confirm('Möchten Sie einen neuen Zahlungslink im aktuellen Stripe-Modus erstellen? Dies wird den alten Link ersetzen.')) {
      return;
    }

    try {
      setRegeneratingLinkFor(reservationId);

      const { data, error } = await supabase.functions.invoke('regenerate-payment-link', {
        body: { reservationId }
      });

      if (error) throw error;

      alert(`Neuer Zahlungslink erstellt (${data.stripe_mode} Modus)!\nDer Link wurde in der Reservierung aktualisiert.`);
      loadReservations();
    } catch (error: any) {
      console.error('Error regenerating payment link:', error);
      alert('Fehler beim Erstellen des neuen Zahlungslinks: ' + (error.message || 'Unbekannter Fehler'));
    } finally {
      setRegeneratingLinkFor(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 no-print">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{t('reservations.title')}</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center space-x-2"
            title="Drucken"
          >
            <Printer className="w-5 h-5" />
            <span className="hidden sm:inline">Drucken</span>
          </button>
          <button
            onClick={() => {
              setNewReservation(prev => ({
                ...prev,
                reservation_date: selectedDate || formatDateLocal(new Date()),
              }));
              setShowCreateForm(true);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('reservations.create')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
        <div className="flex space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilter('today')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
              filter === 'today'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('reservations.today')}
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('reservations.upcoming')}
          </button>
          <button
            onClick={() => setFilter('monthly')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
              filter === 'monthly'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t('reservations.all')}
          </button>
          <button
            onClick={() => setFilter('payment_link')}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base whitespace-nowrap relative ${
              filter === 'payment_link'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Wartet auf Zahlung
            {unpaidPaymentLinkCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {unpaidPaymentLinkCount}
              </span>
            )}
          </button>
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`w-full px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base flex items-center justify-center space-x-2 ${
                filter === 'date'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{filter === 'date' && selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : t('reservations.date')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 z-10 w-64">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedDate && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setFilter('upcoming');
                      setShowDatePicker(false);
                    }}
                    className="w-full mt-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
                  >
                    {t('reservations.clear_date')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative" ref={viewMenuRef}>
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="px-3 py-2 rounded-lg transition flex items-center space-x-2 bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            {viewMode === 'list' ? (
              <>
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">{t('reservations.view_list')}</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">{t('reservations.view_floor_plan')}</span>
              </>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showViewMenu ? 'rotate-180' : ''}`} />
          </button>
          {showViewMenu && (
            <div className="absolute right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20 min-w-[200px]">
              <button
                onClick={() => {
                  setViewMode('list');
                  setShowViewMenu(false);
                }}
                className={`w-full px-4 py-3 flex items-center space-x-3 transition ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <List className="w-5 h-5" />
                <span>{t('reservations.view_list')}</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('floor-plan');
                  setShowViewMenu(false);
                }}
                className={`w-full px-4 py-3 flex items-center space-x-3 transition ${
                  viewMode === 'floor-plan'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span>{t('reservations.view_floor_plan')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2 w-full mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Buchungscode oder Name..."
            className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            Löschen
          </button>
        )}
      </div>

      {/* Payment Badge Guide */}
      <div className="mb-4">
        <button
          onClick={() => setShowBadgeGuide(!showBadgeGuide)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 hover:bg-slate-750 transition flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">Zahlungs-Badge Legende</span>
          </div>
          {showBadgeGuide ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showBadgeGuide && (
          <div className="mt-2 bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-purple-900/30 text-purple-400 border border-purple-500/50 whitespace-nowrap">
                Online €350.00
              </span>
              <span className="text-sm text-slate-300">
                Direkt über Widget bezahlt (booking_method: online)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-green-900/30 text-green-400 border border-green-500/50 whitespace-nowrap">
                Online bezahlt €50.00
              </span>
              <span className="text-sm text-slate-300">
                Zahlungslink erfolgreich bezahlt (booking_method: payment_link, paid)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-purple-900/30 text-purple-400 border border-purple-500/50 whitespace-nowrap">
                Zahlungslink €50.00
              </span>
              <span className="text-sm text-slate-300">
                Wartet auf Zahlung über Link (booking_method: payment_link, pending)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-green-900/30 text-green-400 border border-green-500/50 whitespace-nowrap">
                Anzahlung: €50.00
              </span>
              <span className="text-sm text-slate-300">
                Manuelle Buchung mit Anzahlung (booking_method: manual, cash/transfer)
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-700/50 text-slate-300 border border-slate-600/50 whitespace-nowrap">
                Kostenlos
              </span>
              <span className="text-sm text-slate-300">
                Keine Zahlung erforderlich (booking_method: free)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Unpaid Payment Link Header */}
      {filter === 'payment_link' && (
        <div className="bg-orange-900/20 border-2 border-orange-500/50 rounded-xl p-4 mb-4 flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-orange-400 mb-1">
              {unpaidPaymentLinkCount} {unpaidPaymentLinkCount === 1 ? 'Reservierung wartet' : 'Reservierungen warten'} auf Zahlung
            </h3>
            <p className="text-sm text-orange-300/80">
              Diese Reservierungen wurden mit einem Zahlungslink erstellt, aber noch nicht bezahlt. Verwenden Sie die Aktionsschaltflächen, um den Zahlungslink zu kopieren oder die E-Mail erneut zu senden.
            </p>
          </div>
        </div>
      )}

      {viewMode === 'floor-plan' ? (
        <ReservationFloorPlanView
          selectedDate={selectedDate || formatDateLocal(new Date())}
          selectedTime={newReservation.reservation_time || '18:00'}
          onTableClick={(tableId, reservation) => {
            if (reservation) {
              setSelectedReservation(reservation as any);
            }
          }}
          onCreateReservation={(tableId) => {
            setNewReservation({
              ...newReservation,
              reservation_date: selectedDate || formatDateLocal(new Date()),
            });
            setSelectedTables([tableId]);
            setShowCreateForm(true);
          }}
        />
      ) : (
        <div className="grid gap-4 printable-reservations">
        {filter === 'monthly' ? (
          <>
            {groupReservationsByMonth().map((monthGroup) => {
              const isExpanded = expandedMonths.has(monthGroup.monthKey);
              return (
                <div key={monthGroup.monthKey} className="space-y-4">
                  <button
                    onClick={() => toggleMonth(monthGroup.monthKey)}
                    className="w-full sticky top-0 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 z-10 hover:bg-slate-800 transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-white capitalize">{monthGroup.monthName}</h3>
                    </div>
                    <div className="ml-4">
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {isExpanded && monthGroup.reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 hover:border-slate-600 transition print:bg-white print:border-gray-300 print:rounded-none print:p-3 print:break-inside-avoid"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3 flex-1 cursor-pointer print:cursor-default" onClick={() => setSelectedReservation(reservation)}>
                        <div className="flex flex-col gap-2">
                          <h3 className="text-lg font-semibold text-white print:text-black print:text-base">{reservation.customer_name}</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            {(reservation as any).booking_code && (
                              <span className="text-sm font-mono font-semibold text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-500/50 print:bg-transparent print:border-0 print:text-gray-900">
                                Code: {(reservation as any).booking_code}
                              </span>
                            )}
                            <span className={`px-4 py-1.5 rounded-lg text-sm font-bold ${
                              ((reservation as any).booking_method === 'payment_link' && reservation.payment_status === 'paid') || ((reservation as any).payment_link_url && reservation.payment_status === 'paid')
                                ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                                : ((reservation as any).payment_method === 'stripe' && reservation.payment_status === 'paid')
                                ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                                : (reservation as any).booking_method === 'payment_link' || (reservation as any).booking_method === 'online' || ((reservation as any).payment_method === 'stripe')
                                ? 'bg-blue-900/30 text-blue-400 border border-blue-500/50'
                                : (reservation as any).booking_method === 'manual' && reservation.payment_amount > 0
                                ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                            } print:bg-transparent print:border-0 print:text-gray-800`}>
                              {(reservation as any).booking_method === 'payment_link' && reservation.payment_status === 'paid'
                                ? `Online bezahlt €${reservation.payment_amount.toFixed(2)}`
                                : (reservation as any).booking_method === 'payment_link' && reservation.payment_amount > 0
                                ? `Zahlungslink €${reservation.payment_amount.toFixed(2)}`
                                : (reservation as any).payment_method === 'stripe' && reservation.payment_status === 'paid'
                                ? reservation.payment_amount > 0 ? `Online bezahlt €${reservation.payment_amount.toFixed(2)}` : 'Online bezahlt'
                                : (reservation as any).booking_method === 'online' && reservation.payment_status === 'paid'
                                ? reservation.payment_amount > 0 ? `Online €${reservation.payment_amount.toFixed(2)}` : 'Online'
                                : (reservation as any).booking_method === 'manual' && reservation.payment_amount > 0
                                ? `Anzahlung: €${reservation.payment_amount.toFixed(2)}`
                                : 'Kostenlos'}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                reservation.status
                              )} print:hidden`}
                            >
                              {t(`reservations.status_${reservation.status}`)}
                            </span>
                            <span className="hidden print:inline text-xs text-gray-700">
                              {reservation.status === 'confirmed' ? 'Bestätigt' : reservation.status === 'cancelled' ? 'Storniert' : reservation.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm print:grid-cols-4 print:gap-2 print:text-xs">
                          <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                            <Calendar className="w-4 h-4 print:hidden" />
                            <span className="print:font-medium">{new Date(reservation.reservation_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                            <Clock className="w-4 h-4 print:hidden" />
                            <span className="print:font-medium">{reservation.reservation_time}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                            <Users className="w-4 h-4 print:hidden" />
                            <span className="print:font-medium">{reservation.party_size} Personen</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                            <Calendar className="w-4 h-4 print:hidden" />
                            <span className="print:font-medium text-xs">
                              Gebucht am: {new Date(reservation.created_at).toLocaleString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }).replace(',', ' um')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-slate-400 print:text-xs print:text-gray-700">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 print:hidden" />
                            <span>{reservation.customer_email}</span>
                          </div>
                          {reservation.customer_phone && (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 print:hidden" />
                              <span>{reservation.customer_phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
                          {(reservation as any).email_sent && (reservation as any).booking_method === 'payment_link' && (
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              E-Mail gesendet
                            </span>
                          )}
                          {(reservation as any).payment_link_url && reservation.payment_status === 'unpaid' && (
                            <>
                              <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded border border-amber-500/30 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Wartet auf Zahlung
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyPaymentLink((reservation as any).payment_link_url, reservation.id);
                                }}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded border border-green-500 flex items-center gap-1 transition text-xs"
                                title="Zahlungslink kopieren"
                              >
                                {copyingLinkFor === reservation.id ? (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Kopiert!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Link kopieren</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resendPaymentLinkEmail(reservation.id);
                                }}
                                disabled={resendingEmailFor === reservation.id}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded border border-blue-500 flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                title="Zahlungsemail erneut senden"
                              >
                                {resendingEmailFor === reservation.id ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span>Sendet...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" />
                                    <span>E-Mail senden</span>
                                  </>
                                )}
                              </button>
                              {(reservation as any).payment_link_url?.includes('/test_') && (
                                <>
                                  <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded border border-red-500/30 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    TEST-LINK
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      regeneratePaymentLink(reservation.id);
                                    }}
                                    disabled={regeneratingLinkFor === reservation.id}
                                    className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded border border-orange-500 flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                    title="Neuen Link im Live-Modus erstellen"
                                  >
                                    {regeneratingLinkFor === reservation.id ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Erstellt...</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Live-Link erstellen</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {(reservation as any).payment_link_url && reservation.payment_status === 'paid' && (
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30">
                              Zahlungslink bezahlt
                            </span>
                          )}
                          {(reservation as any).booking_method === 'manual_with_link' && (
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded border border-blue-500/30">
                              Mit Zahlungslink erstellt
                            </span>
                          )}
                        </div>

                        {(reservation.table || (reservation.reservation_tables && reservation.reservation_tables.length > 0)) && (
                          <div className="text-sm text-slate-400 print:text-xs print:text-gray-700">
                            Tisch: <span className="text-blue-400 print:text-gray-900 print:font-semibold">
                              {reservation.reservation_tables && reservation.reservation_tables.length > 0
                                ? reservation.reservation_tables.map((rt: any) => rt.tables?.table_number).filter(Boolean).join(', ')
                                : reservation.table?.table_number || ''}
                            </span>
                          </div>
                        )}

                        {reservation.special_requests && (
                          <div className="text-sm text-slate-300 bg-slate-900 rounded-lg p-3 print:bg-gray-100 print:text-gray-800 print:text-xs print:p-2">
                            <span className="font-medium">Hinweise: </span>
                            {reservation.special_requests}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 no-print">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReservation(reservation);
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReservation(reservation.id);
                          }}
                          disabled={isUpdating}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              );
            })}
          </>
        ) : (
          <>
            {getFilteredReservations().map((reservation) => (
              <div
                key={reservation.id}
                className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 hover:border-slate-600 transition print:bg-white print:border-gray-300 print:rounded-none print:p-3 print:break-inside-avoid"
              >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 flex-1 cursor-pointer print:cursor-default" onClick={() => setSelectedReservation(reservation)}>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-white print:text-black print:text-base">{reservation.customer_name}</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    {(reservation as any).booking_code && (
                      <span className="text-sm font-mono font-semibold text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-500/50 print:bg-transparent print:border-0 print:text-gray-900">
                        Code: {(reservation as any).booking_code}
                      </span>
                    )}
                    <span className={`px-4 py-1.5 rounded-lg text-sm font-bold ${
                      ((reservation as any).booking_method === 'payment_link' && reservation.payment_status === 'paid') || ((reservation as any).payment_link_url && reservation.payment_status === 'paid')
                        ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                        : ((reservation as any).payment_method === 'stripe' && reservation.payment_status === 'paid')
                        ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                        : (reservation as any).booking_method === 'payment_link' || (reservation as any).booking_method === 'online' || ((reservation as any).payment_method === 'stripe')
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-500/50'
                        : (reservation as any).booking_method === 'manual' && reservation.payment_amount > 0
                        ? 'bg-green-900/30 text-green-400 border border-green-500/50'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                    } print:bg-transparent print:border-0 print:text-gray-800`}>
                      {(reservation as any).booking_method === 'payment_link' && reservation.payment_status === 'paid'
                        ? `Online bezahlt €${reservation.payment_amount.toFixed(2)}`
                        : (reservation as any).booking_method === 'payment_link' && reservation.payment_amount > 0
                        ? `Zahlungslink €${reservation.payment_amount.toFixed(2)}`
                        : (reservation as any).payment_method === 'stripe' && reservation.payment_status === 'paid'
                        ? reservation.payment_amount > 0 ? `Online bezahlt €${reservation.payment_amount.toFixed(2)}` : 'Online bezahlt'
                        : (reservation as any).booking_method === 'online' && reservation.payment_status === 'paid'
                        ? reservation.payment_amount > 0 ? `Online €${reservation.payment_amount.toFixed(2)}` : 'Online'
                        : (reservation as any).booking_method === 'manual' && reservation.payment_amount > 0
                        ? `Anzahlung: €${reservation.payment_amount.toFixed(2)}`
                        : 'Kostenlos'}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        reservation.status
                      )} print:hidden`}
                    >
                      {t(`reservations.status_${reservation.status}`)}
                    </span>
                    <span className="hidden print:inline text-xs text-gray-700">
                      {reservation.status === 'confirmed' ? 'Bestätigt' : reservation.status === 'cancelled' ? 'Storniert' : reservation.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm print:grid-cols-4 print:gap-2 print:text-xs">
                  <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                    <Calendar className="w-4 h-4 print:hidden" />
                    <span className="print:font-medium">{new Date(reservation.reservation_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                    <Clock className="w-4 h-4 print:hidden" />
                    <span className="print:font-medium">{reservation.reservation_time}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                    <Users className="w-4 h-4 print:hidden" />
                    <span className="print:font-medium">{reservation.party_size} Personen</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300 print:text-gray-800">
                    <Calendar className="w-4 h-4 print:hidden" />
                    <span className="print:font-medium text-xs">
                      Gebucht am: {new Date(reservation.created_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', ' um')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-slate-400 print:text-xs print:text-gray-700">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 print:hidden" />
                    <span>{reservation.customer_email}</span>
                  </div>
                  {reservation.customer_phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 print:hidden" />
                      <span>{reservation.customer_phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
                  {(reservation as any).email_sent && (reservation as any).booking_method === 'payment_link' && (
                    <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      E-Mail gesendet
                    </span>
                  )}
                  {(reservation as any).payment_link_url && reservation.payment_status === 'unpaid' && (
                    <>
                      <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Wartet auf Zahlung
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPaymentLink((reservation as any).payment_link_url, reservation.id);
                        }}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded border border-green-500 flex items-center gap-1 transition text-xs"
                        title="Zahlungslink kopieren"
                      >
                        {copyingLinkFor === reservation.id ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            <span>Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Link kopieren</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resendPaymentLinkEmail(reservation.id);
                        }}
                        disabled={resendingEmailFor === reservation.id}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded border border-blue-500 flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        title="Zahlungsemail erneut senden"
                      >
                        {resendingEmailFor === reservation.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Sendet...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>E-Mail senden</span>
                          </>
                        )}
                      </button>
                      {(reservation as any).payment_link_url?.includes('/test_') && (
                        <>
                          <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded border border-red-500/30 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            TEST-LINK
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              regeneratePaymentLink(reservation.id);
                            }}
                            disabled={regeneratingLinkFor === reservation.id}
                            className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded border border-orange-500 flex items-center gap-1 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            title="Neuen Link im Live-Modus erstellen"
                          >
                            {regeneratingLinkFor === reservation.id ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Erstellt...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                <span>Live-Link erstellen</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {(reservation as any).payment_link_url && reservation.payment_status === 'paid' && (
                    <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded border border-green-500/30">
                      Zahlungslink bezahlt
                    </span>
                  )}
                  {(reservation as any).booking_method === 'manual_with_link' && (
                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded border border-blue-500/30">
                      Mit Zahlungslink erstellt
                    </span>
                  )}
                </div>

                {(reservation.table || (reservation.reservation_tables && reservation.reservation_tables.length > 0)) && (
                  <div className="text-sm text-slate-400 print:text-xs print:text-gray-700">
                    Tisch: <span className="text-blue-400 print:text-gray-900 print:font-semibold">
                      {reservation.reservation_tables && reservation.reservation_tables.length > 0
                        ? reservation.reservation_tables.map((rt: any) => rt.tables?.table_number).filter(Boolean).join(', ')
                        : reservation.table?.table_number || ''}
                    </span>
                  </div>
                )}

                {reservation.special_requests && (
                  <div className="text-sm text-slate-300 bg-slate-900 rounded-lg p-3 print:bg-gray-100 print:text-gray-800 print:text-xs print:p-2">
                    <span className="font-medium">Hinweise: </span>
                    {reservation.special_requests}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 no-print">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditReservation(reservation);
                  }}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReservation(reservation.id);
                  }}
                  disabled={isUpdating}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
          </>
        )}

        {reservations.length === 0 && viewMode === 'list' && (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('reservations.no_reservations')}</p>
          </div>
        )}
      </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 md:p-4 z-50 overflow-y-auto">
          <div ref={createFormRef} className="bg-slate-800 rounded-2xl p-4 md:p-6 max-w-3xl w-full border border-slate-700 my-2 md:my-8 max-h-[98vh] overflow-y-auto">
            <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 sticky top-0 bg-slate-800 pb-2 border-b border-slate-700">{t('reservations.create')}</h3>
            <form onSubmit={handleCreateReservation} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.name')}</label>
                  <input
                    type="text"
                    required
                    value={newReservation.customer_name}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.email')}</label>
                  <input
                    type="email"
                    required
                    value={newReservation.customer_email}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.phone')}</label>
                  <input
                    type="tel"
                    value={newReservation.customer_phone}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.party_size')}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newReservation.party_size}
                    onChange={(e) => setNewReservation({ ...newReservation, party_size: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.select_date')}</label>
                  <input
                    type="date"
                    required
                    value={newReservation.reservation_date}
                    onChange={(e) => setNewReservation({ ...newReservation, reservation_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.select_time')}</label>
                  <input
                    type="time"
                    required
                    value={newReservation.reservation_time}
                    onChange={(e) => setNewReservation({ ...newReservation, reservation_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Raum auswählen *</label>
                <select
                  required
                  value={newReservation.room_id}
                  onChange={(e) => setNewReservation({ ...newReservation, room_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Bitte wählen...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 bg-slate-900/30 p-3 md:p-4 rounded-lg">
                <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multipleDays}
                    onChange={(e) => {
                      setMultipleDays(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedDays([]);
                        setDayAmounts({});
                      }
                    }}
                    className="w-4 h-4 md:w-5 md:h-5 bg-slate-900 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm md:text-base font-medium text-slate-300">{t('crew.book_multiple_days')}</span>
                </label>
                {multipleDays && (
                  <div>
                    <label className="block text-sm md:text-base font-medium text-slate-300 mb-2 md:mb-3">{t('crew.select_days')}</label>
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 md:p-4 overflow-x-auto">
                      {(() => {
                        const startDate = new Date(newReservation.reservation_date || new Date());
                        const days: JSX.Element[] = [];
                        const currentDate = new Date(startDate);
                        currentDate.setDate(currentDate.getDate() - 7);

                        for (let i = 0; i < 38; i++) {
                          const dateStr = formatDateLocal(currentDate);
                          const isSelected = selectedDays.includes(dateStr);
                          const isOriginalDate = dateStr === newReservation.reservation_date;
                          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayOfMonth = currentDate.getDate();

                          days.push(
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => {
                                if (isOriginalDate) return;
                                if (isSelected) {
                                  setSelectedDays(selectedDays.filter(d => d !== dateStr));
                                  setDayAmounts(prev => { const next = { ...prev }; delete next[dateStr]; return next; });
                                } else {
                                  setSelectedDays([...selectedDays, dateStr].sort());
                                }
                              }}
                              className={`p-1.5 md:p-2 rounded-lg text-xs md:text-sm transition-colors min-w-[50px] md:min-w-[60px] ${
                                isOriginalDate
                                  ? 'bg-green-600 text-white cursor-default'
                                  : isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <div className="font-medium text-[10px] md:text-xs">{dayOfWeek}</div>
                              <div className="text-xs md:text-sm font-bold">{dayOfMonth}</div>
                              {isOriginalDate && <div className="text-[8px] md:text-xs mt-0.5 md:mt-1">●</div>}
                            </button>
                          );

                          currentDate.setDate(currentDate.getDate() + 1);
                        }

                        return <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-[360px]">{days}</div>;
                      })()}
                      {selectedDays.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-400">
                            {selectedDays.length} {t('crew.days_selected')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservations.tables')} ({t('crew.optional')})</label>
                <div className="mb-2 flex gap-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => {
                        setTableRoomFilter(room.id);
                        loadAllTables();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        tableRoomFilter === room.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
                <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 max-h-48 md:max-h-56 overflow-y-auto">
                  {allTables.filter(table => table.capacity > 0 && table.room_id === tableRoomFilter).length === 0 ? (
                    <p className="text-sm text-slate-500">{t('reservations.no_tables_available')}</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                      {allTables
                        .filter(table => table.capacity > 0 && table.room_id === tableRoomFilter)
                        .sort((a, b) => {
                          const numA = parseInt(a.table_number) || 0;
                          const numB = parseInt(b.table_number) || 0;
                          return numA - numB;
                        })
                        .map((table) => {
                        const isSelected = selectedTables.includes(table.id);
                        const reservedTables = (newReservation.reservation_date && newReservation.reservation_time)
                          ? getReservedTablesForDateTime(newReservation.reservation_date, newReservation.reservation_time)
                          : new Set<string>();
                        const isReserved = reservedTables.has(table.id);
                        const isNonBookable = !table.is_bookable;

                        return (
                          <button
                            key={table.id}
                            type="button"
                            disabled={isReserved}
                            onClick={() => {
                              if (isReserved) return;
                              if (isSelected) {
                                setSelectedTables(selectedTables.filter(id => id !== table.id));
                              } else {
                                setSelectedTables([...selectedTables, table.id]);
                              }
                            }}
                            className={`p-2 rounded-lg border-2 transition-all ${
                              isReserved
                                ? 'bg-red-900 border-red-600 text-red-200 cursor-not-allowed opacity-75'
                                : isSelected
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                : isNonBookable
                                ? 'bg-amber-900 border-amber-600 text-amber-200 hover:bg-amber-800 hover:border-amber-500'
                                : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                            }`}
                          >
                            <div className="text-center">
                              <div className="text-sm font-bold">{table.table_number || table.custom_label || `T${table.id.slice(0, 4)}`}</div>
                              <div className="text-[10px] opacity-80">{table.capacity}p</div>
                              {isReserved && <div className="text-[9px] font-semibold mt-0.5">Reserviert</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedTables.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <p className="text-[10px] text-slate-400">
                        {selectedTables.length} {selectedTables.length === 1 ? t('reservations.table') : t('reservations.tables')} {t('crew.selected')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.special_requests')}</label>
                <textarea
                  value={newReservation.special_requests}
                  onChange={(e) => setNewReservation({ ...newReservation, special_requests: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm md:text-base text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-3 bg-slate-900/30 p-3 md:p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Buchungsart</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingMethod('free');
                        setPaidWithCash(false);
                        setCashAmount(0);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        bookingMethod === 'free'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Kostenlos (Keine Zahlung)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingMethod('manual')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        bookingMethod === 'manual'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Mit Zahlung
                    </button>
                  </div>
                </div>
                {bookingMethod === 'manual' && (
                  <>
                    <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={paidWithCash}
                        onChange={(e) => {
                          setPaidWithCash(e.target.checked);
                          if (!e.target.checked) {
                            setCashAmount(0);
                          }
                        }}
                        className="w-4 h-4 md:w-5 md:h-5 bg-slate-900 border-slate-600 rounded text-green-600 focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm md:text-base font-medium text-slate-300">{t('crew.paid_with_cash')}</span>
                    </label>
                    {paidWithCash && (
                      <div>
                        {multipleDays && selectedDays.length > 0 ? (
                          <>
                            <label className="block text-sm font-medium text-slate-300 mb-3">{t('crew.cash_amount')} pro Tag</label>
                            <div className="space-y-2">
                              {[newReservation.reservation_date, ...selectedDays].filter(Boolean).sort().map(dateStr => {
                                const [y, m, d] = dateStr.split('-').map(Number);
                                const dateObj = new Date(y, m - 1, d);
                                const label = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                                const isMain = dateStr === newReservation.reservation_date;
                                return (
                                  <div key={dateStr} className="flex items-center gap-3">
                                    <span className="text-sm text-slate-300 flex-1">
                                      {label}{isMain && <span className="text-green-400 text-xs ml-1">(Haupttag)</span>}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={dayAmounts[dateStr] ?? 0}
                                      onChange={(e) => setDayAmounts(prev => ({ ...prev, [dateStr]: parseFloat(e.target.value) || 0 }))}
                                      className="w-28 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-right"
                                      placeholder="0.00"
                                    />
                                    <span className="text-slate-400 text-sm">€</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <>
                            <label className="block text-sm font-medium text-slate-300 mb-2">{t('crew.cash_amount')}</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={cashAmount}
                              onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 pt-2 sticky bottom-0 bg-slate-800 pb-2 border-t border-slate-700 mt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 md:py-3 bg-green-600 hover:bg-green-700 text-white text-sm md:text-base font-medium rounded-lg transition"
                >
                  {t('reservations.create')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateReservationWithPaymentLink}
                  disabled={isCreatingWithPaymentLink}
                  className="flex-1 px-4 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm md:text-base font-medium rounded-lg transition"
                >
                  {isCreatingWithPaymentLink ? 'Wird erstellt...' : 'Mit Zahlungslink erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setSelectedTables([]);
                    setMultipleDays(false);
                    setSelectedDays([]);
                    setDayAmounts({});
                    setPaidWithCash(false);
                    setCashAmount(0);
                    setBookingMethod('free');
                  }}
                  className="flex-1 px-4 py-2.5 md:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm md:text-base font-medium rounded-lg transition"
                >
                  {t('floor_plan.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-2 md:p-4 z-50 overflow-y-auto">
          <div ref={editFormRef} className="bg-slate-800 rounded-2xl p-4 md:p-6 max-w-3xl w-full border border-slate-700 my-2 md:my-8 max-h-[98vh] overflow-y-auto">
            <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 sticky top-0 bg-slate-800 pb-2 border-b border-slate-700">
              Edit Reservation
            </h3>
            <form onSubmit={handleUpdateReservation} className="space-y-4 md:space-y-6">
              <div className="bg-slate-900/30 p-3 md:p-4 rounded-lg">
                <label className="block text-sm font-medium text-slate-300 mb-2">Buchungsart</label>
                <div className={`px-4 py-3 rounded-lg text-center font-semibold ${
                  (editingReservation as any)?.booking_method === 'online' || (editingReservation as any)?.booking_method === 'payment_link' || (editingReservation as any)?.payment_method === 'stripe'
                    ? 'bg-purple-900/30 text-purple-400 border-2 border-purple-500/50'
                    : (editingReservation as any)?.booking_method === 'manual'
                    ? 'bg-amber-900/30 text-amber-400 border-2 border-amber-500/50'
                    : 'bg-emerald-900/30 text-emerald-400 border-2 border-emerald-500/50'
                }`}>
                  {(editingReservation as any)?.booking_method === 'online' || (editingReservation as any)?.booking_method === 'payment_link' || (editingReservation as any)?.payment_method === 'stripe' ? 'Online gebucht' : (editingReservation as any)?.booking_method === 'manual' ? 'Bar bezahlt' : 'Kostenlos / Frei'}
                </div>
                {((editingReservation as any)?.booking_method === 'online' || (editingReservation as any)?.booking_method === 'payment_link' || (editingReservation as any)?.payment_method === 'stripe') && editingReservation.payment_amount > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Zahlungsbetrag:</span>
                      <span className="text-green-400 font-bold text-lg">€{editingReservation.payment_amount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-slate-300">Status:</span>
                      <span className={`font-medium ${editingReservation.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {editingReservation.payment_status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                      </span>
                    </div>
                    {editingReservation.payment_status !== 'paid' && (editingReservation as any)?.booking_method === 'payment_link' && (
                      <button
                        type="button"
                        onClick={handleMarkPaymentLinkAsPaid}
                        disabled={isUpdating}
                        className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {isUpdating ? 'Wird aktualisiert...' : 'Als bezahlt markieren'}
                      </button>
                    )}
                    <p className="mt-3 text-xs text-slate-400 bg-slate-900/50 p-2 rounded">
                      {editingReservation.payment_status !== 'paid' && (editingReservation as any)?.booking_method === 'payment_link'
                        ? '💡 Wenn der Kunde bar oder per EC-Karte bezahlt hat, klicken Sie auf "Als bezahlt markieren". Der Status wird automatisch auf "Bestätigt" gesetzt.'
                        : 'ℹ️ Zahlungsinformationen für Online-Buchungen werden automatisch geschützt und nicht verändert.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.name')}</label>
                  <input
                    type="text"
                    required
                    value={newReservation.customer_name}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('reservation_widget.email')} ({t('crew.optional')})
                  </label>
                  <input
                    type="email"
                    value={newReservation.customer_email}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.phone')}</label>
                  <input
                    type="tel"
                    value={newReservation.customer_phone}
                    onChange={(e) => setNewReservation({ ...newReservation, customer_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.party_size')}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newReservation.party_size}
                    onChange={(e) => setNewReservation({ ...newReservation, party_size: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Reservation Date</label>
                  <input
                    type="date"
                    required
                    value={newReservation.reservation_date}
                    onChange={(e) => setNewReservation({ ...newReservation, reservation_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.select_time')}</label>
                  <input
                    type="time"
                    required
                    value={newReservation.reservation_time}
                    onChange={(e) => setNewReservation({ ...newReservation, reservation_time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-slate-900/30 p-3 md:p-4 rounded-lg">
                <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multipleDays}
                    onChange={(e) => {
                      setMultipleDays(e.target.checked);
                      if (!e.target.checked) {
                        setSelectedDays([]);
                      }
                    }}
                    className="w-4 h-4 md:w-5 md:h-5 bg-slate-900 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm md:text-base font-medium text-slate-300">
                    {t('crew.book_additional_days')}
                  </span>
                </label>
                {multipleDays && (
                  <div>
                    <label className="block text-sm md:text-base font-medium text-slate-300 mb-2 md:mb-3">
                      {t('crew.select_days')}
                    </label>
                    <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 md:p-4 overflow-x-auto">
                      {(() => {
                        const startDate = new Date(newReservation.reservation_date);
                        const days: JSX.Element[] = [];
                        const currentDate = new Date(startDate);
                        currentDate.setDate(currentDate.getDate() - 7);

                        for (let i = 0; i < 38; i++) {
                          const dateStr = formatDateLocal(currentDate);
                          const isSelected = selectedDays.includes(dateStr);
                          const isOriginalDate = dateStr === newReservation.reservation_date;
                          const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayOfMonth = currentDate.getDate();

                          days.push(
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDays(selectedDays.filter(d => d !== dateStr));
                                } else {
                                  setSelectedDays([...selectedDays, dateStr].sort());
                                }
                              }}
                              className={`p-1.5 md:p-2 rounded-lg text-xs md:text-sm transition-colors min-w-[50px] md:min-w-[60px] ${
                                isOriginalDate
                                  ? 'bg-green-600 text-white cursor-default'
                                  : isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <div className="font-medium text-[10px] md:text-xs">{dayOfWeek}</div>
                              <div className="text-xs md:text-sm font-bold">{dayOfMonth}</div>
                              {isOriginalDate && <div className="text-[8px] md:text-xs mt-0.5 md:mt-1">●</div>}
                            </button>
                          );
                          currentDate.setDate(currentDate.getDate() + 1);
                        }
                        return <div className="grid grid-cols-7 gap-1 md:gap-2 min-w-[360px]">{days}</div>;
                      })()}
                      {selectedDays.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-400">
                            {selectedDays.length} {t('crew.days_selected')} {t('crew.additional_reservations_note')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Raum auswählen *</label>
                <select
                  required
                  value={newReservation.room_id}
                  onChange={(e) => {
                    setNewReservation({ ...newReservation, room_id: e.target.value });
                    setTableRoomFilter(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Bitte wählen...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('reservations.tables')} ({t('crew.optional')})
                </label>
                <div className="mb-2 flex gap-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setTableRoomFilter(room.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        tableRoomFilter === room.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
                <div className="bg-slate-900 border border-slate-600 rounded-lg p-2 max-h-48 md:max-h-56 overflow-y-auto">
                  {allTables.filter(table => table.capacity > 0 && table.room_id === tableRoomFilter).length === 0 ? (
                    <p className="text-sm text-slate-500">{t('reservations.no_tables_available')}</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                      {allTables
                        .filter(table => table.capacity > 0 && table.room_id === tableRoomFilter)
                        .sort((a, b) => {
                          const numA = parseInt(a.table_number) || 0;
                          const numB = parseInt(b.table_number) || 0;
                          return numA - numB;
                        })
                        .map((table) => {
                          const isSelected = selectedTables.includes(table.id);
                          const reservedTables = (newReservation.reservation_date && newReservation.reservation_time)
                            ? getReservedTablesForDateTime(newReservation.reservation_date, newReservation.reservation_time, editingReservation?.id)
                            : new Set<string>();
                          const isReserved = reservedTables.has(table.id);
                          const isNonBookable = !table.is_bookable;

                          return (
                            <button
                              key={table.id}
                              type="button"
                              disabled={isReserved}
                              onClick={() => {
                                if (isReserved) return;
                                if (isSelected) {
                                  setSelectedTables(selectedTables.filter(id => id !== table.id));
                                } else {
                                  setSelectedTables([...selectedTables, table.id]);
                                }
                              }}
                              className={`p-2 rounded-lg border-2 transition-all ${
                                isReserved
                                  ? 'bg-red-900 border-red-600 text-red-200 cursor-not-allowed opacity-75'
                                  : isSelected
                                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                                  : isNonBookable
                                  ? 'bg-amber-900 border-amber-600 text-amber-200 hover:bg-amber-800 hover:border-amber-500'
                                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
                              }`}
                            >
                              <div className="text-center">
                                <div className="text-sm font-bold">
                                  {table.table_number || table.custom_label || `T${table.id.slice(0, 4)}`}
                                </div>
                                <div className="text-[10px] opacity-80">{table.capacity}p</div>
                                {isReserved && <div className="text-[9px] font-semibold mt-0.5">Reserviert</div>}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {selectedTables.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                      <p className="text-[10px] text-slate-400">
                        {selectedTables.length} {selectedTables.length === 1 ? t('reservations.table') : t('reservations.tables')} {t('crew.selected')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('reservation_widget.special_requests')}</label>
                <textarea
                  value={newReservation.special_requests}
                  onChange={(e) => setNewReservation({ ...newReservation, special_requests: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm md:text-base text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {(editingReservation as any)?.booking_method !== 'online' && (editingReservation as any)?.booking_method !== 'payment_link' && (editingReservation as any)?.payment_method !== 'stripe' && (
                <div className="space-y-3 bg-slate-900/30 p-3 md:p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Zahlungsstatus ändern</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingMethod('free');
                          setPaidWithCash(false);
                          setCashAmount(0);
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          bookingMethod === 'free'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Kostenlos (Keine Zahlung)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingMethod('manual')}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                          bookingMethod === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Mit Zahlung
                      </button>
                    </div>
                  </div>
                  {bookingMethod === 'manual' && (
                    <>
                      <label className="flex items-center space-x-2 md:space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paidWithCash}
                          onChange={(e) => {
                            setPaidWithCash(e.target.checked);
                            if (!e.target.checked) {
                              setCashAmount(0);
                            }
                          }}
                          className="w-4 h-4 md:w-5 md:h-5 bg-slate-900 border-slate-600 rounded text-green-600 focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm md:text-base font-medium text-slate-300">
                          {t('crew.paid_with_cash')}
                        </span>
                      </label>
                      {paidWithCash && (
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">{t('crew.cash_amount')}</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3 pt-2 sticky bottom-0 bg-slate-800 pb-2 border-t border-slate-700 mt-4">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`flex-1 px-4 py-2.5 md:py-3 text-white text-sm md:text-base font-medium rounded-lg transition ${
                    isUpdating
                      ? 'bg-slate-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isUpdating ? t('crew.updating') || 'Updating...' : t('crew.update')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingReservation(null);
                    setSelectedTables([]);
                    setMultipleDays(false);
                    setSelectedDays([]);
                    setPaidWithCash(false);
                    setCashAmount(0);
                    setBookingMethod('free');
                    setNewReservation({
                      customer_name: '',
                      customer_email: '',
                      customer_phone: '',
                      party_size: 2,
                      reservation_date: '',
                      reservation_time: '',
                      room_id: '',
                      special_requests: '',
                      status: 'confirmed',
                      payment_status: 'unpaid',
                      payment_amount: 0,
                    });
                  }}
                  className="flex-1 px-4 py-2.5 md:py-3 bg-slate-700 hover:bg-slate-600 text-white text-sm md:text-base font-medium rounded-lg transition"
                >
                  {t('floor_plan.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">{t('reservations.update_status')}</h3>
            <div className="space-y-3">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">{t('reservations.payment_management')}</h4>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={selectedReservation.payment_amount}
                    id="payment-amount"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-slate-400">€</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const amount = parseFloat((document.getElementById('payment-amount') as HTMLInputElement).value);
                      handleUpdatePayment(selectedReservation.id, 'unpaid', amount);
                    }}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs transition"
                  >
                    {t('reservations.payment_pending')}
                  </button>
                  <button
                    onClick={() => {
                      const amount = parseFloat((document.getElementById('payment-amount') as HTMLInputElement).value);
                      handleUpdatePayment(selectedReservation.id, 'paid', amount);
                    }}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition"
                  >
                    {t('reservations.payment_paid')}
                  </button>
                  <button
                    onClick={() => {
                      const amount = parseFloat((document.getElementById('payment-amount') as HTMLInputElement).value);
                      handleUpdatePayment(selectedReservation.id, 'refunded', amount);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition"
                  >
                    {t('reservations.payment_refunded')}
                  </button>
                </div>
              </div>
              <button
                onClick={() => handleUpdateStatus(selectedReservation.id, 'confirmed')}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center space-x-2 transition"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{t('reservations.confirm')}</span>
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReservation.id, 'completed')}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center space-x-2 transition"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{t('reservations.complete')}</span>
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedReservation.id, 'cancelled')}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center space-x-2 transition"
              >
                <XCircle className="w-5 h-5" />
                <span>{t('reservations.cancel')}</span>
              </button>
              <button
                onClick={() => handleDeleteReservation(selectedReservation.id)}
                disabled={isUpdating}
                className="w-full px-4 py-3 bg-red-800 hover:bg-red-900 text-white rounded-lg flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                <span>{isUpdating ? 'Wird gelöscht...' : t('reservations.delete')}</span>
              </button>
              <button
                onClick={() => setSelectedReservation(null)}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                {t('reservations.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
