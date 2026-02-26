import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  ScrollText, RefreshCw, Trash2, Search, ChevronDown, ChevronUp,
  Calendar, Filter, CheckSquare, Square, AlertCircle, Clock,
  User, Users, CreditCard, Gift, TrendingDown, Monitor, Table2,
  X, Code
} from 'lucide-react';

interface ActivityLog {
  id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_CATEGORIES: Record<string, { label: string; color: string; bg: string; icon: typeof Monitor }> = {
  reservation_created: { label: 'Erstellt',      color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: Users },
  reservation_updated: { label: 'Aktualisiert',  color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20',       icon: Users },
  reservation_deleted: { label: 'Gelöscht',      color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20',         icon: Users },
  table_assigned:      { label: 'Tisch',         color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20',     icon: Table2 },
  booking_abandoned:   { label: 'Abgebrochen',   color: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-900/20',   icon: TrendingDown },
  crew_login:          { label: 'Crew Login',    color: 'text-slate-700 dark:text-slate-400',     bg: 'bg-slate-100 dark:bg-slate-700/40',    icon: User },
  gift_card_created:   { label: 'Gutschein',     color: 'text-teal-700 dark:text-teal-400',       bg: 'bg-teal-50 dark:bg-teal-900/20',       icon: Gift },
  gift_card_redeemed:  { label: 'Eingelöst',     color: 'text-cyan-700 dark:text-cyan-400',       bg: 'bg-cyan-50 dark:bg-cyan-900/20',       icon: Gift },
  gift_card_paid:      { label: 'GC Zahlung',    color: 'text-green-700 dark:text-green-400',     bg: 'bg-green-50 dark:bg-green-900/20',     icon: CreditCard },
  gift_card_updated:   { label: 'GC Update',     color: 'text-teal-600 dark:text-teal-400',       bg: 'bg-teal-50 dark:bg-teal-900/20',       icon: Gift },
};

const FILTER_GROUPS = [
  { value: 'all',          label: 'Alle Ereignisse' },
  { value: 'reservations', label: 'Reservierungen',  types: ['reservation_created','reservation_updated','reservation_deleted'] },
  { value: 'tables',       label: 'Tischzuweisungen', types: ['table_assigned'] },
  { value: 'crew',         label: 'Crew',             types: ['crew_login'] },
  { value: 'gift_cards',   label: 'Gutscheine',       types: ['gift_card_created','gift_card_redeemed','gift_card_paid','gift_card_updated'] },
  { value: 'abandoned',    label: 'Abgebrochen',      types: ['booking_abandoned'] },
];

const ACTOR_COLORS: Record<string, string> = {
  admin:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  crew:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  system: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('de-AT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function SystemLogs() {
  const defaults = getDefaultDateRange();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async (silent = false, reset = true) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const currentPage = reset ? 0 : page;

    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

      const group = FILTER_GROUPS.find(g => g.value === eventFilter);
      if (group && group.types) {
        query = query.in('event_type', group.types);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (reset) {
        setLogs(data || []);
        setPage(0);
      } else {
        setLogs(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data?.length ?? 0) === PAGE_SIZE + 1);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, eventFilter, page]);

  useEffect(() => {
    fetchLogs(false, true);
  }, [dateFrom, dateTo, eventFilter]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchLogs(true, true), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.description.toLowerCase().includes(q) ||
      (log.actor_name ?? '').toLowerCase().includes(q) ||
      (log.event_type ?? '').toLowerCase().includes(q) ||
      (log.entity_id ?? '').toLowerCase().includes(q)
    );
  });

  const allVisibleIds = new Set(filteredLogs.map(l => l.id));
  const allSelected = allVisibleIds.size > 0 && [...allVisibleIds].every(id => selected.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allVisibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        allVisibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size} Einträge löschen?`)) return;
    setDeleting(true);
    try {
      const ids = [...selected];
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .in('id', ids);
      if (error) throw error;
      setSelected(new Set());
      fetchLogs(false, true);
    } catch (err: any) {
      alert('Fehler beim Löschen: ' + (err.message || 'Unbekannter Fehler'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteOne = async (id: string) => {
    if (!confirm('Diesen Eintrag löschen?')) return;
    try {
      const { error } = await supabase.from('activity_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(prev => prev.filter(l => l.id !== id));
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      alert('Fehler: ' + (err.message || 'Unbekannter Fehler'));
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(false, false);
  };

  const eventInfo = (type: string) =>
    EVENT_CATEGORIES[type] ?? { label: type, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-700/40', icon: Monitor };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Systemprotokoll</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Vollständige Aktivitätshistorie</p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(false, true)}
          disabled={refreshing || loading}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Aktualisieren</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Date from */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Von</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Date to */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Bis</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Event type filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={eventFilter}
              onChange={e => setEventFilter(e.target.value)}
              className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FILTER_GROUPS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Suche nach Beschreibung, Name, Ereignis…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
            {selected.size} {selected.size === 1 ? 'Eintrag' : 'Einträge'} ausgewählt
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Auswahl aufheben
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? 'Löschen…' : 'Löschen'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_160px_140px_100px_80px] gap-0 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <div className="flex items-center">
            <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
          <div>Beschreibung</div>
          <div>Zeitpunkt</div>
          <div>Ereignis</div>
          <div>Akteur</div>
          <div className="text-right">Aktionen</div>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Lade Protokoll…</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Keine Einträge gefunden</p>
            <p className="text-xs text-slate-400">Ändern Sie den Datumsbereich oder die Filter</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredLogs.map(log => {
              const info = eventInfo(log.event_type);
              const EventIcon = info.icon;
              const isSelected = selected.has(log.id);
              const isExpanded = expanded.has(log.id);

              return (
                <div key={log.id} className={`transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/30'}`}>
                  <div className="grid grid-cols-[40px_1fr_160px_140px_100px_80px] gap-0 px-4 py-3 items-center">
                    {/* Checkbox */}
                    <div>
                      <button onClick={() => toggleSelect(log.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Description */}
                    <div className="pr-4 min-w-0">
                      <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{log.description}</p>
                      {log.entity_id && (
                        <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{log.entity_id}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(log.created_at)}</span>
                    </div>

                    {/* Event badge */}
                    <div>
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${info.bg} ${info.color}`}>
                        <EventIcon className="w-3 h-3" />
                        <span>{info.label}</span>
                      </span>
                    </div>

                    {/* Actor */}
                    <div>
                      <div className="space-y-0.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${ACTOR_COLORS[log.actor_type] ?? ACTOR_COLORS.system}`}>
                          {log.actor_type}
                        </span>
                        {log.actor_name && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{log.actor_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-1">
                      {log.metadata && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          title="Details anzeigen"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOne(log.id)}
                        title="Löschen"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded metadata */}
                  {isExpanded && log.metadata && (
                    <div className="px-4 pb-3">
                      <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Load more / summary footer */}
        {!loading && filteredLogs.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredLogs.length} {filteredLogs.length === 1 ? 'Eintrag' : 'Einträge'} angezeigt
            </p>
            {hasMore && (
              <button
                onClick={loadMore}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline"
              >
                Mehr laden
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
