import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing,
  ShieldAlert,
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Megaphone, 
  BookOpen, 
  MessageSquare, 
  AtSign, 
  Award, 
  Sparkles, 
  X,
  Filter,
  Check
} from 'lucide-react';
import { AppNotification, UserProfile } from '../types';
import { 
  getAppNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  triggerNotificationSound,
  isUserEligibleForNotification,
  requestWebPushPermission
} from '../lib/notifications';
import { soundService } from '../lib/soundService';
import { supabase } from '../lib/supabase';

interface NotificationCenterProps {
  currentUser: UserProfile | null;
  onNavigateTab?: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  onNavigateTab,
  isOpen,
  onClose,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'broadcast' | 'mention' | 'academic'>('all');
  const [isMuted, setIsMuted] = useState<boolean>(soundService.getMuted());
  const [permissionState, setPermissionState] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const handleEnablePushPermissions = async () => {
    await requestWebPushPermission(currentUser?.uid);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }
  };

  // Load notifications from Supabase with per-user state
  const loadNotifications = async () => {
    if (!currentUser) return;
    const data = await getAppNotifications(currentUser.uid, currentUser.grade, currentUser.section, currentUser.role);
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime broadcast notifications
    const channel = supabase.channel('student-os-public');
    channel.on('broadcast', { event: 'new_app_notification' }, (payload) => {
      if (payload && payload.payload) {
        const notif = payload.payload as AppNotification;
        if (isUserEligibleForNotification(notif, currentUser || {})) {
          setNotifications((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
          triggerNotificationSound(notif.type);
        }
      }
    });

    // Listen to local per-user state changes across tabs
    const handleStateChange = () => {
      loadNotifications();
    };
    window.addEventListener('studentos-notif-state-change', handleStateChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('studentos-notif-state-change', handleStateChange);
    };
  }, [currentUser?.uid, currentUser?.grade, currentUser?.section, currentUser?.role]);

  const toggleSound = () => {
    const muted = soundService.toggleMute();
    setIsMuted(muted);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markNotificationAsRead(id, currentUser?.uid);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(notifications, currentUser?.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id, currentUser?.uid);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markNotificationAsRead(notif.id, currentUser?.uid);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.linkTab && onNavigateTab) {
      onNavigateTab(notif.linkTab);
      onClose();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'broadcast') return n.type === 'announcement' || n.type === 'substitute';
    if (filter === 'mention') return n.type === 'mention' || n.type === 'chat';
    if (filter === 'academic') return ['homework', 'assignment', 'exam', 'marks', 'resource'].includes(n.type);
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-400" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-purple-400" />;
      case 'homework':
      case 'assignment':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'exam':
      case 'marks':
        return <Award className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-sky-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop Click */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-md bg-slate-900 border-l border-white/10 h-full flex flex-col shadow-2xl z-10 animate-slideLeft">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-extrabold bg-indigo-600 text-white rounded-full animate-pulse">
                    {unreadCount} new
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Realtime activity & updates</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute notification sounds' : 'Mute notification sounds'}
              className={`p-2 rounded-xl border transition-all ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Push Notification Permission Prompt Banner */}
        {permissionState === 'default' && (
          <div className="p-3.5 bg-indigo-950/80 border-b border-indigo-500/30 flex flex-col gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 mt-0.5">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <p className="font-bold text-white text-xs">Enable Push Notifications</p>
                <p className="text-slate-300 mt-0.5 leading-snug">
                  Allow notifications to receive school announcements, meetings, homework, calls and other important StudentOS updates.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePushPermissions}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40"
            >
              <Bell className="w-3.5 h-3.5" />
              Enable Notifications
            </button>
          </div>
        )}

        {permissionState === 'denied' && (
          <div className="p-3 bg-amber-950/40 border-b border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Browser push notifications are blocked in your browser settings.</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="p-3 border-b border-white/10 bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'broadcast', label: 'Announcements' },
            { id: 'mention', label: 'Mentions & Chat' },
            { id: 'academic', label: 'Academic' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                filter === item.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 p-8 text-center">
              <div className="p-4 rounded-full bg-slate-800/50 border border-white/5">
                <Bell className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">No notifications found</p>
              <p className="text-xs text-slate-600">You are all caught up with school updates!</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !notif.isRead
                    ? 'bg-slate-800/90 border-indigo-500/40 shadow-lg shadow-indigo-950/20'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/20 hover:bg-slate-800/50'
                }`}
              >
                {!notif.isRead && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}

                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-xl bg-slate-950 border border-white/10 shrink-0">
                    {getTypeIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors truncate">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                      <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span className="capitalize">{notif.type}</span>
                    </div>
                  </div>
                </div>

                {/* Actions on Hover */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {!notif.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-white/10"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(notif.id, e)}
                    title="Dismiss/Delete notification"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-slate-950 text-center text-[11px] text-slate-500">
          StudentOS Realtime Notification Engine
        </div>
      </div>
    </div>
  );
};
