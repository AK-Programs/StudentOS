import { supabase } from './supabase';
import { AppNotification } from '../types';

/**
 * Fetch notifications from Supabase
 */
export async function getAppNotifications(userId?: string): Promise<AppNotification[]> {
  console.log('[SUPABASE-NOTIFS] Fetching notifications from Supabase...');
  const notifMap = new Map<string, AppNotification>();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      data.forEach(item => {
        const targetUser = item.target_user_id || item.user_id || 'all';
        if (targetUser === 'all' || targetUser === userId) {
          notifMap.set(item.id, {
            id: item.id,
            title: item.title || 'StudentOS Alert',
            message: item.message || item.content || '',
            type: item.type || 'announcement',
            createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
            isRead: item.is_read || item.read || false,
            targetUserId: targetUser,
            targetClass: item.target_class,
            linkTab: item.link_tab || item.link
          });
        }
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error fetching notifications:', err);
  }

  return Array.from(notifMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Save notification to Supabase and broadcast
 */
export async function saveAppNotification(notif: AppNotification): Promise<void> {
  console.log('[SUPABASE-NOTIFS] Saving notification:', notif.id);

  try {
    const dbRow = {
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      created_at: notif.createdAt ? new Date(notif.createdAt).toISOString() : new Date().toISOString(),
      is_read: notif.isRead,
      target_user_id: notif.targetUserId || 'all',
      target_class: notif.targetClass || null,
      link_tab: notif.linkTab || null
    };

    await supabase.from('notifications').upsert(dbRow);
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error saving notification:', err);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error marking notification read:', err);
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId?: string): Promise<void> {
  try {
    if (userId) {
      await supabase.from('notifications').update({ is_read: true }).or(`target_user_id.eq.${userId},target_user_id.eq.all`);
    } else {
      await supabase.from('notifications').update({ is_read: true }).eq('target_user_id', 'all');
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error marking all read:', err);
  }
}
