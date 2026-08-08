import { supabase } from './supabase';
import { AppNotification } from '../types';
import { soundService } from './soundService';

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Fetch notifications from Supabase
 */
export async function getAppNotifications(userId?: string, userClass?: string): Promise<AppNotification[]> {
  console.log('[SUPABASE-NOTIFS] Fetching notifications from Supabase...');
  const notifMap = new Map<string, AppNotification>();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      data.forEach(item => {
        const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
        const targetUser = payload.targetUserId || item.target_user_id || item.user_id || 'all';
        const targetClass = payload.targetClass || item.target_class;
        
        // Check audience targeting
        const isForUser = targetUser === 'all' || !userId || targetUser === userId || item.user_id === userId || item.user_id === null;
        const isForClass = !targetClass || !userClass || targetClass.toLowerCase() === 'all' || userClass.toLowerCase().includes(targetClass.toLowerCase()) || targetClass.toLowerCase().includes(userClass.toLowerCase());

        if (isForUser && isForClass) {
          const notifId = item.id || payload.id || generateUUID();
          notifMap.set(notifId, {
            id: notifId,
            title: payload.title || item.title || 'StudentOS Alert',
            message: payload.message || item.message || payload.content || item.content || '',
            type: item.type || payload.type || 'announcement',
            createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            isRead: item.is_read ?? payload.isRead ?? false,
            targetUserId: targetUser,
            targetClass: targetClass,
            linkTab: payload.linkTab || 'notice_viewer'
          });
        }
      });
    } else if (error) {
      console.warn('[SUPABASE-NOTIFS] Warning fetching notifications:', error.message);
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error fetching notifications:', err);
  }

  // Return fetched notifications sorted by created_at
  return Array.from(notifMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Request Browser Push Notification permission
 */
export async function requestWebPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (_) {
      return false;
    }
  }
  return false;
}

/**
 * Dispatch real browser desktop/mobile push notification via ServiceWorker or Notification API
 */
export async function triggerBrowserPushNotification(title: string, options?: NotificationOptions & { linkTab?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    const notifOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options?.tag || 'studentos-alert',
      body: options?.body || '',
      data: {
        linkTab: options?.linkTab || options?.data?.linkTab || 'notice_viewer'
      },
      ...options
    };

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, notifOptions);
          return;
        }
      }
    } catch (swErr) {
      console.warn('[WebPush] SW notification fallback to standard Notification:', swErr);
    }

    try {
      const n = new Notification(title, notifOptions);
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        if (notifOptions.data?.linkTab && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentos-navigate-tab', { detail: { tab: notifOptions.data.linkTab } }));
        }
      };
    } catch (e) {
      console.warn('[WebPush] Push notification trigger warning:', e);
    }
  }
}

/**
 * Save notification to Supabase and broadcast in realtime
 */
export async function saveAppNotification(notif: AppNotification): Promise<{ success: boolean; error?: string }> {
  console.log('[SUPABASE-NOTIFS] Saving notification:', notif.title);

  // Play audio chime locally
  triggerNotificationSound(notif.type);

  // Trigger Web Push Notification
  triggerBrowserPushNotification(notif.title, {
    body: notif.message,
    data: { linkTab: notif.linkTab || 'notice_viewer' }
  });

  const finalId = isValidUUID(notif.id) ? notif.id : generateUUID();
  const targetUser = notif.targetUserId || 'all';

  const dbRow = {
    id: finalId,
    type: notif.type || 'announcement',
    user_id: (targetUser !== 'all' && isValidUUID(targetUser)) ? targetUser : null,
    is_read: notif.isRead || false,
    created_at: notif.createdAt ? new Date(notif.createdAt).toISOString() : new Date().toISOString(),
    payload: {
      id: finalId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      createdAt: notif.createdAt || new Date().toISOString(),
      isRead: notif.isRead || false,
      targetUserId: targetUser,
      targetClass: notif.targetClass || null,
      linkTab: notif.linkTab || 'notice_viewer'
    }
  };

  let saveSuccess = true;
  let saveErrorMessage: string | undefined;

  try {
    const { error } = await supabase.from('notifications').upsert(dbRow);
    if (error) {
      console.error('[SUPABASE-NOTIFS] Error upserting notification:', error.message);
      saveSuccess = false;
      saveErrorMessage = error.message;
    } else {
      console.log('[SUPABASE-NOTIFS] Successfully saved notification to Supabase:', finalId);
    }
  } catch (err: any) {
    console.error('[SUPABASE-NOTIFS] Exception saving notification:', err);
    saveSuccess = false;
    saveErrorMessage = err?.message || 'Database error';
  }

  // Broadcast Realtime Event to all connected clients
  try {
    const channel = supabase.channel('student-os-public');
    await channel.send({
      type: 'broadcast',
      event: 'new_app_notification',
      payload: { ...notif, id: finalId }
    });
  } catch (_) {}

  // Trigger local window realtime event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentos-db-update', {
      detail: { table: 'notifications', action: 'INSERT', record: { ...notif, id: finalId }, timestamp: Date.now() }
    }));
  }

  return { success: saveSuccess, error: saveErrorMessage };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    if (isValidUUID(notifId)) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error marking notification read:', err);
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  try {
    if (userId && isValidUUID(userId)) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    } else {
      await supabase.from('notifications').update({ is_read: true }).is('user_id', null);
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error marking all read:', err);
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notifId: string): Promise<void> {
  try {
    if (isValidUUID(notifId)) {
      await supabase.from('notifications').delete().eq('id', notifId);
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error deleting notification:', err);
  }
}

/**
 * Trigger sound based on notification type
 */
export function triggerNotificationSound(type: string) {
  if (type === 'announcement') {
    soundService.playAnnouncementSound();
  } else if (type === 'mention') {
    soundService.playMentionSound();
  } else if (type === 'homework' || type === 'assignment') {
    soundService.playHomeworkSound();
  } else {
    soundService.playMessageSound();
  }
}

