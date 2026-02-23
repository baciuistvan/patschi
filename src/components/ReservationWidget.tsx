import { useState, useEffect } from 'react';
import { supabase, Room } from '../lib/supabase';
import { Calendar, Users, Mail, Phone, MessageSquare, CreditCard, Check } from 'lucide-react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ReservationWidget() {
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [selectedTables, setSelectedTables] = useState<any[]>([]);
  const [success, setSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [cardElement, setCardElement] = useState<any>(null);
  const [paymentRequest, setPaymentRequest] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripeError, setStripeError] = useState('');
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test');

  const [formData, setFormData] = useState({
    party_size: 2,
    reservation_date: '',
    reservation_time: '15:45',
    room_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    special_requests: '',
    payment_amount: 35000,
  });

  useEffect(() => {
    loadRooms();
    loadDepositAmount();
    loadStripeModeAndInitialize();
  }, []);

  useEffect(() => {
    setAvailabilityChecked(false);
    setSelectedTables([]);
    setError('');
  }, [formData.reservation_date, formData.party_size, formData.room_id]);

  const loadStripeModeAndInitialize = async () => {
    try {
      // Fetch both stripe_enabled and stripe_mode from settings
      const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['stripe_enabled', 'stripe_mode']);

      if (error) {
        console.error('Failed to load Stripe settings:', error);
        await initializeStripe('test');
        return;
      }

      // Parse settings
      const stripeEnabledSetting = settings?.find(s => s.key === 'stripe_enabled');
      const stripeModeSetting = settings?.find(s => s.key === 'stripe_mode');

      const enabled = stripeEnabledSetting?.value === 'true';
      const mode = (stripeModeSetting?.value || 'test') as 'test' | 'live';

      console.log('[Stripe Settings] Enabled:', enabled, 'Mode:', mode);

      setStripeEnabled(enabled);
      setStripeMode(mode);

      if (enabled) {
        await initializeStripe(mode);
      } else {
        console.log('[Stripe] Stripe is disabled, skipping initialization');
      }
    } catch (error) {
      console.error('Failed to load Stripe settings:', error);
      setStripeEnabled(true); // Default to enabled for backwards compatibility
      await initializeStripe('test');
    }
  };

  const initializeStripe = async (mode: 'test' | 'live') => {
    try {
      // Load the appropriate key from database settings
      const settingKey = mode === 'test'
        ? 'stripe_test_publishable_key'
        : 'stripe_live_publishable_key';

      console.log('[Stripe Init] Mode:', mode);
      console.log('[Stripe Init] Loading key from settings:', settingKey);

      const { data: keyData, error: keyError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', settingKey)
        .single();

      if (keyError || !keyData?.value) {
        console.error(`[Stripe Init] ${mode} key not found in database:`, keyError);
        setStripeError(`Stripe ${mode === 'test' ? 'Test' : 'Live'}-Modus ist nicht konfiguriert. Bitte laden Sie die Seite neu oder kontaktieren Sie den Administrator.`);
        setStripe(null);
        setCardElement(null);
        return;
      }

      const key = keyData.value;
      console.log('[Stripe Init] Key found:', key ? `${key.substring(0, 10)}...` : 'NONE');

      if (!key || key.length === 0) {
        console.error(`[Stripe Init] ${mode} key is empty`);
        setStripeError(`Stripe ${mode === 'test' ? 'Test' : 'Live'}-Modus ist nicht konfiguriert. Bitte laden Sie die Seite neu oder kontaktieren Sie den Administrator.`);
        setStripe(null);
        setCardElement(null);
        return;
      }

      // Validate key format matches the mode
      const keyPrefix = key.substring(0, 7);
      const expectedPrefix = mode === 'test' ? 'pk_test' : 'pk_live';

      if (!keyPrefix.startsWith(expectedPrefix)) {
        console.error(`[Stripe Init] Key mismatch! Expected ${expectedPrefix} but got ${keyPrefix}`);
        setStripeError(`Stripe-Konfigurationsfehler: Der Schlüssel passt nicht zum ${mode === 'test' ? 'Test' : 'Live'}-Modus. Bitte kontaktieren Sie den Administrator.`);
        setStripe(null);
        setCardElement(null);
        return;
      }

      console.log('[Stripe Init] Loading Stripe with key:', key.substring(0, 10) + '...');
      const stripeInstance = await loadStripe(key);
      if (!stripeInstance) {
        setStripeError('Stripe konnte nicht geladen werden');
        console.error('[Stripe Init] Failed to load Stripe instance');
        setStripe(null);
        setCardElement(null);
        return;
      }

      console.log('[Stripe Init] Stripe loaded successfully');
      setStripe(stripeInstance);

      const elements = stripeInstance.elements();
      const card = elements.create('card', {
        style: {
          base: {
            fontSize: '16px',
            color: '#1e293b',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            '::placeholder': {
              color: '#94a3b8',
            },
          },
          invalid: {
            color: '#ef4444',
          },
        },
      });
      setCardElement(card);
      console.log('[Stripe Init] Card element created');
    } catch (err: any) {
      console.error('Stripe initialization error:', err);
      setStripeError(err.message || 'Fehler beim Laden von Stripe');
      setStripe(null);
      setCardElement(null);
    }
  };

  const initializePaymentRequest = async () => {
    if (!stripe || !formData.payment_amount) return;

    try {
      const pr = stripe.paymentRequest({
        country: 'AT',
        currency: 'eur',
        total: {
          label: 'Reservierungs-Anzahlung',
          amount: formData.payment_amount,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      const canMakePayment = await pr.canMakePayment();
      if (canMakePayment) {
        setPaymentRequest(pr);
      }
    } catch (err) {
      console.log('Payment Request API not available');
    }
  };

  const loadRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setRooms(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, room_id: data[0].id }));
      }
    }
  };

  const loadDepositAmount = async () => {
    const { data: depositData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'deposit_amount')
      .maybeSingle();

    if (depositData) {
      setFormData(prev => ({ ...prev, payment_amount: parseFloat(depositData.value) * 100 }));
    }
  };


  useEffect(() => {
    if (step === 3) {
      initializePaymentRequest();
      if (cardElement) {
        setTimeout(() => {
          try {
            const cardContainer = document.getElementById('card-element');
            if (cardContainer && !cardContainer.hasChildNodes()) {
              cardElement.mount('#card-element');
            }
          } catch (err) {
            console.error('Error mounting card element:', err);
          }
        }, 100);
      }
    }
  }, [step, cardElement, stripe, formData.payment_amount]);

  const checkAvailability = async () => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-availability`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        party_size: formData.party_size,
        room_id: formData.room_id,
      }),
    });

    if (!response.ok) {
      throw new Error('Fehler beim Prüfen der Verfügbarkeit');
    }

    return await response.json();
  };

  const handleNextStep = async () => {
    console.log('handleNextStep called, current step:', step);
    setError('');
    setLoading(true);

    try {
      if (step === 1) {
        if (!formData.reservation_date) {
          setError('Bitte wählen Sie ein Datum');
          return;
        }
        const selectedDate = new Date(formData.reservation_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          setError('Bitte wählen Sie ein zukünftiges Datum');
          return;
        }

        // Check if trying to book today after 12:00
        const now = new Date();
        const currentHour = now.getHours();
        const isToday = selectedDate.toDateString() === now.toDateString();
        if (isToday && currentHour >= 12) {
          setError('Reservierungen für heute sind nur bis 12:00 Uhr möglich. Bitte wählen Sie ein Datum ab morgen.');
          return;
        }

        // Check if date is within 2 weeks (14 days)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 14);
        maxDate.setHours(0, 0, 0, 0);
        if (selectedDate > maxDate) {
          setError('Online-Reservierungen sind nur bis zu 2 Wochen im Voraus möglich. Für spätere Termine kontaktieren Sie uns bitte direkt.');
          return;
        }

        if (!formData.party_size || formData.party_size < 1) {
          setError('Bitte geben Sie die Anzahl der Personen an');
          return;
        }

        if (formData.party_size > 15) {
          setError('Online-Reservierungen sind nur für maximal 15 Personen möglich. Für größere Gruppen kontaktieren Sie uns bitte direkt.');
          return;
        }

        // Check availability before proceeding
        const availability = await checkAvailability();
        if (!availability.available) {
          setAvailabilityChecked(false);
          setSelectedTables([]);
          let errorMessage = availability.message || 'Keine Verfügbarkeit';
          if (availability.reason === 'closed') {
            errorMessage = 'An diesem Datum sind alle Tische geschlossen. Bitte wählen Sie ein anderes Datum.';
          } else if (availability.reason === 'fully_booked') {
            errorMessage = 'An diesem Datum und dieser Uhrzeit sind alle Tische bereits gebucht. Bitte wählen Sie ein anderes Datum.';
          } else if (availability.reason === 'capacity_exceeded') {
            errorMessage = `Leider haben wir keine verfügbaren Tische für ${formData.party_size} Personen. Bitte kontaktieren Sie uns direkt.`;
          }
          setError(errorMessage);
          return;
        }
        // Store selected table info
        setSelectedTables(availability.selected_tables || []);
        setAvailabilityChecked(true);
      }

      if (step === 2) {
        if (!formData.customer_name || !formData.customer_email) {
          setError('Bitte füllen Sie alle Pflichtfelder aus');
          return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.customer_email)) {
          setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
          return;
        }

        // If Stripe is disabled, create a free reservation directly
        if (!stripeEnabled) {
          await createFreeReservation();
          return;
        }
      }

      console.log('Moving to step:', step + 1);
      setStep(step + 1);
    } catch (err: any) {
      console.error('Error in handleNextStep:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const createFreeReservation = async () => {
    try {
      const reservationData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone || '',
        party_size: formData.party_size,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        duration_minutes: 120,
        status: 'confirmed',
        special_requests: formData.special_requests || '',
        payment_status: 'unpaid',
        payment_amount: 0,
        payment_method: 'none',
        booking_method: 'free',
        room_id: formData.room_id,
        selected_tables: selectedTables,
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reservation`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Fehler beim Erstellen der Reservierung');
      }

      setBookingCode(responseData.booking_code);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating free reservation:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  const createPaymentIntent = async () => {
    // First, re-check the current mode from database to ensure it hasn't changed
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['stripe_enabled', 'stripe_mode']);

    if (settingsError) {
      console.error('[Payment Intent] Failed to fetch current settings:', settingsError);
      throw new Error('Fehler beim Laden der Einstellungen');
    }

    const currentMode = (settings?.find(s => s.key === 'stripe_mode')?.value || 'test') as 'test' | 'live';
    const currentEnabled = settings?.find(s => s.key === 'stripe_enabled')?.value === 'true';

    console.log('[Payment Intent] Current DB mode:', currentMode, 'Frontend mode:', stripeMode);
    console.log('[Payment Intent] Current DB enabled:', currentEnabled, 'Frontend enabled:', stripeEnabled);

    // Check if mode changed since page load
    if (currentMode !== stripeMode) {
      console.error('[Payment Intent] MODE CHANGED! DB:', currentMode, 'Frontend:', stripeMode);
      throw new Error(`Die Stripe-Konfiguration wurde geändert. Bitte laden Sie die Seite neu und versuchen Sie es erneut.`);
    }

    if (!currentEnabled) {
      throw new Error('Stripe wurde deaktiviert. Bitte laden Sie die Seite neu.');
    }

    // Verify we have the correct Stripe instance loaded
    if (!stripe) {
      throw new Error('Stripe ist nicht geladen. Bitte laden Sie die Seite neu.');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;
    console.log('[Payment Intent] Creating payment intent for amount:', formData.payment_amount);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: formData.payment_amount,
        currency: 'eur',
        metadata: {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          reservation_date: formData.reservation_date,
          reservation_time: formData.reservation_time,
          party_size: formData.party_size.toString(),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Payment Intent] Error response:', errorData);
      throw new Error(errorData.error || 'Fehler beim Erstellen der Zahlung');
    }

    const data = await response.json();
    console.log('[Payment Intent] Backend returned mode:', data.mode);
    console.log('[Payment Intent] Frontend is using mode:', stripeMode);

    // Double-check mode matches
    if (data.mode !== stripeMode) {
      console.error('[Payment Intent] MODE MISMATCH! Backend:', data.mode, 'Frontend:', stripeMode);
      throw new Error(`Stripe-Modus stimmt nicht überein. Backend: ${data.mode}, Frontend: ${stripeMode}. Bitte laden Sie die Seite neu.`);
    }

    return data.clientSecret;
  };

  const handleSubmit = async () => {
    if (!stripe || !cardElement) {
      setError('Stripe ist noch nicht geladen. Bitte laden Sie die Seite neu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!selectedTables || selectedTables.length === 0) {
        throw new Error('Keine Tischzuweisung vorhanden. Bitte gehen Sie zurück zu Schritt 1 und prüfen Sie die Verfügbarkeit erneut.');
      }

      console.log('[Payment] Creating payment intent...');
      const secret = await createPaymentIntent();
      console.log('[Payment] Payment intent created, client secret:', secret.substring(0, 20) + '...');
      setClientSecret(secret);

      console.log('[Payment] Confirming card payment...');
      console.log('[Payment] Current Stripe mode:', stripeMode);
      console.log('[Payment] Using Stripe instance initialized with:', stripeMode === 'test' ? 'TEST' : 'LIVE', 'keys');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.customer_name,
            email: formData.customer_email,
            phone: formData.customer_phone,
          },
        },
      });

      if (stripeError) {
        console.error('[Payment] Stripe error:', stripeError);
        console.error('[Payment] Error code:', stripeError.code);
        console.error('[Payment] Error type:', stripeError.type);

        if (stripeError.code === 'resource_missing' || stripeError.message?.includes('No such payment_intent')) {
          throw new Error('Zahlungs-Konfigurationsfehler: Die Zahlung konnte nicht gefunden werden. Dies kann passieren, wenn die Stripe-Einstellungen während des Buchungsprozesses geändert wurden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.');
        }

        throw new Error(stripeError.message || 'Zahlung fehlgeschlagen');
      }

      if (paymentIntent.status !== 'succeeded') {
        console.error('[Payment] Payment intent status:', paymentIntent.status);
        throw new Error('Zahlung fehlgeschlagen');
      }

      console.log('[Payment] Payment successful, intent ID:', paymentIntent.id);

      const reservationData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone || '',
        party_size: formData.party_size,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        duration_minutes: 120,
        status: 'confirmed',
        special_requests: formData.special_requests || '',
        payment_status: 'paid',
        payment_amount: formData.payment_amount / 100,
        payment_method: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
        booking_method: 'online',
        room_id: formData.room_id,
        selected_tables: selectedTables,
      };

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reservation`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reservationData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Fehler beim Erstellen der Reservierung');
      }

      setBookingCode(responseData.booking_code);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl shadow-2xl">
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Reservierung bestätigt!</h2>
          <p className="text-lg text-slate-600 mb-8">Vielen Dank für Ihre Buchung</p>

          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="mb-6">
              <p className="text-sm text-slate-600 mb-2">Ihre Buchungsnummer</p>
              <div className="text-4xl font-bold text-emerald-600 tracking-wider mb-1">
                {bookingCode}
              </div>
              <p className="text-sm text-slate-500">Bitte bewahren Sie diese Nummer auf</p>
            </div>

            <div className="border-t border-slate-200 pt-6 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Datum</span>
                <span className="font-semibold text-slate-900">
                  {new Date(formData.reservation_date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Uhrzeit</span>
                <span className="font-semibold text-slate-900">{formData.reservation_time} Uhr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Personen</span>
                <span className="font-semibold text-slate-900">{formData.party_size}</span>
              </div>
              {stripeEnabled && formData.payment_amount > 0 && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="text-slate-600">Bezahlt</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    €{(formData.payment_amount / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Wichtig:</strong> Eine Bestätigungs-E-Mail wurde an <strong>{formData.customer_email}</strong> gesendet.
            </p>
          </div>

          <button
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setBookingCode('');
              setFormData({
                party_size: 2,
                reservation_date: '',
                reservation_time: '15:45',
                room_id: rooms[0]?.id || '',
                customer_name: '',
                customer_email: '',
                customer_phone: '',
                special_requests: '',
                payment_amount: 35000,
              });
              if (cardElement) {
                cardElement.clear();
              }
            }}
            className="w-full sm:w-auto bg-slate-800 active:bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg touch-manipulation"
          >
            Neue Reservierung
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8 px-safe bg-white rounded-3xl shadow-2xl ios-scroll">
      {stripeEnabled && stripeMode === 'test' && (
        <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">Test-Modus aktiv</h4>
              <p className="text-xs text-amber-800 mt-1">
                Es werden keine echten Zahlungen verarbeitet. Testkarte: 4242 4242 4242 4242
              </p>
            </div>
          </div>
        </div>
      )}

      {stripeEnabled && stripeMode === 'live' && (
        <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Check className="w-5 h-5 text-green-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900">Live-Modus aktiv</h4>
              <p className="text-xs text-green-800 mt-1">
                Echte Zahlungen werden verarbeitet. Ihre Zahlung ist sicher.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Tisch Reservierung</h2>
        <p className="text-lg text-slate-600">Reservieren Sie Ihren Tisch für 15:45 Uhr</p>

        <div className="flex items-center justify-between mt-8">
          {(stripeEnabled ? [1, 2, 3] : [1, 2]).map((s, index, arr) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all ${
                  step >= s
                    ? 'bg-emerald-500 text-white shadow-lg scale-110'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {s}
              </div>
              {index < arr.length - 1 && (
                <div
                  className={`h-2 flex-1 mx-2 rounded-full transition-all ${
                    step > s ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium">
          {error}
        </div>
      )}

      {availabilityChecked && step === 1 && !error && (
        <div className="mb-6 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Tisch verfügbar! Sie können mit Ihrer Buchung fortfahren.</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Datum und Anzahl der Gäste</h3>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <Calendar className="w-5 h-5 inline mr-2" />
              Datum wählen
            </label>
            <input
              type="date"
              value={formData.reservation_date}
              onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
              min={(() => {
                const now = new Date();
                const currentHour = now.getHours();
                // If it's 12:00 or later, only allow tomorrow onwards
                if (currentHour >= 12) {
                  now.setDate(now.getDate() + 1);
                }
                return formatDateLocal(now);
              })()}
              max={(() => {
                const maxDate = new Date();
                maxDate.setDate(maxDate.getDate() + 14);
                return formatDateLocal(maxDate);
              })()}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            />
            <p className="text-sm text-slate-500 mt-2">
              {new Date().getHours() >= 12
                ? 'Reservierungen für heute sind nur bis 12:00 Uhr möglich. Sie können ab morgen buchen.'
                : 'Online-Reservierungen sind bis zu 2 Wochen im Voraus möglich'}
            </p>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5">
            <label className="block text-base font-semibold text-slate-700 mb-2">
              Uhrzeit (fest)
            </label>
            <div className="text-3xl font-bold text-emerald-600">15:45 Uhr</div>
            <p className="text-sm text-slate-500 mt-1">Alle Reservierungen sind für 15:45 Uhr</p>
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <Users className="w-5 h-5 inline mr-2" />
              Anzahl der Personen (max. 15 für Online-Buchungen)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={formData.party_size}
              onChange={(e) => {
                const value = e.target.value;
                setFormData({ ...formData, party_size: value === '' ? '' as any : (parseInt(value) || '') as any });
              }}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            />
            <p className="text-sm text-slate-500 mt-2">
              Für Gruppen über 15 Personen kontaktieren Sie uns bitte direkt.
            </p>
          </div>

          {rooms.length > 1 && (
            <div>
              <label className="block text-base font-semibold text-slate-700 mb-3">
                Bereich
              </label>
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Ihre Kontaktdaten</h3>

          {!stripeEnabled && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
              <p className="text-sm text-blue-900">
                <strong>Info:</strong> Keine Anzahlung erforderlich. Ihre Reservierung wird nach dem Absenden direkt bestätigt.
              </p>
            </div>
          )}

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <Users className="w-5 h-5 inline mr-2" />
              Name *
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              placeholder="Max Mustermann"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <Mail className="w-5 h-5 inline mr-2" />
              E-Mail *
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              placeholder="max@beispiel.de"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <Phone className="w-5 h-5 inline mr-2" />
              Telefon (optional)
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              placeholder="+43 123 456789"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-3">
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Besondere Wünsche (optional)
            </label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-base sm:text-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
              placeholder="z.B. Allergien, besondere Anlässe..."
            />
          </div>
        </div>
      )}

      {step === 3 && stripeEnabled && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-900 mb-6">Zahlung & Bestätigung</h3>

          {stripeError && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 mb-4">
              <p className="text-sm text-red-900 mb-2">
                <strong>Fehler:</strong> {stripeError}
              </p>
              <p className="text-xs text-red-800">
                Bitte laden Sie die Seite neu und versuchen Sie es erneut. Wenn das Problem weiterhin besteht, kontaktieren Sie uns direkt.
              </p>
            </div>
          )}

          {!stripe && !stripeError && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-4">
              <p className="text-sm text-amber-900">
                <strong>Hinweis:</strong> Stripe wird geladen... Wenn dieser Hinweis nicht verschwindet, laden Sie bitte die Seite neu.
              </p>
            </div>
          )}

          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 space-y-4 border-2 border-slate-200">
            <h4 className="font-bold text-lg text-slate-900">Reservierungsübersicht</h4>
            <div className="space-y-3 text-base">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Datum:</span>
                <span className="font-semibold text-slate-900">
                  {formData.reservation_date ? new Date(formData.reservation_date).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Uhrzeit:</span>
                <span className="font-semibold text-slate-900">15:45 Uhr</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Personen:</span>
                <span className="font-semibold text-slate-900">{formData.party_size}</span>
              </div>
              <div className="border-t-2 border-slate-300 pt-3 mt-3 flex justify-between items-center">
                <span className="font-bold text-lg text-slate-700">Anzahlung:</span>
                <span className="font-bold text-2xl text-emerald-600">
                  €{(formData.payment_amount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
            <p className="text-sm text-amber-900">
              <strong>Wichtig:</strong> Eine Anzahlung von €{(formData.payment_amount / 100).toFixed(2)} ist erforderlich, um Ihre Reservierung zu bestätigen.
            </p>
          </div>

          {stripe && (
            <div className="space-y-4">
              <label className="block text-base font-semibold text-slate-700 mb-3">
                <CreditCard className="w-5 h-5 inline mr-2" />
                Zahlungsmethode
              </label>

              {paymentRequest && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError('');
                      const secret = await createPaymentIntent();
                      setClientSecret(secret);

                      paymentRequest.update({
                        total: {
                          label: 'Reservierungs-Anzahlung',
                          amount: formData.payment_amount,
                        },
                      });

                      paymentRequest.on('paymentmethod', async (ev: any) => {
                        try {
                          const result = await stripe!.confirmCardPayment(secret, {
                            payment_method: ev.paymentMethod.id,
                          });

                          if (result.error) {
                            ev.complete('fail');
                            setError(result.error.message || 'Zahlung fehlgeschlagen');
                            setLoading(false);
                          } else {
                            ev.complete('success');
                            const reservationData = {
                              customer_name: formData.customer_name,
                              customer_email: formData.customer_email,
                              customer_phone: formData.customer_phone || '',
                              party_size: formData.party_size,
                              reservation_date: formData.reservation_date,
                              reservation_time: formData.reservation_time,
                              duration_minutes: 120,
                              status: 'confirmed',
                              special_requests: formData.special_requests || '',
                              payment_status: 'paid',
                              payment_amount: formData.payment_amount / 100,
                              payment_method: 'stripe',
                              stripe_payment_intent_id: result.paymentIntent!.id,
                              booking_method: 'online',
                              room_id: formData.room_id,
                              selected_tables: selectedTables,
                            };

                            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reservation`;
                            const response = await fetch(apiUrl, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(reservationData),
                            });

                            const responseData = await response.json();
                            if (response.ok) {
                              setBookingCode(responseData.booking_code);
                              setSuccess(true);
                            } else {
                              setError('Fehler beim Erstellen der Reservierung');
                            }
                            setLoading(false);
                          }
                        } catch (err: any) {
                          ev.complete('fail');
                          setError(err.message || 'Ein Fehler ist aufgetreten');
                          setLoading(false);
                        }
                      });

                      paymentRequest.show();
                    } catch (err: any) {
                      setError(err.message || 'Fehler beim Initialisieren der Zahlung');
                      setLoading(false);
                    }
                  }}
                  className="w-full px-6 py-4 bg-slate-900 active:bg-slate-800 text-white rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg touch-manipulation"
                  disabled={loading}
                >
                  <CreditCard className="w-6 h-6" />
                  Apple Pay / Google Pay
                </button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-slate-500">oder mit Karte bezahlen</span>
                  </div>
                </div>
              </div>
            )}

              <div
                id="card-element"
                className="w-full px-5 py-4 border-2 border-slate-300 rounded-xl bg-white"
              />

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mt-4">
                <p className="text-xs text-blue-800">
                  Ihre Zahlung wird sicher über Stripe verarbeitet. Ihre Kartendaten werden verschlüsselt übertragen und niemals auf unserem Server gespeichert.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold text-lg"
          >
            Zurück
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={handleNextStep}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-emerald-500 active:bg-emerald-600 text-white rounded-xl transition-all font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading && step === 1
              ? 'Verfügbarkeit prüfen...'
              : loading && step === 2 && !stripeEnabled
              ? 'Reservierung wird erstellt...'
              : step === 2 && !stripeEnabled
              ? 'Reservierung abschließen'
              : 'Weiter'}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-emerald-500 active:bg-emerald-600 text-white rounded-xl transition-all font-semibold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? 'Wird verarbeitet...' : 'Jetzt bezahlen & buchen'}
          </button>
        )}
      </div>
    </div>
  );
}
