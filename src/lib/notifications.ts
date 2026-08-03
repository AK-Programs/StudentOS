import { supabase } from './supabase';
import { AppNotification } from '../types';
import { soundService } from './soundService';

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

  // Backup store in notes table under special tag '__SYSTEM_NOTIFICATION__' if notifications table is unavailable
  if (notifMap.size === 0) {
    try {
      const { data: backupData } = await supabase
        .from('notes')
        .select('*')
        .eq('title', '__SYSTEM_NOTIFICATION__');

      if (backupData) {
        backupData.forEach(item => {
          try {
            const parsed = JSON.parse(item.content);
            const targetUser = parsed.targetUserId || 'all';
            if (targetUser === 'all' || targetUser === userId) {
              notifMap.set(parsed.id, parsed);
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  }

  return Array.from(notifMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Save notification to Supabase and broadcast in realtime
 */
export async function saveAppNotification(notif: AppNotification): Promise<void> {
  console.log('[SUPABASE-NOTIFS] Saving notification:', notif.id);

  // Play audio chime locally or triggers on broadcast
  triggerNotificationSound(notif.type);

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

    const { error } = await supabase.from('notifications').upsert(dbRow);
    if (error) {
      // Fallback save into notes table with system tag
      await supabase.from('notes').upsert({
        id: `notif_${notif.id}`,
        title: '__SYSTEM_NOTIFICATION__',
        content: JSON.stringify(notif),
        subject: notif.type,
        icon: '🔔',
        cover_bg: 'bg-indigo-600',
        user_id: notif.targetUserId || 'all',
        created_at: notif.createdAt ? new Date(notif.createdAt).toISOString() : new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-NOTIFS] Error saving notification:', err);
  }

  // Broadcast Realtime Event to all connected clients
  try {
    const channel = supabase.channel('student-os-public');
    await channel.send({
      type: 'broadcast',
      event: 'new_app_notification',
      payload: notif
    });
  } catch (_) {}
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notifId);
    await supabase.from('notes').delete().eq('id', `notif_${notifId}`);
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

/**
 * Delete a notification
 */
export async function deleteNotification(notifId: string): Promise<void> {
  try {
    await supabase.from('notifications').delete().eq('id', notifId);
    await supabase.from('notes').delete().eq('id', `notif_${notifId}`);
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
