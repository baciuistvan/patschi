import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface Room {
  id: string;
  name: string;
}

interface BookingHour {
  id: string;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  booking_interval: number;
  capacity_per_slot: number;
  is_active: boolean;
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const DAY_INDEX_MAP = [1, 2, 3, 4, 5, 6, 0];

export function BookingHours() {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingHours, setBookingHours] = useState<BookingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadBookingHours();
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (data && data.length > 0) {
      setRooms(data);
      setSelectedRoom(data[0].id);
    }
    setLoading(false);
  };

  const loadBookingHours = async () => {
    const { data } = await supabase
      .from('booking_hours')
      .select('*')
      .eq('room_id', selectedRoom)
      .order('day_of_week')
      .order('start_time');

    if (data) {
      setBookingHours(data);
    }
  };

  const addTimeSlot = (dayOfWeek: number) => {
    const newSlot: BookingHour = {
      id: `temp-${Date.now()}`,
      room_id: selectedRoom,
      day_of_week: dayOfWeek,
      start_time: '12:00:00',
      end_time: '16:30:00',
      booking_interval: 60,
      capacity_per_slot: 50,
      is_active: true,
    };
    setBookingHours([...bookingHours, newSlot]);
  };

  const updateTimeSlot = (id: string, field: keyof BookingHour, value: any) => {
    setBookingHours(bookingHours.map(slot =>
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const deleteTimeSlot = async (id: string) => {
    if (id.startsWith('temp-')) {
      setBookingHours(bookingHours.filter(slot => slot.id !== id));
    } else {
      const { error } = await supabase
        .from('booking_hours')
        .delete()
        .eq('id', id);

      if (!error) {
        setBookingHours(bookingHours.filter(slot => slot.id !== id));
      }
    }
  };

  const saveBookingHours = async () => {
    setSaving(true);

    try {
      for (const slot of bookingHours) {
        if (slot.id.startsWith('temp-')) {
          const { id, ...slotData } = slot;
          await supabase.from('booking_hours').insert(slotData);
        } else {
          const { id, ...slotData } = slot;
          await supabase.from('booking_hours').update(slotData).eq('id', id);
        }
      }

      await loadBookingHours();
    } catch (error) {
      console.error('Failed to save booking hours:', error);
    } finally {
      setSaving(false);
    }
  };

  const applyToAllDays = (sourceDay: number) => {
    const sourceSlots = bookingHours.filter(slot => slot.day_of_week === sourceDay);
    if (sourceSlots.length === 0) return;

    const newSlots: BookingHour[] = [];
    for (let day = 0; day <= 6; day++) {
      if (day === sourceDay) continue;

      const existingForDay = bookingHours.filter(slot => slot.day_of_week === day);
      existingForDay.forEach(slot => {
        if (!slot.id.startsWith('temp-')) {
          deleteTimeSlot(slot.id);
        }
      });

      sourceSlots.forEach(sourceSlot => {
        newSlots.push({
          ...sourceSlot,
          id: `temp-${Date.now()}-${day}-${Math.random()}`,
          day_of_week: day,
        });
      });
    }

    setBookingHours([
      ...bookingHours.filter(slot => slot.day_of_week === sourceDay),
      ...newSlots
    ]);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-400">Loading booking hours...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('booking_hours.title')}</h2>
        <p className="text-slate-400">
          Configure available booking times and capacities for each room.
          When table plan is enabled, capacity is calculated from table sizes.
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Select Room
          </label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="w-full max-w-xs px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-6">
          {DAYS.map((day, displayIndex) => {
            const dayIndex = DAY_INDEX_MAP[displayIndex];
            const daySlots = bookingHours.filter(slot => slot.day_of_week === dayIndex);

            return (
              <div key={dayIndex} className="bg-slate-900 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    {day}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => applyToAllDays(dayIndex)}
                      className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition"
                    >
                      Apply to All Days
                    </button>
                    <button
                      onClick={() => addTimeSlot(dayIndex)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Slot</span>
                    </button>
                  </div>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-slate-500 text-sm">No booking hours configured for this day</p>
                ) : (
                  <div className="space-y-3">
                    {daySlots.map(slot => (
                      <div key={slot.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-800 p-3 rounded-lg">
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={slot.start_time.substring(0, 5)}
                            onChange={(e) => updateTimeSlot(slot.id, 'start_time', e.target.value + ':00')}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">End Time</label>
                          <input
                            type="time"
                            value={slot.end_time.substring(0, 5)}
                            onChange={(e) => updateTimeSlot(slot.id, 'end_time', e.target.value + ':00')}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-400 mb-1">Booking Interval (min)</label>
                          <select
                            value={slot.booking_interval}
                            onChange={(e) => updateTimeSlot(slot.id, 'booking_interval', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="30">30 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                            <option value="120">120 minutes</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">Capacity</label>
                          <input
                            type="number"
                            min="1"
                            value={slot.capacity_per_slot}
                            onChange={(e) => updateTimeSlot(slot.id, 'capacity_per_slot', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-400 mb-1">Status</label>
                          <select
                            value={slot.is_active ? 'active' : 'inactive'}
                            onChange={(e) => updateTimeSlot(slot.id, 'is_active', e.target.value === 'active')}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>

                        <div className="md:col-span-1">
                          <button
                            onClick={() => deleteTimeSlot(slot.id)}
                            className="w-full p-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <button
            onClick={saveBookingHours}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">About Booking Hours</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong>Booking Interval:</strong> Determines available time slots (e.g., 60 min = hourly slots)</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong>Capacity:</strong> Maximum guests per slot (used when table plan is disabled)</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong>Table Plan Enabled:</strong> Capacity is calculated from available table sizes</span>
          </li>
          <li className="flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            <span><strong>Multiple Slots:</strong> Add multiple time slots per day for split shifts</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
