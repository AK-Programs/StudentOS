import { supabase } from './supabase';
import { ChatMessage, ChatRoom } from '../types';

export interface AiBuddyThread {
  id: string;
  title: string;
  personaId: string;
  mode: 'explanatory' | 'socratic' | 'coder' | 'quiz_gen';
  messages: { role: 'user' | 'assistant'; content: string }[];
  attachedFile?: { name: string; content: string; size: number; type: string } | null;
  attachedFiles?: { name: string; content: string; size: number; type: string }[];
  userId: string;
  createdAt: number;
}

/**
 * Robust helper to fetch AI Buddy Chats from Supabase (ai_buddy_chats table & notes backup).
 * Securely filters by userId to prevent exposure of other users' chats.
 * Syncs seamlessly across devices and browsers.
 */
export async function getAiBuddyChats(userId: string): Promise<AiBuddyThread[]> {
  if (!userId) return [];
  console.log('[SUPABASE-CHAT] Fetching ai_buddy_chats from Supabase for userId:', userId);
  
  const mergedMap = new Map<string, AiBuddyThread>();

  // 1. Query ai_buddy_chats table
  try {
    const { data, error } = await supabase
      .from('ai_buddy_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      for (const item of data) {
        try {
          const parsedMsgs = typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages;
          const isWrapped = parsedMsgs && !Array.isArray(parsedMsgs) && parsedMsgs.messages;
          mergedMap.set(item.id, {
            id: item.id,
            title: item.title,
            personaId: isWrapped ? parsedMsgs.personaId : 'study_buddy',
            mode: isWrapped ? parsedMsgs.mode : 'explanatory',
            messages: isWrapped ? parsedMsgs.messages : (Array.isArray(parsedMsgs) ? parsedMsgs : []),
            attachedFiles: isWrapped ? parsedMsgs.attachedFiles : [],
            userId: item.user_id,
            createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now()
          });
        } catch (parseErr) {
          console.warn('[SUPABASE-CHAT] Failed to parse ai_buddy_chats row:', item.id, parseErr);
        }
      }
    } else if (error && error.code !== '42P01') {
      console.warn('[SUPABASE-CHAT] Query error on ai_buddy_chats table:', error.message);
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error querying ai_buddy_chats table:', err);
  }

  return Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Robust helper to upsert an AI Buddy Chat thread to Supabase
 */
export async function saveAiBuddyChat(thread: AiBuddyThread): Promise<void> {
  if (!thread.userId) return;
  console.log('[SUPABASE-CHAT] Saving ai_buddy_chat thread:', thread.id);

  const payloadString = JSON.stringify({
    messages: thread.messages || [],
    personaId: thread.personaId || 'study_buddy',
    mode: thread.mode || 'explanatory',
    attachedFiles: thread.attachedFiles || []
  });

  // 1. Save to ai_buddy_chats table (NO thread_id field which causes PGRST100 400 error!)
  try {
    const dbRow = {
      id: thread.id,
      user_id: thread.userId,
      title: thread.title || 'Study Session',
      messages: payloadString,
      created_at: new Date(thread.createdAt || Date.now()).toISOString()
    };

    const { error } = await supabase
      .from('ai_buddy_chats')
      .upsert(dbRow);

    if (error && error.code !== '42P01') {
      console.warn('[SUPABASE-CHAT] Table ai_buddy_chats upsert notice:', error.message);
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error upserting to ai_buddy_chats table:', err);
  }
}

/**
 * Robust helper to delete an AI Buddy Chat thread from Supabase
 */
export async function deleteAiBuddyChat(threadId: string, userId: string): Promise<void> {
  console.log('[SUPABASE-CHAT] Deleting ai_buddy_chat:', threadId);

  try {
    await supabase
      .from('ai_buddy_chats')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error deleting from ai_buddy_chats:', err);
  }
}

/**
 * Fetch peer/group messages — uses chat_messages table ONLY.
 */
export async function getPeerMessages(): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(500);

    if (error) {
      if (error.code === '42P01') {
        console.warn('[SUPABASE-CHAT] chat_messages table not found — run Setup Database in Admin Center.');
      } else {
        console.warn('[SUPABASE-CHAT] Error fetching chat_messages:', error.message);
      }
      return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      name: item.sender_name || item.name || 'Student',
      role: item.role || 'student',
      house: item.house || undefined,
      message: item.content || item.message || '',
      createdAt: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
      targetId: item.room_id || item.target_id || null,
      sharedMaterialId: item.shared_material_id || undefined,
      ownerUid: item.sender_id || item.owner_uid || ''
    } as ChatMessage));
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Network error fetching chat_messages:', err);
    return [];
  }
}

/**
 * Save peer/group message to chat_messages table ONLY.
 */
export async function savePeerMessage(message: ChatMessage): Promise<void> {
  const row = {
    id: message.id,
    room_id: message.targetId || null,
    sender_id: message.ownerUid || 'anonymous',
    sender_name: message.name,
    role: message.role || 'student',
    house: message.house || null,
    content: message.message,
    created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString(),
    target_id: message.targetId || null,
    shared_material_id: message.sharedMaterialId || null
  };

  try {
    const { error } = await supabase.from('chat_messages').upsert(row, { onConflict: 'id' });
    if (error && error.code !== '42P01') {
      console.warn('[SUPABASE-CHAT] Error saving to chat_messages:', error.message);
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Network error saving to chat_messages:', err);
  }
}

/**
 * Chat Rooms list helpers
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  console.log('[SUPABASE-CHAT] Querying chat_rooms from Supabase...');
  const roomMap = new Map<string, ChatRoom>();

  // 1. Try chat_rooms table
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*');

    if (!error && data) {
      data.forEach(item => {
        let description = item.description || '';
        let code = item.code || '';
        let type = 'group';
        let icon = '💬';
        let members: string[] = [];
        let moderators: string[] = [];
        let creatorId = '';

        if (description.startsWith('__JSON_METADATA__::')) {
          try {
            const parsed = JSON.parse(description.substring('__JSON_METADATA__::'.length));
            description = parsed.description || '';
            code = parsed.code || '';
            type = parsed.type || 'group';
            icon = parsed.icon || '💬';
            members = parsed.members || [];
            moderators = parsed.moderators || [];
            creatorId = parsed.creatorId || '';
          } catch (_) {}
        } else {
          if (item.type) type = item.type;
          if (item.code) code = item.code;
          if (item.icon) icon = item.icon;
          if (item.creator_id) creatorId = item.creator_id;
          if (item.members) members = typeof item.members === 'string' ? JSON.parse(item.members) : item.members;
          if (item.moderators) moderators = typeof item.moderators === 'string' ? JSON.parse(item.moderators) : item.moderators;
        }

        roomMap.set(item.id, {
          id: item.id,
          name: item.name,
          description,
          code,
          type,
          icon,
          creatorId,
          members,
          moderators
        } as ChatRoom);
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice querying chat_rooms:', err);
  }

  return Array.from(roomMap.values());
}

export async function saveChatRoom(room: ChatRoom): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving chat room to Supabase:', room.id);
  
  const metaPayload = JSON.stringify({
    description: room.description || '',
    code: room.code,
    type: room.type,
    icon: room.icon,
    creatorId: room.creatorId,
    members: room.members || [],
    moderators: room.moderators || []
  });

  // Save to chat_rooms table
  try {
    const dbRow = {
      id: room.id,
      name: room.name,
      description: `__JSON_METADATA__::${metaPayload}`,
      type: room.type,
      code: room.code,
      icon: room.icon
    };

    await supabase.from('chat_rooms').upsert(dbRow);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving to chat_rooms:', err);
  }
}

// ==========================================
// LOCAL STORAGE BACKUP IMPLEMENTATION
// ==========================================














