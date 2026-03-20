import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Calendar, CreditCard, Gift, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type NotificationType = 'payment_paid' | 'online_reservation' | 'gift_card_purchased';
type NavView = 'home' | 'reservations' | 'guests' | 'settings' | 'gift-cards';

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id: string | null;
  created_at: string;
  is_read?: boolean;
}

interface NotificationRead {
  notification_id: string;
}

const TYPE_CONFIG: Record<NotificationType, { icon: React.ElementType; color: string; bg: string; view: NavView }> = {
  payment_paid: {
    icon: CreditCard,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    view: 'reservations',
  },
  online_reservation: {
    icon: Calendar,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    view: 'reservations',
  },
  gift_card_purchased: {
    icon: Gift,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    view: 'gift-cards',
  },
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `Vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `Vor ${days} Tag${days !== 1 ? 'en' : ''}`;
}

async function insertRead(notificationId: string, adminUserId: string) {
  await supabase.from('notification_reads').insert({
    notification_id: notificationId,
    admin_user_id: adminUserId,
  });
}

export interface NotificationBellProps {
  collapsed?: boolean;
  onNavigate?: (view: NavView, relatedId?: string | null) => void;
}

function useNotifications(userId: string | undefined, channelName: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!userId) return;
    const [notifRes, readsRes] = await Promise.all([
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('notification_reads').select('notification_id').eq('admin_user_id', userId),
    ]);
    if (notifRes.data) {
      setNotifications(notifRes.data as AppNotification[]);
    }
    if (readsRes.data) {
      setReadIds(new Set((readsRes.data as NotificationRead[]).map(r => r.notification_id)));
    }
  }, [userId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
        const incoming = payload.new as AppNotification;
        setNotifications(prev => {
          if (prev.some(n => n.id === incoming.id)) return prev;
          return [incoming, ...prev].slice(0, 50);
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, payload => {
        setNotifications(prev => prev.filter(n => n.id !== (payload.old as AppNotification).id));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_reads' }, payload => {
        const r = payload.new as NotificationRead;
        setReadIds(prev => new Set([...prev, r.notification_id]));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, channelName]);

  const markOneRead = useCallback(async (notifId: string, adminUserId: string) => {
    if (readIds.has(notifId)) return;
    setReadIds(prev => new Set([...prev, notifId]));
    await insertRead(notifId, adminUserId);
  }, [readIds]);

  const markAllRead = useCallback(async (adminUserId: string, allNotifications: AppNotification[]) => {
    const unread = allNotifications.filter(n => !readIds.has(n.id));
    if (unread.length === 0) return;
    setReadIds(prev => new Set([...prev, ...unread.map(n => n.id)]));
    for (const n of unread) {
      await insertRead(n.id, adminUserId);
    }
  }, [readIds]);

  return { notifications, readIds, markOneRead, markAllRead };
}

export function NotificationBell({ collapsed = false, onNavigate }: NotificationBellProps) {
  const { user } = useAuth();
  const { notifications, readIds, markOneRead, markAllRead } = useNotifications(user?.id, 'notifications-realtime-v3');
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = () => {
    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const panelWidth = 340;
      const left = rect.right + 8;
      const top = Math.min(rect.top, window.innerHeight - 440);
      setPanelPos({ top, left: Math.min(left, window.innerWidth - panelWidth - 8) });
    }
    setOpen(o => !o);
  };

  const handleMarkOne = (notif: AppNotification) => {
    if (!user) return;
    const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.online_reservation;
    markOneRead(notif.id, user.id);
    if (onNavigate) onNavigate(cfg.view, notif.related_id);
    setOpen(false);
  };

  const handleMarkAll = () => {
    if (!user) return;
    markAllRead(user.id, notifications);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all duration-150 group ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? `Benachrichtigungen${unreadCount > 0 ? ` (${unreadCount})` : ''}` : undefined}
        aria-label="Benachrichtigungen"
      >
        <div className="relative flex-shrink-0">
          <Bell style={{ width: 17, height: 17 }} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-medium flex-1 text-left">Benachrichtigungen</span>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed z-[9999] w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden"
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Benachrichtigungen</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
                  {unreadCount} neu
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMarkAll}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Alle als gelesen markieren"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Alle lesen</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.online_reservation;
                  const Icon = cfg.icon;
                  const isRead = readIds.has(notif.id);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleMarkOne(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-100 ${
                        !isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          {!isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileNotificationBell({ onNavigate }: { onNavigate?: (view: NavView, relatedId?: string | null) => void }) {
  const { user } = useAuth();
  const { notifications, readIds, markOneRead, markAllRead } = useNotifications(user?.id, 'mobile-notifications-realtime-v3');
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ bottom: 0, left: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleToggle = () => {
    if (!open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const navBarHeight = window.innerHeight - rect.top;
      setPanelPos({ bottom: navBarHeight + 8, left: Math.max(8, Math.min(rect.left - 140, window.innerWidth - 344)) });
    }
    setOpen(o => !o);
  };

  const handleMarkOne = (notif: AppNotification) => {
    if (!user) return;
    const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.online_reservation;
    markOneRead(notif.id, user.id);
    if (onNavigate) onNavigate(cfg.view, notif.related_id);
    setOpen(false);
  };

  const handleMarkAll = () => {
    if (!user) return;
    markAllRead(user.id, notifications);
  };

  return (
    <div ref={wrapperRef} className="flex-1 relative">
      <button
        onClick={handleToggle}
        className="flex flex-col items-center py-2 gap-0.5 text-slate-400 dark:text-slate-500 w-full transition"
        aria-label="Benachrichtigungen"
      >
        <div className="relative" style={{ width: 20, height: 20 }}>
          <Bell style={{ width: 20, height: 20 }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium">Nachrichten</span>
      </button>

      {open && (
        <div
          className="fixed z-[9999] w-[340px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/50 overflow-hidden"
          style={{ bottom: panelPos.bottom, left: panelPos.left }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-sm font-semibold text-slate-900 dark:text-white">Benachrichtigungen</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">
                  {unreadCount} neu
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMarkAll}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-default"
                title="Alle als gelesen markieren"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Alle lesen</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map(notif => {
                  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.online_reservation;
                  const Icon = cfg.icon;
                  const isRead = readIds.has(notif.id);
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleMarkOne(notif)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors duration-100 ${
                        !isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${isRead ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                            {notif.title}
                          </p>
                          {!isRead && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
