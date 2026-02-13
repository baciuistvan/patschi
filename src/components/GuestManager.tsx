import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, ChevronDown, ChevronUp, Users, Mail, Phone, Calendar, DollarSign, TrendingUp, Eye, Plus } from 'lucide-react';

interface Guest {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  reservation_count: number;
  total_spent: string;
  last_visit_date: string;
  first_visit_date: string;
}

interface Reservation {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  payment_amount: string;
  payment_status: string;
  special_requests: string;
  booking_code: string;
}

type FilterType = 'all' | 'new' | 'returning' | 'vip';
type SortField = 'name' | 'visits' | 'spent' | 'last_visit';
type SortOrder = 'asc' | 'desc';

export function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('last_visit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedGuest, setExpandedGuest] = useState<string | null>(null);
  const [guestReservations, setGuestReservations] = useState<Record<string, Reservation[]>>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_guest_statistics');

      if (error) {
        const { data: reservations, error: reservationError } = await supabase
          .from('reservations')
          .select('customer_name, customer_email, customer_phone, payment_amount, reservation_date')
          .not('customer_email', 'is', null)
          .neq('customer_email', '');

        if (reservationError) throw reservationError;

        const guestMap = new Map<string, Guest>();

        reservations?.forEach((res) => {
          const key = res.customer_email;
          if (guestMap.has(key)) {
            const guest = guestMap.get(key)!;
            guest.reservation_count += 1;
            guest.total_spent = (parseFloat(guest.total_spent) + parseFloat(res.payment_amount || '0')).toFixed(2);
            if (res.reservation_date > guest.last_visit_date) {
              guest.last_visit_date = res.reservation_date;
            }
            if (res.reservation_date < guest.first_visit_date) {
              guest.first_visit_date = res.reservation_date;
            }
          } else {
            guestMap.set(key, {
              customer_name: res.customer_name,
              customer_email: res.customer_email,
              customer_phone: res.customer_phone || '',
              reservation_count: 1,
              total_spent: (parseFloat(res.payment_amount || '0')).toFixed(2),
              last_visit_date: res.reservation_date,
              first_visit_date: res.reservation_date
            });
          }
        });

        setGuests(Array.from(guestMap.values()));
      } else {
        setGuests(data || []);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestReservations = async (email: string) => {
    if (guestReservations[email]) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, party_size, status, payment_amount, payment_status, special_requests, booking_code')
        .eq('customer_email', email)
        .order('reservation_date', { ascending: false });

      if (error) throw error;

      setGuestReservations(prev => ({
        ...prev,
        [email]: data || []
      }));
    } catch (error) {
      console.error('Error fetching guest reservations:', error);
    }
  };

  const toggleGuestDetails = (email: string) => {
    if (expandedGuest === email) {
      setExpandedGuest(null);
    } else {
      setExpandedGuest(email);
      fetchGuestReservations(email);
    }
  };

  const filteredAndSortedGuests = useMemo(() => {
    let filtered = guests.filter(guest => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        guest.customer_name.toLowerCase().includes(searchLower) ||
        guest.customer_email.toLowerCase().includes(searchLower) ||
        guest.customer_phone.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      switch (filterType) {
        case 'new':
          return guest.reservation_count === 1;
        case 'returning':
          return guest.reservation_count >= 2 && guest.reservation_count < 5;
        case 'vip':
          return guest.reservation_count >= 5 || parseFloat(guest.total_spent) >= 1000;
        default:
          return true;
      }
    });

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.customer_name.localeCompare(b.customer_name);
          break;
        case 'visits':
          comparison = a.reservation_count - b.reservation_count;
          break;
        case 'spent':
          comparison = parseFloat(a.total_spent) - parseFloat(b.total_spent);
          break;
        case 'last_visit':
          comparison = new Date(a.last_visit_date).getTime() - new Date(b.last_visit_date).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [guests, searchTerm, filterType, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Total Visits', 'Total Spent', 'First Visit', 'Last Visit'];
    const csvContent = [
      headers.join(','),
      ...filteredAndSortedGuests.map(guest => [
        `"${guest.customer_name}"`,
        `"${guest.customer_email}"`,
        `"${guest.customer_phone}"`,
        guest.reservation_count,
        guest.total_spent,
        guest.first_visit_date,
        guest.last_visit_date
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getGuestBadge = (guest: Guest) => {
    const visits = guest.reservation_count;
    const spent = parseFloat(guest.total_spent);

    if (visits >= 5 || spent >= 1000) {
      return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-full">VIP</span>;
    } else if (visits >= 2) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">Returning</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">New</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-AT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading guests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Guest Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {filteredAndSortedGuests.length} {filteredAndSortedGuests.length === 1 ? 'guest' : 'guests'} found
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredAndSortedGuests.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-300"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              All Guests
            </button>
            <button
              onClick={() => setFilterType('new')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterType === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              New (1 visit)
            </button>
            <button
              onClick={() => setFilterType('returning')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterType === 'returning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Returning (2-4 visits)
            </button>
            <button
              onClick={() => setFilterType('vip')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filterType === 'vip'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              VIP (5+ visits or €1000+)
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Guest</span>
                    {sortField === 'name' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('visits')}
                    className="flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Visits</span>
                    {sortField === 'visits' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('spent')}
                    className="flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Total Spent</span>
                    {sortField === 'spent' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('last_visit')}
                    className="flex items-center space-x-1 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <span>Last Visit</span>
                    {sortField === 'last_visit' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredAndSortedGuests.map((guest) => (
                <>
                  <tr
                    key={guest.customer_email}
                    className="hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
                    onClick={() => toggleGuestDetails(guest.customer_email)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-200 font-semibold text-sm">
                            {guest.customer_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {guest.customer_name}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {getGuestBadge(guest)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{guest.customer_email}</span>
                        </div>
                        {guest.customer_phone && (
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            <Phone className="w-4 h-4" />
                            <span>{guest.customer_phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {guest.reservation_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          €{parseFloat(guest.total_spent).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(guest.last_visit_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGuestDetails(guest.customer_email);
                        }}
                        className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                  {expandedGuest === guest.customer_email && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-slate-100 dark:bg-slate-900">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              Reservation History
                            </h3>
                            <div className="text-sm text-slate-600 dark:text-slate-300">
                              Member since {formatDate(guest.first_visit_date)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                              <div className="text-sm text-slate-600 dark:text-slate-300">Total Visits</div>
                              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {guest.reservation_count}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                              <div className="text-sm text-slate-600 dark:text-slate-300">Total Spent</div>
                              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                €{parseFloat(guest.total_spent).toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                              <div className="text-sm text-slate-600 dark:text-slate-300">Avg. Spend</div>
                              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                €{(parseFloat(guest.total_spent) / guest.reservation_count).toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                              <div className="text-sm text-slate-600 dark:text-slate-300">Last Visit</div>
                              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                                {formatDate(guest.last_visit_date)}
                              </div>
                            </div>
                          </div>

                          {guestReservations[guest.customer_email] ? (
                            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden shadow-sm">
                              <table className="w-full">
                                <thead className="bg-slate-100 dark:bg-slate-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Party Size</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase">Booking Code</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                  {guestReservations[guest.customer_email].map((reservation) => (
                                    <tr key={reservation.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                                        {formatDate(reservation.reservation_date)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                                        {reservation.reservation_time}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                                        <div className="flex items-center space-x-1">
                                          <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                          <span>{reservation.party_size}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(reservation.status)}`}>
                                          {reservation.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                                        €{parseFloat(reservation.payment_amount || '0').toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">
                                        {reservation.booking_code || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedGuests.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No guests found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Guest data will appear here once reservations are made'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
