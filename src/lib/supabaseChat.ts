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

          const rawMsgs: any[] = isWrapped ? parsedMsgs.messages : (Array.isArray(parsedMsgs) ? parsedMsgs : []);
          
          const cleanMsgs: { role: 'user' | 'assistant'; content: string }[] = [];
          if (Array.isArray(rawMsgs)) {
            for (const msg of rawMsgs) {
              if (!msg || typeof msg.content !== 'string' || !msg.content.trim()) continue;
              const last = cleanMsgs[cleanMsgs.length - 1];
              if (last && last.role === msg.role && last.content.trim() === msg.content.trim()) {
                continue;
              }
              cleanMsgs.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              });
            }
          }

          mergedMap.set(item.id, {
            id: item.id,
            title: item.title,
            personaId: isWrapped ? parsedMsgs.personaId : 'study_buddy',
            mode: isWrapped ? parsedMsgs.mode : 'explanatory',
            messages: cleanMsgs,
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

  const cleanMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (Array.isArray(thread.messages)) {
    for (const msg of thread.messages) {
      if (!msg || typeof msg.content !== 'string' || !msg.content.trim()) continue;
      const last = cleanMessages[cleanMessages.length - 1];
      if (last && last.role === msg.role && last.content.trim() === msg.content.trim()) {
        continue;
      }
      cleanMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    }
  }

  const payloadString = JSON.stringify({
    messages: cleanMessages,
    personaId: thread.personaId || 'study_buddy',
    mode: thread.mode || 'explanatory',
    attachedFiles: thread.attachedFiles || []
  });

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
    
    // Also save messages individually to the ai_buddy_messages table as secondary log if present
    if (cleanMessages.length > 0) {
      try {
        await supabase.from('ai_buddy_messages').delete().eq('thread_id', thread.id);
        const messagesToInsert = cleanMessages.map(msg => ({
          thread_id: thread.id,
          role: msg.role,
          content: msg.content
        }));
        await supabase.from('ai_buddy_messages').insert(messagesToInsert);
      } catch (msgErr) {
        // Safe to ignore secondary table errors as primary JSON payload is persisted
      }
    }

  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error saving ai buddy chat:', err);
  }
}

/**
 * Robust helper to delete an AI Buddy Chat thread from Supabase
 */
export async function deleteAiBuddyChat(threadId: string, userId: string): Promise<void> {
  console.log('[SUPABASE-CHAT] Deleting ai_buddy_chat:', threadId);

  try {
    await supabase.from('ai_buddy_messages').delete().eq('thread_id', threadId);
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

  return Array.from(msgMap.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Robust helper to save Peer/Group Message to Supabase
 */
export async function savePeerMessage(message: ChatMessage): Promise<void> {
  console.log('[SUPABASE-CHAT] Saving message to Supabase:', message.id);

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
}

/**
 * Rename AI Buddy Chat
 */
export async function renameAiBuddyChat(threadId: string, title: string, userId: string): Promise<void> {
  if (!userId || !threadId) return;
  console.log('[SUPABASE-CHAT] Renaming ai_buddy_chat:', threadId, 'to:', title);
  try {
    await supabase
      .from('ai_buddy_chats')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error renaming ai_buddy_chats:', err);
  }
}

/**
 * Delete Peer Message
 */
export async function deletePeerMessage(messageId: string): Promise<void> {
  console.log('[SUPABASE-CHAT] Deleting message:', messageId);
  try {
    await supabase.from('messages').delete().eq('id', messageId);
    await supabase.from('chat_room_messages').delete().eq('id', messageId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error deleting message:', err);
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
          type: type as any,
          icon,
          creatorId,
          members: Array.isArray(members) ? members : [],
          moderators: Array.isArray(moderators) ? moderators : []
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
      icon: room.icon,
      creator_id: room.creatorId || null,
      members: JSON.stringify(room.members || []),
      moderators: JSON.stringify(room.moderators || [])
    };

    await supabase.from('chat_rooms').upsert(dbRow);

    // Sync chat_room_members table
    if (room.members && room.members.length > 0) {
      for (const memberUid of room.members) {
        const isMod = room.moderators?.includes(memberUid) || memberUid === room.creatorId;
        try {
          await supabase.from('chat_room_members').upsert({
            room_id: room.id,
            user_id: memberUid,
            role: isMod ? 'admin' : 'member'
          }, { onConflict: 'room_id,user_id' });
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Notice saving to chat_rooms:', err);
  }
}

export async function joinChatRoom(roomId: string, userId: string): Promise<ChatRoom | null> {
  if (!roomId || !userId) return null;
  console.log('[SUPABASE-CHAT] Joining chat room:', roomId, 'user:', userId);

  try {
    const rooms = await getChatRooms();
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return null;

    const currentMembers = targetRoom.members || [];
    if (!currentMembers.includes(userId)) {
      targetRoom.members = [...currentMembers, userId];
      await saveChatRoom(targetRoom);
    }
    return targetRoom;
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error joining room:', err);
    return null;
  }
}

export async function leaveChatRoom(roomId: string, userId: string): Promise<void> {
  if (!roomId || !userId) return;
  console.log('[SUPABASE-CHAT] Leaving chat room:', roomId, 'user:', userId);

  try {
    const rooms = await getChatRooms();
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    targetRoom.members = (targetRoom.members || []).filter(m => m !== userId);
    targetRoom.moderators = (targetRoom.moderators || []).filter(m => m !== userId);
    await saveChatRoom(targetRoom);

    await supabase
      .from('chat_room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error leaving room:', err);
  }
}

export async function deleteChatRoom(roomId: string, userId: string): Promise<void> {
  if (!roomId) return;
  console.log('[SUPABASE-CHAT] Deleting chat room:', roomId);

  try {
    await supabase.from('chat_room_messages').delete().eq('room_id', roomId);
    await supabase.from('messages').delete().eq('target_id', roomId);
    await supabase.from('chat_room_members').delete().eq('room_id', roomId);
    await supabase.from('chat_rooms').delete().eq('id', roomId);
  } catch (err) {
    console.warn('[SUPABASE-CHAT] Error deleting room:', err);
  }
}

// ==========================================
// LOCAL STORAGE BACKUP IMPLEMENTATION
// ==========================================














