import { useState, useEffect } from 'react';
import { supabase, Room, Table } from '../lib/supabase';
import { Clock, Users, X, Plus, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Reservation {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: string;
  payment_status: string;
  special_requests?: string;
  reservation_tables?: Array<{ table_id: string }>;
}

interface TableStatus {
  table: Table;
  reservation?: Reservation;
  status: 'available' | 'reserved' | 'occupied' | 'cancelled' | 'not-reservable';
}

interface ReservationFloorPlanViewProps {
  selectedDate: string;
  selectedTime: string;
  onTableClick: (tableId: string, reservation?: Reservation) => void;
  onCreateReservation: (tableId: string) => void;
}

export function ReservationFloorPlanView({
  selectedDate,
  selectedTime,
  onTableClick,
  onCreateReservation,
}: ReservationFloorPlanViewProps) {
  const { t } = useLanguage();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved'>('all');
  const FIXED_TIME = '15:45';

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom && selectedDate) {
      loadTableStatuses();
    }
  }, [selectedRoom, selectedDate]);

  const loadRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setRooms(data);
      if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0].id);
      }
    }
  };

  const loadTableStatuses = async () => {
    if (!selectedRoom || !selectedDate) return;

    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('room_id', selectedRoom)
      .eq('is_active', true)
      .order('table_number');

    if (tablesError || !tables) return;

    const normalizedTime = FIXED_TIME;

    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*, reservation_tables(table_id)')
      .eq('reservation_date', selectedDate)
      .neq('status', 'cancelled');

    if (reservationsError) return;

    const tableStatusMap = new Map<string, TableStatus>();

    tables.forEach((table) => {
      const reservation = reservations?.find((res) =>
        res.reservation_tables?.some((rt: any) => rt.table_id === table.id)
      );

      let status: 'available' | 'reserved' | 'occupied' | 'cancelled' | 'not-reservable' = 'available';

      if (!table.is_bookable) {
        status = 'not-reservable';
      } else if (reservation) {
        if (reservation.status === 'confirmed') {
          status = 'reserved';
        } else if (reservation.status === 'completed') {
          status = 'occupied';
        } else if (reservation.status === 'cancelled') {
          status = 'cancelled';
        }
      }

      tableStatusMap.set(table.id, {
        table,
        reservation,
        status,
      });
    });

    setTableStatuses(Array.from(tableStatusMap.values()));
  };

  const getTableColor = (status: 'available' | 'reserved' | 'occupied' | 'cancelled' | 'not-reservable') => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600 border-green-400';
      case 'reserved':
        return 'bg-red-500 hover:bg-red-600 border-red-400';
      case 'occupied':
        return 'bg-red-500 hover:bg-red-600 border-red-400';
      case 'cancelled':
        return 'bg-gray-500 hover:bg-gray-600 border-gray-400';
      case 'not-reservable':
        return 'bg-gray-600 hover:bg-gray-700 border-gray-500 opacity-60';
      default:
        return 'bg-gray-500 hover:bg-gray-600 border-gray-400';
    }
  };

  const handleTableClick = (tableStatus: TableStatus) => {
    if (tableStatus.status === 'not-reservable') {
      return;
    }
    if (tableStatus.reservation) {
      onTableClick(tableStatus.table.id, tableStatus.reservation);
    } else {
      onCreateReservation(tableStatus.table.id);
    }
  };

  const filteredTableStatuses = tableStatuses.filter((ts) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'available') return ts.status === 'available';
    if (statusFilter === 'reserved') return ts.status === 'reserved' || ts.status === 'occupied';
    return true;
  });

  const getTableShape = (shape: string) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'square':
        return 'rounded-lg aspect-square';
      case 'halfcircle':
        return 'rounded-t-full';
      default:
        return 'rounded-lg';
    }
  };

  const stats = {
    total: tableStatuses.length,
    available: tableStatuses.filter((ts) => ts.status === 'available').length,
    reserved: tableStatuses.filter((ts) => ts.status === 'reserved').length,
    occupied: tableStatuses.filter((ts) => ts.status === 'occupied').length,
    notReservable: tableStatuses.filter((ts) => ts.status === 'not-reservable').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                selectedRoom === room.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Legende</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-white font-medium">{FIXED_TIME} Uhr</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                statusFilter === 'available'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Verfügbar ({stats.available})
            </button>
            <button
              onClick={() => setStatusFilter('reserved')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                statusFilter === 'reserved'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Reserviert ({stats.reserved + stats.occupied})
            </button>
          </div>
        </div>

        {showLegend && (
          <div className="mb-4 p-3 bg-slate-700 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded border-2 border-green-400"></div>
                <span className="text-slate-300">Verfügbar</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded border-2 border-red-400"></div>
                <span className="text-slate-300">Reserviert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-600 rounded border-2 border-gray-500 opacity-60"></div>
                <span className="text-slate-300">Nicht reservierbar</span>
              </div>
            </div>
          </div>
        )}

        <div className="relative bg-slate-700 rounded-lg p-6 min-h-[840px] overflow-auto">
          {filteredTableStatuses.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-400 text-center">
                Keine Tische in diesem Raum verfügbar
              </p>
            </div>
          ) : (
            <div className="relative w-full h-[840px]">
            {filteredTableStatuses.map((tableStatus) => {
              const table = tableStatus.table;
              const scaleFactor = 1.0;
              const isNotReservable = tableStatus.status === 'not-reservable';
              return (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(tableStatus)}
                  className={`absolute transition-all ${
                    isNotReservable ? 'cursor-not-allowed' : 'cursor-pointer transform hover:scale-105'
                  } ${getTableColor(
                    tableStatus.status
                  )} ${getTableShape(table.shape || 'rectangle')} border-2 shadow-lg`}
                  style={{
                    left: `${(table.position_x || 0) * scaleFactor}px`,
                    top: `${(table.position_y || 0) * scaleFactor}px`,
                    width: `${(table.width || 100) * scaleFactor}px`,
                    height: `${(table.height || 100) * scaleFactor}px`,
                    transform: `rotate(${table.rotation || 0}deg)`,
                  }}
                  title={
                    isNotReservable
                      ? `Tisch ${table.table_number} - Nicht reservierbar`
                      : tableStatus.reservation
                      ? `${tableStatus.reservation.customer_name} - ${tableStatus.reservation.party_size} Gäste`
                      : `Tisch ${table.table_number} - ${table.capacity} Plätze`
                  }
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs font-bold p-1">
                    <div className="text-sm">{table.custom_label || table.table_number}</div>
                    <div className="flex items-center gap-1 text-[10px] opacity-90">
                      <Users className="w-3 h-3" />
                      <span>{table.capacity}</span>
                    </div>
                    {tableStatus.reservation && (
                      <div className="text-[9px] mt-1 text-center leading-tight opacity-90 max-w-full truncate px-1">
                        {tableStatus.reservation.customer_name.split(' ')[0]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-slate-400">Tische Gesamt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.available}</div>
            <div className="text-sm text-slate-400">Verfügbar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats.reserved + stats.occupied}</div>
            <div className="text-sm text-slate-400">Reserviert</div>
          </div>
        </div>
      </div>
    </div>
  );
}
