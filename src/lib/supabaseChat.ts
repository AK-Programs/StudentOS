import { supabase } from './supabase';
import { ChatMessage, ChatRoom } from '../types';
import { isMissingTableError } from './supabaseHelpers';
import { getLocalArray, setLocalArray, upsertLocalItem, removeLocalItems } from './localStorageHelpers';

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
 * Robust helper to fetch AI Buddy Chats from Supabase, falling back to localStorage
 * if the table is not provisioned or if there is an error.
 * Securely filters by userId to prevent exposure of other users' chats.
 */
export async function getAiBuddyChats(userId: string): Promise<AiBuddyThread[]> {
  if (!userId) return [];
  console.log('[SUPABASE-CHAT] Querying ai_buddy_chats for userId:', userId);
  try {
    const { data, error } = await supabase
      .from('ai_buddy_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[SUPABASE-CHAT] Table ai_buddy_chats does not exist in Supabase yet. Falling back to localStorage.');
        return getLocalAiBuddyChats(userId);
      }
      throw error;
    }

    if (data) {
      // Map database row keys to camelCase frontend keys
      const mapped: AiBuddyThread[] = data.map(item => ({
        id: item.id,
        title: item.title,
        personaId: item.persona_id,
        mode: item.mode,
        messages: typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages,
        attachedFiles: typeof item.attached_files === 'string' ? JSON.parse(item.attached_files) : item.attached_files || [],
        userId: item.user_id,
        createdAt: Number(item.created_at)
      }));
      return mapped;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get ai_buddy_chats from Supabase, using localStorage:', err);
  }
  return getLocalAiBuddyChats(userId);
}

/**
 * Robust helper to upsert an AI Buddy Chat thread to Supabase, falling back to localStorage
 */
export async function saveAiBuddyChat(thread: AiBuddyThread): Promise<void> {
  if (!thread.userId) return;
  console.log('[SUPABASE-CHAT] Saving ai_buddy_chat:', thread.id);
  
  // Update localStorage first (optimistic offline state)
  saveLocalAiBuddyChat(thread);

  try {
    const dbRow = {
      id: thread.id,
      user_id: thread.userId,
      title: thread.title,
      persona_id: thread.personaId,
      mode: thread.mode,
      messages: thread.messages,
      attached_files: thread.attachedFiles || [],
      created_at: thread.createdAt
    };

    const { error } = await supabase
      .from('ai_buddy_chats')
      .upsert(dbRow);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[SUPABASE-CHAT] Table ai_buddy_chats does not exist yet. Saved to localStorage only.');
        return;
      }
      throw error;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to upsert ai_buddy_chat in Supabase:', err);
  }
}

/**
 * Robust helper to delete an AI Buddy Chat thread from Supabase and localStorage
 */
export async function deleteAiBuddyChat(threadId: string, userId: string): Promise<void> {
  console.log('[SUPABASE-CHAT] Deleting ai_buddy_chat:', threadId);
  deleteLocalAiBuddyChat(threadId, userId);

  try {
    const { error } = await supabase
      .from('ai_buddy_chats')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId); // Security safeguard

    if (error) {
      if (isMissingTableError(error)) return;
      throw error;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to delete ai_buddy_chat in Supabase:', err);
  }
}

/**
 * Robust helper to fetch Peer-to-Peer Messages from Supabase, falling back to localStorage
 */
export async function getPeerMessages(): Promise<ChatMessage[]> {
  console.log('[SUPABASE-CHAT] Querying messages...');
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[SUPABASE-CHAT] Table messages does not exist in Supabase yet. Falling back to localStorage.');
        return getLocalMessages();
      }
      throw error;
    }

    if (data) {
      console.log(`[SUPABASE-CHAT] MESSAGES_FETCHED successfully, MESSAGES_COUNT: ${data.length}`);
      
      const mapped: ChatMessage[] = data.map(item => {
        let parsedDate = new Date();
        if (item.created_at) {
          const numVal = Number(item.created_at);
          if (!isNaN(numVal) && item.created_at.toString().length > 10) {
            parsedDate = new Date(numVal);
          } else {
            parsedDate = new Date(item.created_at);
          }
        }
        return {
          id: item.id,
          name: item.name,
          role: item.role,
          house: item.house,
          message: item.message,
          createdAt: parsedDate.toISOString(),
          targetId: item.target_id || item.room_id || null, // handle room_id alias just in case
          sharedMaterialId: item.shared_material_id,
          ownerUid: item.owner_uid
        };
      });
      return mapped;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get messages from Supabase, using localStorage:', err);
  }
  return getLocalMessages();
}

/**
 * Robust helper to save Peer-to-Peer Message to Supabase, falling back to localStorage
 */
export async function savePeerMessage(message: ChatMessage): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving peer message:', message.id);
  saveLocalMessage(message);

  try {
    const dbRow = {
      id: message.id,
      owner_uid: message.ownerUid || '',
      name: message.name,
      role: message.role,
      house: message.house || null,
      message: message.message,
      created_at: message.createdAt ? new Date(message.createdAt).getTime() : Date.now(),
      target_id: message.targetId || null,
      shared_material_id: message.sharedMaterialId || null
    };

    const { error } = await supabase
      .from('messages')
      .upsert(dbRow);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[SUPABASE-CHAT] Table messages does not exist yet. Saved to localStorage only.');
        return;
      }
      throw error;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to save peer message in Supabase:', err);
  }
}

/**
 * Chat Rooms list helpers
 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  console.log('[SUPABASE-CHAT] Querying chat_rooms...');
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*');

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('[SUPABASE-CHAT] Table chat_rooms does not exist in Supabase yet.');
        return getLocalChatRooms();
      }
      throw error;
    }

    if (data) {
      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        type: 'channel',
        icon: '💬'
      }));
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get chat_rooms from Supabase, using localStorage:', err);
  }
  return getLocalChatRooms();
}

export async function saveChatRoom(room: ChatRoom): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving chat room:', room.id);
  saveLocalChatRoom(room);

  try {
    const dbRow = {
      id: room.id,
      name: room.name,
      description: room.description
    };

    const { error } = await supabase
      .from('chat_rooms')
      .upsert(dbRow);

    if (error) {
      if (isMissingTableError(error)) return;
      throw error;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to save chat_room in Supabase:', err);
  }
}

// ==========================================
// LOCAL STORAGE BACKUP IMPLEMENTATION
// ==========================================

function getLocalAiBuddyChats(userId: string): AiBuddyThread[] {
  const all = getLocalArray<AiBuddyThread>('s_os_ai_threads');
  return all.filter(t => t.userId === userId);
}

function saveLocalAiBuddyChat(thread: AiBuddyThread): void {
  upsertLocalItem('s_os_ai_threads', thread, t => t.id === thread.id);
}

function deleteLocalAiBuddyChat(threadId: string, userId: string): void {
  removeLocalItems<AiBuddyThread>('s_os_ai_threads', t => t.id === threadId && t.userId === userId);
}

function getLocalMessages(): ChatMessage[] {
  return getLocalArray<ChatMessage>('s_os_messages');
}

function saveLocalMessage(message: ChatMessage): void {
  const all = getLocalArray<ChatMessage>('s_os_messages');
  if (!all.some(m => m.id === message.id)) {
    all.push(message);
    if (all.length > 200) all.shift();
    setLocalArray('s_os_messages', all);
  }
}

const DEFAULT_CHAT_ROOMS: ChatRoom[] = [
  { id: 'general', name: 'General Announcements', type: 'channel', icon: '📢', description: 'General announcements channel for students' },
  { id: 'maths', name: 'Mathematics Desk', type: 'channel', icon: '📐', description: 'Class discussion on maths formulas and logic' },
  { id: 'physics', name: 'Physics Arena', type: 'channel', icon: '⚡', description: 'Interactive discussions on physics models' }
];

function getLocalChatRooms(): ChatRoom[] {
  const rooms = getLocalArray<ChatRoom>('s_os_chat_rooms');
  return rooms.length > 0 ? rooms : DEFAULT_CHAT_ROOMS;
}

function saveLocalChatRoom(room: ChatRoom): void {
  const all = getLocalArray<ChatRoom>('s_os_chat_rooms');
  if (!all.some(r => r.id === room.id)) {
    all.push(room);
    setLocalArray('s_os_chat_rooms', all);
  }
}
