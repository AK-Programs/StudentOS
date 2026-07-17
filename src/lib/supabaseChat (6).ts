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
 * Robust helper to fetch AI Buddy Chats from Supabase, falling back to localStorage
 * if the table is not provisioned or if there is an error.
 * Securely filters by userId to prevent exposure of other users' chats.
 */
export async function getAiBuddyChats(userId: string): Promise<AiBuddyThread[]> {
  if (!userId) return [];
  console.log('[SUPABASE-CHAT] Querying ai_buddy_chats for userId:', userId);
  
  let locals: AiBuddyThread[] = [];
  try {
    const cached = localStorage.getItem(`s_os_ai_chats_${userId}`);
    if (cached) {
      locals = JSON.parse(cached);
    }
  } catch(e) {}

  try {
    const { data, error } = await supabase
      .from('ai_buddy_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('not found')) {
        console.warn('[SUPABASE-CHAT] Table ai_buddy_chats does not exist in Supabase yet. Falling back to localStorage.');
        return locals;
      }
      throw error;
    }

    if (data) {
      const mapped: AiBuddyThread[] = [];
      for (const item of data) {
        try {
          const parsedMsgs = typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages;
          const isWrapped = parsedMsgs && !Array.isArray(parsedMsgs) && parsedMsgs.messages;
          mapped.push({
            id: item.id,
            title: item.title,
            personaId: isWrapped ? parsedMsgs.personaId : 'study_buddy',
            mode: isWrapped ? parsedMsgs.mode : 'explanatory',
            messages: isWrapped ? parsedMsgs.messages : parsedMsgs,
            attachedFiles: isWrapped ? parsedMsgs.attachedFiles : [],
            userId: item.user_id,
            createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now()
          });
        } catch (parseErr) {
          console.warn('[SUPABASE-CHAT] Failed to parse ai_buddy_chat item:', item.id, parseErr);
        }
      }
      
      const mergedMap = new Map();
      locals.forEach(m => mergedMap.set(m.id, m));
      mapped.forEach(m => mergedMap.set(m.id, m));
      
      return Array.from(mergedMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get ai_buddy_chats from Supabase, using localStorage:', err);
  }
  return locals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Robust helper to upsert an AI Buddy Chat thread to Supabase, falling back to localStorage
 */
export async function saveAiBuddyChat(thread: AiBuddyThread): Promise<void> {
  if (!thread.userId) return;
  console.log('[SUPABASE-CHAT] Saving ai_buddy_chat:', thread.id);
  
  try {
    const cached = localStorage.getItem(`s_os_ai_chats_${thread.userId}`);
    let list = cached ? JSON.parse(cached) : [];
    list = list.filter((t: any) => t.id !== thread.id);
    list.push(thread);
    localStorage.setItem(`s_os_ai_chats_${thread.userId}`, JSON.stringify(list));
  } catch(e) {}

  try {
    const dbRow = {
      id: thread.id,
      user_id: thread.userId,
      thread_id: thread.id,
      title: thread.title,
      messages: JSON.stringify({
        messages: thread.messages,
        personaId: thread.personaId,
        mode: thread.mode,
        attachedFiles: thread.attachedFiles || []
      }),
      created_at: new Date(thread.createdAt).toISOString()
    };

    const { error } = await supabase
      .from('ai_buddy_chats')
      .upsert(dbRow);

    if (error) {
      if (error.code === '42P01' || error.message?.includes('not found')) {
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
  

  try {
    const { error } = await supabase
      .from('ai_buddy_chats')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId); // Security safeguard

    if (error) {
      if (error.code === '42P01') return;
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
      if (error.code === '42P01' || error.message?.includes('not found')) {
        console.warn('[SUPABASE-CHAT] Table messages does not exist in Supabase yet. Falling back to localStorage.');
        return [];
      }
      throw error;
    }

    if (data) {
      const mapped = data.map(item => {
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
        } as ChatMessage;
      });
      const locals = [];
      const mergedMap = new Map();
      locals.forEach(m => mergedMap.set(m.id, m));
      mapped.forEach(m => mergedMap.set(m.id, m));
      return Array.from(mergedMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get messages from Supabase, using localStorage:', err);
  }
  return [];
}

/**
 * Robust helper to save Peer-to-Peer Message to Supabase, falling back to localStorage
 */
export async function savePeerMessage(message: ChatMessage): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving peer message:', message.id);
  

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
      if (error.code === '42P01' || error.message?.includes('not found')) {
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
      if (error.code === '42P01' || error.message?.includes('not found')) {
        console.warn('[SUPABASE-CHAT] Table chat_rooms does not exist in Supabase yet.');
        return [];
      }
      throw error;
    }

    if (data) {
      const mapped = data.map(item => {
        let description = item.description || '';
        let code = item.code || '';
        let type = 'group';
        let icon = '💬';

        
        let members = [];
        let moderators = [];
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
           // Direct column mapping if we updated the DB schema later
           if (item.type) type = item.type;
           if (item.code) code = item.code;
           if (item.icon) icon = item.icon;
           if (item.creator_id) creatorId = item.creator_id;
           if (item.members) members = typeof item.members === 'string' ? JSON.parse(item.members) : item.members;
           if (item.moderators) moderators = typeof item.moderators === 'string' ? JSON.parse(item.moderators) : item.moderators;
        }

        return {
          id: item.id,
          name: item.name,
          description,
          code,
          type,
          icon,
          creatorId,
          members,
          moderators
        } as ChatRoom;
      });

      // Merge with default/local rooms
      const locals = [];
      const merged = [...mapped];
      for (const r of locals) {
        if (!merged.find(m => m.id === r.id)) {
          merged.push(r);
        }
      }
      return merged;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to get chat_rooms from Supabase, using localStorage:', err);
  }
  return [];
}

export async function saveChatRoom(room: ChatRoom): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving chat room:', room.id);
  
  try {
    const metaPayload = JSON.stringify({
      description: room.description || '',
      code: room.code,
      type: room.type,
      icon: room.icon,
      creatorId: room.creatorId,
      members: room.members || [],
      moderators: room.moderators || []
    });

    const dbRow = {
      id: room.id,
      name: room.name,
      description: `__JSON_METADATA__::${metaPayload}`,
      type: room.type,
      code: room.code,
      icon: room.icon
    };

    const { error } = await supabase
      .from('chat_rooms')
      .upsert(dbRow);

    if (error) {
      if (error.code === '42P01') return;
      throw error;
    }
  } catch (err) {
    console.error('[SUPABASE-CHAT] Failed to save chat_room in Supabase:', err);
  }
}

// ==========================================
// LOCAL STORAGE BACKUP IMPLEMENTATION
// ==========================================














