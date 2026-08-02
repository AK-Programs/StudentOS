import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Filter, AlertCircle, Calendar, BookOpen, Award, MessageSquare, Sparkles, X, ChevronRight } from 'lucide-react';
import { AppNotification } from '../types';
import { getAppNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/notifications';

interface NotificationCenterProps {
  userId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  onNavigateTab
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'announcement' | 'assignment'>('all');

  // Load notifications from Supabase
  const loadNotifs = async () => {
    const list = await getAppNotifications(userId);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(userId);
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'announcement') return n.type === 'announcement';
    if (filter === 'assignment') return n.type === 'assignment' || n.type === 'homework';
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'assignment':
      case 'homework': return <BookOpen className="w-4 h-4 text-indigo-400" />;
      case 'exam':
      case 'marks': return <Award className="w-4 h-4 text-amber-400" />;
      case 'chat': return <MessageSquare className="w-4 h-4 text-teal-400" />;
      default: return <Sparkles className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="relative">
      
      {/* Trigger Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 transition-all active:scale-95"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse border border-slate-950">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-4 z-50 animate-fadeIn space-y-3 font-sans">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <h3 className="font-extrabold text-sm text-white">StudentOS Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Read all
              </button>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 text-[10px] font-bold">
            {(['all', 'unread', 'announcement', 'assignment'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-1 rounded-lg capitalize transition-all ${filter === f ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {filteredNotifs.map(n => (
              <div
                key={n.id}
                onClick={() => {
                  handleMarkRead(n.id);
                  if (n.linkTab && onNavigateTab) {
                    onNavigateTab(n.linkTab);
                    setIsOpen(false);
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 ${!n.isRead ? 'bg-indigo-600/10 border-indigo-500/30 text-white' : 'bg-slate-950/40 border-white/5 text-slate-350 hover:bg-slate-950'}`}
              >
                <div className="p-2 bg-slate-900 rounded-xl border border-white/10 shrink-0 h-fit">
                  {getNotifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold truncate">{n.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                  {n.targetClass && (
                    <span className="inline-block text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      Target: {n.targetClass}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredNotifs.length === 0 && (
              <div className="text-center py-8 bg-slate-950/40 border border-white/5 rounded-2xl">
                <p className="text-xs text-slate-500">No notifications found.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
