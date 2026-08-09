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
 * Helper to check if a user profile is eligible to receive a notification
 */
export function isUserEligibleForNotification(
  notif: AppNotification | any,
  user?: { uid?: string; id?: string; grade?: string; classGrade?: string; section?: string; role?: string }
): boolean {
  if (!user) return true;
  const userId = user.uid || user.id;
  const userGrade = user.grade || user.classGrade || '';
  const userSection = user.section || '';
  const userRole = (user.role || 'student').toLowerCase();

  const targetUser = notif.targetUserId || notif.target_user_id || notif.user_id || 'all';
  const targetRole = notif.targetRole || notif.target_role || 'all';
  const targetClass = notif.targetClass || notif.target_class || 'all';
  const targetSection = notif.targetSection || notif.target_section || 'all';

  // 1. User ID matching
  if (targetUser !== 'all' && targetUser !== null && userId && targetUser !== userId) {
    return false;
  }

  // 2. Role matching
  if (targetRole && targetRole !== 'all' && targetRole.toLowerCase() !== userRole) {
    return false;
  }

  // 3. Class/Grade matching
  if (targetClass && targetClass !== 'all' && userGrade) {
    const normTargetC = targetClass.toString().toLowerCase().replace(/class|grade|\s+/g, '');
    const normUserC = userGrade.toString().toLowerCase().replace(/class|grade|\s+/g, '');
    if (!normUserC.includes(normTargetC) && !normTargetC.includes(normUserC)) {
      return false;
    }
  }

  // 4. Section matching
  if (targetSection && targetSection !== 'all' && targetSection !== 'All Sections' && userSection) {
    const normTargetS = targetSection.toString().toLowerCase().trim();
    const normUserS = userSection.toString().toLowerCase().trim();
    if (normUserS !== normTargetS && !normUserS.includes(normTargetS)) {
      return false;
    }
  }

  return true;
}

/**
 * Fetch notifications from Supabase with targeting
 */
export async function getAppNotifications(
  userId?: string, 
  userClass?: string, 
  userSection?: string, 
  userRole?: string
): Promise<AppNotification[]> {
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
        const notifObj: AppNotification = {
          id: item.id || payload.id || generateUUID(),
          title: payload.title || item.title || 'StudentOS Alert',
          message: payload.message || item.message || payload.content || item.content || '',
          type: item.type || payload.type || 'announcement',
          createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
          isRead: item.is_read ?? payload.isRead ?? false,
          targetUserId: payload.targetUserId || item.target_user_id || item.user_id || 'all',
          targetClass: payload.targetClass || item.target_class || 'all',
          targetSection: payload.targetSection || item.target_section || 'all',
          targetRole: payload.targetRole || item.target_role || 'all',
          linkTab: payload.linkTab || 'notice_viewer'
        };

        if (isUserEligibleForNotification(notifObj, { uid: userId, grade: userClass, section: userSection, role: userRole })) {
          notifMap.set(notifObj.id, notifObj);
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
 * Register push subscription and save to Supabase
 */
export async function registerPushSubscription(userId?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true
        });
      } catch (subErr) {
        console.warn('[WebPush] PushManager subscribe notice:', subErr);
      }
    }

    if (subscription) {
      const subJson = subscription.toJSON();
      try {
        await supabase.from('push_subscriptions').upsert({
          user_id: userId || null,
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          updated_at: new Date().toISOString()
        }, { onConflict: 'endpoint' });
      } catch (dbErr) {
        console.warn('[WebPush] Saving subscription to database notice:', dbErr);
      }
    }
    return true;
  } catch (err) {
    console.warn('[WebPush] Subscription error:', err);
    return false;
  }
}

/**
 * Request Browser Push Notification permission
 */
export async function requestWebPushPermission(userId?: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    await registerPushSubscription(userId);
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await registerPushSubscription(userId);
        return true;
      }
      return false;
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
 * Mark notification as read (Only allowed for admins on authoritative global records, or individual target user)
 */
export async function markNotificationAsRead(notifId: string, isAdmin: boolean = false): Promise<void> {
  if (!isAdmin) {
    console.log('[SUPABASE-NOTIFS] Non-admin recipient cannot alter authoritative notification record in Supabase database.');
    return;
  }
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
export async function markAllNotificationsAsRead(userId?: string, isAdmin: boolean = false): Promise<void> {
  if (!isAdmin) {
    console.log('[SUPABASE-NOTIFS] Non-admin recipient cannot alter authoritative notification records in Supabase database.');
    return;
  }
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
 * Delete a notification (Only admins can delete authoritative records)
 */
export async function deleteNotification(notifId: string, isAdmin: boolean = false): Promise<void> {
  if (!isAdmin) {
    console.log('[SUPABASE-NOTIFS] Non-admin recipient cannot delete authoritative notification from Supabase database.');
    return;
  }
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

