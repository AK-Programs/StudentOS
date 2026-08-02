import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Image as ImageIcon, Paperclip, Mic, Square, Smile, Reply, Forward, 
  Trash2, Edit3, Pin, Shield, QrCode, UserPlus, LogOut, Settings, X, Search, 
  CheckCheck, Check, Volume2, AlertTriangle, Info, Sparkles, Filter, Bell,
  Copy, Link, Eye, UserCheck, Flame, ThumbsUp, Heart, Trophy, Megaphone,
  BookOpen, Users, Hash, MoreHorizontal
} from 'lucide-react';
import { ChatMessage, ChatRoom, UserRole, HouseType, ChatAttachment, UserProfile } from '../types';
import { moderateChatMessage } from '../lib/aiModeration';
import { savePeerMessage, deletePeerMessage, saveChatRoom, joinChatRoom, leaveChatRoom, deleteChatRoom } from '../lib/supabaseChat';
import { saveAppNotification } from '../lib/notifications';

interface ChatSystemProps {
  currentUser: UserProfile | null;
  effectiveRole: UserRole;
  chatRooms: ChatRoom[];
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoom[]>>;
  chats: ChatMessage[];
  setChats: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  activeChatTargetId: string;
  setActiveChatTargetId: (id: string) => void;
  showNotification: (msg: string) => void;
  students?: UserProfile[];
}

export const ChatSystem: React.FC<ChatSystemProps> = ({
  currentUser,
  effectiveRole,
  chatRooms,
  setChatRooms,
  chats,
  setChats,
  activeChatTargetId,
  setActiveChatTargetId,
  showNotification,
  students = []
}) => {
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [newChatText, setNewChatText] = useState('');
  const [showChatSidebarMobile, setShowChatSidebarMobile] = useState(true);

  // Group creation & QR states
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'group' | 'friend' | 'channel'>('group');
  const [newChannelCategory, setNewChannelCategory] = useState<'principal' | 'teacher' | 'class' | 'house' | 'club' | 'event'>('class');
  const [newRoomIcon, setNewRoomIcon] = useState('💬');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  // Group settings & QR modal
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Message interaction states
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);
  const [activeMenuMsg, setActiveMenuMsg] = useState<ChatMessage | null>(null);
  const longPressTimerRef = useRef<any>(null);

  const handleTouchStartMessage = (msg: ChatMessage) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActiveMenuMsg(msg);
    }, 450);
  };

  const handleTouchEndMessage = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Attachments & Voice note states
  const [attachedFiles, setAttachedFiles] = useState<ChatAttachment[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Typing indicator state
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const chatScrollViewRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatScrollViewRef.current) {
      chatScrollViewRef.current.scrollTop = chatScrollViewRef.current.scrollHeight;
    }
  }, [chats, activeChatTargetId]);

  // Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAttachedFiles(prev => [
            ...prev,
            { type: 'audio', url: base64Audio, name: `Voice Note (${recordingTime}s)` }
          ]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      showNotification('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      clearInterval(timerRef.current);
    }
  };

  // Handle File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');
      const isPdf = file.type.includes('pdf');
      const attachmentType: 'image' | 'video' | 'pdf' | 'file' = isImg ? 'image' : isVid ? 'video' : isPdf ? 'pdf' : 'file';

      reader.onloadend = () => {
        setAttachedFiles(prev => [
          ...prev,
          {
            type: attachmentType,
            url: reader.result as string,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Send Chat Message
  const handleSendChat = async () => {
    if ((!newChatText.trim() && attachedFiles.length === 0) || !currentUser) return;

    // AI Moderation
    const mod = moderateChatMessage(newChatText, currentUser.role);
    if (mod.flagged && mod.category === 'fake_news') {
      showNotification(`⚠️ Message Flagged: ${mod.reason}`);
    }

    const messageText = mod.flagged ? mod.safeMessage : newChatText.trim();

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      name: currentUser.name || 'Student',
      role: effectiveRole,
      house: currentUser.house || 'Ruby',
      message: messageText,
      createdAt: new Date().toISOString(),
      targetId: activeChatTargetId || 'group-all',
      ownerUid: currentUser.uid,
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      replyToId: replyingTo?.id,
      replyToSender: replyingTo?.name,
      replyToText: replyingTo?.message,
      readBy: [currentUser.uid],
      deliveredTo: [currentUser.uid],
      flaggedReason: mod.flagged ? mod.reason : undefined
    };

    // Optimistic UI update
    setChats(prev => [...prev, newMsg]);
    setNewChatText('');
    setAttachedFiles([]);
    setReplyingTo(null);

    // Save to Supabase
    await savePeerMessage(newMsg);

    // Create Notification if message is @mention or direct message
    if (activeChatTargetId.startsWith('friend-')) {
      const friendUid = activeChatTargetId.replace('friend-', '');
      await saveAppNotification({
        id: `notif-${Date.now()}`,
        title: `New Direct Message from ${currentUser.name}`,
        message: messageText.slice(0, 60),
        type: 'chat',
        createdAt: new Date().toISOString(),
        isRead: false,
        targetUserId: friendUid,
        linkTab: 'peer_chat'
      });
    }
  };

  // Edit Message
  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    setChats(prev => prev.map(c => c.id === msgId ? { ...c, message: editText.trim(), isEdited: true, editedAt: new Date().toISOString() } : c));
    
    const targetMsg = chats.find(c => c.id === msgId);
    if (targetMsg) {
      await savePeerMessage({
        ...targetMsg,
        message: editText.trim(),
        isEdited: true,
        editedAt: new Date().toISOString()
      });
    }
    setEditingMsgId(null);
    setEditText('');
    showNotification('Message updated');
  };

  // React to Message
  const handleAddReaction = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    setChats(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const reactions = { ...(msg.reactions || {}) };
      const currentUsers = reactions[emoji] || [];

      if (currentUsers.includes(currentUser.uid)) {
        reactions[emoji] = currentUsers.filter(u => u !== currentUser.uid);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...currentUsers, currentUser.uid];
      }

      const updated = { ...msg, reactions };
      savePeerMessage(updated).catch(console.error);
      return updated;
    }));
  };

  // Delete Message (For me vs For Everyone)
  const handleDeleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (!currentUser) return;

    if (forEveryone) {
      setChats(prev => prev.filter(c => c.id !== msgId));
      await deletePeerMessage(msgId);
      showNotification('Message deleted for everyone.');
    } else {
      setChats(prev => prev.map(c => c.id === msgId ? { ...c, deletedFor: [...(c.deletedFor || []), currentUser.uid] } : c));
      const targetMsg = chats.find(c => c.id === msgId);
      if (targetMsg) {
        await savePeerMessage({
          ...targetMsg,
          deletedFor: [...(targetMsg.deletedFor || []), currentUser.uid]
        });
      }
      showNotification('Message hidden for you.');
    }
  };

  // Toggle Pin Message
  const handleTogglePin = async (msgId: string) => {
    setChats(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const updated = { ...msg, isPinned: !msg.isPinned };
      savePeerMessage(updated).catch(console.error);
      return updated;
    }));
    showNotification('Pin status updated.');
  };

  // Forward Message
  const handleForwardMessage = async (targetRoomId: string) => {
    if (!forwardingMsg || !currentUser) return;
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fwdMsg: ChatMessage = {
      ...forwardingMsg,
      id: msgId,
      name: currentUser.name || 'Student',
      ownerUid: currentUser.uid,
      targetId: targetRoomId,
      createdAt: new Date().toISOString(),
      message: `[Forwarded]: ${forwardingMsg.message}`
    };

    setChats(prev => [...prev, fwdMsg]);
    await savePeerMessage(fwdMsg);
    setForwardingMsg(null);
    showNotification('Message forwarded successfully!');
  };

  // Join Room via Code
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim() || !currentUser) return;

    const res = await joinChatRoom(joinRoomCode.trim().toUpperCase(), currentUser.uid);
    if (res.success && res.room) {
      setChatRooms(prev => {
        if (prev.some(r => r.id === res.room!.id)) return prev;
        return [...prev, res.room!];
      });
      setActiveChatTargetId(res.room.id);
      setJoinRoomCode('');
      setIsCreatingRoom(false);
      showNotification(res.alreadyJoined ? `Already joined ${res.room.name}` : `Joined room: ${res.room.name}`);
    } else {
      showNotification(res.message || 'Room code not found or invalid.');
    }
  };

  // Create New Room / Channel
  const handleCreateRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !currentUser) return;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim(),
      type: newRoomType,
      channelCategory: newRoomType === 'channel' ? newChannelCategory : undefined,
      icon: newRoomIcon || '💬',
      description: newRoomDescription.trim() || 'Custom chat room',
      code,
      creatorId: currentUser.uid,
      members: [currentUser.uid],
      moderators: [currentUser.uid]
    };

    setChatRooms(prev => [...prev, newRoom]);
    setActiveChatTargetId(newRoom.id);
    setIsCreatingRoom(false);
    setNewRoomName('');
    setNewRoomDescription('');

    await saveChatRoom(newRoom);
    showNotification(`Created ${newRoomType}: ${newRoom.name} (Code: ${code})`);
  };

  const activeRoomInfo = chatRooms.find(r => r.id === activeChatTargetId) || {
    id: 'group-all',
    name: 'All Students Group',
    type: 'group' as const,
    icon: '🌍',
    description: 'General chat for all students',
    code: 'GLOBAL'
  };

  const isBroadcastChannel = activeRoomInfo.type === 'channel';
  const isModerator = (activeRoomInfo.moderators || []).includes(currentUser?.uid || '') || activeRoomInfo.creatorId === currentUser?.uid;
  const canPostInChannel = !isBroadcastChannel || effectiveRole === 'teacher' || effectiveRole === 'principal' || isModerator;

  // Filter messages for current room & search query
  const roomMessages = chats.filter(c => {
    const isTarget = c.targetId === activeChatTargetId || (!c.targetId && activeChatTargetId === 'group-all');
    if (!isTarget) return false;
    if (c.deletedFor?.includes(currentUser?.uid || '')) return false;
    if (!messageSearchQuery) return true;

    const q = messageSearchQuery.toLowerCase();
    return c.message.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const pinnedMessages = roomMessages.filter(m => m.isPinned);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[720px] max-w-7xl mx-auto shadow-2xl animate-fadeIn font-sans">
      
      {/* Left Column: Chat Rooms List (Groups, Direct Messages, Channels) */}
      <div className={`md:col-span-4 bg-slate-900/90 border border-white/10 rounded-3xl p-4 flex flex-col justify-between ${showChatSidebarMobile ? 'block' : 'hidden md:flex'}`}>
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          
          {/* Header & Create Button */}
          <div className="flex justify-between items-center">
            <h3 className="font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-indigo-400" />
              School Channels & Chats
            </h3>
            <button
              onClick={() => setIsCreatingRoom(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-3 py-1.5 rounded-xl font-extrabold uppercase transition-all shadow-md active:scale-95 flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              New / Join
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search groups, friends, channels..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {chatRooms
              .filter(room => {
                if (!chatSearchQuery) return true;
                return room.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
                       room.type.toLowerCase().includes(chatSearchQuery.toLowerCase());
              })
              .map((room) => {
                const isActive = activeChatTargetId === room.id;
                let badgeStyle = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                if (room.type === "friend") badgeStyle = "bg-teal-500/10 text-teal-400 border-teal-500/20";
                if (room.type === "channel") badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setActiveChatTargetId(room.id);
                      setShowChatSidebarMobile(false);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${isActive ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg' : 'bg-slate-950/40 border-white/5 hover:border-white/10 hover:bg-slate-950/70 text-slate-300'}`}
                  >
                    <span className="text-xl shrink-0">{room.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold truncate">{room.name}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${badgeStyle}`}>
                          {room.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{room.description}</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync Active
          </span>
          <span className="font-bold text-indigo-400">{currentUser?.name}</span>
        </div>
      </div>

      {/* Right Column: Chat Dialog Box */}
      <div className={`md:col-span-8 bg-slate-900/90 border border-white/10 rounded-3xl p-5 flex flex-col justify-between ${!showChatSidebarMobile ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Active Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChatSidebarMobile(true)}
              className="md:hidden p-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-[11px]"
            >
              ← Channels
            </button>
            <span className="text-2xl">{activeRoomInfo.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-white">{activeRoomInfo.name}</h4>
                {activeRoomInfo.type === 'channel' && (
                  <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                    📢 School Broadcast
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeRoomInfo.description}</p>
              {activeRoomInfo.code && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  Code: {activeRoomInfo.code}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search messages toggle */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                value={messageSearchQuery}
                onChange={e => setMessageSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 focus:w-48 transition-all"
              />
            </div>

            {/* QR Code button */}
            <button
              onClick={() => setShowQrModal(true)}
              title="Group QR Code & Invite"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-white/10 transition-all"
            >
              <QrCode className="w-4 h-4" />
            </button>

            {/* Settings button */}
            {isModerator && (
              <button
                onClick={() => setShowGroupSettings(true)}
                title="Group Settings"
                className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl border border-indigo-500/30 transition-all"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Pinned Messages Header Banner */}
        {pinnedMessages.length > 0 && (
          <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold">Pinned:</span>
              <span className="truncate">{pinnedMessages[0].message}</span>
            </div>
            <span className="text-[9px] font-mono text-amber-400/80 shrink-0">({pinnedMessages.length} pinned)</span>
          </div>
        )}

        {/* Chat Feed */}
        <div ref={chatScrollViewRef} className="flex-1 overflow-y-auto my-3 space-y-3 pr-1 bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner scrollbar-thin">
          
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center text-[10px] text-slate-400 font-medium">
            🛡️ Encrypted StudentOS Communication System. All messages are moderated for student safety.
          </div>

          {roomMessages.map((c) => {
            const isMine = c.ownerUid === currentUser?.uid;

            return (
              <div
                key={c.id}
                onTouchStart={() => handleTouchStartMessage(c)}
                onTouchEnd={handleTouchEndMessage}
                onTouchMove={handleTouchEndMessage}
                onContextMenu={(e) => { e.preventDefault(); setActiveMenuMsg(c); }}
                className={`group relative p-3.5 rounded-2xl border max-w-[85%] space-y-1.5 animate-fadeIn flex flex-col ${isMine ? 'ml-auto bg-indigo-600/15 border-indigo-500/30 text-white' : 'mr-auto bg-slate-900 border-white/10 text-slate-200'}`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className={`font-bold ${c.role === 'teacher' || c.role === 'principal' ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {c.name} <span className="text-[10px] text-slate-400 font-normal">({c.role}{c.house ? ` • ${c.house}` : ''})</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {c.isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveMenuMsg(c); }}
                      title="Options"
                      className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reply Reference if present */}
                {c.replyToId && (
                  <div className="p-2 bg-black/30 border-l-2 border-indigo-400 rounded text-[11px] text-slate-300 italic">
                    <span className="font-bold text-indigo-300 not-italic block">Replying to {c.replyToSender}:</span>
                    <p className="truncate">{c.replyToText}</p>
                  </div>
                )}

                {/* Message Content or Edit Input */}
                {editingMsgId === c.id ? (
                  <div className="flex gap-2 my-1">
                    <input
                      type="text"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                    <button onClick={() => handleSaveEdit(c.id)} className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-lg font-bold">Save</button>
                    <button onClick={() => setEditingMsgId(null)} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded-lg">Cancel</button>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.message}</p>
                )}

                {/* Attachments preview */}
                {c.attachments && c.attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {c.attachments.map((att, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden border border-white/10 bg-black/40 p-2 text-xs">
                        {att.type === 'image' && (
                          <img src={att.url} alt={att.name} className="max-h-48 rounded-lg object-cover w-full" />
                        )}
                        {att.type === 'audio' && (
                          <audio controls src={att.url} className="w-full h-8" />
                        )}
                        {att.type === 'video' && (
                          <video controls src={att.url} className="max-h-48 rounded-lg w-full" />
                        )}
                        {(att.type === 'pdf' || att.type === 'file') && (
                          <a href={att.url} download={att.name} className="flex items-center gap-2 text-indigo-400 hover:underline">
                            <Paperclip className="w-4 h-4" />
                            <span className="truncate">{att.name} ({att.size || 'Attachment'})</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions List */}
                {c.reactions && Object.keys(c.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {Object.entries(c.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(c.id, emoji)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${users.includes(currentUser?.uid || '') ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : 'bg-slate-950/40 border-white/10 text-slate-300'}`}
                      >
                        <span>{emoji}</span>
                        <span className="font-bold">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer time & receipt status */}
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 font-mono">
                  <span>
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {c.isEdited && ' (edited)'}
                  </span>
                  <div className="flex items-center gap-1">
                    {isMine && (
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* Action Toolbar on Hover */}
                <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl p-1 shadow-lg z-10">
                  <button onClick={() => setReplyingTo(c)} title="Reply" className="p-1 hover:bg-white/10 rounded text-slate-300"><Reply className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleAddReaction(c.id, '👍')} className="p-1 hover:bg-white/10 rounded text-amber-400 text-xs">👍</button>
                  <button onClick={() => handleAddReaction(c.id, '❤️')} className="p-1 hover:bg-white/10 rounded text-rose-400 text-xs">❤️</button>
                  <button onClick={() => handleAddReaction(c.id, '🚀')} className="p-1 hover:bg-white/10 rounded text-indigo-400 text-xs">🚀</button>
                  <button onClick={() => setForwardingMsg(c)} title="Forward" className="p-1 hover:bg-white/10 rounded text-slate-300"><Forward className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleTogglePin(c.id)} title="Pin" className="p-1 hover:bg-white/10 rounded text-amber-400"><Pin className="w-3.5 h-3.5" /></button>
                  
                  {isMine && (
                    <>
                      <button onClick={() => { setEditingMsgId(c.id); setEditText(c.message); }} title="Edit" className="p-1 hover:bg-white/10 rounded text-indigo-300"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteMessage(c.id, true)} title="Delete Everyone" className="p-1 hover:bg-white/10 rounded text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {roomMessages.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No messages in this channel yet.</p>
            </div>
          )}
        </div>

        {/* Input Bar or Channel Restricted Banner */}
        {!canPostInChannel ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center text-xs text-rose-400 font-bold flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Announcement Channel — Only teachers & admins can post messages here.
          </div>
        ) : (
          <div className="space-y-2">
            
            {/* Replying banner */}
            {replyingTo && (
              <div className="flex items-center justify-between bg-indigo-600/15 border border-indigo-500/30 rounded-xl px-3 py-1.5 text-xs text-indigo-200">
                <span className="truncate">Replying to <strong>{replyingTo.name}</strong>: "{replyingTo.message}"</span>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Attached files preview bar */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-950 rounded-xl border border-white/5">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-200">
                    <Paperclip className="w-3 h-3 text-indigo-400" />
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-white"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-white/10 shadow-lg">
              
              {/* File Attachment Button */}
              <label className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
                <Paperclip className="w-4 h-4" />
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>

              {/* Voice Record Button */}
              {isRecordingAudio ? (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 bg-rose-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold animate-pulse"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop ({recordingTime}s)
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  title="Voice Note"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              {/* Text Area Input */}
              <input
                type="text"
                value={newChatText}
                onChange={e => setNewChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message or share an announcement..."
                className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-white px-2 font-medium"
              />

              {/* Send Button */}
              <button
                onClick={handleSendChat}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Create / Join Modal */}
      {isCreatingRoom && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setIsCreatingRoom(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-base font-black text-white">Join Existing Room</h3>
              <p className="text-xs text-slate-400 mt-1">Enter a 6-character room code to join an existing group.</p>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={joinRoomCode}
                onChange={e => setJoinRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter Code (e.g. A1B2C3)"
                maxLength={6}
                required
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 uppercase tracking-widest font-mono"
              />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
                Join
              </button>
            </form>

            <div className="h-px bg-white/10 my-3" />

            <div>
              <h3 className="text-base font-black text-white">Create New Channel or Group</h3>
              <p className="text-xs text-slate-400 mt-1">Setup a class chat room, house channel, or interest group.</p>
            </div>

            <form onSubmit={handleCreateRoomSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Room Type</label>
                <select
                  value={newRoomType}
                  onChange={e => setNewRoomType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1"
                >
                  <option value="group">👥 Study Group</option>
                  <option value="channel">📢 School Channel (Broadcast)</option>
                  <option value="friend">💬 Direct Message Room</option>
                </select>
              </div>

              {newRoomType === 'channel' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Channel Category</label>
                  <select
                    value={newChannelCategory}
                    onChange={e => setNewChannelCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-1"
                  >
                    <option value="principal">🏛️ Principal Official Announcements</option>
                    <option value="teacher">👩‍🏫 Teacher Announcements</option>
                    <option value="class">🏫 Class Announcement (e.g. Class 9A)</option>
                    <option value="house">🏆 House Alliance (Ruby/Emerald)</option>
                    <option value="club">🤖 Club Channel (Robotics/Debate)</option>
                    <option value="event">🎉 Event Channel (Sports Day/Fest)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Name & Icon</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newRoomIcon}
                    onChange={e => setNewRoomIcon(e.target.value)}
                    className="w-12 bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-center text-sm"
                  />
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    placeholder="Room Name (e.g. Robotics Club)"
                    required
                    className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                <textarea
                  value={newRoomDescription}
                  onChange={e => setNewRoomDescription(e.target.value)}
                  placeholder="Short room guidelines or info..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-16 mt-1"
                />
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider">
                Create Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code & Invite Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-slate-400"><X className="w-4 h-4" /></button>
            <span className="text-4xl">{activeRoomInfo.icon}</span>
            <h3 className="font-extrabold text-lg text-white">{activeRoomInfo.name}</h3>
            
            <div className="p-4 bg-white rounded-2xl flex items-center justify-center mx-auto w-44 h-44 shadow-lg">
              <QrCode className="w-36 h-36 text-slate-900" />
            </div>

            <div className="bg-slate-950 border border-white/10 rounded-xl p-3 space-y-1 text-left">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Invite Code:</span>
              <div className="flex justify-between items-center">
                <span className="font-mono text-emerald-400 font-extrabold text-base tracking-widest">{activeRoomInfo.code || 'STUDENTOS'}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeRoomInfo.code || 'STUDENTOS');
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="text-xs text-indigo-400 flex items-center gap-1 hover:underline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedLink ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">Invite links expire in 24 hours. Scan QR to join room directly.</p>
          </div>
        </div>
      )}

      {/* Forwarding Modal */}
      {forwardingMsg && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-4 relative">
            <button onClick={() => setForwardingMsg(null)} className="absolute top-4 right-4 text-slate-400"><X className="w-4 h-4" /></button>
            <h3 className="font-extrabold text-sm text-white">Forward Message To:</h3>
            <p className="text-xs text-slate-400 italic bg-slate-950 p-2.5 rounded-xl border border-white/5">"{forwardingMsg.message}"</p>
            
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {chatRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleForwardMessage(room.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/5 flex items-center gap-2 text-xs text-white"
                >
                  <span>{room.icon}</span>
                  <span>{room.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Touch Context Menu Bottom Sheet */}
      {activeMenuMsg && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative">
            <button onClick={() => setActiveMenuMsg(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5">
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">Message Actions</span>
              <p className="text-xs text-slate-300 italic truncate mt-1 bg-slate-950 p-2.5 rounded-xl border border-white/5">
                "{activeMenuMsg.message}"
              </p>
            </div>

            {/* Quick Reactions Bar */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">React:</span>
              <div className="flex gap-2 mt-1.5 justify-between bg-slate-950 p-2 rounded-xl border border-white/5">
                {['👍', '❤️', '😂', '😮', '🔥', '🚀', '💯'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleAddReaction(activeMenuMsg.id, emoji);
                      setActiveMenuMsg(null);
                    }}
                    className="text-lg hover:scale-125 transition-transform p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setReplyingTo(activeMenuMsg);
                  setActiveMenuMsg(null);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 text-slate-200 font-medium"
              >
                <Reply className="w-4 h-4 text-indigo-400" />
                <span>Reply</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeMenuMsg.message);
                  showNotification('Copied message text!');
                  setActiveMenuMsg(null);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 text-slate-200 font-medium"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>Copy</span>
              </button>

              <button
                onClick={() => {
                  setForwardingMsg(activeMenuMsg);
                  setActiveMenuMsg(null);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 text-slate-200 font-medium"
              >
                <Forward className="w-4 h-4 text-amber-400" />
                <span>Forward</span>
              </button>

              <button
                onClick={() => {
                  handleTogglePin(activeMenuMsg.id);
                  setActiveMenuMsg(null);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 text-slate-200 font-medium"
              >
                <Pin className="w-4 h-4 text-amber-400" />
                <span>{activeMenuMsg.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>

              {activeMenuMsg.ownerUid === currentUser?.uid && (
                <button
                  onClick={() => {
                    setEditingMsgId(activeMenuMsg.id);
                    setEditText(activeMenuMsg.message);
                    setActiveMenuMsg(null);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-white/10 text-indigo-300 font-medium"
                >
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Edit</span>
                </button>
              )}

              {(activeMenuMsg.ownerUid === currentUser?.uid || isModerator) && (
                <button
                  onClick={() => {
                    handleDeleteMessage(activeMenuMsg.id, true);
                    setActiveMenuMsg(null);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 col-span-2 font-medium"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Delete for Everyone</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
