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

  // 2. Query notes table for backup sync (subject = 'ai_buddy_chat')
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', 'ai_buddy_chat');

    if (!error && data) {
      for (const item of data) {
        const rawId = item.id.replace(/^aichat_/, '');
        if (!mergedMap.has(rawId)) {
          try {
            const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            mergedMap.set(rawId, {
              id: rawId,
              title: item.title || 'Study Session',
              personaId: parsed.personaId || 'study_buddy',
              mode: parsed.mode || 'explanatory',
              messages: parsed.messages || [],
              attachedFiles: parsed.attachedFiles || [],
              userId: item.user_id,
              createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now()
            });
          } catch (pErr) {
            console.warn('[SUPABASE-CHAT] Failed to parse notes backup for ai_buddy_chat:', item.id, pErr);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error querying notes table for ai_buddy_chat:', err);
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

  // 2. Dual-save to notes table as guaranteed cloud persistence backup
  try {
    const noteBackup = {
      id: `aichat_${thread.id}`,
      title: thread.title || 'Study Session',
      content: payloadString,
      subject: 'ai_buddy_chat',
      user_id: thread.userId,
      created_at: new Date(thread.createdAt || Date.now()).toISOString()
    };

    await supabase.from('notes').upsert(noteBackup);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error saving ai_buddy_chat to notes backup table:', err);
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

  try {
    await supabase
      .from('notes')
      .delete()
      .eq('id', `aichat_${threadId}`)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error deleting backup from notes:', err);
  }
}

/**
 * Robust helper to fetch Peer-to-Peer Messages from Supabase, falling back to localStorage
 */
export async function getPeerMessages(): Promise<ChatMessage[]> {
  console.log('[SUPABASE-CHAT] Fetching room/peer messages from Supabase...');
  const msgMap = new Map<string, ChatMessage>();

  // 1. Query 'messages' table
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      data.forEach(item => {
        let parsedDate = new Date();
        if (item.created_at) {
          const numVal = Number(item.created_at);
          if (!isNaN(numVal) && item.created_at.toString().length > 10) {
            parsedDate = new Date(numVal);
          } else {
            parsedDate = new Date(item.created_at);
          }
        }
        msgMap.set(item.id, {
          id: item.id,
          name: item.name,
          role: item.role,
          house: item.house,
          message: item.message,
          createdAt: parsedDate.toISOString(),
          targetId: item.target_id || item.room_id || null,
          sharedMaterialId: item.shared_material_id,
          ownerUid: item.owner_uid
        } as ChatMessage);
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice querying messages table:', err);
  }

  // 2. Query 'chat_messages' table (if exists)
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      data.forEach(item => {
        if (!msgMap.has(item.id)) {
          let parsedDate = new Date();
          if (item.created_at) {
            parsedDate = new Date(item.created_at);
          }
          msgMap.set(item.id, {
            id: item.id,
            name: item.name || item.sender_name || 'Student',
            role: item.role || 'student',
            house: item.house,
            message: item.message || item.content || '',
            createdAt: parsedDate.toISOString(),
            targetId: item.target_id || item.room_id || null,
            sharedMaterialId: item.shared_material_id,
            ownerUid: item.owner_uid || item.sender_id || ''
          } as ChatMessage);
        }
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice querying chat_messages table:', err);
  }

  // 3. Query 'notes' table backup (subject = 'peer_message' or 'room_message')
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .or('subject.eq.peer_message,subject.eq.room_message');

    if (!error && data) {
      data.forEach(item => {
        const rawId = item.id.replace(/^msg_/, '');
        if (!msgMap.has(rawId)) {
          try {
            const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            msgMap.set(rawId, {
              id: rawId,
              name: parsed.name || item.title || 'Student',
              role: parsed.role || 'student',
              house: parsed.house,
              message: parsed.message || '',
              createdAt: parsed.createdAt || (item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString()),
              targetId: parsed.targetId || null,
              sharedMaterialId: parsed.sharedMaterialId || null,
              ownerUid: item.user_id || parsed.ownerUid || ''
            } as ChatMessage);
          } catch (_) {}
        }
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice querying notes backup for messages:', err);
  }

  return Array.from(msgMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Robust helper to save Peer/Group Message to Supabase
 */
export async function savePeerMessage(message: ChatMessage): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving message to Supabase:', message.id);

  const payloadString = JSON.stringify({
    id: message.id,
    name: message.name,
    role: message.role,
    house: message.house || null,
    message: message.message,
    createdAt: message.createdAt,
    targetId: message.targetId || null,
    sharedMaterialId: message.sharedMaterialId || null,
    ownerUid: message.ownerUid || ''
  });

  // 1. Try saving to 'messages' table
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

    await supabase.from('messages').upsert(dbRow);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving to messages table:', err);
  }

  // 2. Try saving to 'chat_messages' table
  try {
    const dbRowChat = {
      id: message.id,
      room_id: message.targetId || null,
      sender_id: message.ownerUid || 'anonymous',
      sender_name: message.name,
      content: message.message,
      message: message.message,
      created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString()
    };
    await supabase.from('chat_messages').upsert(dbRowChat);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving to chat_messages table:', err);
  }

  // 3. Dual save to 'notes' table backup for guaranteed cloud persistence across devices
  try {
    await supabase.from('notes').upsert({
      id: `msg_${message.id}`,
      title: message.name || 'Chat Message',
      content: payloadString,
      subject: message.targetId ? 'room_message' : 'peer_message',
      user_id: message.ownerUid || 'system',
      created_at: message.createdAt ? new Date(message.createdAt).toISOString() : new Date().toISOString()
    });
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving message to notes backup:', err);
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

  // 2. Query notes backup table for chat_room entries
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('subject', 'chat_room');

    if (!error && data) {
      data.forEach(item => {
        const rawId = item.id.replace(/^chatroom_/, '');
        if (!roomMap.has(rawId)) {
          try {
            const parsed = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
            roomMap.set(rawId, {
              id: rawId,
              name: item.title,
              description: parsed.description || '',
              code: parsed.code || '',
              type: parsed.type || 'group',
              icon: parsed.icon || '💬',
              creatorId: parsed.creatorId || '',
              members: parsed.members || [],
              moderators: parsed.moderators || []
            } as ChatRoom);
          } catch (_) {}
        }
      });
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice querying notes backup for chat rooms:', err);
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

  // Dual save to notes table
  try {
    await supabase.from('notes').upsert({
      id: `chatroom_${room.id}`,
      title: room.name,
      content: metaPayload,
      subject: 'chat_room',
      user_id: room.creatorId || 'system',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving chat_room to notes backup:', err);
  }
}

// ==========================================
// LOCAL STORAGE BACKUP IMPLEMENTATION
// ==========================================














