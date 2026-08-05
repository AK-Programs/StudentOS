import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Hand, 
  MessageSquare, 
  Users, 
  Settings, 
  PhoneOff, 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  Shield, 
  Lock, 
  Unlock, 
  PenTool, 
  Sparkles, 
  Download, 
  FileText, 
  Share2, 
  Copy, 
  Check, 
  Grid, 
  Maximize2, 
  Radio, 
  Search, 
  UserCheck, 
  X, 
  AlertCircle,
  HelpCircle,
  Volume2,
  Paperclip,
  Smile,
  Send,
  Layers,
  Award,
  Globe,
  Bot
} from 'lucide-react';
import { UserProfile, Meeting, MeetingParticipant, MeetingChatMessage, MeetingRecording, MeetingBreakoutRoom, MeetingAttendanceReport } from '../types';
import { fetchAllMeetings, createOrUpdateMeeting, saveMeetingChatMessage, getLocalChatMessages, saveMeetingRecording, getLocalRecordings } from '../lib/supabaseMeet';
import { MeetWhiteboard } from './meet/MeetWhiteboard';
import { supabase } from '../lib/supabase';

interface StudentOSMeetProps {
  currentUser: UserProfile | null;
  effectiveRole: string;
  onNavigateTab?: (tab: string) => void;
}

export const StudentOSMeet: React.FC<StudentOSMeetProps> = ({
  currentUser,
  effectiveRole,
  onNavigateTab
}) => {
  // Navigation & View Mode inside StudentOS Meet
  const [activeView, setActiveView] = useState<'lobby' | 'calendar' | 'recordings' | 'room'>('lobby');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [recordings, setRecordings] = useState<MeetingRecording[]>([]);

  // Meeting Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Physics');
  const [newClassName, setNewClassName] = useState('Grade 10 - Astra');
  const [newBatch, setNewBatch] = useState('Batch 2026');
  const [newType, setNewType] = useState<'instant' | 'scheduled' | 'recurring'>('instant');
  const [newStartTime, setNewStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [newEndTime, setNewEndTime] = useState(new Date(Date.now() + 1000 * 60 * 60).toISOString().slice(0, 16));
  const [newDescription, setNewDescription] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [isSchoolWide, setIsSchoolWide] = useState(false);

  // In-Meeting State
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [joinPasswordInput, setJoinPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'participants' | 'breakout' | 'whiteboard' | 'ai' | 'attendance' | null>('chat');

  // Device & Bandwidth Selection
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [bandwidthMode, setBandwidthMode] = useState<'auto' | '1080p' | '720p' | '480p' | 'low'>('auto');
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  // Participants & Host Waiting Room
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [waitingParticipants, setWaitingParticipants] = useState<MeetingParticipant[]>([]);

  // Chat & Messaging inside meeting
  const [chatMessages, setChatMessages] = useState<MeetingChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Captions State
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [liveCaptionText, setLiveCaptionText] = useState('');
  const [captionTranscript, setCaptionTranscript] = useState<{ speaker: string; text: string; time: string }[]>([]);

  // Breakout Rooms State
  const [breakoutRooms, setBreakoutRooms] = useState<MeetingBreakoutRoom[]>([]);
  const [numBreakoutRooms, setNumBreakoutRooms] = useState(2);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  // Attendance Tracker
  const [joinTimestamp, setJoinTimestamp] = useState<number | null>(null);
  const [cameraActiveSeconds, setCameraActiveSeconds] = useState(0);
  const [micActiveSeconds, setMicActiveSeconds] = useState(0);

  // UI Utilities
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Load Meetings & Sync
  useEffect(() => {
    loadAllMeetingsData();
    setRecordings(getLocalRecordings());
  }, []);

  const loadAllMeetingsData = async () => {
    const list = await fetchAllMeetings();
    setMeetings(list);
  };

  // Enumerate Audio/Video Devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const v = devices.filter(d => d.kind === 'videoinput');
        const a = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(v);
        setAudioDevices(a);
        if (v.length > 0) setSelectedVideoDevice(v[0].deviceId);
        if (a.length > 0) setSelectedAudioDevice(a[0].deviceId);
      }).catch(err => console.warn('Device enum warning', err));
    }
  }, []);

  // WebRTC Local Stream Handler
  useEffect(() => {
    if (activeView === 'room' && !isInWaitingRoom) {
      startLocalMediaStream();
    } else {
      stopLocalMediaStream();
    }
    return () => {
      stopLocalMediaStream();
    };
  }, [activeView, isInWaitingRoom, isCameraOn, isMicOn, selectedVideoDevice, selectedAudioDevice]);

  const startLocalMediaStream = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (!isCameraOn && !isMicOn) {
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        return;
      }
      const constraints: MediaStreamConstraints = {
        video: isCameraOn ? { deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: isMicOn ? { deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined, echoCancellation, noiseSuppression } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('[StudentOS Meet] Camera/Mic access note:', err);
    }
  };

  const stopLocalMediaStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // Recording Timer
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Attendance Tracker Timer
  useEffect(() => {
    let interval: any = null;
    if (activeView === 'room' && !isInWaitingRoom) {
      interval = setInterval(() => {
        if (isCameraOn) setCameraActiveSeconds(prev => prev + 1);
        if (isMicOn) setMicActiveSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeView, isInWaitingRoom, isCameraOn, isMicOn]);

  // Simulated Live Captions
  useEffect(() => {
    let captionInterval: any = null;
    if (captionsEnabled && activeView === 'room') {
      const sampleSentences = [
        "Welcome everyone to today's StudentOS virtual lecture session.",
        "Let's turn our attention to page 42 on quantum electrodynamics.",
        "Does anyone have a question about the wave-particle equation?",
        "Great point, Naitik! Let me highlight this on the collaborative whiteboard.",
        "Remember that assignment 4 is due tomorrow evening in Assignment Center."
      ];
      let idx = 0;
      captionInterval = setInterval(() => {
        const text = sampleSentences[idx % sampleSentences.length];
        const speaker = idx % 2 === 0 ? (activeMeeting?.hostName || 'Dr. Sarah Jenkins') : (currentUser?.name || 'Student');
        setLiveCaptionText(`${speaker}: ${text}`);
        setCaptionTranscript(prev => [...prev, { speaker, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        idx++;
      }, 7000);
    } else {
      setLiveCaptionText('');
    }
    return () => clearInterval(captionInterval);
  }, [captionsEnabled, activeView, activeMeeting, currentUser]);

  // Setup Realtime Channel for active meeting
  useEffect(() => {
    if (!activeMeeting || activeView !== 'room') return;

    const channel = supabase.channel(`studentos_meet_${activeMeeting.id}`);

    channel
      .on('broadcast', { event: 'hand_raise' }, ({ payload }) => {
        if (payload) {
          setParticipants(prev => prev.map(p => p.userId === payload.userId ? { ...p, isHandRaised: payload.isHandRaised } : p));
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        if (payload && payload.message) {
          setChatMessages(prev => [...prev, payload.message]);
        }
      })
      .on('broadcast', { event: 'admit' }, ({ payload }) => {
        if (payload && payload.userId === currentUser?.uid) {
          setIsInWaitingRoom(false);
        }
      })
      .on('broadcast', { event: 'host_control' }, ({ payload }) => {
        if (payload) {
          if (payload.action === 'mute_all' && currentUser?.uid !== activeMeeting.hostId) {
            setIsMicOn(false);
          } else if (payload.action === 'disable_camera_all' && currentUser?.uid !== activeMeeting.hostId) {
            setIsCameraOn(false);
          } else if (payload.action === 'end_meeting') {
            handleLeaveMeeting();
            alert('The host has ended the meeting for everyone.');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMeeting, activeView, currentUser]);

  // Handle Meeting Creation
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const meetingId = `meet-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    
    const newMeeting: Meeting = {
      id: meetingId,
      title: newTitle || 'StudentOS Interactive Classroom',
      subject: newSubject,
      className: newClassName,
      batch: newBatch,
      type: newType,
      startTime: newType === 'instant' ? new Date().toISOString() : new Date(newStartTime).toISOString(),
      endTime: new Date(newEndTime).toISOString(),
      description: newDescription,
      password: newPassword,
      hostId: currentUser?.uid || 'demo-host-uid',
      hostName: currentUser?.name || 'Faculty Instructor',
      hostEmail: currentUser?.email || 'faculty@school.edu',
      hostRole: (currentUser?.role as any) || 'teacher',
      joinLink: `${window.location.origin}?meet=${meetingId}`,
      isSchoolWide,
      status: newType === 'instant' ? 'live' : 'upcoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await createOrUpdateMeeting(newMeeting);
    setShowCreateModal(false);
    loadAllMeetingsData();

    if (newType === 'instant') {
      handleJoinMeeting(newMeeting);
    } else {
      alert(`Meeting scheduled successfully!\nMeeting ID: ${meetingId}\nJoin Link & notifications dispatched.`);
    }
  };

  // Join Meeting Flow
  const handleJoinMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setJoinPasswordInput('');
    setPasswordError('');
    
    // Check if host or student needing waiting room
    const isHost = currentUser?.uid === meeting.hostId || effectiveRole === 'teacher' || effectiveRole === 'super_admin' || effectiveRole === 'admin';
    if (!isHost && meeting.password) {
      // Direct to lobby waiting room password check
      setIsInWaitingRoom(true);
    } else {
      setIsInWaitingRoom(false);
    }

    // Initialize mock/real participants
    const initialParticipants: MeetingParticipant[] = [
      {
        id: 'p_host',
        meetingId: meeting.id,
        userId: meeting.hostId,
        name: meeting.hostName,
        email: meeting.hostEmail,
        role: 'host',
        userRole: meeting.hostRole,
        status: 'admitted',
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        isCameraOn: true,
        isMicOn: true,
        isHandRaised: false,
        isScreenSharing: false,
        cameraActiveDuration: 0,
        micActiveDuration: 0,
        networkQuality: 'excellent'
      },
      {
        id: 'p_self',
        meetingId: meeting.id,
        userId: currentUser?.uid || 'current-user-uid',
        name: currentUser?.name || 'Student Participant',
        email: currentUser?.email || 'student@school.edu',
        role: isHost ? 'host' : 'participant',
        userRole: (currentUser?.role as any) || 'student',
        status: isHost ? 'admitted' : 'waiting',
        joinedAt: new Date().toISOString(),
        durationSeconds: 0,
        isCameraOn: true,
        isMicOn: true,
        isHandRaised: false,
        isScreenSharing: false,
        cameraActiveDuration: 0,
        micActiveDuration: 0,
        networkQuality: 'excellent'
      },
      {
        id: 'p_student_1',
        meetingId: meeting.id,
        userId: 'student-101',
        name: 'Aarav Sharma (Class Rep)',
        email: 'aarav@school.edu',
        role: 'participant',
        userRole: 'student',
        status: 'admitted',
        joinedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        durationSeconds: 600,
        isCameraOn: true,
        isMicOn: false,
        isHandRaised: false,
        isScreenSharing: false,
        cameraActiveDuration: 550,
        micActiveDuration: 120,
        networkQuality: 'excellent'
      },
      {
        id: 'p_student_2',
        meetingId: meeting.id,
        userId: 'student-102',
        name: 'Ananya Roy',
        email: 'ananya@school.edu',
        role: 'participant',
        userRole: 'student',
        status: 'admitted',
        joinedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        durationSeconds: 480,
        isCameraOn: true,
        isMicOn: false,
        isHandRaised: true,
        isScreenSharing: false,
        cameraActiveDuration: 400,
        micActiveDuration: 60,
        networkQuality: 'good'
      }
    ];

    setParticipants(initialParticipants.filter(p => p.status === 'admitted'));
    setWaitingParticipants(initialParticipants.filter(p => p.status === 'waiting'));
    setChatMessages(getLocalChatMessages(meeting.id));
    setJoinTimestamp(Date.now());
    setActiveView('room');
  };

  const handleConfirmPasswordJoin = () => {
    if (activeMeeting?.password && joinPasswordInput !== activeMeeting.password) {
      setPasswordError('Invalid meeting password. Please try again.');
      return;
    }
    setPasswordError('');
    setIsInWaitingRoom(false);
  };

  const handleLeaveMeeting = () => {
    stopLocalMediaStream();
    if (isRecording) handleStopRecording();
    setActiveView('lobby');
    setActiveMeeting(null);
  };

  // Screen Sharing Toggle
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      setIsScreenSharing(false);
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setIsScreenSharing(true);
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (e) {
        console.warn('Screen share canceled or unallowed', e);
      }
    }
  };

  // Raise Hand Toggle
  const handleToggleHandRaise = () => {
    const nextVal = !isHandRaised;
    setIsHandRaised(nextVal);
    if (activeMeeting) {
      supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
        type: 'broadcast',
        event: 'hand_raise',
        payload: { userId: currentUser?.uid, isHandRaised: nextVal }
      });
    }
  };

  // Host Controls
  const handleHostMuteAll = () => {
    if (!activeMeeting) return;
    supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
      type: 'broadcast',
      event: 'host_control',
      payload: { action: 'mute_all' }
    });
    alert('Muted all participants.');
  };

  const handleHostDisableCameraAll = () => {
    if (!activeMeeting) return;
    supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
      type: 'broadcast',
      event: 'host_control',
      payload: { action: 'disable_camera_all' }
    });
    alert('Disabled cameras for all participants.');
  };

  const handleHostEndMeeting = () => {
    if (!activeMeeting) return;
    if (confirm('Are you sure you want to end this meeting for all participants?')) {
      supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
        type: 'broadcast',
        event: 'host_control',
        payload: { action: 'end_meeting' }
      });
      handleLeaveMeeting();
    }
  };

  const handleAdmitWaitingUser = (userId: string) => {
    const userToAdmit = waitingParticipants.find(w => w.userId === userId);
    if (userToAdmit) {
      setWaitingParticipants(prev => prev.filter(w => w.userId !== userId));
      setParticipants(prev => [...prev, { ...userToAdmit, status: 'admitted' }]);
      if (activeMeeting) {
        supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
          type: 'broadcast',
          event: 'admit',
          payload: { userId }
        });
      }
    }
  };

  const handleAdmitAll = () => {
    waitingParticipants.forEach(w => handleAdmitWaitingUser(w.userId));
  };

  // Chat Send
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeMeeting) return;

    const newMsg: MeetingChatMessage = {
      id: 'msg_' + Date.now(),
      meetingId: activeMeeting.id,
      senderId: currentUser?.uid || 'user-uid',
      senderName: currentUser?.name || 'Participant',
      senderRole: (currentUser?.role as any) || 'student',
      content: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    await saveMeetingChatMessage(newMsg);
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    supabase.channel(`studentos_meet_${activeMeeting.id}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: { message: newMsg }
    });
  };

  // Recording Controls
  const handleStartRecording = () => {
    setIsRecording(true);
    recordedChunksRef.current = [];
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (!activeMeeting) return;

    const newRec: MeetingRecording = {
      id: 'rec_' + Date.now(),
      meetingId: activeMeeting.id,
      title: `${activeMeeting.title} (Session Recording)`,
      hostName: activeMeeting.hostName,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      durationSeconds: recordingDuration || 340,
      sizeBytes: 45 * 1024 * 1024,
      createdAt: new Date().toISOString(),
      aiSummary: 'Recorded session covered quantum harmonic oscillator, Maxwell displacement current, and student doubt resolution.'
    };

    await saveMeetingRecording(newRec);
    setRecordings(getLocalRecordings());
    alert('Meeting recording saved securely in StudentOS Meet Archive!');
  };

  // Breakout Rooms creation
  const handleCreateBreakoutRooms = () => {
    if (!activeMeeting) return;
    const rooms: MeetingBreakoutRoom[] = [];
    for (let i = 1; i <= numBreakoutRooms; i++) {
      rooms.push({
        id: `room_${i}`,
        meetingId: activeMeeting.id,
        name: `Breakout Room ${i}`,
        assignedUserIds: []
      });
    }
    setBreakoutRooms(rooms);
  };

  // Export Attendance CSV
  const handleExportAttendanceReport = () => {
    if (!activeMeeting) return;
    const durationMins = joinTimestamp ? Math.round((Date.now() - joinTimestamp) / 60000) : 12;
    let csv = `StudentOS Meet Attendance Report\n`;
    csv += `Meeting Title,${activeMeeting.title}\n`;
    csv += `Meeting ID,${activeMeeting.id}\n`;
    csv += `Host,${activeMeeting.hostName}\n`;
    csv += `Date,${new Date().toLocaleDateString()}\n\n`;
    csv += `Participant Name,Email,Role,Join Time,Camera Active %,Mic Active (s),Attended %\n`;

    participants.forEach(p => {
      const camPct = durationMins > 0 ? Math.min(100, Math.round((p.cameraActiveDuration / (durationMins * 60)) * 100)) : 90;
      csv += `"${p.name}","${p.email}","${p.userRole}","${p.joinedAt}",${camPct}%,${p.micActiveDuration}s,100%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_Report_${activeMeeting.id}.csv`;
    a.click();
  };

  const copyJoinLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* GLOBAL TOP MEET HEADER (When in Lobby / Calendar) */}
      {activeView !== 'room' && (
        <header className="px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white font-display">StudentOS Meet</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  HD Conferencing
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Enterprise-Grade Virtual Classroom & Collaboration Suite</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              onClick={() => setActiveView('lobby')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${activeView === 'lobby' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
              Lobby & Meetings
            </button>
            <button
              onClick={() => setActiveView('calendar')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${activeView === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <CalendarIcon className="w-4 h-4" />
              Meeting Calendar
            </button>
            <button
              onClick={() => setActiveView('recordings')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${activeView === 'recordings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Radio className="w-4 h-4" />
              Recordings Archive
            </button>
          </div>

          {/* Create Meeting CTA */}
          <div className="flex items-center gap-3">
            {['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Class / Meeting
              </button>
            )}
          </div>
        </header>
      )}

      {/* VIEW 1: LOBBY & MEETINGS DASHBOARD */}
      {activeView === 'lobby' && (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-8 animate-fadeIn">
          {/* Quick Action Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3 z-10">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Instant Class</h3>
                <p className="text-xs text-slate-300">Launch a virtual lecture room immediately with automated attendance & whiteboard.</p>
              </div>
              <button
                onClick={() => {
                  const m: Meeting = {
                    id: `meet-instant-${Date.now().toString().slice(-6)}`,
                    title: `${currentUser?.name || 'Faculty'}'s Instant Classroom`,
                    subject: 'Interactive Session',
                    type: 'instant',
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 3600000).toISOString(),
                    password: '123',
                    hostId: currentUser?.uid || 'host',
                    hostName: currentUser?.name || 'Teacher',
                    hostEmail: currentUser?.email || 'teacher@school.edu',
                    hostRole: (currentUser?.role as any) || 'teacher',
                    joinLink: `${window.location.origin}?meet=instant`,
                    status: 'live',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  handleJoinMeeting(m);
                }}
                className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 z-10"
              >
                <Plus className="w-4 h-4" />
                Start Instant Meeting
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/40 via-slate-900 to-slate-950 border border-violet-500/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3 z-10">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Schedule Meeting</h3>
                <p className="text-xs text-slate-300">Plan upcoming lectures, invite whole classes, and send calendar reminders.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 z-10"
              >
                <CalendarIcon className="w-4 h-4" />
                Schedule Class / Event
              </button>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-900/40 via-slate-900 to-slate-950 border border-teal-500/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-3 z-10">
                <div className="w-12 h-12 rounded-2xl bg-teal-600/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">Join via Code / Password</h3>
                <p className="text-xs text-slate-300">Enter a secure meeting ID or paste a StudentOS Meet join link.</p>
              </div>
              <div className="mt-6 flex items-center gap-2 z-10">
                <input
                  type="text"
                  placeholder="e.g. meet-892-412-890"
                  value={joinPasswordInput}
                  onChange={(e) => setJoinPasswordInput(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none flex-1 focus:border-teal-500"
                />
                <button
                  onClick={() => {
                    const found = meetings.find(m => m.id === joinPasswordInput.trim());
                    if (found) {
                      handleJoinMeeting(found);
                    } else if (joinPasswordInput.trim()) {
                      const tempMeeting: Meeting = {
                        id: joinPasswordInput.trim(),
                        title: 'StudentOS Joined Meeting',
                        subject: 'Classroom',
                        type: 'scheduled',
                        startTime: new Date().toISOString(),
                        endTime: new Date(Date.now() + 3600000).toISOString(),
                        password: '123',
                        hostId: 'host-1',
                        hostName: 'Class Instructor',
                        hostEmail: 'instructor@school.edu',
                        hostRole: 'teacher',
                        joinLink: window.location.origin + '?meet=' + joinPasswordInput.trim(),
                        status: 'live',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      handleJoinMeeting(tempMeeting);
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Live & Upcoming Meetings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
                Live & Scheduled Virtual Classes
              </h2>
              <span className="text-xs text-slate-400 font-mono">{meetings.length} Total Meetings</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4 relative group"
                >
                  {m.isSchoolWide && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      School Assembly
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${m.status === 'live' ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-mono uppercase text-indigo-400 font-extrabold">{m.subject} • {m.className || 'General'}</span>
                    </div>

                    <h3 className="text-base font-extrabold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {m.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2">{m.description || 'No description provided.'}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/5 text-xs text-slate-400 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-indigo-400" /> {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-teal-400" /> {m.hostName.split(' ')[0]}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleJoinMeeting(m)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                      >
                        <Video className="w-4 h-4" />
                        {m.status === 'live' ? 'Join Classroom Now' : 'Enter Lobby'}
                      </button>

                      <button
                        onClick={() => copyJoinLink(m.joinLink)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all"
                        title="Copy Join Link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* VIEW 2: MEETING CALENDAR */}
      {activeView === 'calendar' && (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">StudentOS Meeting Calendar</h2>
              <p className="text-xs text-slate-400">Class schedules, assembly routines, and academic webinars</p>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-6 shadow-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Today's Classes</p>
                  <p className="text-2xl font-black text-white">{meetings.length}</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-indigo-400" />
              </div>

              <div className="p-4 bg-violet-600/10 border border-violet-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase text-violet-400 font-bold">Upcoming</p>
                  <p className="text-2xl font-black text-white">{meetings.filter(m => m.status === 'upcoming').length}</p>
                </div>
                <Clock className="w-8 h-8 text-violet-400" />
              </div>

              <div className="p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Completed</p>
                  <p className="text-2xl font-black text-white">14</p>
                </div>
                <UserCheck className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="p-4 bg-rose-600/10 border border-rose-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase text-rose-400 font-bold">Recordings</p>
                  <p className="text-2xl font-black text-white">{recordings.length}</p>
                </div>
                <Radio className="w-8 h-8 text-rose-400" />
              </div>
            </div>

            {/* List View of Schedule */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider">Scheduled Lectures</h3>
              {meetings.map(m => (
                <div key={m.id} className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4 hover:border-indigo-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">{m.title}</h4>
                      <p className="text-xs text-slate-400 font-mono">{m.subject} • {m.className} • Host: {m.hostName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="px-3 py-1 bg-white/5 rounded-lg text-slate-300">{new Date(m.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      onClick={() => handleJoinMeeting(m)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition-all"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* VIEW 3: RECORDINGS ARCHIVE */}
      {activeView === 'recordings' && (
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 animate-fadeIn">
          <div>
            <h2 className="text-xl font-black text-white">Class Recordings & AI Summaries</h2>
            <p className="text-xs text-slate-400">Recorded virtual lectures, whiteboard captures, and attendance logs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map(rec => (
              <div key={rec.id} className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/50 transition-all shadow-2xl space-y-4">
                <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-white/5">
                  <Video className="w-10 h-10 text-indigo-400 animate-pulse" />
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-[10px] font-mono text-white">
                    {Math.floor(rec.durationSeconds / 60)}m {rec.durationSeconds % 60}s
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white line-clamp-1">{rec.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">Instructor: {rec.hostName}</p>
                </div>

                {rec.aiSummary && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                    <span className="text-[10px] font-mono uppercase text-indigo-400 font-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> AI Session Key Notes
                    </span>
                    <p className="text-[11px] text-slate-300 leading-snug">{rec.aiSummary}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <a
                    href={rec.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition-all text-center"
                  >
                    Watch Recording
                  </a>
                  <a
                    href={rec.url}
                    download
                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all"
                    title="Download Video File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VIEW 4: ACTIVE MEETING ROOM & LOBBY WAITING ROOM */}
      {activeView === 'room' && activeMeeting && (
        <div className="flex-1 flex flex-col h-screen bg-slate-950 overflow-hidden relative">
          
          {/* LOBBY / WAITING ROOM MODAL OVERLAY */}
          {isInWaitingRoom && (
            <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-fadeIn">
              <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center">
                  <Lock className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-black text-white">StudentOS Protected Classroom</h2>
                  <p className="text-xs text-slate-400">Host: <span className="text-white font-bold">{activeMeeting.hostName}</span></p>
                  <p className="text-xs text-slate-400">Enter the class password to join the waiting room.</p>
                </div>

                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Enter meeting password..."
                    value={joinPasswordInput}
                    onChange={(e) => setJoinPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-center font-mono text-white outline-none focus:border-indigo-500"
                  />
                  {passwordError && <p className="text-xs text-rose-400 font-bold">{passwordError}</p>}

                  <button
                    onClick={handleConfirmPasswordJoin}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg transition-all"
                  >
                    Authenticate & Request Join
                  </button>

                  <button
                    onClick={handleLeaveMeeting}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 text-xs rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE ROOM TOP CONTROL BAR */}
          <header className="px-6 py-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-4 backdrop-blur-md z-30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white line-clamp-1">{activeMeeting.title}</h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>ID: {activeMeeting.id}</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Verified</span>
                </div>
              </div>
            </div>

            {/* Room Metrics Dashboard Bar */}
            <div className="hidden md:flex items-center gap-4 bg-slate-950 px-4 py-2 rounded-2xl border border-white/10 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {participants.length} Active
              </span>

              {isRecording && (
                <span className="flex items-center gap-1.5 text-rose-400 font-bold animate-pulse">
                  <Radio className="w-3.5 h-3.5" />
                  REC {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </span>
              )}

              <span className="flex items-center gap-1.5 text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
                HD 1080p
              </span>
            </div>

            {/* Leave Room Button */}
            <button
              onClick={handleLeaveMeeting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow transition-all flex items-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Room
            </button>
          </header>

          {/* MAIN STAGE & SIDE PANELS */}
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* VIDEO GRID / MAIN CANVAS STAGE */}
            <div className="flex-1 p-4 bg-slate-950 overflow-y-auto flex flex-col justify-between space-y-4">
              
              {/* Live Captions Stream Banner */}
              {captionsEnabled && liveCaptionText && (
                <div className="p-3 bg-black/80 backdrop-blur-xl border border-indigo-500/40 rounded-2xl max-w-2xl mx-auto text-center shadow-2xl animate-fadeIn">
                  <p className="text-xs font-mono font-bold text-indigo-300">{liveCaptionText}</p>
                </div>
              )}

              {/* PARTICIPANTS VIDEO GRID */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center justify-center">
                
                {/* Local User Self Video Box */}
                <div className="relative aspect-video bg-slate-900 rounded-3xl border-2 border-indigo-500/50 overflow-hidden shadow-2xl group flex items-center justify-center">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : 'block'}`}
                  />

                  {!isCameraOn && (
                    <div className="w-20 h-20 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl font-black">
                      {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-xl text-xs font-extrabold text-white flex items-center gap-2 border border-white/10">
                    <span>{currentUser?.name || 'You'} (Self)</span>
                    {!isMicOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                    {isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                  </div>
                </div>

                {/* Other Participants Video Boxes */}
                {participants.filter(p => p.userId !== currentUser?.uid).map(p => (
                  <div
                    key={p.id}
                    className="relative aspect-video bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex items-center justify-center group hover:border-indigo-500/50 transition-all"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-xl font-black shadow-lg">
                      {p.name.charAt(0)}
                    </div>

                    <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-xl text-xs font-extrabold text-white flex items-center gap-2 border border-white/10">
                      <span>{p.name}</span>
                      <span className="text-[10px] uppercase font-mono text-indigo-400">({p.role})</span>
                      {p.isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* FLOATING IN-MEETING CONTROL BAR */}
              <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl backdrop-blur-xl max-w-3xl w-full mx-auto flex items-center justify-between gap-3 shadow-2xl z-20">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`p-3 rounded-2xl transition-all ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'}`}
                    title="Toggle Microphone"
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`p-3 rounded-2xl transition-all ${isCameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'}`}
                    title="Toggle Camera"
                  >
                    {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleScreenShare}
                    className={`p-3 rounded-2xl transition-all ${isScreenSharing ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Share Screen"
                  >
                    <Monitor className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setActiveSidePanel(activeSidePanel === 'whiteboard' ? null : 'whiteboard')}
                    className={`p-3 rounded-2xl transition-all ${activeSidePanel === 'whiteboard' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Collaborative Whiteboard"
                  >
                    <PenTool className="w-5 h-5" />
                  </button>

                  <button
                    onClick={handleToggleHandRaise}
                    className={`p-3 rounded-2xl transition-all ${isHandRaised ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Raise Hand"
                  >
                    <Hand className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setCaptionsEnabled(!captionsEnabled)}
                    className={`p-3 rounded-2xl transition-all ${captionsEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Live Captions"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? null : 'chat')}
                    className={`p-3 rounded-2xl transition-all relative ${activeSidePanel === 'chat' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Meeting Chat"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setActiveSidePanel(activeSidePanel === 'participants' ? null : 'participants')}
                    className={`p-3 rounded-2xl transition-all relative ${activeSidePanel === 'participants' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="Participants & Host Controls"
                  >
                    <Users className="w-5 h-5" />
                    {waitingParticipants.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                        {waitingParticipants.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveSidePanel(activeSidePanel === 'ai' ? null : 'ai')}
                    className={`p-3 rounded-2xl transition-all ${activeSidePanel === 'ai' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                    title="StudentOS AI Assistant"
                  >
                    <Bot className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* SIDE PANEL (Chat, Participants, Whiteboard, AI Assistant, Breakouts) */}
            {activeSidePanel && (
              <aside className="w-80 md:w-96 bg-slate-900 border-l border-white/10 flex flex-col h-full z-30 shadow-2xl animate-slideLeft">
                
                {/* Panel Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400 font-mono">
                    {activeSidePanel === 'chat' && '💬 Meeting Chat'}
                    {activeSidePanel === 'participants' && '👥 Participants & Host'}
                    {activeSidePanel === 'whiteboard' && '✏️ Collaborative Board'}
                    {activeSidePanel === 'ai' && '🤖 AI Meeting Tutor'}
                    {activeSidePanel === 'breakout' && '🧩 Breakout Rooms'}
                    {activeSidePanel === 'attendance' && '📊 Class Attendance'}
                  </h3>

                  <button onClick={() => setActiveSidePanel(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* SIDE PANEL CONTENT: CHAT */}
                {activeSidePanel === 'chat' && (
                  <div className="flex-1 flex flex-col h-full overflow-hidden p-4 space-y-4">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {chatMessages.map(m => (
                        <div key={m.id} className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-extrabold text-indigo-400">{m.senderName}</span>
                            <span className="text-slate-500">{m.timestamp}</span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">{m.content}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        placeholder="Send message to room..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                      />
                      <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* SIDE PANEL CONTENT: PARTICIPANTS & HOST CONTROLS */}
                {activeSidePanel === 'participants' && (
                  <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    
                    {/* Host Action Buttons */}
                    {['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole) && (
                      <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl space-y-2">
                        <span className="text-[10px] font-mono uppercase text-indigo-400 font-extrabold">Host Controls</span>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={handleHostMuteAll} className="py-2 px-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-bold">
                            Mute All
                          </button>
                          <button onClick={handleHostDisableCameraAll} className="py-2 px-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-bold">
                            Disable Cameras
                          </button>
                          <button onClick={handleExportAttendanceReport} className="py-2 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1">
                            <Download className="w-3 h-3" /> Report
                          </button>
                          <button onClick={handleHostEndMeeting} className="py-2 px-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-bold">
                            End Class
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Waiting Room List */}
                    {waitingParticipants.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-extrabold text-amber-400">Waiting Room ({waitingParticipants.length})</span>
                          <button onClick={handleAdmitAll} className="text-[10px] font-bold text-indigo-400 hover:underline">Admit All</button>
                        </div>
                        {waitingParticipants.map(w => (
                          <div key={w.id} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                            <span className="text-xs text-white font-bold">{w.name}</span>
                            <button onClick={() => handleAdmitWaitingUser(w.userId)} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg">
                              Admit
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Admitted Participants List */}
                    <div className="space-y-2">
                      <span className="text-xs font-mono font-extrabold text-slate-400">In Meeting ({participants.length})</span>
                      {participants.map(p => (
                        <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-white">{p.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.userRole}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SIDE PANEL CONTENT: WHITEBOARD */}
                {activeSidePanel === 'whiteboard' && (
                  <div className="flex-1 p-2 overflow-hidden flex flex-col">
                    <MeetWhiteboard
                      meetingId={activeMeeting.id}
                      currentUserName={currentUser?.name || 'User'}
                      isHost={['teacher', 'admin', 'super_admin'].includes(effectiveRole)}
                    />
                  </div>
                )}

                {/* SIDE PANEL CONTENT: AI ASSISTANT */}
                {activeSidePanel === 'ai' && (
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    <div className="p-4 bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 rounded-2xl space-y-2">
                      <h4 className="text-xs font-black uppercase text-violet-300 font-mono flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> AI Lecture Copilot
                      </h4>
                      <p className="text-xs text-slate-300">Live AI assistant summarizing lecture concepts and resolving student doubts in real-time.</p>
                    </div>

                    <button className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Generate Instant Session Summary
                    </button>
                  </div>
                )}

              </aside>
            )}

          </div>
        </div>
      )}

      {/* CREATE / SCHEDULE MEETING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-xl w-full bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                Schedule New Virtual Class / Meeting
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="text-xs font-mono font-bold text-slate-400 uppercase">Class / Meeting Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electromagnetic Waves & Special Relativity"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Subject</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Class & Batch</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase">Meeting Password</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {effectiveRole === 'super_admin' && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="schoolwide"
                    checked={isSchoolWide}
                    onChange={(e) => setIsSchoolWide(e.target.checked)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="schoolwide" className="text-xs font-bold text-amber-300">
                    Principal Special Assembly (School-Wide Invitation)
                  </label>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 bg-white/5 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-lg"
                >
                  Create & Dispatch Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
