import { Whiteboard2 } from './components/Whiteboard2';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronRight, Plus, Check, Trash, Trash2, BookOpen, Award, Sparkles, 
  Clock, ArrowRight, Lock, Unlock, Send, Volume2, VolumeX, ZoomIn, 
  ZoomOut, Eye, Settings, MessageSquare, BarChart2, User, Calendar, 
  Flame, Upload, FileText, CheckCircle, Download, ChevronLeft, 
  PenTool, Eraser, Share2, LogOut, AlertTriangle, Activity, RefreshCw,
  Heart, Bookmark, X, Bell
} from 'lucide-react';
import { 
  UserRole, HouseType, SectionType, UserProfile, HouseStats, 
  Task, ScheduleItem, VaultNote, Lesson, FeedbackPost, 
  MaterialResource, QuizQuestion, ChatMessage, ChatRoom, AITeacherPersona,
  Homework, RecentAccount
} from './types';
import { supabase } from './lib/supabase';
import { getVaultNotes, saveVaultNoteToSupabase, deleteVaultNoteFromSupabase } from './lib/supabaseNotes';
import { getSupabaseUserProfile, saveSupabaseUserProfile } from './lib/supabaseUsers';
import { getSupabaseHomework, saveSupabaseHomework, deleteSupabaseHomework } from './lib/supabaseHomework';
import { 
  getAiBuddyChats, saveAiBuddyChat, deleteAiBuddyChat, 
  getPeerMessages, savePeerMessage, getChatRooms, saveChatRoom 
} from './lib/supabaseChat';
import { saveSupabaseMaterial, getSupabaseMaterials, deleteSupabaseMaterial } from './lib/supabaseResources';
import { PdfCanvasViewer } from './components/PdfCanvasViewer';
import { StudentOSJarvis } from './components/StudentOSJarvis';
import AttendanceManager from './components/AttendanceManager';
import AdminCenter from './components/AdminCenter';
import TeacherStudentList from './components/TeacherStudentList';
import TeacherStudentReports from './components/TeacherStudentReports';
import TeacherProfile from './components/TeacherProfile';
import StudentAttendanceView from './components/StudentAttendanceView';
import StudentAiAnalytics from './components/StudentAiAnalytics';
import HouseChampionship from './components/HouseChampionship';
import SimpleResourceManager from './components/SimpleResourceManager';
import { BlogsPortal } from './components/BlogsPortal';
import { AssignmentCenter } from './components/AssignmentCenter';
import StudentMarksCenter from './components/StudentMarksCenter';
import CoordinatorModule from './components/CoordinatorModule';
import { SportsActivitiesPortal } from './components/SportsActivitiesPortal';
import { SubstituteHub } from './components/SubstituteHub';
import { MOCK_QUIZZES, AI_PERSONAS, INITIAL_ANNOUNCEMENTS, INITIAL_FEEDBACK, INITIAL_MATERIALS, MOCK_SCHEDULES } from './mockData';

// Stub Integrations
import {
  handleFirestoreError, OperationType, sendNotificationToUsers,
  auth, db, GoogleAuthProvider, signInWithPopup, signOut,
  doc, collection, query, where, onSnapshot,
  setDoc, updateDoc, deleteDoc
} from './firebase';
import { uploadFileToStorage } from './lib/storageHelper';

const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const CodeBlock = ({ code, language }: { code: string; language: string; key?: any }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-slate-950 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-white/5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`px-2 py-1 rounded transition-all text-[9px] font-semibold active:scale-95 ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'}`}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-100 whitespace-pre scrollbar-thin scrollbar-thumb-white/10 select-text leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const parseInlineMarkdown = (line: string) => {
  const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-extrabold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="mx-1 px-1.5 py-0.5 rounded bg-slate-950 border border-white/5 font-mono text-[11px] text-amber-300 font-semibold">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const lang = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);

      return <CodeBlock key={index} code={code} language={lang} />;
    }

    const lines = part.split('\n');
    return (
      <div key={index} className="space-y-1.5">
        {lines.map((line, lIdx) => {
          if (line.trim() === '---' || line.trim() === '***') {
            return <hr key={lIdx} className="my-3 border-t border-white/10" />;
          }

          if (line.startsWith('### ')) {
            return <h4 key={lIdx} className="text-sm font-extrabold text-indigo-300 mt-2 mb-1 tracking-tight">{parseInlineMarkdown(line.substring(4))}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={lIdx} className="text-base font-black text-indigo-400 mt-3 mb-1.5 tracking-tight">{parseInlineMarkdown(line.substring(3))}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={lIdx} className="text-lg font-black text-white mt-4 mb-2 tracking-wide">{parseInlineMarkdown(line.substring(2))}</h2>;
          }

          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const raw = line.trim().substring(2);
            return (
              <ul key={lIdx} className="list-disc pl-5 my-0.5 text-slate-300">
                <li className="leading-relaxed">{parseInlineMarkdown(raw)}</li>
              </ul>
            );
          }

          if (/^\d+\.\s/.test(line.trim())) {
            const dotIdx = line.indexOf('.');
            const raw = line.substring(dotIdx + 1).trim();
            const num = line.trim().substring(0, dotIdx);
            return (
              <ol key={lIdx} className="list-decimal pl-5 my-0.5 text-slate-300" start={parseInt(num) || 1}>
                <li className="leading-relaxed">{parseInlineMarkdown(raw)}</li>
              </ol>
            );
          }

          if (line.trim().startsWith('>')) {
            const raw = line.trim().substring(1).trim();
            return (
              <blockquote key={lIdx} className="border-l-4 border-indigo-500/50 bg-indigo-500/5 pl-4 py-1.5 my-1.5 rounded-r-lg italic text-slate-300">
                {parseInlineMarkdown(raw)}
              </blockquote>
            );
          }

          if (!line.trim()) return <div key={lIdx} className="h-1.5" />;
          return <p key={lIdx} className="leading-relaxed mb-1 text-slate-300 text-xs sm:text-sm">{parseInlineMarkdown(line)}</p>;
        })}
      </div>
    );
  });
};

export function getUserProfileTitle(profile: UserProfile | null, effectiveRole?: string): string {
  if (!profile) return 'Guest';
  const role = effectiveRole || profile.role;

  if (role === 'student') {
    const gradeNum = profile.grade ? profile.grade.replace('Grade ', '') : '';
    const section = profile.section || '';
    if (gradeNum && section) {
      return `Class ${gradeNum} ${section} Student`;
    } else if (gradeNum) {
      return `Class ${gradeNum} Student`;
    } else if (section) {
      return `${section} Student`;
    }
    return 'Student';
  }

  if (role === 'teacher') {
    if (profile.specialtySubject) {
      return `${profile.specialtySubject} Teacher`;
    }
    return 'Teacher';
  }

  if (role === 'coordinator') {
    if (profile.designation) {
      return profile.designation;
    }
    return 'Academic Coordinator';
  }

  if (role === 'admin') {
    return 'School Administrator';
  }

  if (role === 'super_admin') {
    return 'Super Administrator';
  }

  if (role) {
    const capitalized = (role as string).charAt(0).toUpperCase() + (role as string).slice(1).replace('_', ' ');
    return capitalized;
  }
  return 'Member';
}

export default function App() {

  useEffect(() => {
    if (window.opener && window.location.hash.includes('access_token=')) {
      window.opener.postMessage({
        type: 'SUPABASE_AUTH_SUCCESS',
        hash: window.location.hash
      }, window.location.origin);
      setTimeout(() => window.close(), 500);
    }
  }, []);

  // Global States
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('s_os_user');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [firebaseLoading, setFirebaseLoading] = useState<boolean>(true);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [firebaseOnboardingUser, setFirebaseOnboardingUser] = useState<any>(null);
  const [authError, setAuthError] = useState<{ code: string; message: string; hostname: string } | null>(null);

  const DEV_MODE = false; // Production release
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const effectiveRole = (isSuperAdmin || DEV_MODE) && simulatedRole ? simulatedRole : currentUser?.role;
  const isSportsTeacher = !!(currentUser && effectiveRole === 'teacher' && (
    (currentUser.department || '').toLowerCase().includes('sport') ||
    (currentUser.department || '').toLowerCase().includes('activity') ||
    (currentUser.department || '').toLowerCase().includes('pe') ||
    (currentUser.department || '').toLowerCase().includes('physical') ||
    (currentUser.department || '').toLowerCase().includes('co-curricular') ||
    (currentUser.department || '').toLowerCase().includes('karate') ||
    (currentUser.department || '').toLowerCase().includes('taekwondo') ||
    (currentUser.department || '').toLowerCase().includes('dance') ||
    (currentUser.department || '').toLowerCase().includes('music') ||
    (currentUser.department || '').toLowerCase().includes('art') ||
    (currentUser.specialtySubject || '').toLowerCase().includes('art') ||
    (currentUser.specialtySubject || '').toLowerCase().includes('music') ||
    (currentUser.specialtySubject || '').toLowerCase().includes('dance') ||
    (currentUser.specialtySubject || '').toLowerCase().includes('karate')
  ));



  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      return localStorage.getItem('s_os_active_tab') || 'dashboard';
    } catch (e) {
      console.warn('[Storage] Unsafe activeTab localStorage read:', e);
      return 'dashboard';
    }
  });
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [clock, setClock] = useState<string>('');
  
  // Homework filter states
  const [hwFilterGrade, setHwFilterGrade] = useState<string>('All Grades');
  const [hwSearch, setHwSearch] = useState<string>('');
  
  // Homework Edit states
  const [hwFormOpen, setHwFormOpen] = useState(false);
  const [hwEditId, setHwEditId] = useState<string | null>(null);
  const [hwFSubject, setHwFSubject] = useState('');
  const [hwFTitle, setHwFTitle] = useState('');
  const [hwFContent, setHwFContent] = useState('');
  const [hwFGrade, setHwFGrade] = useState('Grade 12');
  const [hwFSection, setHwFSection] = useState<SectionType | 'All Sections'>('All Sections');
  
  const [profileTab, setProfileTab] = useState<string>('overview');

  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifCenter, setShowNotifCenter] = useState<boolean>(false);

  // Secure Role Registration Selection State
  const [requestedAccountType, setRequestedAccountType] = useState<'student' | 'teacher' | 'coordinator' | 'admin'>('student');

  // Redesigned Sign Up Flow States
  const [regStep, setRegStep] = useState<'login' | 'role' | 'profile' | 'submit'>('role');
  const regStepRef = useRef(regStep);
  useEffect(() => {
    regStepRef.current = regStep;
  }, [regStep]);

  const [regRole, setRegRole] = useState<'student' | 'teacher' | 'coordinator' | 'admin'>('student');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regGrade, setRegGrade] = useState('Grade 10');
  const [regSection, setRegSection] = useState('Solara');
  const [regHouse, setRegHouse] = useState('Emerald');
  const [regPhoto, setRegPhoto] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regSubjects, setRegSubjects] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [linkedGoogleUid, setLinkedGoogleUid] = useState<string | null>(null);
  const [linkedGooglePhoto, setLinkedGooglePhoto] = useState<string | null>(null);

  // Startup Screen States
  const [showStartup, setShowStartup] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  // Classroom Security & Smart Board Mode States
  const [presentationMode, setPresentationMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('s_os_presentation_mode') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [smartBoardMode, setSmartBoardMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('s_os_smart_board_mode') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [teacherPin, setTeacherPin] = useState<string>(() => {
    try {
      return localStorage.getItem('s_os_teacher_pin') || '';
    } catch (e) {
      return '';
    }
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [autoLockTime, setAutoLockTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('s_os_auto_lock_time');
      return saved ? parseInt(saved, 10) : 0; // default 0 (Off)
    } catch (e) {
      return 0;
    }
  });
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [securityMenuOpen, setSecurityMenuOpen] = useState<boolean>(false);

  // Pin creation & validation modal states
  const [pinSetupOpen, setPinSetupOpen] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [pinVerifyOpen, setPinVerifyOpen] = useState<boolean>(false);
  const [verifyPinInput, setVerifyPinInput] = useState<string>('');
  const [pinVerifyAction, setPinVerifyAction] = useState<(() => void) | null>(null);

  const [lockScreenPinInput, setLockScreenPinInput] = useState<string>('');
  const [lockScreenError, setLockScreenError] = useState<string>('');

  const isTabAllowedInPresentation = (tab: string) => {
    return ['whiteboard', 'ai_teacher', 'materials', 'assignments', 'homework', 'pomodoro', 'planner', 'tasks'].includes(tab);
  };

  const getSidebarBtnClass = (tab: string, type: 'standard' | 'faculty' | 'attendance' | 'admin' = 'standard') => {
    const isActive = activeTab === tab;
    let base = `w-full flex items-center gap-3.5 transition-all rounded-xl border `;
    if (smartBoardMode) {
      base += `px-5 py-3.5 text-sm font-black `;
    } else {
      base += `px-4 py-2.5 text-xs font-semibold `;
    }

    if (isActive) {
      if (type === 'faculty') base += 'bg-emerald-600 text-white shadow-lg border-emerald-500';
      else if (type === 'attendance') base += 'bg-amber-600 text-white shadow-lg border-amber-500';
      else if (type === 'admin') base += 'bg-rose-600 text-white shadow-lg border-rose-500';
      else base += 'bg-indigo-600 text-white shadow-lg border-indigo-500';
    } else {
      if (type === 'faculty') base += 'text-emerald-400 hover:text-white hover:bg-emerald-500/10 border-emerald-500/20';
      else if (type === 'attendance') base += 'text-amber-400 hover:text-white hover:bg-amber-500/10 border-amber-500/20';
      else if (type === 'admin') base += 'text-rose-400 hover:text-white hover:bg-rose-500/10 border-rose-500/20';
      else base += 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5';
    }
    return base;
  };

  const handleSavePin = () => {
    if (newPin.length !== 4 && newPin.length !== 6) {
      setPinError('PIN must be exactly 4 or 6 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }
    try {
      localStorage.setItem('s_os_teacher_pin', newPin);
      setTeacherPin(newPin);
      if (currentUser) {
        const updatedUser = { ...currentUser, pin: newPin };
        setCurrentUser(updatedUser);
        saveSupabaseUserProfile(updatedUser).catch(console.error);
      }
      setPinSetupOpen(false);
      setPinError('');
      setNewPin('');
      setConfirmPin('');
      showNotification('✅ Security PIN saved successfully!');
    } catch (e) {
      setPinError('Failed to save PIN.');
    }
  };

  const handleVerifyPin = () => {
    const activePin = currentUser?.pin || teacherPin;
    if (verifyPinInput === activePin || verifyPinInput === '5205' /* Master Override */) {
      if (pinVerifyAction) {
        pinVerifyAction();
      }
      setIsLocked(false);
      setPinVerifyOpen(false);
      setPinVerifyAction(null);
      setVerifyPinInput('');
      setPinError('');
      if (currentUser && currentUser.raw_data?.isLocked) {
        const updatedUser = { ...currentUser, raw_data: { ...(currentUser.raw_data || {}), isLocked: false } };
        setCurrentUser(updatedUser);
        saveSupabaseUserProfile(updatedUser).catch(console.error);
      }
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const triggerPinVerification = (action: () => void) => {
    const activePin = currentUser?.pin || teacherPin;
    if (!activePin) {
      setPinSetupOpen(true);
      return;
    }
    setPinVerifyAction(() => action);
    setPinVerifyOpen(true);
  };

  const handleUnlockWithPin = () => {
    if (lockScreenPinInput === teacherPin) {
      setIsLocked(false);
      setLockScreenPinInput('');
      setLockScreenError('');
      setLastActivity(Date.now());
      showNotification('🔓 Workspace unlocked successfully.');
    } else {
      setLockScreenError('Incorrect security PIN.');
    }
  };

  const handleTabSelect = (tab: string) => {
    if (presentationMode && !isTabAllowedInPresentation(tab)) {
      showNotification('🔒 This tab is hidden in Presentation Mode for classroom safety.');
      return;
    }
    setActiveTab(tab);
    localStorage.setItem('s_os_active_tab', tab);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  // Theme & Accessibility States
  const [lightMode, setLightMode] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'standard' | 'large' | 'huge'>('standard');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('s_os_tts_enabled') === 'true';
    } catch (e) {
      console.warn('[Storage] Unsafe ttsEnabled localStorage read:', e);
      return false;
    }
  });

  // Business Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [vaultNotes, setVaultNotes] = useState<VaultNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteEditMode, setNoteEditMode] = useState<boolean>(true);
  const [noteFont, setNoteFont] = useState<'sans' | 'serif' | 'mono'>('sans');

  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  
  // --- Core State Expansion for Multi-User Real-time Sync & Custom Tools ---
  const socketRef = useRef<WebSocket | null>(null);
  const lastXRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const whiteboardHistory = useRef<string[]>([]);
  const whiteboardRedoStack = useRef<string[]>([]);
  const aiChatsSyncingFor = useRef<string | null>(null);

  const [announcements, setAnnouncements] = useState<any[]>([]);

  // AI Notes Generator Parameters
  const [aiGeneratingNotes, setAiGeneratingNotes] = useState<boolean>(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');

  // Whiteboard Configurations & Classroom panel projection modes
  const [isSmartBoardPanelMode, setIsSmartBoardPanelMode] = useState<boolean>(false);
  const [isJarvisActive, setIsJarvisActive] = useState<boolean>(false);
  const [canvasShape, setCanvasShape] = useState<'free' | 'rect' | 'circle'>('free');

  // Materials Audience alignment toggles
  const [newMaterialIsPublic, setNewMaterialIsPublic] = useState<boolean>(true);
  const [newMaterialVisibility, setNewMaterialVisibility] = useState<'student' | 'teacher' | 'private'>('student');
  const [newMaterialGrades, setNewMaterialGrades] = useState<string[]>([]);
  const [newMaterialSections, setNewMaterialSections] = useState<string[]>([]);
  const [newMaterialHouses, setNewMaterialHouses] = useState<string[]>([]);
  const [materialsSearchQuery, setMaterialsSearchQuery] = useState<string>('');
  const [materialsSubjectFilter, setMaterialsSubjectFilter] = useState<string>('All');

  // Extended Material Hub parameters
  const [selectedMaterialForAi, setSelectedMaterialForAi] = useState<MaterialResource | null>(null);
  const [aiActionLoading, setAiActionLoading] = useState<boolean>(false);
  const [aiActionResultText, setAiActionResultText] = useState<string>('');
  const [aiActionType, setAiActionType] = useState<string>('');
  const [aiUserQuestion, setAiUserQuestion] = useState<string>('');
  const [activeMaterialSubTab, setActiveMaterialSubTab] = useState<string>('feed');
  const [materialsGradeFilter, setMaterialsGradeFilter] = useState<string>('All');
  const [materialsTypeFilter, setMaterialsTypeFilter] = useState<string>('All');
  const [materialsSortBy, setMaterialsSortBy] = useState<string>('Newest');
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false);
  const [activeCommentsMaterialId, setActiveCommentsMaterialId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [savedMaterialIds, setSavedMaterialIds] = useState<string[]>([]);

  const [activeChatTargetId, setActiveChatTargetId] = useState<string>('group-all');
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');
  const [previewMaterial, setPreviewMaterial] = useState<MaterialResource | null>(null);
  const [shareMaterial, setShareMaterial] = useState<MaterialResource | null>(null);
  const [showChatSidebarMobile, setShowChatSidebarMobile] = useState<boolean>(true);


  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<MaterialResource[]>([]);
  const [feedbackPosts, setFeedbackPosts] = useState<FeedbackPost[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([
    { id: 'group-all', name: 'All Students Group', type: 'group', icon: '🌍', description: 'General chat for all students' },
    { id: 'group-math', name: 'Math Study Club', type: 'group', icon: '📐', description: 'Solve trigonometry and chemistry' },
    { id: 'group-ruby', name: 'Ruby House Alliance', type: 'group', icon: '🟥', description: 'Coordinate Ruby House plans' },
    { id: 'group-emerald', name: 'Emerald Studious', type: 'group', icon: '🟩', description: 'Coordinate Emerald plans' },
    { id: 'group-science', name: 'Science Projects', type: 'group', icon: '🧪', description: 'Lab ideas and assistance' },
    
    { id: 'friend-siddharth', name: 'Siddharth Sen', type: 'friend', icon: '🧑‍🎓', description: 'Active 2m ago' },
    { id: 'friend-meera', name: 'Meera Jain', type: 'friend', icon: '👩‍🎓', description: 'Online' },
    { id: 'friend-anya', name: 'Anya Mehta', type: 'friend', icon: '👩', description: 'Offline' },
    { id: 'friend-rahul', name: 'Rahul Dev', type: 'friend', icon: '🧑', description: 'Active 1h ago' },

    { id: 'channel-school', name: 'School Announcements', type: 'channel', icon: '📢', description: 'Official alerts from Principal' },
    { id: 'channel-alerts', name: 'Exam & Test Alerts', type: 'channel', icon: '⚡', description: 'Dates and schedules' },
    { id: 'channel-sports', name: 'Sports & Cultural Hub', type: 'channel', icon: '🏆', description: 'Tournaments schedule' }
  ]);
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>('');
  const [showGroupSettings, setShowGroupSettings] = useState<boolean>(false);
  const [newRoomType, setNewRoomType] = useState<'group' | 'friend' | 'channel'>('group');
  const [newRoomIcon, setNewRoomIcon] = useState<string>('💬');
  const [newRoomDescription, setNewRoomDescription] = useState<string>('');
  const [housePoints, setHousePoints] = useState<{ [key in HouseType]: number }>({
    Ruby: 1450,
    Emerald: 1200,
    Sapphire: 1150,
    Topaz: 1300
  });

  // Onboarding Login form states
  const [authRole, setAuthRole] = useState<UserRole>('student');
  const [authName, setAuthName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authGrade, setAuthGrade] = useState<string>('Grade 10');
  const [authSection, setAuthSection] = useState<SectionType>('Solara');
  const [authHouse, setAuthHouse] = useState<HouseType>('Emerald');
  const [authSpecialty, setAuthSpecialty] = useState<string>('Physics');
  const [authRollNumber, setAuthRollNumber] = useState<string>('');
  const [authDepartment, setAuthDepartment] = useState<string>('');
  const [authSubjects, setAuthSubjects] = useState<string>('');
  const [authDesignation, setAuthDesignation] = useState<string>('');
  const [authPin, setAuthPin] = useState<string>('');

  // Recent Accounts States
  const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>(() => {
    try {
      const cached = localStorage.getItem('s_os_recent_accounts');
      return (cached && cached !== "undefined") ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [securityVerificationAcc, setSecurityVerificationAcc] = useState<RecentAccount | null>(null);
  const [pinVerificationError, setPinVerificationError] = useState<string>('');
  const [enteredVerificationPin, setEnteredVerificationPin] = useState<string>('');
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Input States for New Entries
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newNoteTitle, setNewNoteTitle] = useState<string>('');
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteSubject, setNewNoteSubject] = useState<string>('Physics');
  const [newMaterialTitle, setNewMaterialTitle] = useState<string>('');
  const [newMaterialDesc, setNewMaterialDesc] = useState<string>('');
  const [newMaterialSubject, setNewMaterialSubject] = useState<string>('Physics');
  const [newMaterialType, setNewMaterialType] = useState<'pdf' | 'link' | 'formula-sheet'>('pdf');
  const [newFeedbackText, setNewFeedbackText] = useState<string>('');
  const [newFeedbackCategory, setNewFeedbackCategory] = useState<'facilities' | 'academic' | 'events'>('facilities');
  const [newChatText, setNewChatText] = useState<string>('');
  const [joinRoomCode, setJoinRoomCode] = useState<string>('');

  // Persistent Light/Dark/Auto Theme System State
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('s_os_theme') as any) || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.add('light-theme');
    } else if (themeMode === 'dark') {
      root.classList.remove('light-theme');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.remove('light-theme');
      } else {
        root.classList.add('light-theme');
      }
    }
    localStorage.setItem('s_os_theme', themeMode);
  }, [themeMode]);

  // AI Chat states
  const [selectedPersona, setSelectedPersona] = useState<string>('study_buddy');
  const [aiInput, setAiInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<'explanatory' | 'socratic' | 'coder' | 'quiz_gen'>('explanatory');

  // Multi-thread AI Session History with Persistent Local Storage state
  const [aiThreads, setAiThreads] = useState<{
    id: string;
    title: string;
    personaId: string;
    mode: 'explanatory' | 'socratic' | 'coder' | 'quiz_gen';
    messages: { role: 'user' | 'assistant'; content: string; files?: any[] }[];
    attachedFile?: { name: string; content: string; size: number; type: string } | null;
    attachedFiles?: any[];
    userId?: string;
    createdAt?: number;
  }[]>(() => {
    try {
      const cached = localStorage.getItem('s_os_ai_threads');
      if (cached && cached !== "undefined") {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cachedUser = localStorage.getItem('s_os_user');
          if (cachedUser) {
            const user = JSON.parse(cachedUser);
            if (user?.uid) {
              return parsed.filter((t: any) => t.userId === user.uid);
            }
          }
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    try {
      const cachedUser = localStorage.getItem('s_os_user');
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        if (user?.uid) {
          const cachedActive = localStorage.getItem(`s_os_ai_active_id_${user.uid}`);
          if (cachedActive) return cachedActive;
        }
      }
      const cachedActive = localStorage.getItem('s_os_ai_active_id');
      if (cachedActive) return cachedActive;
    } catch (e) {}
    return '';
  });

  // Derived current thread state helper
  const activeThread = aiThreads.find(t => t.id === activeThreadId) || aiThreads[0] || {
    id: 'thread-default',
    title: 'Introductory Study Unit',
    personaId: 'study_buddy',
    mode: 'explanatory' as const,
    messages: [],
    attachedFile: null,
    attachedFiles: [],
    createdAt: Date.now(),
    userId: currentUser?.uid || ''
  };

  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string; size: number; type: string }[]>([]);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<string | null>(null);

  // User Activity Tracker for Auto-Lock
  useEffect(() => {
    if (autoLockTime <= 0 || isLocked || !currentUser || !['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole || '')) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('mousemove', handleActivity);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= autoLockTime * 60 * 1000) {
        setIsLocked(true);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      clearInterval(interval);
    };
  }, [autoLockTime, lastActivity, isLocked, effectiveRole, currentUser]);

  // Sync Remote Lock State
  useEffect(() => {
    if (currentUser?.raw_data?.isLocked && !isLocked) {
      setIsLocked(true);
    }
  }, [currentUser, isLocked]);

  // Session & Permission Protection
  useEffect(() => {
    if (currentUser) {
      const forbiddenTabsForStudent = ['faculty', 'attendance_manager', 'admin', 'panel_mode'];
      if (effectiveRole === 'student' && forbiddenTabsForStudent.includes(activeTab)) {
        setActiveTab('dashboard');
        showNotification('🚫 Restricted Area: Students are not authorized to view this resource.');
      }
    }
  }, [activeTab, effectiveRole, currentUser]);

  // Local cached sync for active thread, avoiding complex initial hydration errors
  useEffect(() => {
    const cachedActive = localStorage.getItem(`s_os_ai_active_id_${currentUser?.uid}`);
    if (cachedActive && currentUser) setActiveThreadId(cachedActive);
  }, [currentUser?.uid]);

  // Sync active thread ID locally
  useEffect(() => {
    if (currentUser?.uid) {
      localStorage.setItem(`s_os_ai_active_id_${currentUser.uid}`, activeThreadId);
    }
  }, [activeThreadId, currentUser]);

  // Sync active mode, attached files, and active tutor when changing threads
  useEffect(() => {
    if (activeThread) {
      setAiMode(activeThread.mode || 'explanatory');
      setSelectedPersona(activeThread.personaId || 'study_buddy');
      if (activeThread.attachedFiles) {
        setAttachedFiles(activeThread.attachedFiles);
      } else if (activeThread.attachedFile) {
        setAttachedFiles([activeThread.attachedFile]);
      } else {
        setAttachedFiles([]);
      }
    }
  }, [activeThreadId]);

  // Whiteboard Canvas State
  const whiteboardRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const [brushColor, setBrushColor] = useState<string>('#6366f1');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [brushSize, setBrushSize] = useState<number>(4);
  const [canvasTool, setCanvasTool] = useState<string>('pen');
  const [canvasMode, setCanvasMode] = useState<'grid' | 'ruled' | 'blank'>('blank');
  
  // Whiteboard Slides
  const [whiteboardSlides, setWhiteboardSlides] = useState<string[]>(['']);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);


  // Interactive Quiz States
  const [quizSubject, setQuizSubject] = useState<string>('Physics');
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState<number>(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizTimer, setQuizTimer] = useState<number>(15);
  const quizTimerRef = useRef<any>(null);

  // Classroom Live stream states
  const [studentJoinedClass, setStudentJoinedClass] = useState<boolean>(false);
  const [activeBroadcast, setActiveBroadcast] = useState<Lesson | null>(null);
  const [understandingSignals, setUnderstandingSignals] = useState<{ [key: string]: number }>({
    understood: 14,
    confused: 2,
    awesome: 8
  });

  // Quick Sidebar Uploader States
  const [quickUploadDragActive, setQuickUploadDragActive] = useState<boolean>(false);
  const [quickUploadFile, setQuickUploadFile] = useState<File | null>(null);
  const [quickUploadTitle, setQuickUploadTitle] = useState<string>('');
  const [quickUploadSubject, setQuickUploadSubject] = useState<string>('Mathematics');
  const [quickUploadType, setQuickUploadType] = useState<string>('notes');
  const [quickUploadIsUploading, setQuickUploadIsUploading] = useState<boolean>(false);

  // Pomodoro Focus Timer States
  const [pomodoroSeconds, setPomodoroSeconds] = useState<number>(1500); // 25:00
  const [customPomodoro, setCustomPomodoro] = useState<number>(1500); // 25:00
  const [pomodoroRunning, setPomodoroRunning] = useState<boolean>(false);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState<boolean>(false);
  const [timerH, setTimerH] = useState<number>(0);
  const [timerM, setTimerM] = useState<number>(25);
  const [timerS, setTimerS] = useState<number>(0);
  const pomodoroIntervalRef = useRef<any>(null);

  // Study Planner States
  const [schSubject, setSchSubject] = useState<string>('');
  const [schTime, setSchTime] = useState<string>('');
  const [schDay, setSchDay] = useState<string>('Monday');

  // Student Profile Editorial States
  const [profileNameInput, setProfileNameInput] = useState<string>('');
  const [profileGradeInput, setProfileGradeInput] = useState<string>('');
  const [profileSectionInput, setProfileSectionInput] = useState<SectionType>('Solara');
  const [profileHouseInput, setProfileHouseInput] = useState<HouseType>('Emerald');
  const [profileAvatar, setProfileAvatar] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop');

  // Synchronize profile credentials on account update
  useEffect(() => {
    if (currentUser) {
      setProfileNameInput(currentUser.name || '');
      setProfileGradeInput(currentUser.grade || '');
      setProfileSectionInput(currentUser.section || 'Solara');
      setProfileHouseInput(currentUser.house || 'Emerald');
      setProfileAvatar(currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop');
    }
  }, [currentUser]);

  const getNotificationEmoji = (type: string) => {
    switch (type) {
      case 'notice': return '📢';
      case 'assignment': return '📚';
      case 'worksheet': return '📝';
      case 'homework': return '✏️';
      case 'attendance': return '📅';
      case 'marks': return '💯';
      default: return '🔔';
    }
  };

  // Real-time Notification listener with index-safe client-side sorting
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      const localNotifs = localStorage.getItem(`s_os_notifications_${currentUser.uid}`);
      if (localNotifs && localNotifs !== "undefined") {
        setNotifications(JSON.parse(localNotifs));
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('[Sync] Failed to parse local notifications:', err);
      setNotifications([]);
    }
  }, [currentUser]);

  // Handle custom system notification creation events
  useEffect(() => {
    const handleNotificationCreated = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !currentUser) return;

      // Verify targeted user criteria (grade, section, house)
      if (data.targetGrades && data.targetGrades.length > 0) {
        if (!data.targetGrades.includes(currentUser.grade)) return;
      }
      if (data.targetSections && data.targetSections.length > 0) {
        if (!data.targetSections.includes(currentUser.section)) return;
      }
      if (data.targetHouses && data.targetHouses.length > 0) {
        if (!data.targetHouses.includes(currentUser.house)) return;
      }

      const newNotif = {
        id: Math.random().toString(36).substring(7),
        title: data.title || 'New System Notice',
        message: data.message || data.content || '',
        type: data.type || 'notice',
        read: false,
        createdAt: Date.now(),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        localStorage.setItem(`s_os_notifications_${currentUser.uid}`, JSON.stringify(updated));
        return updated;
      });

      showNotification(`🔔 ${newNotif.title}`);
    };

    window.addEventListener('s_os_notification_created', handleNotificationCreated);
    return () => {
      window.removeEventListener('s_os_notification_created', handleNotificationCreated);
    };
  }, [currentUser]);

  // Persist ttsEnabled state to localStorage on modification
  useEffect(() => {
    localStorage.setItem('s_os_tts_enabled', String(ttsEnabled));
  }, [ttsEnabled]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const updated = notifications.map(n => n.id === notifId ? { ...n, read: true } : n);
      setNotifications(updated);
      if (currentUser) {
        localStorage.setItem(`s_os_notifications_${currentUser.uid}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      if (currentUser) {
        localStorage.setItem(`s_os_notifications_${currentUser.uid}`, JSON.stringify(updated));
      }
      showNotification('✓ All notifications marked read.');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDeleteNotif = async (notifId: string) => {
    try {
      const updated = notifications.filter(n => n.id !== notifId);
      setNotifications(updated);
      if (currentUser) {
        localStorage.setItem(`s_os_notifications_${currentUser.uid}`, JSON.stringify(updated));
      }
      showNotification('Notification removed.');
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Toasts Notification State
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  // Effect to manage real clock timing
  useEffect(() => {
    const tInterval = setInterval(() => {
      const live = new Date();
      setClock(live.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(tInterval);
  }, []);

  // Effect to handle Pomodoro countdown ticks
  useEffect(() => {
    if (pomodoroRunning) {
      pomodoroIntervalRef.current = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            clearInterval(pomodoroIntervalRef.current);
            setPomodoroRunning(false);

            if (currentUser) {
              const updated = {
                ...currentUser,
                studyHours: (currentUser.studyHours || 12) + 1
              };
              setCurrentUser(updated);
              localStorage.setItem('s_os_user', JSON.stringify(updated));
            }
            showNotification('🍅 Focus interval completed! Your study hours have been logged.');
            return 1500; // Reset focus length
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    }
    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
      }
    };
  }, [pomodoroRunning, currentUser]);

  // System Notification Handler
  const showNotification = (msg: string) => {
    const id = generateUniqueId();
    setToasts(prev => [...prev, { id, msg }]);
    if (ttsEnabled) {
      speakText(msg);
    }
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Speaks aloud with Web Speech Synthesis
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const cleanText = text.replace(/[#*_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }, 50);
  };

  // --- PHASE 2 CORE ECOSYSTEM EVENT LISTENERS ---
  useEffect(() => {
    const handleCreateNoteEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const { title, content, subject } = customEvt.detail;
      if (!currentUser) return;
      const uid = currentUser.uid;
      const defaultCover = 'bg-gradient-to-r from-violet-600 to-indigo-900';
      const newId = generateUniqueId();
      const newNote = {
        id: newId,
        title: title || 'AI Research Notes Page',
        subject: subject || 'Syllabus General',
        content: content || '',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        icon: '🧠',
        coverBg: defaultCover,
        userId: uid
      };
      setVaultNotes(prev => {
        const updated = [...prev, newNote];
        (async () => {
       const newArr = updated;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
        return updated;
      });
      setSelectedNoteId(newId);
      setNoteEditMode(true);
      showNotification(`✓ Custom AI Notes saved in your Vault!`);
    };

    const handleAddScheduleEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      const { subject, day, time } = customEvt.detail;
      if (!currentUser) return;
      const uid = currentUser.uid;
      const newSch = {
        id: generateUniqueId(),
        subject,
        day,
        time,
        userId: uid
      };
      setSchedules(prev => {
        const updated = [...prev, newSch];
        localStorage.setItem(`s_os_schedules_${uid}`, JSON.stringify(updated));
        return updated;
      });
      showNotification(`✓ Study Slot: ${subject} added to study planner!`);
    };

    window.addEventListener('s_os_create_note', handleCreateNoteEvent);
    window.addEventListener('s_os_add_schedule', handleAddScheduleEvent);
    return () => {
      window.removeEventListener('s_os_create_note', handleCreateNoteEvent);
      window.removeEventListener('s_os_add_schedule', handleAddScheduleEvent);
    };
  }, [currentUser]);

  // Firebase Authentication & Collaborative Real-Time Database Synchronizations
  useEffect(() => {
    console.log('[Auth-Init] Initializing Supabase Auth listeners. Starting 4.5s loading safety timeout.');
    
    // Safety fallback timer: ensure loading screen NEVER gets stuck forever
    const safetyTimer = setTimeout(() => {
      setFirebaseLoading(prev => {
        if (prev) console.warn('[Auth-Init] ⚠️ Safety Timeout: Force-resolving stuck firebaseLoading!');
        return false;
      });
      setDataLoading(prev => {
        if (prev) console.warn('[Auth-Init] ⚠️ Safety Timeout: Force-resolving stuck dataLoading!');
        return false;
      });
    }, 4500); // 4.5 seconds maximum startup wait time

    if (isDemoMode) {
      const demoStudent = {
        uid: 'demo-student-uid',
        name: 'Naitik Kashyap',
        email: 'naitik.kashyap0015@gmail.com',
        role: 'student' as const,
        grade: 'Grade 10',
        section: 'Ruby' as any,
        house: 'Ruby' as any,
        studyHours: 14,
        quizzesTaken: 5,
        streakDays: 8,
        accountStatus: 'approved' as const
      };
      setCurrentUser(demoStudent);
      setFirebaseLoading(false);
      return;
    }

    // Listen for auth success messages if we are the parent window
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        console.log('[Auth] Parent received OAuth success message from popup!');
        showNotification('✅ Google Sign-In successful! Loading your academic workspace...');
        setFirebaseLoading(true);
        setDataLoading(true);
        
        const hash = event.data?.hash || '';
        const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
        const params = new URLSearchParams(cleanHash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data, error }) => {
            if (error) {
              console.error('[Auth] Failed to set session from popup hash:', error);
              window.location.reload();
            } else {
              console.log('[Auth] Session successfully established in parent!');
            }
          }).catch(err => {
            console.error('[Auth] Error setting session from popup hash:', err);
            window.location.reload();
          });
        } else {
          supabase.auth.getSession().then(({ data }) => {
            if (!data?.session) {
              window.location.reload();
            }
          });
        }
      }
    };
    window.addEventListener('message', handleAuthMessage);

    let hasExchanged = false;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hasHashParams = window.location.hash.includes('access_token=') || window.location.hash.includes('id_token=');

    if (code && !hasExchanged) {
      hasExchanged = true;
      setFirebaseLoading(true);
      setDataLoading(true);

      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          try { window.history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
          if (error) {
            console.error('[Auth] Code exchange failed:', error);
            setFirebaseLoading(false);
            setDataLoading(false);
            showNotification(`⚠️ Google Sign-In failed: ${error.message}`);
          }
        })
        .catch(err => {
          console.error('[Auth] Unexpected error in code exchange:', err);
          try { window.history.replaceState({}, document.title, window.location.pathname); } catch (e) {}
          setFirebaseLoading(false);
          setDataLoading(false);
        });
    } else if (hasHashParams) {
      // The Supabase SDK (detectSessionInUrl: true + flowType: 'implicit') already
      // parsed the hash and stored the session locally before this code runs.
      // We just need to read it back with getSession() — no server call needed.
      // DO NOT call setSession() here: it makes a server round-trip that requires
      // the anon key and will fail with 401 if the key is misconfigured.
      setFirebaseLoading(true);
      setDataLoading(true);

      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // Always use getSession() — the SDK already processed the hash automatically
      Promise.resolve(supabase.auth.getSession()).then(({ data, error }) => {
        if (data?.session) {
          try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
        } else {
          console.error('[Auth] No session after hash redirect:', error);
          if (error) showNotification(`⚠️ Sign-in failed: ${error.message}`);
          try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {}
          setFirebaseLoading(false);
          setDataLoading(false);
        }
      }).catch(err => {
        console.error('[Auth] Exception reading session after hash:', err);
        setFirebaseLoading(false);
        setDataLoading(false);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isAuthInProgress = window.location.hash.includes('access_token=') || 
                               window.location.search.includes('code=') || 
                               window.location.hash.includes('id_token=');
      
      setFirebaseLoading(true);

      // Handle active OAuth redirect in progress before session is parsed
      if (isAuthInProgress && !session) {
        setFirebaseLoading(true);
        if (!(window as any).__studentos_auth_timeout__) {
          (window as any).__studentos_auth_timeout__ = setTimeout(() => {
            setFirebaseLoading(false);
            setDataLoading(false);
            delete (window as any).__studentos_auth_timeout__;
          }, 8000);
        }
        return;
      }

      // If we made it here, the session is loaded or isAuthInProgress is false. Clear any safety timeouts.
      if ((window as any).__studentos_auth_timeout__) {
        clearTimeout((window as any).__studentos_auth_timeout__);
        delete (window as any).__studentos_auth_timeout__;
      }

      // If auth parameters were present and we now have a session, strip them immediately to prevent re-exchange on page reload.
      if (isAuthInProgress && session) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error('[Auth] Failed to clear URL credentials:', err);
        }
      }

      const supabaseUser = session?.user;

      if (supabaseUser) {
        setFirebaseOnboardingUser(supabaseUser as any);

        try {
          
          const isWhitelisted = supabaseUser.email && [
            'naitik.kashyap0015@gmail.com',
            'naitik.kashyap5205@gmail.com'
          ].includes(supabaseUser.email.toLowerCase());

          let profile: UserProfile | null = null;
          let isTableMissing = false;

          try {
            profile = await getSupabaseUserProfile(supabaseUser.id, supabaseUser.email);
          } catch (sbErr: any) {
            console.error('[Auth] Failed to fetch user profile:', sbErr);
            isTableMissing = true;
          }

          if (profile) {
            if (isWhitelisted && (profile.role !== 'super_admin' || profile.accountStatus !== 'approved')) {
              profile.role = 'super_admin';
              profile.accountStatus = 'approved';
              try {
                profile = await saveSupabaseUserProfile(profile);
              } catch (e) {
                console.error('[Auth] Failed to update whitelisted user role:', e);
              }
            }

            setCurrentUser(profile);
            localStorage.setItem('s_os_user', JSON.stringify(profile));
            updateRecentAccounts(profile);
            setDataLoading(false);
            showNotification(`Welcome back, ${profile.name}! ✅`);
          } else {
            // Automatically create profile for OAuth users
            console.log('[Auth] Profile not found for OAuth user. Auto-creating profile.');

            const newProfile: UserProfile = {
              uid: supabaseUser.id,
              name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || (isWhitelisted ? 'Super Admin' : 'Student'),
              email: supabaseUser.email || `${supabaseUser.id}@temp.user.com`,
              photoURL: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
              role: isWhitelisted ? 'super_admin' : 'student',
              requestedRole: 'student',
              accountStatus: 'approved',
              studyHours: 0,
              quizzesTaken: 0,
              streakDays: 0,
              lastLogin: Date.now()
            };

            if (isTableMissing) {
              profile = newProfile;
              showNotification('⚠️ Supabase "users" table not found or inaccessible. Running in offline/demo mode.');
            } else {
              try {
                profile = await saveSupabaseUserProfile(newProfile);
                showNotification(`Welcome to StudentOS, ${profile.name}! 🎉`);
              } catch (sbCreateErr: any) {
                console.error('[Auth] Failed to auto-create user profile:', sbCreateErr);
                profile = newProfile;
                showNotification('⚠️ Database save failed. Running with offline user profile.');
              }
            }

            setCurrentUser(profile);
            localStorage.setItem('s_os_user', JSON.stringify(profile));
            updateRecentAccounts(profile);
            setDataLoading(false);
          }
        } catch (err: any) {
          console.error('[Auth] Profile load error:', err);
          setAuthError({
            code: err.code || 'supabase/read-error',
            message: 'Role Load Failed: ' + (err.message || String(err)),
            hostname: window.location.hostname
          });
          
          showNotification(`⚠️ Role Load Failed: ${err.message || String(err)}`);
          
          setCurrentUser(null);
          localStorage.removeItem('s_os_user');
          setFirebaseLoading(false);
          setShowStartup(false);
          setDataLoading(false);
        }
      } else {
        if (!isAuthInProgress) {
          const cachedUserStr = localStorage.getItem('s_os_user');
          let isDemoUser = false;
          if (cachedUserStr) {
            try {
              const u = JSON.parse(cachedUserStr);
              if (u?.uid && (u.uid.startsWith('demo-') || u.isDemo)) {
                isDemoUser = true;
              }
            } catch (_) {}
          }
          if (!isDemoUser) {
            setFirebaseOnboardingUser(null);
            setCurrentUser(null);
            localStorage.removeItem('s_os_user');
            setDataLoading(false);
          } else {
            // Keep demo user active
            setFirebaseLoading(false);
            setDataLoading(false);
          }
        } else {
        }
      }
      
      if (!isAuthInProgress || session) {
        setFirebaseLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      window.removeEventListener('message', handleAuthMessage);
    };
  }, []);

  const STARTUP_MESSAGES = [
    "Calibrating student credentials...",
    "Loading AI Buddy modules...",
    "Syncing with school database...",
    "Booting StudentOS environment..."
  ];

  // Simulates progress and rotating messages for Startup Screen
  useEffect(() => {
    if (firebaseLoading || dataLoading) {
      setLoadingProgress(0);
      setLoadingStep(0);
      setShowStartup(true);
      return;
    }

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShowStartup(false);
          }, 600);
          return 100;
        }
        
        const stepSize = Math.floor(Math.random() * 15) + 5;
        const nextProgress = Math.min(prev + stepSize, 100);
        
        if (nextProgress < 25) {
          setLoadingStep(0);
        } else if (nextProgress < 50) {
          setLoadingStep(1);
        } else if (nextProgress < 75) {
          setLoadingStep(2);
        } else {
          setLoadingStep(3);
        }

        return nextProgress;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [firebaseLoading, dataLoading]);

  const loadedRefs = useRef<{ [key: string]: boolean }>({});

  // Demo Mode Init
  useEffect(() => {
    if (!isDemoMode) return;
    setTasks([
      { id: 'task-1', title: 'AP Physics Vectors Review', completed: false, category: 'Physics', dueDate: 'Tomorrow', subject: 'Physics' },
      { id: 'task-2', title: 'Complete organic chemistry synthesis homework', completed: true, category: 'Chemistry', dueDate: 'Friday', subject: 'Chemistry' },
      { id: 'task-3', title: 'BST Balancing Algorithms practice', completed: false, category: 'Computer Science', dueDate: 'Next Monday', subject: 'Computer Science' }
    ]);
    setVaultNotes([
      { id: 'note-1', title: 'Lecture Notes - Centripetal Mechanics', content: 'Centripetal force is directed toward the center of curvature. The magnitude is F = m v^2 / r. No work is performed globally in circular orbits because force vector is perpendicular to motion displacement.', subject: 'Physics', createdAt: new Date().toLocaleDateString(), icon: '📝' },
      { id: 'note-2', title: 'Chemistry Synthesis notes', content: 'Lewis acid acts as an electron pair acceptor, while Lewis base is an electron pair donor. Important to understand pH vs pKa relations for synthetic organic derivatives.', subject: 'Chemistry', createdAt: new Date().toLocaleDateString(), icon: '🧪' }
    ]);
    setMaterials(INITIAL_MATERIALS);
    setFeedbackPosts(INITIAL_FEEDBACK);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setChats([
      { id: 'chat-1', name: 'Professor Elara', role: 'teacher', message: 'Welcome to the smart study group! Please feel free to ask formulas help.', createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'chat-2', name: 'Naitik Kashyap', role: 'student', message: 'Thank you Professor! The formulas sheet has been super helpful.', createdAt: new Date(Date.now() - 1800000).toISOString() }
    ]);
    const demoThreadId = 'demo-thread-1';
    setAiThreads([
      {
        id: demoThreadId,
        title: 'Study with Professor Elara',
        personaId: 'elara',
        mode: 'explanatory',
        messages: [
          { role: 'assistant', content: "Hello Naitik! Welcome to your Study Session. I am Professor Elara, your AI Science & Engineering specialist. Choose a learning mode or ask a question to begin our deep-dive exploration!" }
        ],
        attachedFile: null,
        attachedFiles: []
      }
    ]);
    setActiveThreadId(demoThreadId);
    setHomeworkList([
      { id: 'hw-1', title: 'Physics Worksheets Chapter 4', subject: 'Physics', content: 'Solve problems 1-15 regarding circular friction.', dueDate: 'Tomorrow', classGrade: 'Grade 10', classSection: 'All Sections', givenBy: 'Prof. Elara', createdAt: new Date().toISOString(), completedList: [] },
      { id: 'hw-2', title: 'C++ BST balancing questions', subject: 'Computer Science', content: 'Design pseudo-code for rotation of tree node structures.', dueDate: 'Friday', classGrade: 'Grade 10', classSection: 'All Sections', givenBy: 'Prof. Elara', createdAt: new Date().toISOString(), completedList: ['naitik.kashyap0015@gmail.com'] }
    ]);
    setSchedules(MOCK_SCHEDULES);
    setDataLoading(false);
  }, [isDemoMode]);

  // System Diagnostics Logging (CHAT_INIT, ROOMS_INIT, CURRENT_USER, CURRENT_ROLE)
  useEffect(() => {
    if (currentUser) {
      console.log("CURRENT_USER", currentUser);
      console.log("CURRENT_ROLE", currentUser.role || 'Unknown');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'peer_chat') {
      console.log("CHAT_INIT", { chatsCount: chats.length });
      console.log("ROOMS_INIT", chatRooms);
    }
  }, [activeTab, chats, chatRooms]);

  // Tasks Sync
  useEffect(() => {
    if (!currentUser) return;
    try {
      const uid = currentUser.uid;
      const localTasks = localStorage.getItem(`s_os_tasks_${uid}`);
      if (localTasks && localTasks !== "undefined") {
        setTasks(JSON.parse(localTasks));
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('[Sync] Failed to parse local tasks:', err);
      setTasks([]);
    }
  }, [currentUser]);

  // Personal Notes Sync
  useEffect(() => {
    if (!currentUser) return;
    const loadNotes = async () => {
      try {
        const uid = currentUser.uid;
        const dbNotes = await getVaultNotes(uid || 'guest');
        setVaultNotes(dbNotes);
      } catch (err) {
        console.error('[Sync] Failed to parse notes:', err);
        setVaultNotes([]);
      }
    };
    loadNotes();
  }, [currentUser]);

  // Homework Persistence Sync
  const isHomeworkLoaded = useRef<boolean>(false);

  useEffect(() => {
    if (!currentUser) {
      isHomeworkLoaded.current = false;
      return;
    }
    getSupabaseHomework().then(list => {
      if (list && list.length > 0) {
        setHomeworkList(list);
      } else {
        // Fallback to default class homework on initial session
        setHomeworkList([
          { id: 'hw-1', title: 'Physics Worksheets Chapter 4', subject: 'Physics', content: 'Solve problems 1-15 regarding circular friction.', dueDate: 'Tomorrow', classGrade: 'Grade 10', classSection: 'All Sections', givenBy: 'Prof. Elara', createdAt: new Date().toISOString(), completedList: [] },
          { id: 'hw-2', title: 'C++ BST balancing questions', subject: 'Computer Science', content: 'Design pseudo-code for rotation of tree node structures.', dueDate: 'Friday', classGrade: 'Grade 10', classSection: 'All Sections', givenBy: 'Prof. Elara', createdAt: new Date().toISOString(), completedList: ['naitik.kashyap0015@gmail.com'] }
        ]);
      }
      isHomeworkLoaded.current = true;
    });
  }, [currentUser]);

  // We don't save the entire list to localStorage anymore in an effect, 
  // because each action (add, complete, delete) will call saveSupabaseHomework individually.

  // AI Buddy Chats Sync — loads when user is authenticated (not just on tab visit)
  useEffect(() => {
    if (!currentUser) {
      aiChatsSyncingFor.current = null;
      return;
    }
    // Use Firebase auth UID consistently (same as what saveAiBuddyChat uses at line 3588)
    const uid = currentUser?.uid || currentUser.uid;
    if (!uid) return;
    
    // Prevent parallel/duplicate syncing for the same user ID
    if (aiChatsSyncingFor.current === uid) return;
    aiChatsSyncingFor.current = uid;
    
    console.log("[SUPABASE-CHAT] Syncing aiBuddyChats for user:", uid);
    
    getAiBuddyChats(uid).then((list) => {
      if (list && list.length > 0) {
        const uniqueList = Array.from(new Map(list.map(t => [t.id, t])).values());
        const sortedList = uniqueList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) as any;
        setAiThreads(sortedList);
        setActiveThreadId(prev => {
          if (!prev || prev === 'thread-default' || !uniqueList.find(t => t.id === prev)) {
            const hasUserDefault = uniqueList.find(t => t.id === `thread-default-${uid}`);
            return hasUserDefault ? `thread-default-${uid}` : (uniqueList[0]?.id || prev);
          }
          return prev;
        });
      } else {
        const userDefaultId = `thread-default-${uid}`;
        const defaultT = {
          id: userDefaultId,
          title: 'Introductory Study Unit',
          personaId: 'study_buddy',
          mode: 'explanatory' as const,
          messages: [
            { role: 'assistant' as const, content: "Hey! 🚀 Welcome to your Campus AI workspace. Here is what you can do:\n\n- **Start New Chat Threads**: Manage different lesson conversations seamlessly.\n- **Toggle Dynamic Learning Modes**: Socratic guidance, deeper explanations, code coach reviews, and exam challenges.\n- **Analyze Uploaded Files**: Drag and drop or browse standard codes, notes, chemistry formulae, or texts here to direct our context!\n\nWhat can I clarify today?" }
          ],
          attachedFile: null,
          attachedFiles: [],
          userId: uid,
          createdAt: Date.now()
        };
        saveAiBuddyChat(defaultT).then(() => {
          setAiThreads([defaultT]);
          setActiveThreadId(userDefaultId);
        });
      }
    }).catch(error => {
      console.error("[SUPABASE-CHAT] Error loading AI buddy chats:", error);
      aiChatsSyncingFor.current = null; // Allow retry on failure
    });
  }, [currentUser]); // Load when user logs in — not gated on tab so chats survive refresh

  // Educational Materials Hub Sync
  useEffect(() => {
    if (!currentUser || activeTab !== 'materials') return;
    console.log("[SUPABASE] Fetching materials for materials hub tab");
    getSupabaseMaterials().then(list => {
      setMaterials(list);
    }).catch(err => {
      console.error('Failed to load materials from Supabase:', err);
    });
  }, [currentUser, activeTab]);

  // Feedback Sync
  useEffect(() => {
    if (!currentUser || activeTab !== 'feedback') return;
    try {
      const localFeedbacks = localStorage.getItem('s_os_feedbacks');
      if (localFeedbacks && localFeedbacks !== "undefined") {
        setFeedbackPosts(JSON.parse(localFeedbacks));
      } else {
        setFeedbackPosts(INITIAL_FEEDBACK);
      }
    } catch (err) {
      console.error('[Sync] Failed to parse local feedbacks:', err);
      setFeedbackPosts(INITIAL_FEEDBACK);
    }
  }, [currentUser, activeTab]);

  // Announcements Sync
  useEffect(() => {
    if (!currentUser || activeTab !== 'dashboard') return;
    try {
      const localAnnouncements = localStorage.getItem('s_os_announcements');
      if (localAnnouncements && localAnnouncements !== "undefined") {
        setAnnouncements(JSON.parse(localAnnouncements));
      } else {
        setAnnouncements(INITIAL_ANNOUNCEMENTS);
      }
    } catch (err) {
      console.error('[Sync] Failed to parse local announcements:', err);
      setAnnouncements(INITIAL_ANNOUNCEMENTS);
    }
  }, [currentUser, activeTab]);

  // Chats Sync On-Demand (Lazy-Loaded from Supabase)
  useEffect(() => {
    if (!currentUser || activeTab !== 'peer_chat') return;
    console.log("[SUPABASE-CHAT] Syncing messages and custom rooms...");
    getPeerMessages().then(list => {
      if (list) {
        console.log(`[SUPABASE-CHAT] Component received MESSAGES_COUNT: ${list.length}, CURRENT_USER: ${currentUser?.uid}, CURRENT_ROOM_ID/CHAT_ROOM_ID: ${activeChatTargetId}`);
        setChats(list);
        setTimeout(() => {
          const scrollArea = document.getElementById('chat-scroll-view');
          if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 80);
      }
    }).catch(err => {
      console.error("[SUPABASE-CHAT] Error fetching peer messages:", err);
    });

    getChatRooms().then(roomsList => {
      if (roomsList) {
        setChatRooms(prev => {
          const merged = [...prev];
          for (const room of roomsList) {
            if (!merged.some(r => r.id === room.id)) {
              merged.push(room);
            }
          }
          return merged;
        });
      }
    }).catch(err => {
      console.error("[SUPABASE-CHAT] Error fetching chat rooms:", err);
    });
  }, [activeTab, currentUser]);

  // --- WebSocket Sync Client ---
  useEffect(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    console.log('[WS Link] Establishing connection to:', wsUrl);
    
    let ws: WebSocket;
    let keepAlive: any;

    const establishConnection = () => {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('[WS Link] Connected successfully!');
      };

      ws.onmessage = (e) => {
        try {
          if (!e.data || e.data === 'undefined') return;
          const payload = JSON.parse(e.data);
          switch (payload.type) {
            case 'sync:state':
              if (payload.state.chats && payload.state.chats.length > 0) {
                setChats(prev => {
                  const combined = [...prev];
                  payload.state.chats.forEach((c: any) => {
                    if (!combined.some(existing => existing.id === c.id)) {
                      combined.push(c);
                    }
                  });
                  return combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                });
              }
              if (payload.state.announcements) setAnnouncements(payload.state.announcements);
              if (payload.state.homework) setHomeworkList(payload.state.homework);
              break;

            case 'chat:received':
              setChats(prev => {
                if (prev.some(c => c.id === payload.chat.id)) return prev;
                return [...prev, payload.chat];
              });
              setTimeout(() => {
                const view = document.getElementById('chat-scroll-view');
                if (view) view.scrollTop = view.scrollHeight;
              }, 40);
              break;

            case 'announcement:received':
              setAnnouncements(prev => {
                if (prev.some(a => a.id === payload.announcement.id)) return prev;
                return [payload.announcement, ...prev];
              });
              showNotification(`📢 NEW ANNOUNCEMENT: ${payload.announcement.title}`);
              break;

            case 'homework:received':
              setHomeworkList(prev => {
                if (prev.some(h => h.id === payload.homework.id)) return prev;
                return [payload.homework, ...prev];
              });
              showNotification(`📝 New Homework Released: ${payload.homework.title}`);
              break;

            case 'homework:updated':
              setHomeworkList(prev => prev.map(h => h.id === payload.homework.id ? payload.homework : h));
              break;

            case 'whiteboard:drawing':
              receiveRemoteWhiteboardDraw(payload.data);
              break;

            case 'whiteboard:cleared':
              clearLocalCanvas();
              break;
          }
        } catch (err) {
          console.error('[WS Link] message process failure', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS Link] Socket closed. Restarting link in 3 seconds...');
        keepAlive = setTimeout(establishConnection, 3000);
      };
    };

    establishConnection();

    return () => {
      if (ws) ws.close();
      clearTimeout(keepAlive);
    };
  }, []);



  // Whiteboard drawing synchronization helpers
  const receiveRemoteWhiteboardDraw = (data: any) => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = data.tool === 'eraser' ? '#0f172a' : data.color || '#6366f1';
    ctx.lineWidth = data.tool === 'eraser' ? data.size * 4 : data.size || 4;

    if (data.type === 'draw') {
      ctx.beginPath();
      ctx.moveTo(data.x1, data.y1);
      ctx.lineTo(data.x2, data.y2);
      ctx.stroke();
    } else if (data.type === 'shape:circle') {
      ctx.beginPath();
      ctx.arc(data.x, data.y, data.radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (data.type === 'shape:rect') {
      ctx.beginPath();
      ctx.strokeRect(data.x, data.y, data.w, data.h);
    }
    ctx.restore();
  };

  const clearLocalCanvas = () => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- Notion-style Gemini AI Notes transform helper ---
  const handleAINoteAction = async (action: string) => {
    const activeNote = vaultNotes.find(n => n.id === selectedNoteId);
    if (!activeNote) return;

    setAiGeneratingNotes(true);
    let promptText = activeNote.content;
    
    const textarea = document.getElementById('notion-editor-textarea') as HTMLTextAreaElement;
    let selectedTextLength = 0;
    let startSel = 0;
    let endSel = 0;

    if (textarea) {
      startSel = textarea.selectionStart;
      endSel = textarea.selectionEnd;
      const selected = textarea.value.substring(startSel, endSel);
      if (selected.trim().length > 5) {
        promptText = selected;
        selectedTextLength = selected.length;
        showNotification('🤖 AI Companion processing highlighted block segment...');
      }
    }

    try {
      let resultText = '';
      try {
        const response = await fetch('/api/ai/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: promptText,
            action,
            instruction: action === 'custom' ? aiCustomPrompt : undefined
          })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('API not available (static deployment)');
        }
        
        if (!response.ok) {
           throw new Error('API not available (static deployment)');
        }

        const resData = await response.json();
        if (resData.error) {
          throw new Error(resData.error);
        }
        resultText = resData.text;
      } catch (err: any) {
        console.log("Server API failed, falling back to client-side AI:", err);
        const { clientSideGemini } = await import('./lib/clientAiFallback');
        let sysInstruction = '';
        if (action === 'summarize') sysInstruction = 'Synthesize into a bulleted cheat-sheet.';
        else if (action === 'expand') sysInstruction = 'Expand and explain with examples.';
        else if (action === 'improve') sysInstruction = 'Proofread and rewrite cleanly.';
        else if (action === 'quiz') sysInstruction = 'Design a 3-question quiz with an answer key.';
        else if (action === 'action_items') sysInstruction = 'Extract an action checklist.';
        else sysInstruction = `Execute this instruction: ${aiCustomPrompt}`;
        
        resultText = await clientSideGemini(`System: ${sysInstruction}\n\nContent:\n${promptText}`);
      }

      if (resultText) {
        if (selectedTextLength > 0) {
          const before = activeNote.content.substring(0, startSel);
          const after = activeNote.content.substring(endSel);
          const updatedContent = before + `\n\n${resultText}\n\n` + after;
          setVaultNotes(prev => {
            const newNotes = prev.map(n => n.id === activeNote.id ? { ...n, content: updatedContent } : n);
            if (currentUser) (async () => {
       const newArr = newNotes;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
            return newNotes;
          });
        } else {
          const updatedContent = action === 'summarize' || action === 'improve'
            ? resultText 
            : activeNote.content + `\n\n---\n\n### 🤖 AI Expansion:\n` + resultText;
          setVaultNotes(prev => {
            const newNotes = prev.map(n => n.id === activeNote.id ? { ...n, content: updatedContent } : n);
            if (currentUser) (async () => {
       const newArr = newNotes;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
            return newNotes;
          });
        }
        showNotification('⚡ Notion block written successfully with Gemini!');
        if (action === 'custom') setAiCustomPrompt('');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(`Could not establish connection with AI: ${err.message}`);
    } finally {
      setAiGeneratingNotes(false);
    }
  };




  // Sync house stats simulation
  const addHousePoints = (houseName: HouseType, amt: number) => {
    setHousePoints(prev => {
      const next = { ...prev, [houseName]: prev[houseName] + amt };
      showNotification(`House ${houseName} earned +${amt} points!`);
      return next;
    });
  };

  // Auth Operations
  const handleMockLogin = (role: 'student' | 'teacher' | 'admin' | 'coordinator' | 'super_admin') => {
    let mockProfile: UserProfile = {
      uid: `mock-${role}-12345`,
      email: `mock_${role}@school.edu`,
      name: `Mock ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role: role as any,
    };
    if (role === 'student') {
      mockProfile.grade = 'Grade 10';
      mockProfile.section = 'Solara';
      mockProfile.house = 'Emerald';
    }
    if (role === 'teacher') {
      mockProfile.assignedGrades = ['Grade 10', 'Grade 12'];
      mockProfile.assignedSections = ['Solara', 'Astra'];
      mockProfile.assignedClasses = ['10_Solara', '12_Astra'];
    }
    showNotification(`Dropping into Dev Mode as ${role}`);
    setCurrentUser(mockProfile);
    localStorage.setItem('s_os_user', JSON.stringify(mockProfile));
    saveSupabaseUserProfile(mockProfile).catch(console.error);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showNotification('Please provide email and password');
      return;
    }
    
    try {
      setAuthError(null);
      setFirebaseLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        throw error;
      }
      
      showNotification('Login successful!');
    } catch (err: any) {
      console.error('Email login error:', err);
      setAuthError({
        code: err.code || 'login-error',
        message: err.message || 'Login failed',
        hostname: window.location.hostname
      });
      showNotification(`Login failed: ${err.message}`);
      setFirebaseLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.url,
          'supabase-google-signin',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        if (!popup) {
          showNotification('⚠️ Popup blocked. Please allow popups for this site.');
        } else {
          showNotification('🔑 Sign-In popup opened. Please complete Google authentication.');
        }
      }
    } catch (error: any) {
      console.error('[Auth] Google Sign-In failed:', error);
      const code = error?.code || 'unknown';
      const msg = error?.message || String(error);
      setAuthError({
        code,
        message: msg,
        hostname: window.location.hostname
      });
      showNotification(`❌ Sign-In Failed: [${code}] ${msg}`);
    }
  };

  const handleGoogleSignInWithSelect = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            prompt: 'select_account'
          },
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.url,
          'supabase-google-signin',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        if (!popup) {
          showNotification('⚠️ Popup blocked. Please allow popups for this site.');
        } else {
          showNotification('🔑 Sign-In popup opened. Please choose your Google account.');
        }
      }
    } catch (error: any) {
      console.error('[Auth] Google Sign-In with select_account failed:', error);
      const code = error?.code || 'unknown';
      const msg = error?.message || String(error);
      setAuthError({
        code,
        message: msg,
        hostname: window.location.hostname
      });
      showNotification(`❌ Sign-In Failed: [${code}] ${msg}`);
    }
  };

  const updateRecentAccounts = (profile: UserProfile) => {
    if (!profile || !profile.uid) return;
    const newAcc: RecentAccount = {
      uid: profile.uid,
      name: profile.name || 'Anonymous',
      email: profile.email || '',
      photoURL: profile.photoURL || profile.avatar || '',
      role: profile.role || 'student',
      lastLogin: Date.now()
    };
    setRecentAccounts(prev => {
      const filtered = prev.filter(a => a.email !== profile.email && a.uid !== profile.uid);
      const updated = [newAcc, ...filtered].slice(0, 5);
      localStorage.setItem('s_os_recent_accounts', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLinkGoogle = async () => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.url,
          'supabase-google-signin',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        if (!popup) {
          showNotification('⚠️ Popup blocked. Please allow popups for this site.');
        } else {
          showNotification('🔑 Account-linking popup opened.');
        }
      }
    } catch (error: any) {
      console.error('[Auth] Link Google failed:', error);
      const code = error?.code || 'unknown';
      const msg = error?.message || String(error);
      setAuthError({
        code,
        message: msg,
        hostname: window.location.hostname
      });
      showNotification(`❌ Account linking failed: [${code}] ${msg}`);
    }
  };

  const handleContinueRecentAccount = async (acc: RecentAccount) => {
    if (acc.uid && acc.uid.startsWith('manual-')) {
      if (acc.role === 'admin' || acc.role === 'coordinator' || acc.role === 'super_admin') {
        setSecurityVerificationAcc(acc);
        setEnteredVerificationPin('');
        setPinVerificationError('');
        setIsPinModalOpen(true);
      } else {
        try {
          let profile: UserProfile | null = null;
          try {
            profile = await getSupabaseUserProfile(acc.uid);
          } catch (sbErr) {
            console.error('[Supabase] Failed to load recent account from Supabase:', sbErr);
          }

          if (profile) {
            setCurrentUser(profile);
            localStorage.setItem('s_os_user', JSON.stringify(profile));
            showNotification(`Authenticated successfully as ${profile.name}!`);
          } else {
            showNotification('Profile not found in Supabase database.');
          }
        } catch (e) {
          console.error(e);
          showNotification('Error loading manual profile.');
        }
      }
    } else {
      if (acc.role === 'admin' || acc.role === 'coordinator' || acc.role === 'super_admin') {
        setSecurityVerificationAcc(acc);
        setEnteredVerificationPin('');
        setPinVerificationError('');
        setIsPinModalOpen(true);
      } else {
        await performGoogleAuthForRecentAccount(acc);
      }
    }
  };

  const performGoogleAuthForRecentAccount = async (acc: RecentAccount) => {
    try {
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            login_hint: acc.email
          },
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });
      if (error) throw error;
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        const popup = window.open(
          data.url,
          'supabase-google-signin',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        if (!popup) {
          showNotification('⚠️ Popup blocked. Please allow popups for this site.');
        } else {
          showNotification(`🔑 Sign-In popup opened for ${acc.name}.`);
        }
      }
    } catch (error: any) {
      console.error('[Auth] Recent account Google sign-in failed:', error);
      const code = error?.code || 'unknown';
      const msg = error?.message || String(error);
      setAuthError({
        code,
        message: msg,
        hostname: window.location.hostname
      });
      showNotification(`❌ Authentication Failed: [${code}] ${msg}`);
    }
  };

  const handleVerifyPinAndLogin = async () => {
    if (!securityVerificationAcc) return;
    try {
      let profile: UserProfile | null = null;
      try {
        profile = await getSupabaseUserProfile(securityVerificationAcc.uid);
      } catch (sbErr) {
        console.error('[Supabase] Failed to check PIN from Supabase:', sbErr);
      }

      if (profile) {
        const expectedPin = profile.pin || (import.meta as any).env.VITE_ADMIN_PIN || '1234';
        if (enteredVerificationPin === expectedPin) {
          setIsPinModalOpen(false);
          setPinVerificationError('');
          showNotification('PIN verified. Terminating verification gate...');
          if (securityVerificationAcc.uid && securityVerificationAcc.uid.startsWith('manual-')) {
            setCurrentUser(profile);
            localStorage.setItem('s_os_user', JSON.stringify(profile));
            showNotification(`Welcome back, ${profile.name}!`);
          } else {
            await performGoogleAuthForRecentAccount(securityVerificationAcc);
          }
        } else {
          setPinVerificationError('Incorrect 4-digit PIN. Please try again.');
        }
      } else {
        setPinVerificationError('Account record not found.');
      }
    } catch (err) {
      console.error(err);
      setPinVerificationError('Error validating PIN with security node.');
    }
  };

  const handleRemoveRecentAccount = (email: string) => {
    setRecentAccounts(prev => {
      const updated = prev.filter(a => a.email !== email);
      localStorage.setItem('s_os_recent_accounts', JSON.stringify(updated));
      return updated;
    });
    showNotification('Account reference removed from device list.');
  };

  const hashPassword = async (password: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.error('SubtleCrypto failure, using fallback hash:', e);
      let hash = 0;
      for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return `fb-${Math.abs(hash).toString(16)}`;
    }
  };

  const handleOnboardingLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regName.trim()) {
      showNotification('Please provide a valid name tag.');
      return;
    }
    
    // NEW: Full name validation (only letters, spaces, hyphens)
    const nameRegex = /^[A-Za-z\s\-]+$/;
    if (!nameRegex.test(regName.trim())) {
      showNotification('Full name must contain only letters, spaces, and hyphens.');
      return;
    }

    if (!regEmail.trim()) {
      showNotification('Please provide a valid school email.');
      return;
    }
    
    const finalEmail = regEmail.trim();

    // Sign up with Supabase Auth if not linked via Google
    let actualUid = linkedGoogleUid;
    let passwordHash = '';
    if (!isGoogleLinked) {
      if (!regPassword || regPassword.length < 6) {
         showNotification('Please provide a password of at least 6 characters.');
         return;
      }
      
      passwordHash = await hashPassword(regPassword);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: finalEmail,
        password: regPassword,
        options: {
          data: {
            full_name: regName.trim(),
          }
        }
      });
      
      if (authError) {
        console.error('Supabase Auth Signup Error:', authError);
        showNotification(`Signup failed: ${authError.message}`);
        return;
      }
      
      if (authData.user) {
         setLinkedGoogleUid(authData.user.id);
         actualUid = authData.user.id;
      }
    }

    const statusMap = {
      student: 'approved',
      teacher: 'pending_teacher',
      coordinator: 'pending_coordinator',
      admin: 'pending_admin'
    };

    const isWhitelisted = finalEmail && [
      'naitik.kashyap0015@gmail.com',
      'naitik.kashyap5205@gmail.com'
    ].includes(finalEmail.toLowerCase());

    const status = isWhitelisted ? 'approved' : (statusMap[regRole] || 'approved');
    // Using the auth user id if available, otherwise it will just use a fallback which shouldn't happen with real Auth
    const uid = actualUid || `manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newProfile: any = {
      uid: uid,
      name: regName.trim(),
      email: finalEmail,
      photoURL: regPhoto.trim() || linkedGooglePhoto || '',
      role: isWhitelisted ? 'super_admin' : 'student', // Everyone starts as student except whitelisted
      requestedRole: isWhitelisted ? 'admin' : regRole,
      accountStatus: status,
      studyHours: 8,
      quizzesTaken: 2,
      streakDays: 4,
      lastLogin: Date.now(),
      raw_data: {
        password_hash: passwordHash
      }
    };

    if (regRole === 'student') {
      newProfile.grade = regGrade;
      newProfile.section = regSection;
      newProfile.house = regHouse;
    } else if (regRole === 'teacher') {
      newProfile.specialtySubject = regSubjects.split(',')[0]?.trim() || 'General';
      newProfile.department = regDept.trim();
      newProfile.subjects = regSubjects.split(',').map(s => s.trim()).filter(Boolean);
      newProfile.pin = (import.meta as any).env.VITE_ADMIN_PIN || '1234';
    } else if (regRole === 'coordinator') {
      newProfile.specialtySubject = 'General';
      newProfile.department = regDept.trim();
      newProfile.pin = (import.meta as any).env.VITE_ADMIN_PIN || '1234';
    } else if (regRole === 'admin') {
      newProfile.specialtySubject = 'General';
      newProfile.designation = regDesignation.trim();
      newProfile.pin = (import.meta as any).env.VITE_ADMIN_PIN || '1234';
    }
    
    if (newProfile.role === 'super_admin') {
      newProfile.pin = (import.meta as any).env.VITE_ADMIN_PIN || '1234';
    }

    try {
      try {
        await saveSupabaseUserProfile(newProfile);
      } catch (sbErr) {
        console.error('[Supabase] Failed to save new registration to Supabase:', sbErr);
        throw sbErr;
      }
      
      setCurrentUser(newProfile);
      updateRecentAccounts(newProfile);
      localStorage.setItem('s_os_user', JSON.stringify(newProfile));
      
      if (regRole === 'student') {
        showNotification(`Welcome to StudentOS, ${newProfile.name}!`);
      } else {
        showNotification(`Request submitted for ${regRole.toUpperCase()} approval. Exploring as Student in the meantime!`);
      }
      
      setRegStep('login');
    } catch (error: any) {
      console.error('Failed to register user:', error);
      showNotification(`⚠️ Registration failed: ${error.message || String(error)}`);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('s_os_user');
      localStorage.removeItem('s_os_active_tab');
      setCurrentUser(null);
      setStudentJoinedClass(false);
      
      // Reset business states
      setTasks([]);
      setVaultNotes([]);
      setMaterials([]);
      setFeedbackPosts([]);
      setAnnouncements([]);
      setChats([]);
      setAiThreads([]);
      setHomeworkList([]);
      setSchedules([]);
      setStudents([]);
      
      showNotification('Workspace session terminated.');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Tasks manager operations
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !currentUser) return;
    const uid = currentUser.uid;
    const taskId = generateUniqueId();
    const item: Task = {
      id: taskId,
      title: newTaskTitle.trim(),
      completed: false,
      dueDate: 'June 15',
      subject: currentUser?.specialtySubject || 'General',
      userId: uid,
      createdAt: new Date().toISOString()
    };
    try {
      const updated = [...tasks, item];
      setTasks(updated);
      localStorage.setItem(`s_os_tasks_${uid}`, JSON.stringify(updated));
      setNewTaskTitle('');
      showNotification('New task milestone appended to local repository.');
    } catch (err: any) {
      console.error('Failed to add task:', err);
    }
  };

  const toggleTask = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(updated);
    localStorage.setItem(`s_os_tasks_${uid}`, JSON.stringify(updated));
  };

  const deleteTask = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem(`s_os_tasks_${uid}`, JSON.stringify(updated));
    showNotification('Task deleted.');
  };

  // Vault Notes notes state
  const handleSaveNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim() || !currentUser) {
      showNotification('Please provide a title and transcript contents.');
      return;
    }
    const uid = currentUser.uid;
    const noteId = generateUniqueId();
    const note: VaultNote = {
      id: noteId,
      title: newNoteTitle.trim(),
      subject: newNoteSubject,
      content: newNoteContent.trim(),
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      userId: uid
    };
    try {
      const updated = [...vaultNotes, note];
      setVaultNotes(updated);
      (async () => {
       const newArr = updated;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
      setNewNoteTitle('');
      setNewNoteContent('');
      showNotification('Lecture notes secured.');
    } catch (err: any) {
      console.error('Error saving note:', err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      name: profileNameInput.trim() || currentUser.name,
      grade: profileGradeInput || currentUser.grade,
      section: profileSectionInput,
      house: profileHouseInput,
      avatar: profileAvatar,
      photoURL: profileAvatar
    };
    try {
      try {
        await saveSupabaseUserProfile(updated);
      } catch (sbErr) {
        console.error('[Supabase] Failed to save profile to Supabase:', sbErr);
        throw sbErr;
      }
      
      setCurrentUser(updated);
      showNotification('Academic profile credentials synced successfully.');
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schSubject.trim() || !schTime.trim()) {
      showNotification('Provide both a focus subject and a target window.');
      return;
    }
    const item: ScheduleItem = {
      id: generateUniqueId(),
      subject: schSubject.trim(),
      time: schTime.trim(),
      day: schDay
    };
    setSchedules(prev => [...prev, item]);
    setSchSubject('');
    setSchTime('');
    showNotification('Schedule Interval Added');
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(item => item.id !== id));
    showNotification('Schedule Interval Removed');
  };

  const handleDeleteNote = async (id: string) => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const updated = vaultNotes.filter(n => n.id !== id);
    setVaultNotes(updated);
    (async () => {
       const newArr = updated;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
    showNotification('Lecture note removed.');
  };

  const handleCreateNewNote = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const defaultCover = [
      'bg-gradient-to-r from-violet-600 to-indigo-900',
      'bg-gradient-to-r from-emerald-600 to-teal-900',
      'bg-gradient-to-r from-rose-600 to-amber-900',
      'bg-gradient-to-r from-cyan-600 to-blue-900',
      'bg-gradient-to-r from-slate-700 to-slate-900'
    ][Math.floor(Math.random() * 5)];
    const defaultIcon = ['📝', '💡', '💻', '🧠', '🔬', '🧪', '📐', '🎨', '🚀'][Math.floor(Math.random() * 9)];
    const newId = generateUniqueId();
    const newNote: VaultNote = {
      id: newId,
      title: 'Untitled Note Page',
      subject: 'Syllabus General',
      content: '# Untitled Note\n\nWrite your thoughts using **Markdown** formatting. Click on the reader view tab to preview!\n\n## Core Concepts\n- Concept 1\n- Concept 2',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      icon: defaultIcon,
      coverBg: defaultCover,
      userId: uid
    };
    try {
      const updated = [...vaultNotes, newNote];
      setVaultNotes(updated);
      (async () => {
       const newArr = updated;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
      setSelectedNoteId(newId);
      setNoteEditMode(true);
      showNotification('Study canvas instantiated!');
    } catch (err: any) {
      console.error('Error creating note:', err);
    }
  };

  // Smart Board Draw functions
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    whiteboardHistory.current.push(canvas.toDataURL('image/png'));
    whiteboardRedoStack.current = [];

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    lastXRef.current = x;
    lastYRef.current = y;
    startXRef.current = x;
    startYRef.current = y;
  };

  const drawOnCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    if (canvasShape === 'free' || canvasTool === 'eraser') {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = canvasTool === 'eraser' ? '#0f172a' : brushColor;
      
      if (canvasTool === 'marker') {
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = brushSize * 2;
      } else if (canvasTool === 'brush') {
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = brushSize * 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = brushColor;
      } else if (canvasTool === 'fountain') {
        const dx = x - lastXRef.current;
        const dy = y - lastYRef.current;
        const speed = Math.sqrt(dx * dx + dy * dy);
        ctx.lineWidth = Math.max(1, brushSize - speed * 0.1);
      } else {
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.lineWidth = canvasTool === 'eraser' ? brushSize * 4 : brushSize;
      }

      ctx.beginPath();
      ctx.moveTo(lastXRef.current, lastYRef.current);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Reset
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'whiteboard:draw',
          data: {
            type: 'draw',
            x1: lastXRef.current,
            y1: lastYRef.current,
            x2: x,
            y2: y,
            color: brushColor,
            size: brushSize,
            tool: canvasTool
          }
        }));
      }
    }

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = whiteboardRef.current;
    if (!canvas) return;
    
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x: endX, y: endY } = getCoordinates(e);

    if (canvasTool !== 'eraser' && canvasShape !== 'free') {
      ctx.save();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (canvasShape === 'rect') {
        const w = endX - startXRef.current;
        const h = endY - startYRef.current;
        ctx.strokeRect(startXRef.current, startYRef.current, w, h);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'whiteboard:draw',
            data: { type: 'shape:rect', x: startXRef.current, y: startYRef.current, w, h, color: brushColor, size: brushSize }
          }));
        }
      } else if (canvasShape === 'circle') {
        const r = Math.sqrt(Math.pow(endX - startXRef.current, 2) + Math.pow(endY - startYRef.current, 2));
        ctx.beginPath();
        ctx.arc(startXRef.current, startYRef.current, r, 0, 2 * Math.PI);
        ctx.stroke();

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'whiteboard:draw',
            data: { type: 'shape:circle', x: startXRef.current, y: startYRef.current, radius: r, color: brushColor, size: brushSize }
          }));
        }
      } else if (canvasShape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(startXRef.current + (endX - startXRef.current) / 2, startYRef.current);
        ctx.lineTo(endX, endY);
        ctx.lineTo(startXRef.current, endY);
        ctx.closePath();
        ctx.stroke();
      } else if (canvasShape === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startXRef.current, startYRef.current);
        ctx.lineTo(endX, endY);
        const angle = Math.atan2(endY - startYRef.current, endX - startXRef.current);
        ctx.lineTo(endX - 20 * Math.cos(angle - Math.PI / 6), endY - 20 * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 20 * Math.cos(angle + Math.PI / 6), endY - 20 * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (canvasShape === 'star') {
        const r = Math.sqrt(Math.pow(endX - startXRef.current, 2) + Math.pow(endY - startYRef.current, 2));
        const spikes = 5;
        const outerRadius = r;
        const innerRadius = r / 2;
        let rot = Math.PI / 2 * 3;
        let x = startXRef.current;
        let y = startYRef.current;
        let step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(startXRef.current, startYRef.current - outerRadius);
        for (let i = 0; i < spikes; i++) {
          x = startXRef.current + Math.cos(rot) * outerRadius;
          y = startYRef.current + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;
          x = startXRef.current + Math.cos(rot) * innerRadius;
          y = startYRef.current + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(startXRef.current, startYRef.current - outerRadius);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  const clearCanvas = () => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showNotification('Canvas cleared.');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'whiteboard:clear'
      }));
    }
  };

  const drawShapeOnWhiteboard = (shape: string, text?: string) => {
    setTimeout(() => {
      const canvas = whiteboardRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const r = Math.min(canvas.width, canvas.height) / 4;

      if (shape === 'circle') {
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (shape === 'rect' || shape === 'rectangle' || shape === 'square') {
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
        ctx.stroke();
      } else if (shape === 'triangle') {
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy + r);
        ctx.lineTo(cx - r, cy + r);
        ctx.closePath();
        ctx.stroke();
      } else if (shape === 'arrow') {
        ctx.moveTo(cx - r, cy);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx + r - 20, cy - 20);
        ctx.moveTo(cx + r, cy);
        ctx.lineTo(cx + r - 20, cy + 20);
        ctx.stroke();
      } else if (shape === 'star') {
        const spikes = 5;
        const outerRadius = r;
        const innerRadius = r / 2;
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;
          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.stroke();
      } else if (shape === 'text' && text) {
        ctx.font = `bold ${Math.max(24, canvas.height / 20)}px monospace`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        const lines = text.split('\n');
        const lineHeight = parseInt(ctx.font, 10) * 1.2;
        lines.forEach((line, index) => {
          ctx.fillText(line, cx, cy - (lines.length * lineHeight) / 2 + index * lineHeight);
        });
      }

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'whiteboard:drawShape',
          data: { shape, cx, cy, r, color: brushColor, size: brushSize, text }
        }));
      }
    }, 100);
  };

  // Expose methods for Orion
  useEffect(() => {
    (window as any).whiteboardCreateSlide = () => {
      setWhiteboardSlides(prev => [...prev, '']);
      setCurrentSlideIndex(whiteboardSlides.length);
      clearCanvas();
    };
    (window as any).whiteboardNextSlide = () => {
      if (currentSlideIndex < whiteboardSlides.length - 1) {
        loadSlide(currentSlideIndex + 1);
      }
    };
    (window as any).whiteboardPrevSlide = () => {
      if (currentSlideIndex > 0) {
        loadSlide(currentSlideIndex - 1);
      }
    };
    (window as any).whiteboardDuplicateSlide = () => {
      const snap = whiteboardRef.current?.toDataURL('image/png') || '';
      setWhiteboardSlides(prev => {
        const next = [...prev];
        next.splice(currentSlideIndex + 1, 0, snap);
        return next;
      });
      setCurrentSlideIndex(idx => idx + 1);
    };
    (window as any).whiteboardDeleteSlide = () => {
      if (whiteboardSlides.length <= 1) {
         clearCanvas();
         setWhiteboardSlides(['']);
         setCurrentSlideIndex(0);
         return;
      }
      setWhiteboardSlides(prev => prev.filter((_, i) => i !== currentSlideIndex));
      setCurrentSlideIndex(idx => Math.max(0, idx - 1));
      setTimeout(() => {
         loadSlide(Math.max(0, currentSlideIndex - 1));
      }, 50);
    };
    
    (window as any).whiteboardUndo = () => {
      const canvas = whiteboardRef.current;
      if (canvas && whiteboardHistory.current.length > 0) {
        whiteboardRedoStack.current.push(canvas.toDataURL('image/png'));
        const previousState = whiteboardHistory.current.pop();
        if (previousState) {
          clearCanvas();
          const img = new Image();
          img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0);
          img.src = previousState;
        }
      }
    };

    (window as any).whiteboardRedo = () => {
      const canvas = whiteboardRef.current;
      if (canvas && whiteboardRedoStack.current.length > 0) {
        whiteboardHistory.current.push(canvas.toDataURL('image/png'));
        const nextState = whiteboardRedoStack.current.pop();
        if (nextState) {
          clearCanvas();
          const img = new Image();
          img.onload = () => canvas.getContext('2d')?.drawImage(img, 0, 0);
          img.src = nextState;
        }
      }
    };

    return () => {
      delete (window as any).whiteboardCreateSlide;
      delete (window as any).whiteboardNextSlide;
      delete (window as any).whiteboardPrevSlide;
      delete (window as any).whiteboardDuplicateSlide;
      delete (window as any).whiteboardDeleteSlide;
      delete (window as any).whiteboardUndo;
      delete (window as any).whiteboardRedo;
    };
  }, [currentSlideIndex, whiteboardSlides]);

  const loadSlide = (index: number) => {
    // Save current slide first
    const canvas = whiteboardRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const newSlides = [...whiteboardSlides];
      newSlides[currentSlideIndex] = dataUrl;
      setWhiteboardSlides(newSlides);
    }
    
    // Load next slide
    setCurrentSlideIndex(index);
    clearCanvas();
    if (whiteboardSlides[index]) {
      const img = new Image();
      img.onload = () => {
        const ctx = whiteboardRef.current?.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
      };
      img.src = whiteboardSlides[index];
    }
  };

  // Robust Whiteboard canvas resize setup
  useEffect(() => {
    if (activeTab === 'whiteboard') {
      const canvas = whiteboardRef.current;
      if (!canvas) return;
      
      const updateCanvasSize = () => {
        const parent = canvas.parentElement;
        if (parent) {
          // Save drawing before resize 
          const ctx = canvas.getContext('2d');
          let tempCanvas: HTMLCanvasElement | null = null;
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tCtx = tempCanvas.getContext('2d');
            if (tCtx) tCtx.drawImage(canvas, 0, 0);
          }

          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;

          // Restore drawing
          if (ctx && tempCanvas) {
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      };

      // Initial size
      updateCanvasSize();

      // Observe parent for resize
      const observer = new ResizeObserver(() => {
        updateCanvasSize();
      });

      if (canvas.parentElement) {
        observer.observe(canvas.parentElement);
      }

      return () => observer.disconnect();
    }
  }, [activeTab]);

  // Teacher Presentation Broadcasts
  const handleTeacherBroadcast = () => {
    const summaryBullets = [
      'Understand binary tree balance formulas.',
      'Rotations execute structural shift O(1) in-place pointers.',
      'Check heights at each child branch after push methods.'
    ];

    const initialLesson: Lesson = {
      id: 'les-active',
      title: 'Structural Rotations in Balanced Trees',
      subject: currentUser?.specialtySubject || 'Computer Science',
      presentedBy: currentUser?.name || 'Class Professor',
      slides: summaryBullets,
      currentSlideIndex: 0,
      isActive: true,
      smartBoardNotes: 'Verify standard AVL tree rotation vectors: Left-Left vs. Left-Right double rotations.'
    };

    setActiveBroadcast(initialLesson);
    setLessons(prev => [initialLesson, ...prev]);
    showNotification('Lesson presentation is now Live Broadcasted to all sections!');
  };

  const handleStopBroadcast = () => {
    setActiveBroadcast(null);
    showNotification('Lesson stream terminated.');
  };

  // Student Classroom interaction actions
  const sendStudentSignal = (type: string) => {
    setUnderstandingSignals(prev => {
      const counter = prev[type] || 0;
      return { ...prev, [type]: counter + 1 };
    });
    showNotification(`Status token "${type.toUpperCase()}" transmitted to your faculty dashboards.`);
  };

  // Material Resource Hub additions
  const handleAddMaterial = async (titleText?: string, descText?: string) => {
    const finalTitle = titleText || newMaterialTitle;
    const finalDesc = descText || newMaterialDesc;

    if (!finalTitle.trim() || !finalDesc.trim()) {
      showNotification('Required: resource name and description tags.');
      return;
    }

    const matId = generateUniqueId();
    const docItem: MaterialResource = {
      id: matId,
      title: finalTitle.trim(),
      subject: newMaterialSubject,
      type: newMaterialType,
      description: finalDesc.trim(),
      uploadedBy: currentUser?.name || 'Academic Faculty',
      uploaderUid: currentUser?.uid || '',
      uploaderHouse: currentUser?.house || '',
      uploaderSection: currentUser?.section || '',
      createdAt: new Date().toISOString().split('T')[0],
      created_at: Date.now(),
      isPublic: newMaterialIsPublic,
      visibleToGrades: newMaterialIsPublic ? undefined : newMaterialGrades,
      visibleToSections: newMaterialIsPublic ? undefined : newMaterialSections,
      visibleToHouses: newMaterialIsPublic ? undefined : newMaterialHouses,
      downloads: 1,
      likes: 0,
      likedBy: [],
      views: 1,
      isVerified: effectiveRole === 'teacher',
      comments: []
    };

    try {
      await saveSupabaseMaterial(docItem);
      // Optimistic update: show immediately without waiting for refetch
      setMaterials(prev => [docItem, ...prev]);
      setNewMaterialTitle('');
      setNewMaterialDesc('');
      
      // Reset permissions state fields
      setNewMaterialIsPublic(true);
      setNewMaterialGrades([]);
      setNewMaterialSections([]);
      setNewMaterialHouses([]);

      showNotification('Academic resource shared successfully on Materials Hub!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `materials/${matId}`);
    }
  };

  // Toggle Like Material
  const toggleLikeMaterial = async (mat: MaterialResource) => {
    if (!currentUser || !auth.currentUser) return;
    const myUid = currentUser?.uid || "";
    const isLiked = mat.likedBy?.includes(myUid);
    const updatedLikedBy = isLiked
      ? (mat.likedBy || []).filter(u => u !== myUid)
      : [...(mat.likedBy || []), myUid];
    const updatedLikesCount = updatedLikedBy.length;
    
    // popular award threshold
    const becamePopular = !isLiked && updatedLikesCount === 5;
    
    const nextMat = { ...mat, likes: updatedLikesCount, likedBy: updatedLikedBy };
    try {
      await saveSupabaseMaterial(nextMat);
      setMaterials(prev => prev.map(m => m.id === mat.id ? nextMat : m));
      if (becamePopular && mat.uploaderHouse) {
        showNotification(`❤️ Popular Item! "${mat.title}" crossed 5 likes.`);
      }
    } catch (err) {
      console.error("Failed to update like count in Supabase:", err);
    }
  };

  // Download material wrapper (increments download tally)
  const handleDownloadMaterial = async (mat: MaterialResource) => {
    const finalUrl = mat.url || mat.fileUrl || mat.file_url || mat.attachment_url;
    if (finalUrl) {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
      // Increment downloads
      const updatedDownloads = (mat.downloads || 0) + 1;
      const nextMat = { ...mat, downloads: updatedDownloads };
      try {
        await saveSupabaseMaterial(nextMat);
        setMaterials(prev => prev.map(m => m.id === mat.id ? nextMat : m));
      } catch (err) {
        console.error("Failed to update download count in Supabase:", err);
      }
    } else {
      showNotification('Link not available for this material.');
    }
  };

  // Increment view counter
  const incrementViewsMaterial = async (mat: MaterialResource) => {
    const updatedViews = (mat.views || 0) + 1;
    const nextMat = { ...mat, views: updatedViews };
    try {
      await saveSupabaseMaterial(nextMat);
      setMaterials(prev => prev.map(m => m.id === mat.id ? nextMat : m));
    } catch (err) {
      console.error("Failed to update view count in Supabase:", err);
    }
  };

  // Add Comment on Material
  const handleAddComment = async (mat: MaterialResource) => {
    if (!newCommentText.trim()) return;
    const commentId = generateUniqueId();
    const newComment = {
      id: commentId,
      author: currentUser?.name || 'Academic Scholar',
      house: currentUser?.house || undefined,
      text: newCommentText.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    const updatedComments = [...(mat.comments || []), newComment];
    const nextMat = { ...mat, comments: updatedComments };
    try {
      await saveSupabaseMaterial(nextMat);
      setMaterials(prev => prev.map(m => m.id === mat.id ? nextMat : m));
      setNewCommentText('');
      showNotification('Comment registered successfully in peer discussion threads!');
    } catch (err) {
      console.error("Failed to add comment to Supabase:", err);
    }
  };

  // Verify Material (Teacher action)
  const handleVerifyMaterial = async (mat: MaterialResource) => {
    if (effectiveRole !== 'teacher') return;
    const nextState = !mat.isVerified;
    const nextMat = { ...mat, isVerified: nextState };
    try {
      await saveSupabaseMaterial(nextMat);
      setMaterials(prev => prev.map(m => m.id === mat.id ? nextMat : m));
      if (nextState) {
        const houseOfUploader = mat.uploaderHouse as HouseType;
        if (houseOfUploader) {
          showNotification(`✅ Faculty Verified! ${mat.title} is now peer gold-standard!`);
        } else {
          showNotification('Material marked verified!');
        }
      } else {
        showNotification('Verification removed.');
      }
    } catch (err) {
      console.error("Failed to verify material in Supabase:", err);
    }
  };

  // Save Bookmarks
  const toggleBookmarkMaterial = (id: string) => {
    setSavedMaterialIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(mId => mId !== id) : [...prev, id];
      showNotification(exists ? 'Material removed from bookmarks.' : 'Material saved to private bookmarks desk!');
      return next;
    });
  };

  // Trigger AI analysis with raw content context
  const handleTriggerMaterialAi = async (mat: MaterialResource, action: string) => {
    setAiActionLoading(true);
    setAiActionType(action);
    setSelectedMaterialForAi(mat);
    setAiActionResultText('');
    
    let contentContext = `Subject Category: ${mat.subject}. Description Detail: ${mat.description}. Type classification: ${mat.type}. Uploader role stats: ${mat.uploadedBy}. target grades: ${mat.visibleToGrades?.join(', ') || 'All Grades'}.`;
    
    incrementViewsMaterial(mat);
    
    try {
      let resultText = '';
      try {
        const response = await fetch('/api/ai/material-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: mat.title,
            description: mat.description,
            content: contentContext,
            action: action,
            userQuestion: aiUserQuestion
          })
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('API not available (static deployment)');
        }
        
        if (!response.ok) {
           throw new Error('API not available (static deployment)');
        }
        
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        resultText = data.text;
      } catch (err: any) {
        console.log("Server API failed, falling back to client-side AI:", err);
        const { clientSideGemini } = await import('./lib/clientAiFallback');
        let prompt = '';
        if (action === 'summarize') prompt = `Summarize this material: ${mat.title}. ${mat.description}`;
        else if (action === 'quiz') prompt = `Generate a short quiz for: ${mat.title}. ${mat.description}`;
        else if (action === 'explain') prompt = `Explain this topic simply: ${mat.title}. ${mat.description}`;
        else prompt = `Answer this question: "${aiUserQuestion}" based on ${mat.title}. ${mat.description}`;
        
        resultText = await clientSideGemini(prompt);
      }
      
      setAiActionResultText(resultText);
      showNotification(`✨ AI ${action.toUpperCase()} processes complete!`);
    } catch (err: any) {
      console.error('AI execution failed:', err);
      showNotification('Fallback: Engine error connecting to study core AI.');
      setAiActionResultText(`### ⚠️ AI Processing Error\n\nCould not fetch response. Please verify network interfaces or local API servers.`);
    } finally {
      setAiActionLoading(false);
    }
  };

  // Export AI result to various templates
  const handleExportAiResult = (mat: MaterialResource, format: 'txt' | 'html' | 'pdf') => {
    if (!aiActionResultText) return;
    const baseHeader = `=========================================\nSTUDENTOS ACADEMIC AI REPORT\nMaterial: ${mat.title}\nSubject: ${mat.subject}\nDate: ${new Date().toLocaleDateString()}\n=========================================\n\n`;
    
    if (format === 'txt') {
      const fileContent = baseHeader + aiActionResultText;
      const element = document.createElement("a");
      const file = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${mat.title.replace(/\s+/g, "_")}_AI_${aiActionType}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showNotification('Notes saved as plain document!');
    } else if (format === 'html') {
      const richHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>AI Report - ${mat.title}</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px; line-height: 1.6; }
            .wrapper { max-width: 800px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #334155; }
            h1, h2, h3 { color: #f8fafc; font-family: monospace; }
            pre { background: #020617; padding: 15px; border-radius: 8px; color: #a5f3fc; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <h1>📚 StudentOS AI Report Dashboard</h1>
            <p><b>Material:</b> ${mat.title} | <b>Subject:</b> ${mat.subject}</p>
            <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
            <div>${aiActionResultText.replace(/\n/g, '<br>')}</div>
          </div>
        </body>
        </html>
      `;
      const element = document.createElement("a");
      const file = new Blob([richHtml], { type: 'text/html;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `${mat.title.replace(/\s+/g, "_")}_AI_${aiActionType}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      showNotification('Notes saved as rich styled webpage HTML!');
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>Print StudentOS AI Report - ${mat.title}</title>
            <style>
              body { font-family: monospace; padding: 30px; color: #000; background: #fff; line-height: 1.5; }
              h1 { border-bottom: 2px solid #000; padding-bottom: 5px; }
              pre { background: #f4f4f5; padding: 10px; border: 1px solid #e4e4e7; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <h1>📚 StudentOS Faculty Resource Analysis</h1>
            <p><b>Title:</b> ${mat.title} | <b>Category Focus:</b> ${mat.subject}</p>
            <p><b>Uploader Contact:</b> ${mat.uploadedBy} | <b>Date:</b> ${mat.createdAt}</p>
            <hr>
            <div style="font-family: sans-serif; white-space: pre-wrap;">${aiActionResultText}</div>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  // Upload file to storage / Firestore
  const handleUploadFileMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[UPLOAD TRACE] 1. Form submitted / Upload button clicked");
    console.log("[UPLOAD TRACE] 2. handleUploadFileMaterial entered");
    
    const titleInput = (document.getElementById('upload-title') as HTMLInputElement)?.value;
    const descInput = (document.getElementById('upload-desc') as HTMLTextAreaElement)?.value;
    const subjectInput = (document.getElementById('upload-subject') as HTMLSelectElement)?.value;
    const typeInput = (document.getElementById('upload-type') as HTMLSelectElement)?.value as any;
    const yearInput = (document.getElementById('upload-year') as HTMLInputElement)?.value;
    const fileInput = document.getElementById('upload-file') as HTMLInputElement;
    
    if (!titleInput || !descInput || !subjectInput) {
      console.warn("[UPLOAD TRACE] Validation failed: Name, Description, and Subject are required.");
      showNotification('Please fill in Name, Description, and Subject!');
      return;
    }

    const hasFile = !!(fileInput?.files && fileInput.files[0]);
    console.log(`[UPLOAD TRACE] 2.1 selectedFile is null? ${!hasFile}`);
    if (hasFile) {
      const file = fileInput.files[0];
      console.log(`[UPLOAD TRACE] 2.2 Selected file metadata: Name="${file.name}", Size=${file.size} bytes, Type="${file.type}"`);
      
      const isDuplicate = materials.some(mat => (mat.fileName === file.name) || (mat.title.trim().toLowerCase() === titleInput.trim().toLowerCase()));
      if (isDuplicate) {
        console.warn("[UPLOAD TRACE] Validation failed: Duplicate file or title detected in state.");
        showNotification('❌ Duplicate file detected. A file with this name or title already exists in the Material Hub.');
        return;
      }
    } else {
      console.log("[UPLOAD TRACE] No file selected, proceeding with mock attachment URL.");
      const isDuplicate = materials.some(mat => mat.title.trim().toLowerCase() === titleInput.trim().toLowerCase());
      if (isDuplicate) {
        console.warn("[UPLOAD TRACE] Validation failed: Duplicate material title detected in state.");
        showNotification('❌ Duplicate material detected. A material with this title already exists.');
        return;
      }
    }

    const matId = generateUniqueId();
    let fileUrl = 'https://example.com/mock.pdf';
    let fName: string | undefined = undefined;
    let fType: string | undefined = undefined;
    let fSize: number | undefined = undefined;
    let supabaseFilePath: string | undefined = undefined;
    
    if (fileInput?.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 200 * 1024 * 1024) { // Increase limit to 200MB since we are using Firebase Storage
        console.warn("[UPLOAD TRACE] Validation failed: File exceeds limit of 200 MB");
        showNotification('⚠️ File exceeds storage limit of 200 MB.');
        return;
      }
      fName = file.name;
      fType = file.type;
      fSize = file.size;
      
      showNotification('Uploading file securely...');
      console.log("[UPLOAD TRACE] 3. uploadFileToStorage called for file", file.name);
      try {
        const { url, path } = await uploadFileToStorage(file, 'materials');
        
        console.log("[UPLOAD TRACE] 4. uploadFileToStorage returned success!");
        console.log("[UPLOAD TRACE] 4.1 Returned URL:", url);
        console.log("[UPLOAD TRACE] 4.2 Returned Path:", path);

        fileUrl = url;
        supabaseFilePath = path;
             
        showNotification('✓ File uploaded successfully!');
      } catch (err: any) {
        console.error('[UPLOAD TRACE] 3.1 uploadFileToStorage failed with error:', err);
        showNotification(`❌ Upload failed: ${err.message || String(err)}`);
        return;
      }
    }

    const docItem: MaterialResource = {
      id: matId,
      title: titleInput.trim(),
      subject: subjectInput,
      type: typeInput,
      url: fileUrl,
      storagePath: supabaseFilePath,
      fileName: fName,
      fileType: fType,
      fileSize: fSize,
      description: descInput.trim(),
      uploadedBy: currentUser?.name || 'Faculty Representative',
      uploaderUid: currentUser?.uid || '',
      uploaderHouse: currentUser?.house || '',
      uploaderSection: currentUser?.section || '',
      createdAt: new Date().toISOString().split('T')[0],
      created_at: Date.now(),
      isPublic: newMaterialIsPublic,
      visibleToGrades: newMaterialIsPublic ? undefined : newMaterialGrades,
      visibleToSections: newMaterialIsPublic ? undefined : newMaterialSections,
      visibleToHouses: newMaterialIsPublic ? undefined : newMaterialHouses,
      downloads: 1, // uploader downloaded it first
      likes: 0,
      likedBy: [],
      views: 1,
      isVerified: effectiveRole === 'teacher' || effectiveRole === 'admin' || effectiveRole === 'super_admin', // auto verify staff!
      comments: [],
      visibility: newMaterialVisibility,
      questionPaperYear: yearInput ? yearInput.trim() : undefined
    };

    console.log("[UPLOAD TRACE] 5. Metadata object constructed before save:", JSON.stringify(docItem, null, 2));

    try {
      await saveSupabaseMaterial(docItem);
      // Optimistic update: show in list immediately without waiting for refetch
      setMaterials(prev => [docItem, ...prev]);

      // Reset state elements
      setNewMaterialGrades([]);
      setNewMaterialSections([]);
      setNewMaterialHouses([]);
      setNewMaterialIsPublic(true);
      
      showNotification('Success: Course material published to the Material Hub!');
      setOpenUploadModal(false);
    } catch (err: any) {
      console.error('[UPLOAD TRACE] Material save failed:', err);
      showNotification(`❌ Failed to save material: ${err.message || String(err)}`);
    }
  };

  // Quick Sidebar Uploader logic
  const handleQuickUploadDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setQuickUploadDragActive(true);
    } else if (e.type === 'dragleave') {
      setQuickUploadDragActive(false);
    }
  };

  const handleQuickUploadDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setQuickUploadDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setQuickUploadFile(file);
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setQuickUploadTitle(nameWithoutExt);
      showNotification(`File "${file.name}" ready for instant share!`);
    }
  };

  const handleQuickUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQuickUploadFile(file);
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setQuickUploadTitle(nameWithoutExt);
      showNotification(`File "${file.name}" loaded for quick publish.`);
    }
  };

  const handleQuickUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[UPLOAD TRACE] 1. Quick Upload submitted / Form submitted");
    console.log("[UPLOAD TRACE] 2. handleQuickUploadSubmit entered");

    if (!quickUploadFile) {
      console.warn("[UPLOAD TRACE] Validation failed: quickUploadFile is null.");
      showNotification('Please select or drop a file first!');
      return;
    }
    if (!quickUploadTitle.trim()) {
      console.warn("[UPLOAD TRACE] Validation failed: quickUploadTitle is empty.");
      showNotification('Please provide a title for your shared file!');
      return;
    }

    console.log(`[UPLOAD TRACE] 2.1 selectedFile is null? false`);
    console.log(`[UPLOAD TRACE] 2.2 Selected file metadata: Name="${quickUploadFile.name}", Size=${quickUploadFile.size} bytes, Type="${quickUploadFile.type}"`);

    if (quickUploadFile.size > 200 * 1024 * 1024) {
      console.warn("[UPLOAD TRACE] Validation failed: Quick Upload file exceeds 200 MB storage limit.");
      showNotification('⚠️ Quick Upload file exceeds 200 MB storage limit.');
      setQuickUploadIsUploading(false);
      return;
    }

    setQuickUploadIsUploading(true);
    const matId = generateUniqueId();
    let fileUrl = 'https://example.com/mock.pdf';
    let supabaseFilePath: string | undefined = undefined;

    try {
      showNotification(`Uploading "${quickUploadFile.name}"...`);
      console.log("[UPLOAD TRACE] 3. uploadFileToStorage called for quick file", quickUploadFile.name);
      try {
        const { url, path } = await uploadFileToStorage(quickUploadFile, 'materials');
        
        console.log("[UPLOAD TRACE] 4. uploadFileToStorage returned success!");
        console.log("[UPLOAD TRACE] 4.1 Returned URL:", url);
        console.log("[UPLOAD TRACE] 4.2 Returned Path:", path);

        fileUrl = url;
        supabaseFilePath = path;

        showNotification('✓ File uploaded successfully!');
      } catch (err: any) {
        console.error('[UPLOAD TRACE] 3.1 uploadFileToStorage failed with error:', err);
        showNotification(`❌ Upload failed: ${err.message || String(err)}`);
        setQuickUploadIsUploading(false);
        return;
      }

      const docItem: MaterialResource = {
        id: matId,
        title: quickUploadTitle.trim(),
        subject: quickUploadSubject,
        type: quickUploadType as any,
        url: fileUrl,
        storagePath: supabaseFilePath,
        fileName: quickUploadFile.name,
        fileType: quickUploadFile.type,
        fileSize: quickUploadFile.size,
        description: `Direct share upload: "${quickUploadTitle.trim()}" in ${quickUploadSubject}.`,
        uploadedBy: currentUser?.name || 'Class Peer',
        uploaderUid: currentUser?.uid || '',
        uploaderHouse: currentUser?.house || '',
        uploaderSection: currentUser?.section || '',
        createdAt: new Date().toISOString().split('T')[0],
        isPublic: true,
        downloads: 1,
        likes: 0,
        likedBy: [],
        views: 1,
        isVerified: effectiveRole === 'teacher',
        comments: []
      };

      console.log("[UPLOAD TRACE] 5. Metadata object constructed before save:", JSON.stringify(docItem, null, 2));

      try {
        await saveSupabaseMaterial(docItem);
        // Optimistic update: show in list immediately
        setMaterials(prev => [docItem, ...prev]);

        showNotification(`Success: "${docItem.title}" has been shared directly with your peers!`);
        
        // Reset
        setQuickUploadFile(null);
        setQuickUploadTitle('');
        setQuickUploadIsUploading(false);
      } catch (innerErr: any) {
        console.error('[UPLOAD TRACE] Quick upload material save FAILED:', innerErr);
        throw innerErr;
      }
    } catch (err) {
      setQuickUploadIsUploading(false);
      handleFirestoreError(err, OperationType.CREATE, `materials/${matId}`);
    }
  };

  // Interactive Quizzes Game loop
  const handleStartQuiz = (subject: string) => {
    setQuizSubject(subject);
    setQuizStarted(true);
    setQuizCurrentIndex(0);
    setQuizSelectedOption(null);
    setQuizSubmitted(false);
    setQuizScore(0);
    setQuizTimer(15);
    showNotification(`Aptitude Quiz started for ${subject}. 15s per question.`);
    triggerQuizTimer();
  };

  const triggerQuizTimer = () => {
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setQuizTimer(15);
    quizTimerRef.current = setInterval(() => {
      setQuizTimer(prev => {
        if (prev <= 1) {
          clearInterval(quizTimerRef.current);
          handleQuizSubmit(true); // Auto-fail/submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleQuizSubmit = (isTimeout = false) => {
    if (quizSubmitted) return;
    if (quizTimerRef.current) clearInterval(quizTimerRef.current);
    setQuizSubmitted(true);

    const questions = MOCK_QUIZZES[quizSubject] || [];
    const question = questions[quizCurrentIndex];

    if (isTimeout) {
      showNotification('Time elapsed! Question marked incorrect.');
    } else if (quizSelectedOption === question.correctOptionIndex) {
      setQuizScore(prev => prev + 1);
      showNotification('Great job! Correct response.');
    } else {
      showNotification('Incorrect selection. Review explanation.');
    }
  };

  const handleNextQuizQuestion = () => {
    const questions = MOCK_QUIZZES[quizSubject] || [];
    if (quizCurrentIndex + 1 < questions.length) {
      setQuizCurrentIndex(prev => prev + 1);
      setQuizSelectedOption(null);
      setQuizSubmitted(false);
      triggerQuizTimer();
    } else {
      // End Quiz loop
      setQuizStarted(false);
      showNotification(`Quiz Finished! Accuracy: ${quizScore}/${questions.length}.`);
    }
  };

  // Community Portal Operations
  const handleSendChat = async (overrideText?: string, materialIdId?: string) => {
    const textToSend = overrideText || newChatText;
    if (!textToSend.trim()) return;

    const msgId = Date.now().toString();
    const msg: ChatMessage = {
      id: msgId,
      name: currentUser?.name || 'Anonymous Peer',
      role: effectiveRole || 'student',
      house: currentUser?.house,
      message: textToSend.trim(),
      createdAt: new Date().toISOString(),
      targetId: activeChatTargetId || 'group-all',
      sharedMaterialId: materialIdId || undefined,
      ownerUid: currentUser?.uid || undefined
    };

    // Optimistic update — show message instantly for the sender
    setChats(prev => {
      if (prev.some(c => c.id === msg.id)) return prev;
      return [...prev, msg];
    });

    try {
      await savePeerMessage(msg);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat:send',
          chat: msg
        }));
      }
      if (!overrideText) {
        setNewChatText('');
      }
      setTimeout(() => {
        const scrollArea = document.getElementById('chat-scroll-view');
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 50);
    } catch (err: any) {
      console.error("Error sending peer message:", err);
    }
  };

  const handleShareMaterialToChat = async (mat: MaterialResource, targetRoomId: string) => {
    const text = `📁 Shared files: "${mat.title}" for subject ${mat.subject}`;
    const msgId = `${Date.now()}-share`;
    const msg: ChatMessage = {
      id: msgId,
      name: currentUser?.name || 'Anonymous Peer',
      role: effectiveRole || 'student',
      house: currentUser?.house,
      message: text,
      createdAt: new Date().toISOString(),
      targetId: targetRoomId,
      sharedMaterialId: mat.id,
      ownerUid: currentUser?.uid || undefined
    };

    try {
      await savePeerMessage(msg);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'chat:send',
          chat: msg
        }));
      }
      showNotification(`Successfully shared to chat!`);
    } catch (err: any) {
      console.error("Error sharing material to chat:", err);
    }
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const roomId = `${newRoomType}-${Date.now()}`;
    const newRoom: ChatRoom = {
      id: roomId,
      name: newRoomName.trim(),
      type: newRoomType,
      icon: newRoomIcon,
      description: newRoomDescription.trim() || `Study room created for peers`,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      creatorId: currentUser?.uid || 'unknown',
      members: [currentUser?.uid || 'unknown'],
      moderators: [currentUser?.uid || 'unknown']
    };

    const updated = [...chatRooms, newRoom];
    setChatRooms(updated);
    setActiveChatTargetId(roomId);
    
    saveChatRoom(newRoom).catch(error => {
      console.error("Error saving chat room:", error);
    });

    // reset form
    setNewRoomName('');
    setNewRoomType('group');
    setNewRoomIcon('💬');
    setNewRoomDescription('');
    setIsCreatingRoom(false);
    showNotification(`New ${newRoomType} "${newRoom.name}" has been created!`);
  };


  // Interactive Feedback Forum lists
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) return;
    const code = joinRoomCode.trim().toUpperCase();
    
    // Fetch all rooms from Supabase since user might not have it in local state
    try {
      const allRooms = await getChatRooms();
      const room = allRooms.find(r => (r as any).code === code);
      if (room) {
        if (!chatRooms.some(r => r.id === room.id)) {
          setChatRooms(prev => [...prev, room]);
          saveChatRoom(room).catch(console.error); // Save to local storage for the user
        }
        setActiveChatTargetId(room.id);
        setIsCreatingRoom(false);
        setJoinRoomCode('');
        showNotification(`Joined room: ${room.name}`);
      } else {
        showNotification('Invalid room code. Please check and try again.');
      }
    } catch (err) {
      console.error(err);
      showNotification('Failed to join room.');
    }
  };
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedbackText.trim()) return;

    const postId = generateUniqueId();
    const post: FeedbackPost = {
      id: postId,
      author: currentUser?.name || 'Student OS Guest',
      role: effectiveRole || 'student',
      text: newFeedbackText.trim(),
      votes: 1,
      category: newFeedbackCategory,
      status: 'pending',
      createdAt: new Date().toISOString(),
      replies: []
    };

    setFeedbackPosts(prev => {
      const updated = [post, ...prev];
      localStorage.setItem('s_os_feedbacks', JSON.stringify(updated));
      return updated;
    });
    setNewFeedbackText('');
    showNotification('Feedback posted directly to faculty bulletin boards.');
  };

  const upvoteFeedback = async (id: string) => {
    setFeedbackPosts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, votes: p.votes + 1 } : p);
      localStorage.setItem('s_os_feedbacks', JSON.stringify(updated));
      return updated;
    });
    showNotification('Upvoted successfully!');
  };

  const handleFacultyStatusUpdate = async (id: string, nextStatus: 'in-progress' | 'solved' | 'planned') => {
    setFeedbackPosts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: nextStatus } : p);
      localStorage.setItem('s_os_feedbacks', JSON.stringify(updated));
      return updated;
    });
    showNotification(`Feedback status updated to: ${nextStatus.toUpperCase()}`);
  };

  // Extract text from PDF in exact page order
  const extractPDFText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            return reject(new Error('ArrayBuffer is empty'));
          }
          const pdfjsLib = (window as any).pdfjsLib;
          if (!pdfjsLib) {
            return reject(new Error('PDF.js engine is currently loading from CDN...'));
          }
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          let entireText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            entireText += `[Page ${i}]\n${pageText}\n\n`;
          }
          resolve(entireText.trim());
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed reading PDF stream.'));
      reader.readAsArrayBuffer(file);
    });
  };

  const readImageAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('Image loader error.'));
      reader.readAsDataURL(file);
    });
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('File reader error.'));
      reader.readAsDataURL(file);
    });
  };

  // File attachments and Thread state mutations
  const handleFileUploadAction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit file size to 15MB
      if (file.size > 15 * 1024 * 1024) {
        showNotification(`❌ File too large: "${file.name}" limits exceeded.`);
        continue;
      }
      
      showNotification(`Scanning attachment: "${file.name}"...`);
      
      try {
        let contentText = '';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          try {
            contentText = await extractPDFText(file);
          } catch (pdfErr: any) {
            showNotification(`❌ PDF could not be read: ${pdfErr.message || pdfErr}`);
            continue;
          }
        } else if (file.type.startsWith('image/')) {
          try {
            contentText = await readImageAsBase64(file);
          } catch (imgErr) {
            showNotification(`❌ Image could not be read.`);
            continue;
          }
        } else if (
          file.name.toLowerCase().endsWith('.md') ||
          file.name.toLowerCase().endsWith('.txt') ||
          file.name.toLowerCase().endsWith('.json') ||
          file.name.toLowerCase().endsWith('.csv') ||
          file.type.startsWith('text/')
        ) {
          contentText = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = (ev) => resolve(ev.target?.result as string || '');
            r.onerror = () => reject(new Error('Reader error'));
            r.readAsText(file);
          });
        } else {
          contentText = `[Document Metadata - Name: ${file.name}, format support active, Type: ${file.type || 'Office File'}]`;
        }

        const payloadFile = {
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: contentText
        };

        setAttachedFiles(prev => {
          const updated = [...prev, payloadFile];
          setAiThreads(threads => threads.map(t => {
            if (t.id === activeThreadId) {
              return { ...t, attachedFiles: updated, attachedFile: payloadFile };
            }
            return t;
          }));
          return updated;
        });

        showNotification(`✓ File linked perfectly: "${file.name}"`);
      } catch (err: any) {
        showNotification(`❌ Upload failed: ${err.message || err}`);
      }
    }
    
    e.target.value = '';
  };

  const handleRemoveAttachedFile = (fileName: string) => {
    setAttachedFiles(prev => {
      const updated = prev.filter(f => f.name !== fileName);
      setAiThreads(threads => threads.map(t => {
        if (t.id === activeThreadId) {
          return { ...t, attachedFiles: updated, attachedFile: updated[0] || null };
        }
        return t;
      }));
      return updated;
    });
    showNotification(`Removed: "${fileName}"`);
  };

  const handleCreateNewThread = () => {
    const newId = generateUniqueId();
    const newThread = {
      id: newId,
      title: `Study Session #${aiThreads.length + 1}`,
      personaId: selectedPersona,
      mode: aiMode,
      messages: [
        { role: 'assistant' as const, content: "Start a brand-new discussion segment. Choose a learning mode option or upload references to guide our exploration!" }
      ],
      attachedFile: null,
      attachedFiles: [],
      userId: currentUser?.uid || '',
      createdAt: Date.now()
    };
    if (currentUser?.uid) {
      saveAiBuddyChat(newThread as any).catch(error => {
        console.error("Error saving AI buddy chat:", error);
      });
    }
    setAiThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newId);
    setAttachedFiles([]);
    showNotification('New study thread initialized!');
  };

  const handleSwitchPersona = (personaId: string) => {
    setSelectedPersona(personaId);
    if (currentUser?.uid) {
       const t = aiThreads.find(t => t.id === activeThreadId);
       if (t) {
         saveAiBuddyChat({ 
           ...t, 
           personaId, 
           title: `Study with ${AI_PERSONAS.find(p => p.id === personaId)?.name || 'Tutor'}`,
           userId: currentUser?.uid || "" 
         } as any).catch(error => {
           console.error("Error saving AI buddy chat persona:", error);
         });
       }
    }
    showNotification(`Active Mentor switched: ${AI_PERSONAS.find(p => p.id === personaId)?.name}`);
  };

  const handleSwitchMode = (mode: 'explanatory' | 'socratic' | 'coder' | 'quiz_gen') => {
    setAiMode(mode);
    if (currentUser?.uid) {
       const t = aiThreads.find(t => t.id === activeThreadId);
       if (t) {
         saveAiBuddyChat({ 
           ...t, 
           mode,
           userId: currentUser?.uid || "" 
         } as any).catch(error => {
           console.error("Error saving AI buddy chat mode:", error);
         });
       }
    }
    showNotification(`Active mode set to ${mode.toUpperCase()}`);
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiThreads.length <= 1) {
      showNotification('At least one chat sequence must remain intact.');
      return;
    }
    if (currentUser?.uid) {
      deleteAiBuddyChat(threadId, currentUser?.uid || "").catch(error => {
        console.error("Error deleting AI buddy chat:", error);
      });
    }
    const nextThreads = aiThreads.filter(t => t.id !== threadId);
    if (activeThreadId === threadId && nextThreads.length > 0) {
      const fallbackThread = nextThreads[0];
      setActiveThreadId(fallbackThread.id);
      setSelectedPersona(fallbackThread.personaId);
      setAiMode(fallbackThread.mode);
      if (fallbackThread.attachedFiles) {
        setAttachedFiles(fallbackThread.attachedFiles);
      } else if (fallbackThread.attachedFile) {
        setAttachedFiles([fallbackThread.attachedFile]);
      } else {
        setAttachedFiles([]);
      }
    }
    showNotification('Chat thread discarded.');
  };

  const handleClearThreadHistory = () => {
    setAiThreads(prev => prev.map(t => {
      if (t.id === activeThreadId) {
        return {
          ...t,
          messages: [
            { role: 'assistant' as const, content: "Conversation segment cleared by user." }
          ],
          attachedFile: null,
          attachedFiles: []
        };
      }
      return t;
    }));
    setAttachedFiles([]);
    showNotification('Conversation record flushed.');
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification('Response copied to clipboard!');
  };

  const handleSaveToNotes = (text: string) => {
    const cleanSubject = currentUser?.specialtySubject || 'AI Study';
    const defaultTitle = text.length > 30 ? text.substring(0, 30).trim() + "..." : text;
    const title = prompt("Enter a title for this note:", `AI Mentor - ${defaultTitle}`);
    if (title === null) return; // User cancelled prompt
    
    const finalTitle = title.trim() || `AI Study Note - ${new Date().toLocaleDateString()}`;
    const newNote: VaultNote = {
      id: generateUniqueId(),
      title: finalTitle,
      subject: cleanSubject,
      content: text,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    setVaultNotes(prev => [newNote, ...prev]);
    showNotification('Saved to your Personal Vault Notes!');
  };

  const handleToggleSpeakMessage = (text: string, msgKey: string) => {
    if (!('speechSynthesis' in window)) {
      showNotification('TTS is not supported in this browser.');
      return;
    }
    
    if (window.speechSynthesis.speaking && speakingMsgIdx === msgKey) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
      showNotification('Audio output paused.');
    } else {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        const cleanText = text.replace(/[#*_`]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.onend = () => {
          setSpeakingMsgIdx(null);
        };
        utterance.onerror = () => {
          setSpeakingMsgIdx(null);
        };
        setSpeakingMsgIdx(msgKey);
        window.speechSynthesis.speak(utterance);
        showNotification('Speaking reply aloud...');
      }, 50);
    }
  };

  // Secure AI Teacher dialog queries proxying via our server endpoints
  const handleAskAIModel = async () => {
    if (!aiInput.trim()) return;
    
    const userQuery = aiInput.trim();
    const currentAttachedFiles = [...attachedFiles];
    const newUserMsg = { 
      role: 'user' as const, 
      content: userQuery,
      files: currentAttachedFiles
    };
    
    let promptWithContext = userQuery;
    if (currentAttachedFiles.length > 0) {
      const fileContextString = currentAttachedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          // If it is an image, we can supply its metadata and context
          return `[Attached Diagram/Image: ${file.name} (Base64 data url size ${(file.size / 1024).toFixed(1)} KB)]\nImage Data: ${file.content}`;
        } else {
          return `[Attached Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]\nContent:\n"""\n${file.content}\n"""`;
        }
      }).join('\n\n');
      
      let roleLabel = 'Student Inquiry';
      if (currentUser?.role) {
         roleLabel = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) + ' Inquiry';
      }
      promptWithContext = `${fileContextString}\n\n${roleLabel}: ${userQuery}`;
    }

    const targetThreadId = activeThreadId;
    const currentThread = aiThreads.find(t => t.id === targetThreadId) || aiThreads[0];
    
    const updatedMessages = [...(currentThread?.messages || []), newUserMsg];
    const newTitle = currentThread.title.startsWith('Study Session #') || currentThread.title.startsWith('Introductory Study') || currentThread.title.startsWith('Study with')
      ? (userQuery.length > 25 ? userQuery.substring(0, 25) + '...' : userQuery)
      : currentThread.title;

    // Optimistically push message and update title
    setAiThreads(prev => prev.map(t => {
      if (t.id === targetThreadId) {
        return { 
          ...t, 
          messages: updatedMessages,
          title: newTitle,
          attachedFiles: [] // Reset attachments on the current active thread state
        };
      }
      return t;
    }));

    if (currentUser?.uid) {
       saveAiBuddyChat({ 
         ...currentThread, 
         id: targetThreadId,
         userId: currentUser?.uid || "",
         title: newTitle,
         messages: updatedMessages,
         attachedFiles: []
       } as any).catch(error => {
         console.error("Error saving AI buddy chat message:", error);
       });
    }
    
    setAiInput('');
    setAttachedFiles([]); // Clear visual attachment tray
    setAiLoading(true);

    try {
      let answer = '';
      try {
        const historyPayload = (currentThread?.messages || []).map(m => ({
          role: m.role,
          content: m.content
        }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptWithContext,
            history: historyPayload,
            persona: selectedPersona,
            level: currentUser?.grade,
            subject: currentUser?.specialtySubject || 'Science',
            mode: aiMode
          })
        });

        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('API not available (static deployment)');
        }
        
        if (!res.ok) {
           throw new Error('API not available (static deployment)');
         }

        const parsedRes = await res.json();
        if (parsedRes.error) throw new Error(parsedRes.error);
        answer = parsedRes.text || 'I encountered an issue processing your lesson topic.';
      } catch (apiErr: any) {
        console.log("Server API failed, falling back to client-side AI:", apiErr);
        const { clientSideGemini } = await import('./lib/clientAiFallback');
        // Pass only the user's message — the mock doesn't use system context
        // and including history text caused false keyword matches (e.g. "workspace" → "work")
        answer = await clientSideGemini(promptWithContext);
      }
      
      setAiThreads(prev => prev.map(t => {
        if (t.id === targetThreadId) {
          return { ...t, messages: [...updatedMessages, { role: 'assistant', content: answer }] };
        }
        return t;
      }));

      if (currentUser?.uid) {
         saveAiBuddyChat({ 
           ...currentThread, 
           id: targetThreadId,
           userId: currentUser?.uid || "",
           title: currentThread.title.startsWith('Study Session #') || currentThread.title.startsWith('Introductory Study') || currentThread.title.startsWith('Study with')
            ? (userQuery.length > 25 ? userQuery.substring(0, 25) + '...' : userQuery)
            : currentThread.title,
           messages: [...updatedMessages, { role: 'assistant', content: answer }] 
         } as any).catch(error => {
           console.error("Error saving AI buddy chat response:", error);
         });
      }

      if (ttsEnabled) {
        speakText(answer);
      }
    } catch (err: any) {
      setAiThreads(prev => prev.map(t => {
        if (t.id === targetThreadId) {
          return { 
            ...t, 
            messages: [...updatedMessages, { role: 'assistant' as const, content: `[Connection Delay] Unable to proxy query to Gemini server layer: ${err.message}. Ensure your local dev server is powered on.` }] 
          };
        }
        return t;
      }));
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        const dialogBox = document.getElementById('ai-dialog-scroll');
        if (dialogBox) dialogBox.scrollTop = dialogBox.scrollHeight;
      }, 50);
    }
  };

  // Select dynamic accent colors based on House profile
  const getHouseAccentClass = () => {
    if (!currentUser || effectiveRole === 'teacher') return 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 focus:ring-indigo-500';
    switch (currentUser.house) {
      case 'Ruby': return 'border-red-500/30 text-red-400 bg-red-500/10 focus:ring-red-500';
      case 'Emerald': return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 focus:ring-emerald-500';
      case 'Sapphire': return 'border-blue-500/30 text-blue-400 bg-blue-500/10 focus:ring-blue-500';
      case 'Topaz': return 'border-amber-500/30 text-amber-500 bg-amber-500/10 focus:ring-amber-500';
      default: return 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 focus:ring-indigo-500';
    }
  };

  const getHousePrimaryText = () => {
    if (!currentUser || effectiveRole === 'teacher') return 'text-indigo-400';
    switch (currentUser.house) {
      case 'Ruby': return 'text-red-400 font-bold';
      case 'Emerald': return 'text-emerald-400 font-bold';
      case 'Sapphire': return 'text-blue-400 font-bold';
      case 'Topaz': return 'text-amber-500 font-bold';
      default: return 'text-indigo-400';
    }
  };

  const getHouseBadgeColor = (house: HouseType) => {
    switch (house) {
      case 'Ruby': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'Emerald': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'Sapphire': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'Topaz': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${lightMode ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-slate-100'}`}>
      
      {/* 🔒 Screen Lock Screen Overlay */}
      {isLocked && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center z-[200] animate-fadeIn select-none">
          <div className="max-w-md w-full px-6 text-center space-y-6">
            <div className="mx-auto h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-center justify-center text-2xl shadow-xl animate-bounce">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Workspace Locked</h2>
              <p className="text-xs text-slate-400">Classroom Safety Guard Active. Enter PIN to unlock.</p>
            </div>

            {/* Hidden Input field for keyboard users and visible indicator dots */}
            <div className="space-y-4">
              <div className="flex justify-center gap-3">
                {Array.from({ length: teacherPin.length || 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                      lockScreenPinInput.length > i
                        ? 'bg-indigo-500 border-indigo-400 scale-110 shadow-lg shadow-indigo-500/50'
                        : 'bg-transparent border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {lockScreenError && (
                <p className="text-xs text-red-400 font-semibold animate-pulse">{lockScreenError}</p>
              )}
            </div>

            {/* Smart Touch Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    if (lockScreenPinInput.length < (teacherPin.length || 4)) {
                      setLockScreenPinInput(prev => prev + num.toString());
                      setLockScreenError('');
                    }
                  }}
                  className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white text-lg font-bold transition-all flex items-center justify-center border border-white/5 cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => {
                  setLockScreenPinInput('');
                  setLockScreenError('');
                }}
                className="h-14 w-14 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-400 text-xs font-bold transition-all flex items-center justify-center border border-red-500/10 cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  if (lockScreenPinInput.length < (teacherPin.length || 4)) {
                    setLockScreenPinInput(prev => prev + '0');
                    setLockScreenError('');
                  }
                }}
                className="h-14 w-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-white text-lg font-bold transition-all flex items-center justify-center border border-white/5 cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleUnlockWithPin}
                className="h-14 w-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs transition-all flex items-center justify-center cursor-pointer"
              >
                Enter
              </button>
            </div>

            <p className="text-[10px] text-slate-500 uppercase tracking-widest pt-2">
              Secure Classroom Smart Board Session
            </p>
          </div>
        </div>
      )}

      {/* 📝 Teacher PIN Setup / Modification Modal */}
      {pinSetupOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[250] animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-sm text-indigo-400">🛡️ Classroom PIN Setup</span>
              <button
                onClick={() => {
                  setPinSetupOpen(false);
                  setNewPin('');
                  setConfirmPin('');
                  setPinError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="text-slate-400">
                Create a 4 or 6-digit PIN to securely manage presentation modes and quick locks without exposing your password.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-left">
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">New Security PIN</label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                    setNewPin(cleanVal);
                  }}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-center text-lg tracking-widest font-black focus:border-indigo-500 outline-none"
                  placeholder="••••"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Confirm PIN</label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPin}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                    setConfirmPin(cleanVal);
                  }}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-center text-lg tracking-widest font-black focus:border-indigo-500 outline-none"
                  placeholder="••••"
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-400 font-bold text-center">{pinError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setPinSetupOpen(false);
                  setNewPin('');
                  setConfirmPin('');
                  setPinError('');
                }}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePin}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white transition-all shadow-lg"
              >
                Save Security PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔑 PIN Verification / Authorization Modal */}
      {pinVerifyOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[250] animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-sm text-amber-400">🔑 Security Authorization</span>
              <button
                onClick={() => {
                  setPinVerifyOpen(false);
                  setVerifyPinInput('');
                  setPinVerifyAction(null);
                  setPinError('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-center">
              <p className="text-xs text-slate-400">
                Please enter your teacher security PIN to authorize this sensitive action.
              </p>
            </div>

            <div className="pt-2 text-center">
              <input
                type="password"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={teacherPin.length || 4}
                value={verifyPinInput}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                  setVerifyPinInput(cleanVal);
                }}
                className="w-full max-w-[200px] mx-auto px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-center text-lg tracking-widest font-black focus:border-amber-500 outline-none"
                placeholder="••••"
                autoFocus
              />

              {pinError && (
                <p className="text-xs text-red-400 font-bold mt-2">{pinError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setPinVerifyOpen(false);
                  setVerifyPinInput('');
                  setPinVerifyAction(null);
                  setPinError('');
                }}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPin}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Startup Screen */}
      {showStartup && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[100] transition-opacity duration-700 select-none overflow-hidden">
          {/* Futuristic ambient backlights */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/15 rounded-full blur-[90px] animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-teal-500/10 rounded-full blur-[70px] animate-pulse" style={{ animationDuration: '4s' }} />

          <div className="max-w-md w-full px-8 text-center space-y-8 relative z-10">
            {/* Premium Logo Layout */}
            <div className="relative inline-flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-teal-400 rounded-[2rem] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-pulse" />
                <div className="relative h-20 w-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-teal-500 p-[1.5px] shadow-2xl shadow-indigo-500/20 overflow-hidden">
                  <div className="w-full h-full bg-slate-950 rounded-[30px] flex items-center justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-10" />
                    <img 
                      src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=256&h=256" 
                      alt="StudentOS Logo" 
                      className="w-full h-full object-cover rounded-[30px] opacity-90 group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white font-display bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                StudentOS
              </h1>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                <span className="text-[9px] tracking-widest uppercase font-mono text-indigo-300 font-extrabold">initializing neural core</span>
              </div>
            </div>

            {/* Glowing Progress bar container */}
            <div className="space-y-4 pt-6 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-center gap-2 min-h-[20px]">
                <p className="text-xs text-slate-300 font-bold font-mono transition-all duration-300 tracking-wide">
                  {STARTUP_MESSAGES[loadingStep] || 'Optimizing workspace parameters...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950/90 border border-white/5 rounded-full h-2.5 overflow-hidden shadow-inner p-[2px]">
                <div 
                  className="bg-gradient-to-r from-indigo-500 via-violet-500 to-teal-400 h-full rounded-full transition-all duration-150 ease-out shadow-glow shadow-indigo-500/50" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono font-bold text-slate-500 tracking-widest">
                <span>REVISION v3.12 (A-CORE)</span>
                <span className="text-indigo-400">{loadingProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Absolute Dynamic Alert Center */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="smart-glass animate-bounce text-xs font-semibold px-4 py-3.5 rounded-xl border border-white/10 text-white shadow-xl flex items-center gap-2 pointer-events-auto bg-slate-900/90">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Onboarding Authentication Modal Gate */}
      {!currentUser && !firebaseLoading && !dataLoading && (
        <div id="onboarding-gate-modal" className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 overflow-y-auto flex items-start sm:items-center justify-center p-4">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
          
          <div className="smart-glass max-w-xl w-full p-8 sm:p-10 my-auto rounded-[2.5rem] border border-white/10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden space-y-8 animate-fadeIn" style={{ animationDuration: '0.8s' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 pointer-events-none" />
            
            <div className="text-center space-y-4 relative z-10">
              <div className="inline-flex h-20 w-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-violet-600 p-[2px] shadow-xl shadow-indigo-500/25">
                <div className="w-full h-full bg-slate-950 rounded-[30px] flex items-center justify-center text-4xl shadow-inner relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                   🎓
                </div>
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl font-black font-display tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">StudentOS</h1>
                <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto">Next-generation collaborative academic dashboard and neural identity node.</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <AnimatePresence mode="wait">
                {regStep === 'login' && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    id="reg-step-login"
                    className="space-y-6"
                  >
                    {/* Google Sign-In Actions */}
                    <div className="space-y-3">
                      <button
                        id="google-signin-btn"
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white text-slate-900 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 transition-all shadow-lg hover:shadow-indigo-500/10 active:scale-98"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.6a5.64 5.64 0 0 1-2.45 3.7v2.51h3.95c2.31-2.13 3.64-5.26 3.64-9.06Z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.95-2.51a7.21 7.21 0 0 1-11.02-3.8H.92v2.59A12 12 0 0 0 12 24Z" />
                          <path fill="#FBBC05" d="M4.96 14.78A7.16 7.16 0 0 1 4.5 12c0-.98.17-1.92.46-2.78V6.63H.92A12 12 0 0 0 .92 17.37l4.04-2.59Z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A12.012 12.012 0 0 0 .92 6.63l4.04 2.59a7.2 7.2 0 0 1 7.04-4.47Z" />
                        </svg>
                        Continue with Google
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          id="google-signin-select-btn"
                          type="button"
                          onClick={handleGoogleSignInWithSelect}
                          className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider bg-slate-900/60 hover:bg-slate-800 text-slate-300 rounded-xl transition-all border border-white/5 hover:border-white/10"
                        >
                          🔄 Switch Google
                        </button>
                        <button
                          id="google-use-another-btn"
                          type="button"
                          onClick={handleGoogleSignInWithSelect}
                          className="py-2.5 px-3 text-[10px] font-black uppercase tracking-wider bg-slate-900/60 hover:bg-slate-800 text-slate-300 rounded-xl transition-all border border-white/5 hover:border-white/10"
                        >
                          🔑 Use Another Account
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-white/5"></div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">or email & password</span>
                      <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    <form onSubmit={handleEmailSignIn} className="space-y-4">
                      <div className="space-y-3.5">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Email Address</label>
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="e.g. naitik.kashyap0015@gmail.com"
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-mono placeholder-slate-600 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 text-left">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Password</label>
                          <input
                            type="password"
                            required
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Enter security key"
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-mono placeholder-slate-600 transition-all"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={firebaseLoading}
                        className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 active:scale-98 disabled:opacity-50"
                      >
                        {firebaseLoading ? 'Signing In...' : 'Sign In with Email'}
                      </button>
                    </form>

                    {authError && (
                      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left space-y-3 animate-fadeIn">
                        <div className="flex gap-2.5 items-start">
                          <span className="text-lg">⚠️</span>
                          <div>
                            <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-wide">Sign-In Error</h4>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                              {authError.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RECENT ACCOUNTS */}
                    {recentAccounts.length > 0 && (
                      <div id="recent-accounts-section" className="space-y-3.5 pt-4 border-t border-white/5">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-left">
                          🔑 Recent Profiles on this Node
                        </label>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {recentAccounts.slice(0, 5).map((acc) => {
                            const initials = acc.name ? acc.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                            return (
                              <div
                                key={acc.uid || acc.email}
                                className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  {acc.photoURL ? (
                                    <img
                                      src={acc.photoURL}
                                      referrerPolicy="no-referrer"
                                      alt={acc.name}
                                      className="w-10 h-10 rounded-xl object-cover border border-white/10"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-black font-mono text-indigo-400 text-xs">
                                      {initials}
                                    </div>
                                  )}
                                  <div className="space-y-0.5 text-left">
                                    <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                                      {acc.name}
                                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase font-mono text-slate-400">
                                        {acc.role}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] sm:max-w-[200px]">{acc.email}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleContinueRecentAccount(acc)}
                                    className="py-1.5 px-3 text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all border border-emerald-500/20"
                                  >
                                    Continue
                                  </button>
                                  <button
                                    type="button"
                                    title="Remove profile reference"
                                    onClick={() => handleRemoveRecentAccount(acc.email)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-all hover:bg-white/5"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Redesigned Sign Up Button */}
                    <div className="pt-4 border-t border-white/5 text-center space-y-3">
                      <p className="text-xs text-slate-400">Don't have an account or want to register a new role?</p>
                      <button
                        id="start-signup-flow-btn"
                        type="button"
                        onClick={() => {
                          setRegStep('role');
                          setIsGoogleLinked(false);
                          setLinkedGoogleUid(null);
                          setLinkedGooglePhoto(null);
                          setRegName('');
                          setRegEmail('');
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-xs uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all active:scale-98 shadow-md"
                      >
                        Create Profile & Sign Up →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: ROLE SELECTION */}
                {regStep === 'role' && (
                  <motion.div
                    key="role"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    id="reg-step-role"
                    className="space-y-5"
                  >
                    <div className="space-y-1 text-center">
                      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Step 1 of 3</span>
                      <h2 className="text-xl font-bold text-white mt-3">Choose Account Type</h2>
                      <p className="text-xs text-slate-400">Select the primary profile identity you want to request.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { type: 'student', label: '🎓 Student Identity', desc: 'Immediate workspace exploration access' },
                        { type: 'teacher', label: '👩‍🏫 Teacher Request', desc: 'Upload materials and assign worksheets (approval required)' },
                        { type: 'coordinator', label: '🧭 Coordinator Request', desc: 'Authorize content and manage schedule nodes (approval required)' },
                        { type: 'admin', label: '⚙️ Admin Request', desc: 'Supervise entire institution clearance and logs (approval required)' }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setRegRole(item.type as any);
                          }}
                          className={`p-4 rounded-2xl text-left border transition-all flex flex-col gap-1 active:scale-99 ${
                            regRole === item.type
                              ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                              : 'bg-slate-900/40 border-white/5 text-slate-300 hover:border-white/10 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="font-extrabold text-sm">{item.label}</div>
                          <div className="text-xs text-slate-400 leading-relaxed">{item.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-center items-center pt-4 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setRegStep('profile')}
                        className="w-full px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md active:scale-98"
                      >
                        Next Step →
                      </button>
                    </div>
                    <div className="pt-4 border-t border-white/5 text-center space-y-3">
                      <p className="text-xs text-slate-400">Already have an account?</p>
                      <button
                        type="button"
                        onClick={() => setRegStep('login')}
                        className="w-full py-3.5 px-4 rounded-2xl bg-slate-900/40 border border-white/5 text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-800 hover:border-white/10 transition-all active:scale-98 shadow-md"
                      >
                        Log In Here →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: PROFILE INFORMATION FORM */}
                {regStep === 'profile' && (
                  <motion.form
                    key="profile"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    id="reg-step-profile"
                    onSubmit={(e) => { e.preventDefault(); setRegStep('submit'); }}
                    className="space-y-5"
                  >
                    <div className="space-y-1 text-center">
                      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Step 2 of 3</span>
                      <h2 className="text-xl font-bold text-white mt-3">Profile Information</h2>
                      <p className="text-xs text-slate-400">Provide registration credentials for verification.</p>
                    </div>

                    {/* EMAIL HANDLING SELECTOR */}
                    <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3 text-left">
                      <p className="text-xs font-bold text-indigo-300">Choose Registration Method:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-left space-y-1">
                          <span className="text-[9px] uppercase font-black text-slate-500 tracking-wide block">Option A</span>
                          <p className="text-xs font-bold text-white">Manual Credentials</p>
                          <p className="text-[10px] text-slate-500">Enter custom name and secure password.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleLinkGoogle}
                          className={`p-2.5 rounded-xl text-left space-y-1 border transition-all active:scale-98 ${
                            isGoogleLinked
                              ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                              : 'bg-slate-900/60 border-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wide block">Option B</span>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {isGoogleLinked ? '✓ Google Linked' : '🔗 Link Google Account'}
                          </p>
                          <p className="text-[10px] text-slate-400">Pre-fill details instantly from Google session.</p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Full Name</label>
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="e.g. Jean-Luc Picard"
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-medium placeholder-slate-600 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">School Email</label>
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="e.g. captain@academy.edu"
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-mono placeholder-slate-600 transition-all"
                          />
                        </div>
                      </div>
                      
                      {!isGoogleLinked && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Password</label>
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Must be at least 6 characters"
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-mono placeholder-slate-600 transition-all"
                          />
                        </div>
                      )}

                      {/* ROLE-SPECIFIC EXTRA FIELDS */}
                      {regRole === 'student' && (
                        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-left">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Student Information</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Class</label>
                              <select
                                value={regGrade}
                                onChange={(e) => setRegGrade(e.target.value)}
                                className="w-full text-xs px-3 py-2.5 rounded-lg bg-slate-950 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white font-semibold"
                              >
                                {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Section</label>
                              <select
                                value={regSection}
                                onChange={(e) => setRegSection(e.target.value)}
                                className="w-full text-xs px-3 py-2.5 rounded-lg bg-slate-950 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                              >
                                <option value="Astra">Astra (Alpha)</option>
                                <option value="Elera">Elera (Beta)</option>
                                <option value="Solara">Solara (Gamma)</option>
                                <option value="Vega">Vega (Delta)</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">House</label>
                              <select
                                value={regHouse}
                                onChange={(e) => setRegHouse(e.target.value)}
                                className="w-full text-xs px-3 py-2.5 rounded-lg bg-slate-950 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
                              >
                                <option value="Ruby">Ruby House (Crimson)</option>
                                <option value="Emerald">Emerald House (Green)</option>
                                <option value="Sapphire">Sapphire House (Blue)</option>
                                <option value="Topaz">Topaz House (Gold)</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Profile Photo URL (Optional)</label>
                            <input
                              type="url"
                              value={regPhoto}
                              onChange={(e) => setRegPhoto(e.target.value)}
                              placeholder="https://images.unsplash.com/..."
                              className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-mono placeholder-slate-700"
                            />
                          </div>
                        </div>
                      )}

                      {regRole === 'teacher' && (
                        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-left">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Teacher Specifications</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Department</label>
                              <input
                                type="text"
                                required
                                value={regDept}
                                onChange={(e) => setRegDept(e.target.value)}
                                placeholder="e.g. Sciences"
                                className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder-slate-700"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Subjects</label>
                              <input
                                type="text"
                                required
                                value={regSubjects}
                                onChange={(e) => setRegSubjects(e.target.value)}
                                placeholder="e.g. Physics, Chemistry"
                                className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder-slate-700"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {regRole === 'coordinator' && (
                        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-left">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Coordinator Specifications</p>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Department</label>
                            <input
                              type="text"
                              required
                              value={regDept}
                              onChange={(e) => setRegDept(e.target.value)}
                              placeholder="e.g. Academic Programs"
                              className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder-slate-700"
                            />
                          </div>
                        </div>
                      )}

                      {regRole === 'admin' && (
                        <div className="space-y-3.5 p-4 rounded-2xl bg-slate-900/30 border border-white/5 text-left">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Administrator Specifications</p>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Designation</label>
                            <input
                              type="text"
                              required
                              value={regDesignation}
                              onChange={(e) => setRegDesignation(e.target.value)}
                              placeholder="e.g. Registrar, Vice Principal"
                              className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white placeholder-slate-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setRegStep('role')}
                        className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all active:scale-98"
                      >
                        Next →
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* STEP 3: SUBMIT REGISTRATION */}
                {regStep === 'submit' && (
                  <motion.div
                    key="submit"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    id="reg-step-submit"
                    className="space-y-5"
                  >
                    <div className="space-y-1 text-center">
                      <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Step 3 of 3</span>
                      <h2 className="text-xl font-bold text-white mt-3">Review Profile Registration</h2>
                      <p className="text-xs text-slate-400">Please verify details before creating your node.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3.5 text-xs text-left">
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Target Account Role</span>
                        <span className="font-extrabold text-indigo-400 uppercase tracking-wide">{regRole}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Full Name</span>
                        <span className="font-bold text-white">{regName}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">School Email</span>
                        <span className="font-mono text-white">{regEmail}</span>
                      </div>

                      {regRole === 'student' && (
                        <>
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Grade & Section</span>
                            <span className="font-bold text-white">{regGrade} - {regSection}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">House Alliance</span>
                            <span className="font-bold text-white">{regHouse}</span>
                          </div>
                        </>
                      )}

                      {regRole === 'teacher' && (
                        <>
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Department</span>
                            <span className="font-bold text-white">{regDept}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-white/5">
                            <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Assigned Subjects</span>
                            <span className="font-bold text-white">{regSubjects}</span>
                          </div>
                        </>
                      )}

                      {regRole === 'coordinator' && (
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Department</span>
                          <span className="font-bold text-white">{regDept}</span>
                        </div>
                      )}

                      {regRole === 'admin' && (
                        <div className="flex justify-between items-center py-1 border-b border-white/5">
                          <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Designation</span>
                          <span className="font-bold text-white">{regDesignation}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 uppercase font-black tracking-widest text-[9px]">Google Verification Linked</span>
                        <span className={`font-black tracking-wider uppercase text-[10px] ${isGoogleLinked ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20' : 'text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20'}`}>
                          {isGoogleLinked ? 'Linked' : 'Unlinked'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-slate-400 text-center leading-relaxed">
                      ⚙️ By proceeding, your institutional clearance request is logged. Standard accounts gain immediate access while administrative roles route into approval queues.
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => setRegStep('profile')}
                        className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                      >
                        ← Back
                      </button>
                      <button
                        id="submit-onboarding-btn"
                        type="button"
                        onClick={handleOnboardingLogin}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 active:scale-98"
                      >
                        Create Profile & Enter StudentOS
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {currentUser && (
        <div className="flex min-h-screen relative">
          
          {/* Main Workspace Sidebar */}
          <aside className={`fixed top-0 left-0 h-full bg-slate-900/95 dark:bg-slate-950/80 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col justify-between transition-all duration-300 p-6 ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
            <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
              
              {/* Sidebar Header Brand */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-lg">S</div>
                  {sidebarOpen && (
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white leading-none">StudentOS</span>
                      <span className="text-[10px] text-indigo-400 font-bold mt-0.5 tracking-wider font-mono">v3.12</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Elements */}
              <nav className="space-y-4">
                {/* SECTION 1: STUDY SUITE */}
                <div className="space-y-1">
                  {sidebarOpen && <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">Study Suite</p>}
                  
                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('dashboard')}
                      className={getSidebarBtnClass('dashboard')}
                    >
                      <span>🏠</span>
                      {sidebarOpen && 'Dashboard Overview'}
                    </button>
                  )}

                  {effectiveRole !== 'student' && !presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('panel_mode')}
                      className={getSidebarBtnClass('panel_mode')}
                    >
                      <span>🖥️</span>
                      {sidebarOpen && 'Panel Mode'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('tasks')) && (
                    <button 
                      onClick={() => handleTabSelect('tasks')}
                      className={getSidebarBtnClass('tasks')}
                    >
                      <span>📋</span>
                      {sidebarOpen && 'Task Manager'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('planner')) && (
                    <button 
                      onClick={() => handleTabSelect('planner')}
                      className={getSidebarBtnClass('planner')}
                    >
                      <span>📅</span>
                      {sidebarOpen && 'Study Planner'}
                    </button>
                  )}

                  {!presentationMode && !isSportsTeacher && (
                    <button 
                      onClick={() => handleTabSelect('notes')}
                      className={getSidebarBtnClass('notes')}
                    >
                      <span>📝</span>
                      {sidebarOpen && 'Lecture Notes'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('pomodoro')) && (
                    <button 
                      onClick={() => handleTabSelect('pomodoro')}
                      className={getSidebarBtnClass('pomodoro')}
                    >
                      <span>🍅</span>
                      {sidebarOpen && 'Focus Timer'}
                    </button>
                  )}
                </div>

                {/* SECTION 2: CLASSROOM & COMMUNITY */}
                <div className="space-y-1">
                  {sidebarOpen && <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">Class & Community</p>}
                  
                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('quiz')}
                      className={getSidebarBtnClass('quiz')}
                    >
                      <span>🧠</span>
                      {sidebarOpen && 'Interactive Quiz'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('whiteboard')) && !isSportsTeacher && (
                    <button 
                      onClick={() => handleTabSelect('whiteboard')}
                      className={getSidebarBtnClass('whiteboard')}
                    >
                      <span>✏️</span>
                      {sidebarOpen && 'Class Whiteboard'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('materials')) && (
                    <button 
                      onClick={() => handleTabSelect('materials')}
                      className={getSidebarBtnClass('materials')}
                    >
                      <span>📚</span>
                      {sidebarOpen && 'Materials Hub'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('assignments')) && (
                    <button 
                      onClick={() => handleTabSelect('assignments')}
                      className={getSidebarBtnClass('assignments')}
                    >
                      <span>📓</span>
                      {sidebarOpen && 'Assignment Center'}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('houses')}
                      className={getSidebarBtnClass('houses')}
                    >
                      <span>🏆</span>
                      {sidebarOpen && 'House Standings'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('homework')) && !isSportsTeacher && (
                    <button 
                      onClick={() => handleTabSelect('homework')}
                      className={getSidebarBtnClass('homework')}
                      title="Access class assignments online"
                    >
                      <span>📓</span>
                      {sidebarOpen && 'Class Homework'}
                    </button>
                  )}

                  {isSportsTeacher && !presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('sports_activities')}
                      className={getSidebarBtnClass('sports_activities')}
                    >
                      <span>⚽</span>
                      {sidebarOpen && 'Sports & Activities'}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('feedback')}
                      className={getSidebarBtnClass('feedback')}
                    >
                      <span>💬</span>
                      {sidebarOpen && 'Feedback Board'}
                    </button>
                  )}

                  {(!presentationMode || isTabAllowedInPresentation('ai_teacher')) && (
                    <button 
                      onClick={() => handleTabSelect('ai_teacher')}
                      className={getSidebarBtnClass('ai_teacher')}
                    >
                      <span>🤖</span>
                      {sidebarOpen && 'Campus AI Agent'}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('peer_chat')}
                      className={getSidebarBtnClass('peer_chat')}
                    >
                      <span>🌍</span>
                      {sidebarOpen && 'Global Chat'}
                    </button>
                  )}
                </div>

                {/* SECTION 3: USER & SYSTEM */}
                <div className="space-y-1">
                  {sidebarOpen && <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-3 mb-1">User & System</p>}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('substitutes')}
                      className={getSidebarBtnClass('substitutes')}
                    >
                      <span>📋</span>
                      {sidebarOpen && 'Substitute Board'}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('analytics')}
                      className={getSidebarBtnClass('analytics')}
                    >
                      <span>📊</span>
                      {sidebarOpen && 'Performance Analytics'}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('profile')}
                      className={getSidebarBtnClass('profile')}
                    >
                      <span>👤</span>
                      {sidebarOpen && `${(effectiveRole || 'student').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Profile`}
                    </button>
                  )}

                  {!presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('blogs')}
                      className={getSidebarBtnClass('blogs')}
                    >
                      <span>💎</span>
                      {sidebarOpen && 'Blogs'}
                    </button>
                  )}

                  {effectiveRole === 'teacher' && !presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('faculty')}
                      className={getSidebarBtnClass('faculty', 'faculty')}
                    >
                      <span>👨‍🏫</span>
                      {sidebarOpen && 'Faculty Center'}
                    </button>
                  )}

                  {['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole) && !presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('attendance_manager')}
                      className={getSidebarBtnClass('attendance_manager', 'attendance')}
                    >
                      <span>📋</span>
                      {sidebarOpen && 'Attendance Manager'}
                    </button>
                  )}

                  {(effectiveRole === 'admin' || effectiveRole === 'super_admin') && !presentationMode && (
                    <button 
                      onClick={() => handleTabSelect('admin')}
                      className={getSidebarBtnClass('admin', 'admin')}
                    >
                      <span>⚙️</span>
                      {sidebarOpen && 'Admin Center'}
                    </button>
                  )}
                </div>
              </nav>
            </div>

            {/* Sidebar Footer User detail card */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              {sidebarOpen && (
                <div className="p-3.5 rounded-2xl bg-white/5 flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Avatar" 
                      className="h-9 w-9 rounded-xl object-cover border border-white/10" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white ${currentUser.house ? getHouseBadgeColor(currentUser.house) : 'bg-slate-700'}`}>
                      {currentUser.name ? currentUser.name[0] : '?'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate leading-none">{currentUser.name || 'Anonymous User'}</span>
                    <span className="text-[10px] text-slate-400 truncate mt-1 font-bold">
                      {presentationMode ? '🖥️ Presenter' : getUserProfileTitle(currentUser, effectiveRole)}
                    </span>
                    {currentUser.accountStatus && currentUser.accountStatus !== 'approved' && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wider w-max ${
                        currentUser.accountStatus.startsWith('pending')
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {currentUser.accountStatus.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Theme Selector Widget */}
              <div className="flex items-center justify-between gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-white/5 mx-1">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 flex items-center justify-center py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    themeMode === 'light' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Force Light Mode"
                >
                  ☀️ {sidebarOpen && <span className="ml-1 text-[9px]">Light</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 flex items-center justify-center py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    themeMode === 'dark' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Force Dark Mode"
                >
                  🌙 {sidebarOpen && <span className="ml-1 text-[9px]">Dark</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('auto')}
                  className={`flex-1 flex items-center justify-center py-2 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    themeMode === 'auto' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Follow System Theme"
                >
                  ⚙️ {sidebarOpen && <span className="ml-1 text-[9px]">Auto</span>}
                </button>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-xs bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all font-semibold"
              >
                <LogOut className="w-4 h-4" />
                {sidebarOpen && 'Kill Session'}
              </button>
            </div>
          </aside>

          {/* Main workspace frame */}
          <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
            {/* BEAUTIFUL DEMO MODE BANNER */}
            {isDemoMode && (
              <div className="bg-gradient-to-r from-red-600 via-amber-600 to-indigo-600 text-white py-2 px-4 shadow-lg z-50 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded animate-pulse">🚨 DEMO ACTIVE</span>
                  <span className="text-xs font-semibold text-white/90">Sandbox state loaded. Real-time Firestore paused.</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] uppercase font-black text-white/70 tracking-wider">Switch Profile:</span>
                  <button
                    onClick={() => {
                      const demoStudent = {
                        uid: 'demo-student-uid',
                        name: 'Naitik Kashyap',
                        email: 'naitik.kashyap0015@gmail.com',
                        role: 'student' as const,
                        grade: 'Grade 10',
                        section: 'Ruby' as any,
                        house: 'Ruby' as any,
                        studyHours: 14,
                        quizzesTaken: 5,
                        streakDays: 8,
                        accountStatus: 'approved' as const
                      };
                      setCurrentUser(demoStudent);
                      localStorage.setItem('s_os_user', JSON.stringify(demoStudent));
                      saveSupabaseUserProfile(demoStudent).catch(console.error);
                      showNotification('Swapped workspace context to: Student Demo (Naitik Kashyap)');
                    }}
                    className={`text-[9px] font-extrabold py-0.5 px-2 rounded transition-all ${currentUser?.role === 'student' ? 'bg-white text-slate-900 border border-white font-black shadow-sm scale-105' : 'bg-black/25 text-white border border-white/10 hover:bg-black/45'}`}
                  >
                    🎓 Naitik (Student)
                  </button>
                  <button
                    onClick={() => {
                      const demoTeacher = {
                        uid: 'demo-teacher-uid',
                        name: 'Physics Teacher',
                        email: 'physics.teacher@school.edu',
                        role: 'teacher' as const,
                        specialtySubject: 'Physics',
                        assignedGrades: ['Grade 10', 'Grade 11', 'Grade 12'],
                        assignedSections: ['Ruby', 'Astra', 'Vega'],
                        assignedClasses: ['10_Ruby', '11_Astra', '12_Vega'],
                        accountStatus: 'approved' as const
                      };
                      setCurrentUser(demoTeacher);
                      localStorage.setItem('s_os_user', JSON.stringify(demoTeacher));
                      saveSupabaseUserProfile(demoTeacher).catch(console.error);
                      showNotification('Swapped workspace context to: Physics Faculty');
                    }}
                    className={`text-[9px] font-extrabold py-0.5 px-2 rounded transition-all ${currentUser?.role === 'teacher' ? 'bg-white text-slate-900 border border-white font-black shadow-sm scale-105' : 'bg-black/25 text-white border border-white/10 hover:bg-black/45'}`}
                  >
                    🔬 Physics (Teacher)
                  </button>
                  <button
                    onClick={() => {
                      const demoAdmin = {
                        uid: 'demo-admin-uid',
                        name: 'School Administrator',
                        email: 'admin@school.edu',
                        role: 'admin' as const,
                        accountStatus: 'approved' as const
                      };
                      setCurrentUser(demoAdmin);
                      localStorage.setItem('s_os_user', JSON.stringify(demoAdmin));
                      saveSupabaseUserProfile(demoAdmin).catch(console.error);
                      showNotification('Swapped workspace context to: School Administrator');
                    }}
                    className={`text-[9px] font-extrabold py-0.5 px-2 rounded transition-all ${currentUser?.role === 'admin' ? 'bg-white text-slate-900 border border-white font-black shadow-sm scale-105' : 'bg-black/25 text-white border border-white/10 hover:bg-black/45'}`}
                  >
                    🛡️ Admin
                  </button>
                </div>
              </div>
            )}
            
            {/* Global Workspace Header bar */}
            <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-slate-950/40">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-all"
                >
                  <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`} />
                </button>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-white font-display">
                    {activeTab === 'dashboard' && 'My Dashboard'}
                    {activeTab === 'tasks' && 'My Tasks'}
                    {activeTab === 'whiteboard' && 'Drawing Board'}
                    {activeTab === 'houses' && 'House Standings'}
                    {activeTab === 'materials' && 'Class Files & Materials'}
                    {activeTab === 'assignments' && 'Assignment Center'}
                    {activeTab === 'homework' && 'My Homework'}
                    {activeTab === 'quiz' && 'Practice Quizzes'}
                    {activeTab === 'feedback' && 'Feedback Box'}
                    {activeTab === 'ai_teacher' && 'My AI Tutor'}
                    {activeTab === 'peer_chat' && 'Class Chat Room'}
                    {activeTab === 'faculty' && 'Teacher Dashboard'}
                    {activeTab === 'planner' && 'Study Planner'}
                    {activeTab === 'notes' && 'My Personal Notes'}
                    {activeTab === 'pomodoro' && 'Focus Timer'}
                    {activeTab === 'analytics' && 'My Progress'}
                    {activeTab === 'profile' && 'My Profile'}
                    {activeTab === 'blogs' && 'Educational Blogs'}
                  </h2>
                </div>
              </div>

              {/* Status and Clock widget */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                
                {/* Classroom Security Center */}
                {['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole || '') && (
                  <div className="relative">
                    <button
                      onClick={() => setSecurityMenuOpen(!securityMenuOpen)}
                      className={`px-3 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        presentationMode 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                          : 'bg-slate-900 border-white/5 hover:bg-slate-800 text-slate-300'
                      }`}
                      title="Classroom Security Center"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Security</span>
                      {presentationMode && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      )}
                    </button>

                    {securityMenuOpen && (
                      <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl z-50 space-y-3.5 animate-fadeIn text-slate-100">
                        <div className="pb-2 border-b border-white/5 flex items-center justify-between">
                          <span className="text-xs uppercase font-mono tracking-wider font-extrabold text-indigo-400 flex items-center gap-1.5">
                            🔒 Classroom Panel
                          </span>
                          <button 
                            onClick={() => setSecurityMenuOpen(false)}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Interactive Actions */}
                        <div className="space-y-3">
                          {/* 1. Presentation Mode Toggle */}
                          <div className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold">Presentation Mode</span>
                              <span className="text-[9px] text-slate-400">Hide emails & private views</span>
                            </div>
                            <button
                              onClick={() => {
                                setSecurityMenuOpen(false);
                                if (presentationMode) {
                                  // Require PIN to turn off
                                  triggerPinVerification(() => {
                                    setPresentationMode(false);
                                    localStorage.setItem('s_os_presentation_mode', 'false');
                                    showNotification('🔓 Presentation Mode disabled. Normal views restored.');
                                  });
                                } else {
                                  // Enable presentation mode
                                  if (!teacherPin) {
                                    setPinSetupOpen(true);
                                  } else {
                                    setPresentationMode(true);
                                    localStorage.setItem('s_os_presentation_mode', 'true');
                                    if (!isTabAllowedInPresentation(activeTab)) {
                                      setActiveTab('whiteboard');
                                    }
                                    showNotification('🔒 Presentation Mode active on Smart Board.');
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                presentationMode 
                                  ? 'bg-teal-500 text-slate-950' 
                                  : 'bg-white/10 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              {presentationMode ? 'Active' : 'Start'}
                            </button>
                          </div>

                          {/* 2. Smart Board Mode Toggle */}
                          <div className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold">Smart Board Mode</span>
                              <span className="text-[9px] text-slate-400">Large touch UI & elements</span>
                            </div>
                            <button
                              onClick={() => {
                                const newVal = !smartBoardMode;
                                setSmartBoardMode(newVal);
                                localStorage.setItem('s_os_smart_board_mode', newVal ? 'true' : 'false');
                                showNotification(newVal ? '🖥️ Smart Board optimization active.' : '🖥️ Standard UI active.');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                smartBoardMode 
                                  ? 'bg-indigo-500 text-white shadow' 
                                  : 'bg-white/10 hover:bg-white/15 text-slate-300'
                              }`}
                            >
                              {smartBoardMode ? 'Active' : 'Start'}
                            </button>
                          </div>

                        {/* 3. Quick Lock Screen Button */}
                        <button
                          onClick={() => {
                            setSecurityMenuOpen(false);
                            const activePin = currentUser?.pin || teacherPin;
                            if (!activePin) {
                              setPinSetupOpen(true);
                            } else {
                              setIsLocked(true);
                              if (currentUser) {
                                const updatedUser = { ...currentUser, raw_data: { ...(currentUser.raw_data || {}), isLocked: true } };
                                setCurrentUser(updatedUser);
                                saveSupabaseUserProfile(updatedUser).catch(console.error);
                              }
                              showNotification('🔒 Screen locked. PIN required to resume.');
                            }
                          }}
                          className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            Lock Workspace Now
                          </button>

                          {/* 4. PIN Management */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>PIN Secured</span>
                            <button
                              onClick={() => {
                                setSecurityMenuOpen(false);
                                setPinSetupOpen(true);
                              }}
                              className="text-indigo-400 hover:underline font-bold"
                            >
                              {teacherPin ? 'Reset PIN' : 'Create PIN'}
                            </button>
                          </div>

                          {/* 5. Auto Lock Duration Selector */}
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] uppercase font-mono text-slate-400">Auto Lock:</span>
                            <select
                              value={autoLockTime}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setAutoLockTime(val);
                                localStorage.setItem('s_os_auto_lock_time', val.toString());
                                showNotification(val > 0 ? `⏰ Screen will auto-lock after ${val} minutes of inactivity.` : '⏰ Auto-lock disabled.');
                              }}
                              className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-300 outline-none"
                            >
                              <option value={0}>Disabled</option>
                              <option value={5}>5 Min</option>
                              <option value={10}>10 Min</option>
                              <option value={15}>15 Min</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Accessibility Toolbar panel */}
                <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5 shadow-inner">
                  <button 
                    onClick={() => setFontSize(prev => prev === 'standard' ? 'large' : prev === 'large' ? 'huge' : 'standard')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300"
                    title="Toggle Font Size"
                  >
                    <span className="font-bold">A</span>
                    {fontSize === 'large' && <span className="text-[9px] text-indigo-400 ml-0.5">+</span>}
                    {fontSize === 'huge' && <span className="text-[9px] text-indigo-400 ml-0.5">++</span>}
                  </button>
                  <button 
                    onClick={() => setHighContrast(!highContrast)}
                    className={`p-1.5 rounded-lg text-slate-300 ${highContrast ? 'bg-indigo-600 text-white' : 'hover:bg-white/10'}`}
                    title="Toggle High Contrast Mode"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`p-1.5 rounded-lg ${ttsEnabled ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-white/10'}`}
                    title="Toggle TTS Assistance"
                  >
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-white/5 font-mono text-indigo-400 shadow-sm">
                  <Clock className="w-4 h-4" />
                  <span>{clock}</span>
                </div>

                {/* Notification Center */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifCenter(!showNotifCenter)}
                    className="relative p-2 rounded-xl bg-slate-900 border border-white/5 hover:bg-slate-800 hover:text-white text-slate-300 transition-all flex items-center justify-center cursor-pointer"
                    title="Academic Notification Hub"
                  >
                    <Bell className="w-4 h-4" />
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white leading-none scale-100 animate-pulse">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  {showNotifCenter && (
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl z-50 space-y-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white font-display">Notification Center</span>
                          {notifications.filter(n => !n.read).length > 0 && (
                            <span className="text-[10px] bg-indigo-500/15 text-indigo-400 font-bold px-2 py-0.5 rounded-full">
                              {notifications.filter(n => !n.read).length} new
                            </span>
                          )}
                        </div>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center space-y-1.5">
                            <p className="text-xl">📭</p>
                            <p className="text-xs text-slate-400 font-medium">All clear! No notifications found.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 relative group ${
                                notif.read 
                                  ? 'bg-slate-950/20 border-white/5 opacity-60 hover:opacity-100' 
                                  : 'bg-indigo-600/5 border-indigo-500/20 hover:border-indigo-500/40 shadow-sm'
                              }`}
                            >
                              <div className="text-lg shrink-0 mt-0.5">
                                {getNotificationEmoji(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-xs font-bold truncate leading-tight ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                    {notif.title}
                                  </span>
                                  <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10.5px] text-slate-400 leading-relaxed break-words pr-4">
                                  {notif.message}
                                </p>
                              </div>

                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 rounded-lg p-0.5 border border-white/5">
                                {!notif.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className="p-1 hover:bg-white/10 text-indigo-400 rounded-md transition-colors"
                                    title="Mark as Read"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteNotif(notif.id)}
                                  className="p-1 hover:bg-red-500/20 text-red-400 rounded-md transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {effectiveRole === 'student' && currentUser.house && (
                  <span className={`px-3 py-1.5 rounded-full ${getHouseBadgeColor(currentUser.house)} font-bold tracking-wide uppercase text-[10px]`}>
                    📍 {currentUser.house} House
                  </span>
                )}
              </div>
            </header>

            {/* Base View Layout Wrapper */}
            <main className={`flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 ${fontSize === 'large' ? 'text-lg' : fontSize === 'huge' ? 'text-xl' : 'text-sm'}`}>
              
              {/* Tab: Panel Mode Launcher */}
              {activeTab === 'panel_mode' && effectiveRole !== 'student' && (
                <div className="space-y-6 animate-fadeIn h-[calc(100vh-140px)] flex flex-col pt-4">
                  {/* Banner */}
                  <div className="p-10 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center text-center gap-4 border border-indigo-500/20 bg-slate-900 shadow-2xl z-10 shrink-0">
                    <div className="absolute top-0 w-full h-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full relative z-10">Multi-Tool Terminal • Academic Hub</span>
                    <h2 className="text-4xl md:text-5xl font-black text-white font-display relative z-10 tracking-tight">System Panel Mode</h2>
                    <p className="text-slate-400 max-w-lg text-sm relative z-10 leading-relaxed">Quickly launch and access essential academic tools, interactive whiteboards, smart assistant Orion, or focus timers.</p>
                  </div>

                  {/* Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    <div 
                      onClick={() => handleTabSelect('whiteboard')}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_40px_-5px_rgba(99,102,241,0.2)] flex flex-col items-center justify-center text-center gap-4 h-full"
                    >
                      <div className="w-24 h-24 bg-indigo-500/10 text-indigo-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform">✏️</div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-2">Class Whiteboard</h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">Launch the interactive full-screen classroom smart board projection.</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleTabSelect('materials')}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.2)] flex flex-col items-center justify-center text-center gap-4 h-full"
                    >
                      <div className="w-24 h-24 bg-emerald-500/10 text-emerald-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform">📚</div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                          {effectiveRole === 'teacher' ? 'Teacher Materials Vault' : 'Materials Hub'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                          {effectiveRole === 'teacher' ? 'Access secured master documents, exams, and grading rubrics.' : 'Access synced documents, resources, and shared classroom files.'}
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleTabSelect('ai_teacher')}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-pink-500/50 hover:shadow-[0_0_40px_-5px_rgba(236,72,153,0.2)] flex flex-col items-center justify-center text-center gap-4 h-full"
                    >
                      <div className="w-24 h-24 bg-pink-500/10 text-pink-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform">🤖</div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                          {effectiveRole === 'teacher' ? 'AI Admin & Assessor' : 'AI Assistant'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                          {effectiveRole === 'teacher' ? 'Query the AI to draft rubrics, construct quizzes, and parse student data.' : 'Query the AI tutor for homework help and guided studying.'}
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => setIsJarvisActive(true)}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_40px_-5px_rgba(6,182,212,0.2)] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden h-full"
                    >
                      <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-24 h-24 bg-cyan-500/10 text-cyan-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform relative z-10">🎙️</div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase">Orion Copilot</h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">Activate the voice-command smart classroom AI assistant.</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleTabSelect('notes')}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-amber-500/50 hover:shadow-[0_0_40px_-5px_rgba(245,158,11,0.2)] flex flex-col items-center justify-center text-center gap-4 h-full"
                    >
                      <div className="w-24 h-24 bg-amber-500/10 text-amber-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform">📝</div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
                          {effectiveRole === 'teacher' ? 'Teaching Records' : 'My Notes'}
                        </h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                          {effectiveRole === 'teacher' ? 'Log private administrative and student behavioral records.' : 'Write, edit, and organize your personal quick scratchpad.'}
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => handleTabSelect('pomodoro')}
                      className="group cursor-pointer bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 hover:bg-slate-800 transition-all hover:border-red-500/50 hover:shadow-[0_0_40px_-5px_rgba(239,68,68,0.2)] flex flex-col items-center justify-center text-center gap-4 h-full"
                    >
                      <div className="w-24 h-24 bg-red-500/10 text-red-400 flex items-center justify-center rounded-[2rem] text-5xl group-hover:scale-110 transition-transform">⏲️</div>
                      <div>
                        <h3 className="text-xl font-bold text-white tracking-tight mb-2">Focus Timer</h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">Customizable work sessions with auditory bell sound alerts.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 1: Dashboard View */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Status Banner for Pending Requests */}
                  {currentUser.accountStatus && currentUser.accountStatus !== 'approved' && (
                    <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                      currentUser.accountStatus.startsWith('pending')
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                        : 'bg-red-500/5 border-red-500/20 text-red-300'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">
                          {currentUser.accountStatus.startsWith('pending') ? '⏳' : '❌'}
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">
                            Account Status: {currentUser.accountStatus.replace('pending_', 'Pending ').toUpperCase()}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Your request to join as a {currentUser.requestedRole?.toUpperCase()} is currently awaiting administrator verification. In the meantime, you have been granted temporary Student-level access to explore.
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-2.5 py-1 bg-white/10 rounded-full font-mono shrink-0 text-center">
                        Awaiting Admin Approval
                      </span>
                    </div>
                  )}

                  {/* Glowing user banner */}
                  <div className={`p-8 rounded-3xl relative overflow-hidden backdrop-blur-md border shadow-xl ${currentUser.house === 'Ruby' ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500/20' : currentUser.house === 'Emerald' ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/20' : currentUser.house === 'Sapphire' ? 'bg-gradient-to-r from-blue-950/40 to-slate-900 border-blue-500/20' : currentUser.house === 'Topaz' ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500/20' : 'bg-gradient-to-r from-indigo-950/40 to-slate-900 border-white/10'}`}>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Adaptive Classroom Node</span>
                        <h1 className="text-3xl font-black font-display text-white">Welcome back, {currentUser.name}!</h1>
                        <p className="text-slate-300 max-w-xl text-sm">
                          {effectiveRole === 'student' 
                            ? `You represent ${currentUser.house} House, studying in Section ${currentUser.section}. Keep tracking critical tasks and contribute points to your house leaderboard!`
                            : `You are logged in as a specialized faculty leader in ${currentUser.specialtySubject}. Set up whiteboard slide broadcasts, review student feedback lists, and evaluate class performance.`}
                        </p>
                      </div>

                      {/* Summary Streak component */}
                      <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 animate-pulse">
                        <Flame className="w-10 h-10 text-orange-500" />
                        <div>
                          <p className="text-lg font-black text-white">{currentUser.streakDays || 5} Days</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active study streak</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Quick Navigation Section */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span>⚡</span> Quick Navigation Dashboard
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Student Cards */}
                      {effectiveRole === 'student' && (
                        <>
                          <button
                            onClick={() => handleTabSelect('notes')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📝</span>
                            <span className="text-xs font-bold text-white">Lecture Notes</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('homework')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📓</span>
                            <span className="text-xs font-bold text-white">Homework Hub</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('quiz')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">🧠</span>
                            <span className="text-xs font-bold text-white">Interactive Quizzes</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('analytics')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📊</span>
                            <span className="text-xs font-bold text-white">Performance Stats</span>
                          </button>
                        </>
                      )}

                      {/* Teacher Cards */}
                      {effectiveRole === 'teacher' && (
                        <>
                          <button
                            onClick={() => handleTabSelect('panel_mode')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">🖥️</span>
                            <span className="text-xs font-bold text-white">Smartboard Panel</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('attendance_manager')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📋</span>
                            <span className="text-xs font-bold text-white">Attendance Roll</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('faculty')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">👨‍🏫</span>
                            <span className="text-xs font-bold text-white">Faculty Portal</span>
                          </button>
                          {isSportsTeacher ? (
                            <button
                              onClick={() => handleTabSelect('sports_activities')}
                              className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                            >
                              <span className="text-2xl">⚽</span>
                              <span className="text-xs font-bold text-white">Co-Curriculars</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTabSelect('assignments')}
                              className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                            >
                              <span className="text-2xl">📓</span>
                              <span className="text-xs font-bold text-white">Assignment Hub</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Coordinator Cards */}
                      {effectiveRole === 'coordinator' && (
                        <>
                          <button
                            onClick={() => handleTabSelect('attendance_manager')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📋</span>
                            <span className="text-xs font-bold text-white">Attendance Ledger</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('blogs')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">💎</span>
                            <span className="text-xs font-bold text-white">School Blogs</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('planner')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📅</span>
                            <span className="text-xs font-bold text-white">Study Planner</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('profile')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">👤</span>
                            <span className="text-xs font-bold text-white">My Profile</span>
                          </button>
                        </>
                      )}

                      {/* Admin & Super Admin Cards */}
                      {(effectiveRole === 'admin' || effectiveRole === 'super_admin') && (
                        <>
                          <button
                            onClick={() => handleTabSelect('admin')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">⚙️</span>
                            <span className="text-xs font-bold text-white">Control Center</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('attendance_manager')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">📋</span>
                            <span className="text-xs font-bold text-white">Attendance Roll</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('blogs')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">💎</span>
                            <span className="text-xs font-bold text-white">Blogs Portal</span>
                          </button>
                          <button
                            onClick={() => handleTabSelect('profile')}
                            className="p-4 bg-slate-900/60 hover:bg-indigo-950/40 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center gap-2 hover:border-indigo-500/50 hover:shadow-lg transition-all"
                          >
                            <span className="text-2xl">👤</span>
                            <span className="text-xs font-bold text-white">My Profile</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Core Metrics Bento Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="smart-glass p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Milestones Open</span>
                        <h3 className="text-2xl font-black text-white tracking-tight">{tasks.filter(t => !t.completed).length} Tasks</h3>
                      </div>
                      <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">📋</div>
                    </div>

                    <div className="smart-glass p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Saved Notes</span>
                        <h3 className="text-2xl font-black text-white tracking-tight">{vaultNotes.length} Items</h3>
                      </div>
                      <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">📝</div>
                    </div>

                    <div className="smart-glass p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Self Quizzes Taken</span>
                        <h3 className="text-2xl font-black text-white tracking-tight">{currentUser.quizzesTaken || 3} Checked</h3>
                      </div>
                      <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">🧠</div>
                    </div>

                    <div className="smart-glass p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hours In Field</span>
                        <h3 className="text-2xl font-black text-white tracking-tight">{currentUser.studyHours || 12} hrs</h3>
                      </div>
                      <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">⏱️</div>
                    </div>
                  </div>

                  {/* High Quality Bento Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Column 1: School dashboard standing lists & Schedules */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Interactive Lesson Broadcast banner (if active) */}
                      {activeBroadcast && (
                        <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-4 animate-pulse">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-xl animate-spin">📡</div>
                            <div>
                              <p className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Active Live Broadcast</p>
                              <p className="text-base font-bold text-white leading-tight">{activeBroadcast.title}</p>
                              <p className="text-xs text-slate-300">Subject: {activeBroadcast.subject} • Pres. {activeBroadcast.presentedBy}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setStudentJoinedClass(true);
                              handleTabSelect('whiteboard');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md uppercase transition-all"
                          >
                            Join Smartboard Classroom
                          </button>
                        </div>
                      )}

                      {/* Section Timetable and schedule */}
                      <div className="smart-glass p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black font-display text-white">Daily Schedule Standings</h3>
                          <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">Section Astra & Solara</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {schedules.map(sch => (
                            <div key={sch.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors flex justify-between items-center">
                              <div>
                                <p className="font-bold text-sm text-white">{sch.subject}</p>
                                <p className="text-xs text-slate-400">{sch.day}</p>
                              </div>
                              <div className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg">
                                {sch.time}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Official Bulletin boards */}
                      <div className="smart-glass p-6 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black font-display text-white">Academic Notice Board</h3>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">LTS Verified Announcements</span>
                        </div>
                        <div className="space-y-3.5">
                          {announcements.length > 0 ? (
                            announcements.map(ann => (
                              <div key={ann.id} className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all space-y-2">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${ann.tagColor || 'bg-indigo-500/10 text-indigo-400'}`}>{ann.tag || 'Notice'}</span>
                                  <span className="text-[10px] text-slate-500">{ann.date || 'Today'}</span>
                                </div>
                                <h4 className="font-bold text-sm text-white leading-tight">{ann.title}</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                                <button 
                                  onClick={() => speakText(`${ann.title}. ${ann.content}`)}
                                  className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg mt-1 transition-all"
                                >
                                  <Volume2 className="w-3.5 h-3.5" /> Read Aloud
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-slate-500 font-mono text-xs">
                              📢 No announcements posted yet.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Column 2: House Standings Leaderboards & Quick Challenges */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* House System standings leaderboard */}
                      <div className="smart-glass p-6 rounded-3xl space-y-5">
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold font-display text-white">School House Standings</h3>
                          <p className="text-xs text-slate-400 leading-tight">Compete in quizzes and schedules to earn points for your house alliance.</p>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(housePoints).map(([house, points]) => (
                            <div key={house} className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${getHouseBadgeColor(house as HouseType)}`}>
                                  {house[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{house} House</p>
                                  <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Allied Standings</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black text-sm text-white">{points}</p>
                                <p className="text-[8px] text-slate-500">Pts</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Active House specific challenges */}
                      <div className="smart-glass p-6 rounded-3xl space-y-4">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-400" /> Allied Challenges
                        </h4>
                        <div className="space-y-3 text-xs leading-relaxed">
                          <div className="p-2.5 bg-slate-900 rounded-xl space-y-1">
                            <p className="font-bold text-emerald-400">Emerald Challenge</p>
                            <p className="text-[10px] text-slate-400">Have 5 students complete CS BST quiz vectors continuously.</p>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-full w-[60%]"></div>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-900 rounded-xl space-y-1">
                            <p className="font-bold text-orange-400">Topaz Challenge</p>
                            <p className="text-[10px] text-slate-400">Accrue combined 120 focus study blocks.</p>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-orange-500 h-full w-[45%]"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Featured Academic Materials Hub Integration Row */}
                  <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="space-y-0.5">
                        <h3 className="text-lg font-black font-display text-white">Featured Academic Materials</h3>
                        <p className="text-xs text-slate-400">Hand-picked contributions from your class, section, and faculty.</p>
                      </div>
                      <button 
                        onClick={() => handleTabSelect('materials')}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 bg-indigo-500/10 px-3.5 py-2 rounded-xl border border-indigo-500/20 shadow-md hover:scale-[1.01] transition-transform"
                      >
                        Explore Materials Hub →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Section 1: Recent Materials */}
                      <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-1">⏱️ Recent Uploads</span>
                        </div>
                        <div className="space-y-2">
                          {materials.slice(0, 3).map((mat) => (
                            <div key={mat.id} className="p-2.5 bg-black/25 rounded-xl border border-white/5 hover:bg-black/40 cursor-pointer transition-colors" onClick={() => handleTabSelect('materials')}>
                              <p className="text-xs font-bold text-white truncate">{mat.title}</p>
                              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                                <span>{mat.subject}</span>
                                <span>{mat.createdAt}</span>
                              </div>
                            </div>
                          ))}
                          {materials.length === 0 && (
                            <p className="text-[11px] text-slate-500 italic py-2">No uploaded materials yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Trending Materials */}
                      <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider flex items-center gap-1">🔥 Trending Materials</span>
                        </div>
                        <div className="space-y-2">
                          {[...materials]
                            .sort((a, b) => ((b.downloads || 0) + (b.views || 0)) - ((a.downloads || 0) + (a.views || 0)))
                            .slice(0, 3)
                            .map((mat) => (
                              <div key={mat.id} className="p-2.5 bg-black/25 rounded-xl border border-white/5 hover:bg-black/40 cursor-pointer transition-colors" onClick={() => handleTabSelect('materials')}>
                                <p className="text-xs font-bold text-white truncate">{mat.title}</p>
                                <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                                  <span>{mat.subject}</span>
                                  <span className="text-slate-300">📈 {(mat.downloads || 0) + (mat.views || 0)} pts</span>
                                </div>
                              </div>
                            ))}
                          {materials.length === 0 && (
                            <p className="text-[11px] text-slate-500 italic py-2">No trending materials yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Verified Materials */}
                      <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1">✅ Teacher Verified</span>
                        </div>
                        <div className="space-y-2">
                          {materials.filter(m => m.isVerified).slice(0, 3).map((mat) => (
                            <div key={mat.id} className="p-2.5 bg-black/25 rounded-xl border border-white/5 hover:bg-black/40 cursor-pointer transition-colors" onClick={() => handleTabSelect('materials')}>
                              <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                                <span>{mat.title}</span>
                              </p>
                              <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                                <span>{mat.subject}</span>
                                <span className="text-emerald-400 text-[9px] uppercase font-black font-sans leading-none">Verified</span>
                              </div>
                            </div>
                          ))}
                          {materials.filter(m => m.isVerified).length === 0 && (
                            <p className="text-[11px] text-slate-500 italic py-2">No verified materials yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Task Manager View */}
              {activeTab === 'tasks' && (
                <div className="smart-glass p-8 rounded-3xl space-y-6 max-w-3xl mx-auto animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-display text-white">Target Tasks & Focus Objectives</h3>
                    <p className="text-xs text-slate-400">Record syllabus preparation sequences, project homework, and term tests timelines.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input 
                      type="text"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="e.g., Study AVL Tree balancing heights and double rotations..."
                      className="flex-1 px-4 py-3 text-sm rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button 
                      onClick={handleAddTask}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    {tasks.map(t => (
                      <div key={t.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleTask(t.id)}
                            className={`h-5 w-5 rounded flex items-center justify-center border transition-all ${t.completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-white/20 hover:border-white'}`}
                          >
                            {t.completed && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span className={`text-sm ${t.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {t.title}
                          </span>
                        </div>
                        <button 
                          onClick={() => deleteTask(t.id)}
                          className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {tasks.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        No active task milestones recorded yet. Create one!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Study Planner View */}
              {activeTab === 'planner' && (
                <div className="smart-glass p-8 rounded-3xl space-y-6 max-w-4xl mx-auto animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-display text-white">Target Study Time Planner</h3>
                    <p className="text-xs text-slate-400">Map targeted times against core disciplines and organize class exam sequences.</p>
                  </div>

                  <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Focus Subject</label>
                      <input 
                        type="text"
                        value={schSubject}
                        onChange={e => setSchSubject(e.target.value)}
                        placeholder="Subject Focus Title" 
                        className="w-full text-xs px-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Target Window</label>
                      <input 
                        type="text"
                        value={schTime}
                        onChange={e => setSchTime(e.target.value)}
                        placeholder="e.g. 14:00 - 16:30" 
                        className="w-full text-xs px-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Schedule Day</label>
                      <select 
                        value={schDay}
                        onChange={e => setSchDay(e.target.value)}
                        className="w-full text-xs px-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                        <option>Saturday</option>
                        <option>Sunday</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Add Schedule
                      </button>
                    </div>
                  </form>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-bold text-indigo-400">Current Schedule Blocks</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {schedules.map(sch => (
                        <div key={sch.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all duration-300 flex items-center justify-between group shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">📚 {sch.subject}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">{sch.day}</span>
                            </div>
                            <p className="text-xs font-mono text-slate-300">⏱️ {sch.time}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteSchedule(sch.id)}
                            className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg opacity-80 group-hover:opacity-100 transition-all active:scale-95"
                            title="Delete Interval"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {schedules.length === 0 && (
                        <div className="col-span-2 text-center py-8 text-slate-500 border border-dashed border-white/5 rounded-2xl">
                          No study schedules saved. Map your day above!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Structured Vault Notes View */}
              {activeTab === 'notes' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Notion Sidebar List: 4 Cols */}
                    <div className="lg:col-span-4 smart-glass p-5 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-black text-white font-display uppercase tracking-tight">Notion Canvas Workspace</h3>
                          <p className="text-[10px] text-slate-400">Organize and draft rich study structures.</p>
                        </div>
                        <button 
                          onClick={handleCreateNewNote}
                          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-505 text-white hover:bg-indigo-500 transition-all font-bold text-xs uppercase shadow-md flex items-center gap-1 active:scale-95"
                          title="Instantiate clean canvas node"
                        >
                          ➕ New
                        </button>
                      </div>

                      {/* Notes Search bar */}
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Search lecture pages..."
                          value={newNoteTitle} // we'll use newNoteTitle as intermediate searching if needed, or local input
                          onChange={e => setNewNoteTitle(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="absolute left-3 top-3 text-[10px]">🔍</span>
                      </div>

                      {/* list of pages */}
                      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                        {vaultNotes
                          .filter(n => !newNoteTitle.trim() || n.title.toLowerCase().includes(newNoteTitle.toLowerCase()) || n.subject.toLowerCase().includes(newNoteTitle.toLowerCase()))
                          .map(note => {
                            const isActive = selectedNoteId === note.id;
                            return (
                              <button
                                key={note.id}
                                onClick={() => {
                                  setSelectedNoteId(note.id);
                                  setNoteEditMode(true);
                                }}
                                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${isActive ? 'bg-indigo-600/15 border-indigo-500/20 text-white' : 'border-white/5 bg-slate-900/40 hover:bg-white/5 text-slate-300'}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base flex-shrink-0">{note.icon || '📝'}</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate leading-snug">{note.title || 'Untitled Note'}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                                        {note.subject}
                                      </span>
                                      <span className="text-[8px] text-slate-500 font-mono">{note.createdAt}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[10px] transition-transform ${isActive ? 'translate-x-1 opacity-100' : 'opacity-0'}`}>👉</span>
                              </button>
                            );
                          })}

                        {vaultNotes.length === 0 && (
                          <div className="text-center py-10 text-xs text-slate-500 font-medium">
                            No pages found. Click "➕ New" to build your first page.
                          </div>
                        )}
                        
                        {vaultNotes.length > 0 && vaultNotes.filter(n => !newNoteTitle.trim() || n.title.toLowerCase().includes(newNoteTitle.toLowerCase())).length === 0 && (
                          <div className="text-center py-6 text-xs text-slate-500">
                            No match found for "{newNoteTitle}".
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notion Main Document Container Workspace: 8 Cols */}
                    <div className="lg:col-span-8 space-y-6">
                      {(() => {
                        const activeNote = vaultNotes.find(n => n.id === selectedNoteId);
                        if (!activeNote) {
                          return (
                            <div className="smart-glass p-12 rounded-3xl text-center space-y-4 border border-dashed border-white/5">
                              <span className="text-5xl block animate-bounce">⚡</span>
                              <h3 className="text-lg font-black font-display text-white">Select a Lecture Note Template</h3>
                              <p className="text-xs text-slate-400 max-w-md mx-auto">Access, read, and write rich LaTeX, code blocks, or literature summaries. Click on any page in the sidebar workspace to begin your session, or start a new workspace canvas.</p>
                              <button 
                                onClick={handleCreateNewNote}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow active:scale-95"
                              >
                                🚀 Initialize New Page
                              </button>
                            </div>
                          );
                        }

                        // Character & Word Counter
                        const charCount = activeNote.content.length;
                        const wordCount = activeNote.content.trim() === '' ? 0 : activeNote.content.trim().split(/\s+/).length;

                        // Helpers to update fields dynamically with instant local storage saving
                        const updateActiveNote = async (updates: Partial<VaultNote>) => {
                          setVaultNotes(prev => {
                            const newNotes = prev.map(n => n.id === activeNote.id ? { ...n, ...updates } : n);
                            if (currentUser) (async () => {
       const newArr = newNotes;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
                            return newNotes;
                          });
                          try {
                            await updateDoc(doc(db, 'notes', activeNote.id), updates);
                          } catch (err) {
                            console.error('[Vault Notes] Firestore update failed:', err);
                          }
                        };

                        const handleToolbarInject = (prefix: string, suffix = '') => {
                          const textarea = document.getElementById('notion-editor-textarea') as HTMLTextAreaElement;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const text = textarea.value;
                          const before = text.substring(0, start);
                          const after = text.substring(end, text.length);
                          const selected = text.substring(start, end) || 'Text';
                          const replacement = before + prefix + selected + suffix + after;
                          updateActiveNote({ content: replacement });
                          showNotification('Layout token injected.');
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
                          }, 50);
                        };

                        return (
                          <div className="smart-glass rounded-3xl overflow-hidden border border-white/10 shadow-lg bg-slate-900/40 relative">
                            
                            {/* Rich Theme Cover Gradient Banner */}
                            <div className={`h-32 ${activeNote.coverBg || 'bg-gradient-to-r from-violet-600 to-indigo-900'} relative transition-all duration-500 flex items-end justify-between px-6 pb-3`}>
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md">
                                {[
                                  'bg-gradient-to-r from-violet-600 to-indigo-900',
                                  'bg-gradient-to-r from-emerald-600 to-teal-900',
                                  'bg-gradient-to-r from-rose-600 to-amber-900',
                                  'bg-gradient-to-r from-cyan-600 to-blue-900',
                                  'bg-gradient-to-r from-slate-700 to-slate-900'
                                ].map((grad, gIdx) => (
                                  <button
                                    key={gIdx}
                                    onClick={() => updateActiveNote({ coverBg: grad })}
                                    className={`h-4 w-4 rounded-full border border-white/20 hover:scale-110 active:scale-95 transition-all ${grad} ${activeNote.coverBg === grad ? 'ring-2 ring-indigo-400 border-white' : ''}`}
                                    title="Switch cover theme"
                                  />
                                ))}
                              </div>
                              
                              <p className="text-[9px] font-black uppercase text-white/50 tracking-wider">Studying Workspace • Live Synchronization</p>
                            </div>

                            {/* Main Document Body layout */}
                            <div className="p-6 sm:p-8 space-y-6">
                              
                              {/* Icon + Title Header block */}
                              <div className="space-y-4 relative -mt-16">
                                
                                {/* Emoji selection bar */}
                                <div className="inline-block relative group">
                                  <div className="h-16 w-16 rounded-2xl bg-slate-950 border-2 border-white/10 text-3xl flex items-center justify-center cursor-pointer shadow-lg hover:border-indigo-500 transition-colors">
                                    {activeNote.icon || '📝'}
                                  </div>
                                  <div className="absolute top-18 left-0 hidden group-hover:grid grid-cols-6 gap-1 p-2 rounded-xl bg-slate-950 border border-white/10 shadow-2xl z-20 w-44">
                                    {['📝', '🚀', '💡', '💻', '🧠', '🧪', '🧬', '🔬', '📐', '🎨', '🏖️', '📚'].map(emoji => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          updateActiveNote({ icon: emoji });
                                          showNotification(`Icon updated to ${emoji}`);
                                        }}
                                        className="h-6 w-6 rounded hover:bg-white/10 text-xs transition-colors flex items-center justify-center"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                  {/* Page Title */}
                                  <div className="md:col-span-3">
                                    <input 
                                      type="text"
                                      value={activeNote.title}
                                      onChange={e => updateActiveNote({ title: e.target.value })}
                                      placeholder="Untitled Study Page"
                                      className="w-full text-2xl font-black font-display tracking-tight text-white border-b border-transparent focus:border-indigo-500/30 pb-1 bg-transparent focus:outline-none transition-colors"
                                    />
                                  </div>

                                  {/* Subject tags */}
                                  <div className="md:col-span-1">
                                    <select
                                      value={activeNote.subject}
                                      onChange={e => updateActiveNote({ subject: e.target.value })}
                                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-slate-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                      {['Physics', 'Chemistry', 'Computer Science', 'Mathematics', 'Syllabus General', 'Biology', 'Geography', 'History', 'English'].map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* Workspace Editor vs Preview switches */}
                              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                <div className="flex gap-2.5">
                                  <button
                                    onClick={() => setNoteEditMode(true)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${noteEditMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
                                  >
                                    ✍️ Markdown Notion Editor
                                  </button>
                                  <button
                                    onClick={() => setNoteEditMode(false)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!noteEditMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white bg-white/5'}`}
                                  >
                                    👁️ Reader View (Preview)
                                  </button>
                                </div>

                                <div className="flex items-center gap-3">
                                  {/* Export Buttons */}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        const blob = new Blob([activeNote.content], { type: 'text/markdown' });
                                        const link = document.createElement('a');
                                        link.href = URL.createObjectURL(blob);
                                        link.download = `${activeNote.title || 'Note'}.md`;
                                        link.click();
                                      }}
                                      className="px-2 py-1 rounded bg-indigo-900/30 text-indigo-400 text-[10px] font-bold hover:bg-indigo-800/40" title="Export as MD"
                                    >⬇️ .MD</button>
                                    <button
                                      onClick={() => {
                                        const w = window.open('', '_blank');
                                        if (w) {
                                          w.document.write(`<html><head><title>${activeNote.title}</title><style>body { font-family: sans-serif; padding: 2rem; }</style></head><body><h1>${activeNote.title}</h1><pre style="white-space: pre-wrap; font-family: inherit;">${activeNote.content}</pre></body></html>`);
                                          w.document.close();
                                          w.setTimeout(() => w.print(), 500);
                                        }
                                      }}
                                      className="px-2 py-1 rounded bg-indigo-900/30 text-indigo-400 text-[10px] font-bold hover:bg-indigo-800/40" title="Export as PDF / Print"
                                    >🖨️ PDF</button>
                                  </div>

                                  {/* Typography toggles */}
                                  <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950 border border-white/5">
                                    {(['sans', 'serif', 'mono'] as const).map(font => (
                                      <button
                                        key={font}
                                        onClick={() => setNoteFont(font)}
                                        className={`px-2.5 py-1 rounded text-[10px] uppercase font-mono transition-all ${noteFont === font ? 'bg-indigo-600 font-bold text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                      >
                                        {font}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Notion editor tab canvas */}
                              {noteEditMode ? (
                                <div className="space-y-3.5">
                                  
                                  {/* Editor Formatting toolbar */}
                                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-white/5 text-xs text-slate-400">
                                    <button onClick={() => handleToolbarInject('# ', '\n')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px] font-bold">H1</button>
                                    <button onClick={() => handleToolbarInject('## ', '\n')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px] font-bold">H2</button>
                                    <button onClick={() => handleToolbarInject('### ', '\n')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px] font-bold">H3</button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => handleToolbarInject('**', '**')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 font-bold text-[10px]" title="Bold">B</button>
                                    <button onClick={() => handleToolbarInject('*', '*')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 italic text-[10px]" title="Italic">I</button>
                                    <button onClick={() => handleToolbarInject('<u>', '</u>')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 underline text-[10px]" title="Underline">U</button>
                                    <button onClick={() => handleToolbarInject('<mark>', '</mark>')} className="hover:text-white px-2 py-1 rounded bg-emerald-900/50 border border-emerald-500/20 hover:bg-emerald-800/50 text-[10px]" title="Highlight">HL</button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => handleToolbarInject('* ', '')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">Bullet</button>
                                    <button onClick={() => handleToolbarInject('1. ', '')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">Number</button>
                                    <button onClick={() => handleToolbarInject('- [ ] ', '')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">Checklist</button>
                                    <button onClick={() => handleToolbarInject('\n| Header | Header |\n|--------|--------|\n| Content| Content|\n', '')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">Table</button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => handleToolbarInject('\n---\n')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">Line</button>
                                    <button onClick={() => handleToolbarInject('> ', '')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 italic text-[10px]">Quote</button>
                                    <button onClick={() => handleToolbarInject('`', '`')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 font-mono text-[10px]">Code</button>
                                    <button onClick={() => handleToolbarInject('```\n', '\n```')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 font-mono text-[10px]">Block</button>
                                    <button onClick={() => handleToolbarInject('$$ ', ' $$')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 font-serif text-[10px]" title="LaTeX Math">Math</button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => handleToolbarInject('[Link Text](', ')')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">🔗</button>
                                    <button onClick={() => handleToolbarInject('![Image Alt](', ')')} className="hover:text-white px-2 py-1 rounded bg-slate-900 border border-white/5 hover:bg-slate-850 text-[10px]">🖼️</button>
                                  </div>

                                  {/* Notion-styled AI Toolbar expansion card */}
                                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-indigo-500/10 space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-indigo-400">⚡</span>
                                        <p className="text-xs font-black text-white font-display uppercase tracking-wider">Gemini Notion Note Companion</p>
                                      </div>
                                      <span className="text-[9px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Highlight text to prompt only selected section!</span>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-1.5">
                                      <button 
                                        type="button"
                                        onClick={() => handleAINoteAction('summarize')}
                                        disabled={aiGeneratingNotes}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 transition-colors disabled:opacity-40"
                                      >
                                        📝 Summarize Note
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleAINoteAction('expand')}
                                        disabled={aiGeneratingNotes}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 transition-colors disabled:opacity-40"
                                      >
                                        🚀 Expand Draft
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleAINoteAction('improve')}
                                        disabled={aiGeneratingNotes}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 border border-indigo-500/20 text-[10px] font-bold text-indigo-300 transition-colors disabled:opacity-40"
                                      >
                                        ✍️ Proofread & Polish
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleAINoteAction('quiz')}
                                        disabled={aiGeneratingNotes}
                                        className="px-3 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/30 border border-purple-500/20 text-[10px] font-bold text-purple-300 transition-colors disabled:opacity-40"
                                      >
                                        🧠 Active Quiz Block
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => handleAINoteAction('action_items')}
                                        disabled={aiGeneratingNotes}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/30 border border-emerald-500/20 text-[10px] font-bold text-emerald-300 transition-colors disabled:opacity-40"
                                      >
                                        📋 Extract Checklist
                                      </button>
                                    </div>

                                    <div className="flex gap-2 items-center">
                                      <input 
                                        type="text"
                                        placeholder="Ask AI to write section: e.g. Write a summary explaining electromagnetism..."
                                        value={aiCustomPrompt}
                                        onChange={e => setAiCustomPrompt(e.target.value)}
                                        className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-150 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleAINoteAction('custom')}
                                        disabled={aiGeneratingNotes || !aiCustomPrompt.trim()}
                                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 text-white font-bold text-[10px] uppercase transition-all"
                                      >
                                        Apply
                                      </button>
                                    </div>

                                    {aiGeneratingNotes && (
                                      <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold animate-pulse pt-1">
                                        <div className="animate-spin h-3 w-3 border-2 border-indigo-500 rounded-full border-t-transparent" />
                                        <span>🤖 Gemini is redrafting blocks and active summaries. Please wait...</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="relative">
                                    <textarea 
                                      id="notion-editor-textarea"
                                      rows={15}
                                      value={activeNote.content}
                                      onChange={e => updateActiveNote({ content: e.target.value })}
                                      className={`w-full px-4 py-3 bg-slate-950/60 border border-white/5 rounded-2xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200 leading-relaxed resize-none ${noteFont === 'serif' ? 'font-serif' : noteFont === 'mono' ? 'font-mono' : 'font-sans'}`}
                                      placeholder="Write anything... support LaTeX equations, assignments instructions, code modules or list details..."
                                    />
                                    <span className="absolute bottom-3 right-3 text-[10px] text-slate-500 font-mono">
                                      {wordCount} words • {charCount} characters
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-6 rounded-2xl bg-slate-950/40 border border-white/5 text-xs text-slate-200 min-h-[300px] leading-relaxed select-text ${noteFont === 'serif' ? 'font-serif' : noteFont === 'mono' ? 'font-mono' : 'font-sans'}`}>
                                  <div className="space-y-2">
                                    {renderMarkdown(activeNote.content)}
                                  </div>
                                </div>
                              )}

                              {/* Workspace page utilities */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(`Page: ${activeNote.icon || '📝'} ${activeNote.title}\nSubject: ${activeNote.subject}\n\n${activeNote.content}`);
                                    showNotification('Full page layout copied in Markdown format!');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-350 hover:text-white transition-colors border border-white/5 active:scale-95"
                                  title="Export Note to standard Markdown syntax"
                                >
                                  📥 Copy Full Page Markdown
                                </button>

                                <button
                                  onClick={() => {
                                    if (confirm('Delete this Notion study canvas page permanently?')) {
                                      setVaultNotes(prev => {
                                      const newNotes = prev.filter(n => n.id !== activeNote.id);
                                      if (currentUser) (async () => {
       const newArr = newNotes;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
                                      return newNotes;
                                    });
                                      setSelectedNoteId(null);
                                      showNotification('Canvas page removed from database.');
                                    }
                                  }}
                                  className="flex items-center gap-1 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors text-[10px] font-semibold active:scale-95"
                                  title="Trash note permanently"
                                >
                                  🗑️ Delete Page
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                </div>
              )}

              {/* Tab: Deep Focus Interval Timer View */}
              {activeTab === 'pomodoro' && (
                <div className="smart-glass p-8 rounded-3xl space-y-6 max-w-2xl mx-auto text-center animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-display text-white">Deep Work Engine</h3>
                    <p className="text-xs text-slate-400">Isolate distractions and sustain baseline focus metrics over intervals. Earn 50 house points on session completion.</p>
                  </div>

                  <div className="py-12 px-6 rounded-3xl bg-slate-950/60 border border-white/5 shadow-inner relative overflow-hidden flex flex-col items-center justify-center space-y-6">
                    {/* Glowing pulse rings active only when counting down */}
                    {pomodoroRunning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="absolute h-64 w-64 rounded-full border border-indigo-500/20 animate-ping"></div>
                        <div className="absolute h-96 w-96 rounded-full border border-indigo-500/5 animate-pulse"></div>
                      </div>
                    )}

                    <div className="text-5xl md:text-7xl font-black font-mono tracking-wider text-white bg-slate-900/80 px-6 md:px-8 py-4 md:py-5 rounded-2xl border border-white/10 shadow-lg relative z-10 select-none">
                      {Math.floor(pomodoroSeconds / 3600) > 0 ? `${Math.floor(pomodoroSeconds / 3600).toString().padStart(2, '0')}:` : ''}{Math.floor((pomodoroSeconds % 3600) / 60).toString().padStart(2, '0')}:{(pomodoroSeconds % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-[10px] md:text-xs uppercase font-bold tracking-widest text-indigo-400 relative z-10 px-4">
                      {pomodoroRunning ? '⚡ Focus Session countdown in progress' : '⏸️ Session timer halted'}
                    </p>

                    {showPomodoroSettings ? (
                      <div className="flex flex-col gap-4 relative z-10 bg-slate-900 p-4 rounded-2xl border border-white/10 w-full max-w-sm mt-4">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase text-slate-400 font-bold">Hours</label>
                            <input type="number" min="0" max="23" value={timerH} onChange={e => setTimerH(Number(e.target.value))} className="w-16 px-2 py-1 bg-slate-950 border border-white/10 rounded text-center text-white" />
                          </div>
                          <span className="text-xl font-bold text-slate-500">:</span>
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase text-slate-400 font-bold">Minutes</label>
                            <input type="number" min="0" max="59" value={timerM} onChange={e => setTimerM(Number(e.target.value))} className="w-16 px-2 py-1 bg-slate-950 border border-white/10 rounded text-center text-white" />
                          </div>
                          <span className="text-xl font-bold text-slate-500">:</span>
                          <div className="flex flex-col">
                            <label className="text-[10px] uppercase text-slate-400 font-bold">Seconds</label>
                            <input type="number" min="0" max="59" value={timerS} onChange={e => setTimerS(Number(e.target.value))} className="w-16 px-2 py-1 bg-slate-950 border border-white/10 rounded text-center text-white" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              const totalSec = (timerH * 3600) + (timerM * 60) + timerS;
                              setCustomPomodoro(totalSec);
                              setPomodoroSeconds(totalSec);
                              setShowPomodoroSettings(false);
                              showNotification('Custom preferred timer saved.');
                            }}
                            className="flex-1 bg-indigo-600 rounded py-2 text-xs font-bold text-white hover:bg-indigo-500"
                          >
                            Save Custom Timer
                          </button>
                          <button onClick={() => setShowPomodoroSettings(false)} className="px-4 py-2 rounded bg-slate-800 text-xs font-bold text-white hover:bg-slate-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-center gap-3 relative z-10 px-4 mt-2">
                        <button 
                          onClick={() => {
                            setPomodoroRunning(true);
                            showNotification('Focus interval initialized. Keep learning!');
                          }}
                          disabled={pomodoroRunning}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold px-4 md:px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 w-full sm:w-auto"
                        >
                          {pomodoroSeconds === customPomodoro ? 'Initiate Focus' : 'Resume'}
                        </button>
                        <button 
                          onClick={() => {
                            setPomodoroRunning(false);
                            showNotification('Focus timer suspended.');
                          }}
                          disabled={!pomodoroRunning}
                          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold px-4 md:px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          Pause
                        </button>
                        <button 
                          onClick={() => {
                            setPomodoroRunning(false);
                            setPomodoroSeconds(customPomodoro);
                            showNotification('Focus interval duration reset.');
                          }}
                          className="bg-rose-600/80 hover:bg-rose-500 text-white font-bold px-4 md:px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => setShowPomodoroSettings(true)}
                          disabled={pomodoroRunning}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-55 disabled:cursor-not-allowed text-slate-200 font-bold px-4 md:px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          ⚙️ Setup
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Performance Analytics View */}
              {activeTab === 'analytics' && (
                <div className="smart-glass p-8 rounded-3xl space-y-6 max-w-4xl mx-auto animate-fadeIn">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-display text-white">Performance & Study Analytics</h3>
                    <p className="text-xs text-slate-400">Detailed overview of tracking milestones and weekly workload parameters.</p>
                  </div>

                  {effectiveRole === 'student' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Tasks Count</p>
                          <h4 className="text-3xl font-black text-white">{tasks.length}</h4>
                          <p className="text-[10px] text-indigo-400 font-mono">Items recorded</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Generated Notes</p>
                          <h4 className="text-3xl font-black text-amber-500">{vaultNotes.length}</h4>
                          <p className="text-[10px] text-amber-400 font-mono font-bold">Committed notes</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consecutive Study Streak</p>
                          <h4 className="text-3xl font-black text-emerald-500">{currentUser.streakDays || 4} Days</h4>
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">Active current streak</p>
                        </div>
                      </div>

                      {/* Inline Premium Interactive Study Distribution Chart */}
                      <div className="p-6 rounded-3xl bg-slate-950/60 border border-white/5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">Weekly Focus Distribution Hour Path</h4>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">Monitored Hours</span>
                        </div>

                        <div className="relative pt-4 pb-2">
                          <div className="h-44 w-full flex items-end justify-between px-2 sm:px-6 relative border-b border-white/5">
                            {/* Horizontal guides */}
                            <div className="absolute inset-x-0 top-0 border-t border-white/5 pointer-events-none"></div>
                            <div className="absolute inset-x-0 top-1/3 border-t border-white/5 pointer-events-none"></div>
                            <div className="absolute inset-x-0 top-2/3 border-t border-white/5 pointer-events-none"></div>

                            {/* Animated bars */}
                            {[
                              { lbl: 'Mon', hrs: 2, scale: 'h-[30%]', color: 'bg-indigo-500/80 hover:bg-indigo-400' },
                              { lbl: 'Tue', hrs: 4, scale: 'h-[50%]', color: 'bg-indigo-600/80 hover:bg-indigo-500' },
                              { lbl: 'Wed', hrs: 1.5, scale: 'h-[25%]', color: 'bg-indigo-400/80 hover:bg-indigo-300' },
                              { lbl: 'Thu', hrs: 5.5, scale: 'h-[75%]', color: 'bg-emerald-500/80 hover:bg-emerald-400' },
                              { lbl: 'Fri', hrs: 7, scale: 'h-[95%]', color: 'bg-indigo-500/80 hover:bg-indigo-400' },
                              { lbl: 'Sat', hrs: 3, scale: 'h-[44%]', color: 'bg-amber-500/80 hover:bg-amber-400' },
                              { lbl: 'Sun', hrs: 6, scale: 'h-[85%]', color: 'bg-emerald-600/80 hover:bg-emerald-500' }
                            ].map((bar, bIdx) => (
                              <div key={bIdx} className="flex flex-col items-center gap-2 group cursor-pointer relative z-10 w-8">
                                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-white/10 text-[9px] text-indigo-300 px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50">
                                  {bar.hrs} hrs focus
                                </div>
                                <div className={`w-3 sm:w-6 ${bar.scale} ${bar.color} rounded-t-md transition-all duration-500 shadow-md`}></div>
                                <span className="text-[10px] text-slate-500 font-bold">{bar.lbl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {effectiveRole !== 'student' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Performance</p>
                          <h4 className="text-3xl font-black text-white">84%</h4>
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">+2.4% vs last term</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Output</p>
                          <h4 className="text-3xl font-black text-amber-500">1.2x</h4>
                          <p className="text-[10px] text-amber-400 font-mono font-bold">Standard deviation</p>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center space-y-1 shadow-sm">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Growth Delta</p>
                          <h4 className="text-3xl font-black text-emerald-500">+14%</h4>
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">In top percentiles</p>
                        </div>
                      </div>
                      
                      <div className="p-6 rounded-3xl bg-slate-950/60 border border-white/5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-white">
                            {effectiveRole === 'teacher' ? 'Student & Class Performance (Your Subject)' : effectiveRole === 'coordinator' ? 'Teacher & House Analytics' : 'School-Wide Performance Overview'}
                          </h4>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">Term Activity</span>
                        </div>
                        
                        <div className="relative pt-4 pb-2">
                          <div className="h-44 w-full flex items-end justify-between px-2 sm:px-6 relative border-b border-white/5">
                            {/* Horizontal guides */}
                            <div className="absolute inset-x-0 top-0 border-t border-white/5 pointer-events-none"></div>
                            <div className="absolute inset-x-0 top-1/3 border-t border-white/5 pointer-events-none"></div>
                            <div className="absolute inset-x-0 top-2/3 border-t border-white/5 pointer-events-none"></div>

                            {/* Animated bars */}
                            {[
                              { lbl: 'W1', pts: 82, scale: 'h-[82%]', color: 'bg-emerald-500/80 hover:bg-emerald-400' },
                              { lbl: 'W2', pts: 84, scale: 'h-[84%]', color: 'bg-emerald-500/80 hover:bg-emerald-400' },
                              { lbl: 'W3', pts: 78, scale: 'h-[78%]', color: 'bg-amber-500/80 hover:bg-amber-400' },
                              { lbl: 'W4', pts: 85, scale: 'h-[85%]', color: 'bg-emerald-500/80 hover:bg-emerald-400' },
                              { lbl: 'W5', pts: 88, scale: 'h-[88%]', color: 'bg-emerald-600/80 hover:bg-emerald-500' },
                              { lbl: 'W6', pts: 92, scale: 'h-[92%]', color: 'bg-indigo-500/80 hover:bg-indigo-400' }
                            ].map((bar, bIdx) => (
                              <div key={bIdx} className="flex flex-col items-center gap-2 group cursor-pointer relative z-10 w-8">
                                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-white/10 text-[9px] text-emerald-300 px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50">
                                  {bar.pts}% Avg
                                </div>
                                <div className={`w-4 sm:w-8 ${bar.scale} ${bar.color} rounded-t-md transition-all duration-500 shadow-md`}></div>
                                <span className="text-[10px] text-slate-500 font-bold">{bar.lbl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Student/Staff Profile View */}
              {activeTab === 'profile' && (
                <div className="smart-glass p-8 rounded-3xl space-y-6 max-w-4xl mx-auto animate-fadeIn col-span-2">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-display text-white">{getUserProfileTitle(currentUser, effectiveRole)} Profile</h3>
                    <p className="text-xs text-slate-400">Manage your presence, identity, and view your dashboard.</p>
                  </div>

                  {effectiveRole === 'teacher' ? (
                     <TeacherProfile 
                       currentUser={currentUser} 
                       handleSaveProfile={handleSaveProfile} 
                       profileNameInput={profileNameInput} 
                       setProfileNameInput={setProfileNameInput} 
                       profileAvatar={profileAvatar} 
                       setProfileAvatar={setProfileAvatar} 
                       profileTab={profileTab} 
                       setProfileTab={setProfileTab} 
                     />
                  ) : (
                    <>
                      {/* Profile Navigation Tabs for Non-Teachers */}
                      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 gap-1 mb-6 flex-wrap">
                        {(
                          effectiveRole === 'student' ? ['overview', 'attendance', 'records', 'remarks', 'analytics'] : 
                          effectiveRole === 'coordinator' ? ['overview', 'teacher_list', 'student_list', 'house_reports', 'section_reports'] : 
                          ['overview', 'students', 'teachers', 'coordinators', 'reports']
                        ).map((pt) => (
                          <button
                            key={pt}
                            onClick={() => setProfileTab(pt as any)}
                            className={`py-3 px-2 sm:px-4 flex-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all min-w-[70px] ${
                              profileTab === pt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {pt === 'overview' && 'Overview'}
                            
                            {/* Student Tabs */}
                            {pt === 'attendance' && 'Attendance'}
                            {pt === 'records' && 'Records'}
                            {pt === 'remarks' && 'Remarks'}
                            {pt === 'analytics' && 'AI Analytics'}

                            {/* Staff Tabs */}
                            {pt === 'student_list' && 'Student List'}
                            {pt === 'student_reports' && 'Student Reports'}
                            {pt === 'enter_marks' && 'Enter Marks'}
                            {pt === 'class_reports' && 'Class Reports'}
                            {pt === 'teacher_list' && 'Teacher List'}
                            {pt === 'house_reports' && 'House Reports'}
                            {pt === 'section_reports' && 'Section Reports'}
                            
                            {/* Admin Specific Tabs */}
                            {pt === 'students' && 'Students'}
                            {pt === 'teachers' && 'Teachers'}
                            {pt === 'coordinators' && 'Coordinators'}
                            {pt === 'reports' && 'Reports'}
                          </button>
                        ))}
                      </div>

                      {profileTab === 'overview' && (
                        <form onSubmit={handleSaveProfile} className="space-y-6 animate-fadeIn">
                          {effectiveRole === 'student' && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold">
                              <span>🔒</span>
                              <p>Profile details are locked. Only Teachers, Coordinators, and Admins can modify your core details, including your assigned House and Section.</p>
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-white/5 rounded-2xl border border-white/5">
                            {profileAvatar ? (
                              <img 
                                src={profileAvatar} 
                                alt="Profile Avatar" 
                                className="w-20 h-20 rounded-2xl border-2 border-indigo-500 object-cover shadow-md"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-2xl border-2 border-indigo-500 bg-slate-800 flex items-center justify-center font-black font-mono text-indigo-400 text-xl">
                                {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
                              </div>
                            )}
                            <div className="space-y-2 text-center sm:text-left flex-1">
                              <label className="text-[11px] font-bold text-slate-400 block p-0.5 mb-1.5 uppercase tracking-wider">Profile Picture Integration</label>
                              <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                                {/* Upload Button */}
                                <label className="cursor-pointer py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all">
                                  📁 Choose File
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={async (e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        try {
                                          showNotification('Uploading profile picture to storage...');
                                          const { url } = await uploadFileToStorage(file, 'users');
                                          setProfileAvatar(url);
                                          showNotification('✓ Profile image selected! Click save below to sync changes.');
                                        } catch (err: any) {
                                          showNotification(`❌ Upload failed: ${err.message || String(err)}`);
                                        }
                                      }
                                    }}
                                  />
                                </label>
                                
                                {/* Remove Button */}
                                {profileAvatar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfileAvatar('');
                                      showNotification('Profile picture cleared. Click save below to sync changes.');
                                    }}
                                    className="py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    🗑️ Remove Picture
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500">Supports PNG, JPG, or WEBP images uploaded to secure school storage.</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400">Full Identity Name</label>
                          <input 
                            type="text"
                            value={profileNameInput}
                            disabled={effectiveRole === 'student'}
                            onChange={e => setProfileNameInput(e.target.value)}
                            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            required
                          />
                        </div>

                        {effectiveRole === 'student' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Class Level / Academic Stream</label>
                              <select 
                                value={profileGradeInput}
                                disabled={true}
                                onChange={e => setProfileGradeInput(e.target.value)}
                                className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Official House Alliance</label>
                              <select 
                                value={profileHouseInput}
                                disabled={true}
                                onChange={e => setProfileHouseInput(e.target.value as HouseType)}
                                className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="Ruby">Ruby House (Crimson)</option>
                                <option value="Emerald">Emerald House (Green)</option>
                                <option value="Sapphire">Sapphire House (Blue)</option>
                                <option value="Topaz">Topaz House (Gold)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Assigned Classroom Section</label>
                              <select 
                                value={profileSectionInput}
                                disabled={true}
                                onChange={e => setProfileSectionInput(e.target.value as SectionType)}
                                className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="Astra">Astra (Alpha)</option>
                                <option value="Elera">Elera (Beta)</option>
                                <option value="Solara">Solara (Gamma)</option>
                                <option value="Vega">Vega (Delta)</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Assigned Classes (Read-Only)</label>
                              <div className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-slate-300">
                                {(currentUser.assignedGrades || []).join(', ') || 'None Assigned'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Assigned Sections (Read-Only)</label>
                              <div className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-slate-300">
                                {(currentUser.assignedSections || []).join(', ') || 'None Assigned'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400">Role</label>
                              <div className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900/50 border border-white/5 text-slate-300 uppercase">
                                {effectiveRole}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <button 
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                      >
                        {effectiveRole === 'student' ? 'Update Profile Picture' : 'Update Profile Parameters'}
                      </button>
                    </form>
                  )}
                  
                  {profileTab === 'attendance' && (
                    <StudentAttendanceView currentUser={currentUser} />
                  )}

                  {profileTab === 'records' && (
                    <div className="animate-fadeIn space-y-4">
                      <div className="p-6 bg-slate-950/50 border border-white/5 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-bold text-white">Report Cards & Marks</h4>
                          <span className="bg-indigo-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full">Term 1</span>
                        </div>
                        
                        <div className="overflow-x-hidden">
                          {/* Desktop Table */}
                          <div className="hidden sm:block">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-slate-400">
                                <tr>
                                  <th className="p-3">Subject</th>
                                  <th className="p-3">Class Test</th>
                                  <th className="p-3">Mid Term</th>
                                  <th className="p-3">Grade</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-slate-300">
                                <tr><td className="p-3 font-semibold text-white">Mathematics</td><td className="p-3">18/20</td><td className="p-3">88/100</td><td className="p-3 text-emerald-400 font-bold">A</td></tr>
                                <tr><td className="p-3 font-semibold text-white">Physics</td><td className="p-3">16/20</td><td className="p-3">82/100</td><td className="p-3 text-emerald-400 font-bold">A-</td></tr>
                                <tr><td className="p-3 font-semibold text-white">Chemistry</td><td className="p-3">19/20</td><td className="p-3">94/100</td><td className="p-3 text-indigo-400 font-bold">A+</td></tr>
                                <tr><td className="p-3 font-semibold text-white">English</td><td className="p-3">15/20</td><td className="p-3">78/100</td><td className="p-3 text-amber-400 font-bold">B+</td></tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Stacked Cards */}
                          <div className="sm:hidden space-y-3">
                            {[
                              { sub: 'Mathematics', ct: '18/20', mt: '88/100', grade: 'A', gColor: 'text-emerald-400' },
                              { sub: 'Physics', ct: '16/20', mt: '82/100', grade: 'A-', gColor: 'text-emerald-400' },
                              { sub: 'Chemistry', ct: '19/20', mt: '94/100', grade: 'A+', gColor: 'text-indigo-400' },
                              { sub: 'English', ct: '15/20', mt: '78/100', grade: 'B+', gColor: 'text-amber-400' },
                            ].map((row, i) => (
                              <div key={i} className="bg-slate-900 border border-white/5 rounded-xl p-4 text-sm flex gap-4">
                                <div className="flex-1 space-y-1">
                                  <div className="font-bold text-white text-base">{row.sub}</div>
                                  <div className="text-slate-400 text-xs flex justify-between"><span>Class Test:</span> <span className="text-white">{row.ct}</span></div>
                                  <div className="text-slate-400 text-xs flex justify-between"><span>Mid Term:</span> <span className="text-white">{row.mt}</span></div>
                                </div>
                                <div className={`flex items-center justify-center font-display font-black text-2xl ${row.gColor}`}>
                                  {row.grade}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {profileTab === 'remarks' && (
                    <div className="animate-fadeIn space-y-4">
                      <div className="p-5 border-l-4 border-emerald-500 bg-emerald-500/10 rounded-r-xl">
                        <h4 className="text-sm font-bold text-emerald-400">Excellent Contribution</h4>
                        <p className="text-xs text-slate-300 mt-1">Consistently active in class participation and helps peers in the Whiteboard streams.</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-2">- Mr. Anderson, Physics Dept</p>
                      </div>
                      <div className="p-5 border-l-4 border-indigo-500 bg-indigo-500/10 rounded-r-xl">
                        <h4 className="text-sm font-bold text-indigo-400">Project Leadership</h4>
                        <p className="text-xs text-slate-300 mt-1">Displayed great leadership in the recent House Science project.</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-2">- Mrs. Smith, Class Teacher</p>
                      </div>
                    </div>
                  )}

                  {profileTab === 'analytics' && currentUser && (
                    <StudentAiAnalytics currentUser={currentUser} />
                  )}

                  {profileTab === 'enter_marks' && (
                    <StudentMarksCenter currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} />
                  )}

                  {['house_reports', 'warn_classes'].includes(profileTab) && (
                    <CoordinatorModule currentUser={currentUser} showNotification={showNotification} />
                  )}

                  {['students', 'teachers', 'coordinators', 'reports'].includes(profileTab) && effectiveRole === 'admin' && (
                    <AdminCenter currentUser={currentUser} showNotification={showNotification} profileTab={profileTab} />
                  )}

                  {['teacher_list'].includes(profileTab) && effectiveRole === 'coordinator' && (
                    <AdminCenter currentUser={currentUser} showNotification={showNotification} profileTab={profileTab} />
                  )}

                  {['student_list'].includes(profileTab) && ((effectiveRole as any) === 'teacher' || effectiveRole === 'coordinator') && currentUser && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 animate-fadeIn">
                        <h4 className="font-bold text-white text-lg mb-4">My Students</h4>
                        <TeacherStudentList currentUser={currentUser} />
                      </div>
                    </div>
                  )}

                  {['student_reports', 'class_reports', 'section_reports'].includes(profileTab) && ((effectiveRole as any) === 'teacher' || effectiveRole === 'coordinator') && currentUser && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-3xl bg-slate-900 border border-white/5 animate-fadeIn">
                        <h4 className="font-bold text-white text-lg mb-4">{profileTab.replace('_', ' ').toUpperCase()}</h4>
                        {profileTab === 'student_reports' ? (
                          <TeacherStudentReports currentUser={currentUser} />
                        ) : (
                          <div className="p-8 border border-dashed border-indigo-500/30 rounded-3xl text-center bg-indigo-500/5 space-y-3">
                            <span className="text-4xl block">📊</span>
                            <p className="text-slate-400 text-xs text-balance">Aggregate class and section analytics are coming in the next term update.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentUser && profileTab === 'overview' && effectiveRole === 'admin' && (
                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4 animate-fadeIn">
                       <h4 className="text-xl font-bold text-white tracking-widest">School Overview</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-center space-y-2">
                           <span className="text-3xl block">👨‍🎓</span>
                           <p className="text-3xl font-black text-white">850</p>
                           <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Total Students</p>
                         </div>
                         <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center space-y-2">
                           <span className="text-3xl block">👩‍🏫</span>
                           <p className="text-3xl font-black text-white">42</p>
                           <p className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Total Teachers</p>
                         </div>
                         <div className="p-6 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-center space-y-2">
                           <span className="text-3xl block">👔</span>
                           <p className="text-3xl font-black text-white">8</p>
                           <p className="text-xs text-amber-400 uppercase font-bold tracking-wider">Coordinators</p>
                         </div>
                       </div>
                    </div>
                  )}

                  {currentUser && profileTab === 'overview' && effectiveRole !== 'admin' && (
                    (() => {
                      const userMaterials = materials.filter(m => m.uploadedBy === currentUser.name || m.uploaderUid === currentUser?.uid);
                      const totalUploads = userMaterials.length;
                      const totalDownloads = userMaterials.reduce((acc, curr) => acc + (curr.downloads || 0), 0);
                      const totalLikes = userMaterials.reduce((acc, curr) => acc + (curr.likes || 0), 0);
                      
                      return (
                        <div className="mt-8 pt-6 border-t border-white/5 space-y-4 animate-fadeIn">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">📚 Material Hub Contributions summary</h4>
                            <p className="text-[11px] text-slate-400">Contribution index tracking peer utility points for your identity profile.</p>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 text-center space-y-1">
                              <span className="text-2xl block">📤</span>
                              <p className="text-xl font-extrabold text-white">{totalUploads}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Uploaded</p>
                            </div>
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 text-center space-y-1">
                              <span className="text-2xl block">📥</span>
                              <p className="text-xl font-extrabold text-white">{totalDownloads}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Downloads</p>
                            </div>
                            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 text-center space-y-1">
                              <span className="text-2xl block">❤️</span>
                              <p className="text-xl font-extrabold text-white">{totalLikes}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Likes Received</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                  </>
                  )}
                </div>
              )}

              {/* Tab: Blogs View */}
              {activeTab === 'blogs' && (
                <BlogsPortal 
                  currentUser={currentUser} 
                  isSuperAdmin={isSuperAdmin || currentUser?.role === 'super_admin'} 
                  showNotification={showNotification} 
                />
              )}
              {/* Tab: Sports & Activities View */}
              {activeTab === 'sports_activities' && (
                <SportsActivitiesPortal 
                  currentUser={currentUser} 
                  showNotification={showNotification} 
                />
              )}
              {/* Tab: Substitute Board View */}
              {activeTab === 'substitutes' && (
                <SubstituteHub 
                  currentUser={currentUser} 
                  effectiveRole={effectiveRole}
                  showNotification={showNotification} 
                />
              )}
              {/* Tab 3: Whiteboard / Smart Board Classroom - Full Screen Immersive */}
              {activeTab === 'whiteboard' && (
                <Whiteboard2 onClose={() => setActiveTab('dashboard')} currentUser={currentUser} />
              )}
              {/* Tab: Assignment Center */}
              {activeTab === 'assignments' && (
                <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-black font-display tracking-tight text-white uppercase">Assignment Center</h3>
                      <p className="text-xs text-slate-400 font-medium tracking-wide">Manage school work, timetables, and class notices.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('homework')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">📓</span>
                        <span className="bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full">Active</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Homework</h4>
                        <p className="text-xs text-slate-400">View and submit daily homework.</p>
                      </div>
                    </div>
                    
                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-emerald-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('worksheet_viewer')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">📝</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-emerald-500/20">Resources</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Worksheets</h4>
                        <p className="text-xs text-slate-400">Download practice worksheets.</p>
                      </div>
                    </div>

                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-amber-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('timetable_viewer')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">📅</span>
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-amber-500/20">Schedule</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Timetable</h4>
                        <p className="text-xs text-slate-400">Class timetable and routines.</p>
                      </div>
                    </div>

                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-rose-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('assignment_viewer')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">📋</span>
                        <span className="bg-rose-500/20 text-rose-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-rose-500/20">Tasks</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Assignments</h4>
                        <p className="text-xs text-slate-400">Projects and long-term assignments.</p>
                      </div>
                    </div>

                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-cyan-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('notice_viewer')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">📢</span>
                        <span className="bg-cyan-500/20 text-cyan-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-cyan-500/20">Updates</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Class Notices</h4>
                        <p className="text-xs text-slate-400">Important messages from teachers.</p>
                      </div>
                    </div>

                    <div className="smart-glass p-6 rounded-3xl space-y-4 hover:border-fuchsia-500/50 transition-all cursor-pointer" onClick={() => handleTabSelect('gallery_viewer')}>
                      <div className="flex justify-between items-center">
                        <span className="text-3xl">🖼️</span>
                        <span className="bg-fuchsia-500/20 text-fuchsia-400 text-[10px] uppercase font-bold px-2 py-1 rounded-full border border-fuchsia-500/20">Events</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">Photo Gallery</h4>
                        <p className="text-xs text-slate-400">Upload school event photos.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'gallery_viewer' && (
                <SimpleResourceManager 
                  type="gallery" title="Event Photo Gallery" emoji="🖼️" 
                  currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} 
                  goBack={() => handleTabSelect('assignments')} 
                />
              )}

              {activeTab === 'timetable_viewer' && (
                <SimpleResourceManager 
                  type="timetable" title="Timetables" emoji="📅" 
                  currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} 
                  goBack={() => handleTabSelect('assignments')} 
                />
              )}

              {activeTab === 'worksheet_viewer' && (
                <SimpleResourceManager 
                  type="worksheet" title="Worksheets" emoji="📝" 
                  currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} 
                  goBack={() => handleTabSelect('assignments')} 
                />
              )}

              {activeTab === 'assignment_viewer' && (
                <SimpleResourceManager 
                  type="assignment" title="Assignments" emoji="📋" 
                  currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} 
                  goBack={() => handleTabSelect('assignments')} 
                />
              )}

              {activeTab === 'notice_viewer' && (
                <SimpleResourceManager 
                  type="notice" title="Class Notices" emoji="📢" 
                  currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} 
                  goBack={() => handleTabSelect('assignments')} 
                />
              )}

              {/* Tab: Class Homework System */}
              {activeTab === 'homework' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Banner Header card */}
                  <div className="smart-glass p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">Online Homework Desk</span>
                        {currentUser?.grade && (
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">Your Class: {currentUser.grade}</span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black font-display text-white">Academic Tasks & Assignments</h3>
                      <p className="text-xs text-slate-400 max-w-2xl">Access, study, and track homework assigned online by certified teachers. Feel stuck? Click "💡 AI Teacher Assistant" to debug complex calculations or theoretical concepts instantly.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {effectiveRole === 'student' ? (
                        <button 
                          onClick={() => {
                            setHwFilterGrade(currentUser?.grade || 'Grade 12');
                            setHwSearch('');
                            showNotification('Aligned filters to your active class level!');
                          }}
                          className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold px-4 py-2 text-xs rounded-xl transition-all"
                        >
                          🎯 Align to My Grade
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setHwEditId(null);
                              setHwFSubject('');
                              setHwFTitle('');
                              setHwFContent('');
                              setHwFGrade(currentUser?.assignedGrades?.[0] || 'Grade 12');
                              setHwFSection('All Sections');
                              setHwFormOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                          >
                            <Plus size={14} /> Create Homework
                          </button>
                          <button 
                            onClick={() => {
                              setHwFilterGrade('My Classes');
                              setHwSearch('');
                              showNotification('Filtered homework for your assigned classes only.');
                            }}
                            className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold px-4 py-2 text-xs rounded-xl transition-all"
                          >
                            📚 My Assigned Classes
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {hwFormOpen && (effectiveRole === 'teacher' || effectiveRole === 'coordinator' || effectiveRole === 'admin' || effectiveRole === 'super_admin') && (
                    <div className="smart-glass p-6 rounded-3xl border border-indigo-500/30 space-y-4 animate-slideUp">
                      <div className="flex justify-between items-center">
                        <h4 className="text-lg font-bold text-white">{hwEditId ? 'Edit Homework' : 'Create New Homework'}</h4>
                        <button onClick={() => setHwFormOpen(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 font-bold block mb-1">Subject</label>
                          <input type="text" value={hwFSubject} onChange={e=>setHwFSubject(e.target.value)} required placeholder="e.g. Mathematics" className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-bold block mb-1">Title</label>
                          <input type="text" value={hwFTitle} onChange={e=>setHwFTitle(e.target.value)} required placeholder="e.g. Chapter 4 Exercises" className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-sm" />
                        </div>
                        <div className="col-span-full">
                          <label className="text-xs text-slate-400 font-bold block mb-1">Instructions</label>
                          <textarea value={hwFContent} onChange={e=>setHwFContent(e.target.value)} rows={4} required placeholder="Explain the assignment..." className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-bold block mb-1">Target Grade</label>
                          <select value={hwFGrade} onChange={e=>setHwFGrade(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-sm">
                            {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 font-bold block mb-1">Target Section</label>
                          <select value={hwFSection} onChange={e=>setHwFSection(e.target.value as any)} className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-sm">
                            <option value="All Sections">All Sections</option>
                            <option value="Astra">Astra</option>
                            <option value="Elera">Elera</option>
                            <option value="Solara">Solara</option>
                            <option value="Vega">Vega</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-white/10">
                        <button type="button" onClick={() => setHwFormOpen(false)} className="px-4 py-2 hover:bg-white/5 text-slate-300 rounded-xl text-xs font-bold transition-all">Cancel</button>
                        <button type="button" onClick={() => {
                          if (!hwFSubject || !hwFTitle || !hwFContent) {
                            showNotification('Please fill in all required fields.');
                            return;
                          }
                          const newHw: Homework = {
                            id: hwEditId || `hw-${Date.now()}`,
                            subject: hwFSubject,
                            title: hwFTitle,
                            content: hwFContent,
                            classGrade: hwFGrade,
                            classSection: hwFSection,
                            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Default tomorrow
                            createdAt: hwEditId ? homeworkList.find(h=>h.id === hwEditId)?.createdAt || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            completedList: hwEditId ? homeworkList.find(h=>h.id === hwEditId)?.completedList || [] : [],
                            givenBy: currentUser?.name || 'Teacher'
                          };
                          
                          setHomeworkList(prev => {
                            if (hwEditId) return prev.map(h => h.id === hwEditId ? newHw : h);
                            return [newHw, ...prev];
                          });
                          saveSupabaseHomework(newHw);

                          if (!hwEditId) {
                            sendNotificationToUsers({
                              title: '📝 Homework Added',
                              message: `"${hwFTitle}" in ${hwFSubject} assigned by ${currentUser?.name || 'Teacher'}.`,
                              type: 'homework',
                              targetGrades: [hwFGrade],
                              targetSections: hwFSection === 'All Sections' ? undefined : [hwFSection]
                            }).catch(e => console.error(e));
                          }

                          showNotification(hwEditId ? 'Homework updated!' : 'Homework created and published!');
                          setHwFormOpen(false);
                        }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                          <Check size={14}/> {hwEditId ? 'Update Homework' : 'Publish Homework'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filter panel */}
                  <div className="smart-glass p-4 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4 relative">
                      <input 
                        type="text"
                        placeholder="Search assignments by subject or title..."
                        value={hwSearch}
                        onChange={e => setHwSearch(e.target.value)}
                        className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="absolute left-3 top-3 text-[10px]">🔎</span>
                    </div>

                    <div className="md:col-span-4">
                      <select
                        value={hwFilterGrade}
                        onChange={e => setHwFilterGrade(e.target.value)}
                        className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-slate-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="All Grades">📚 All Grades (Grade 1 - 12)</option>
                        {effectiveRole !== 'student' && <option value="My Classes">👨‍🏫 My Assigned Classes</option>}
                        {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map(g => (
                          <option key={g} value={g}>🏫 {g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4 flex justify-end gap-2 text-xs text-slate-400">
                      <span>Total Assigned: <strong className="text-white font-mono">{homeworkList.length}</strong></span>
                      <span>•</span>
                      <span>Filters Match: <strong className="text-white font-mono">
                        {homeworkList.filter(hw => {
                          let roleAllowed = true;
                          if (effectiveRole === 'student') {
                            roleAllowed = (hw.classGrade === currentUser?.grade) && (hw.classSection === 'All Sections' || hw.classSection === currentUser?.section);
                          } else if (effectiveRole === 'teacher') {
                            const gradeMatch = !currentUser?.assignedGrades || currentUser.assignedGrades.length === 0 || currentUser.assignedGrades.includes(hw.classGrade);
                            const secMatch = hw.classSection === 'All Sections' || !currentUser?.assignedSections || currentUser.assignedSections.length === 0 || currentUser.assignedSections.includes(hw.classSection);
                            const isMyCreation = hw.givenBy === currentUser?.name || hw.givenBy === 'Teacher';
                            if (hwFilterGrade === 'My Classes') {
                              roleAllowed = (gradeMatch && secMatch) || isMyCreation;
                            } else {
                              roleAllowed = true;
                            }
                          } else {
                            roleAllowed = true;
                          }
                          
                          const matchG = hwFilterGrade === 'All Grades' || 
                                       (hwFilterGrade === 'My Classes' ? roleAllowed : hw.classGrade === hwFilterGrade);
                          const matchS = !hwSearch.trim() || hw.title.toLowerCase().includes(hwSearch.toLowerCase()) || hw.content.toLowerCase().includes(hwSearch.toLowerCase()) || hw.subject.toLowerCase().includes(hwSearch.toLowerCase());
                          return roleAllowed && matchG && matchS;
                        }).length}
                      </strong></span>
                    </div>
                  </div>

                  {/* Homework Grid list */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {(() => {
                      const filtered = homeworkList.filter(hw => {
                        let roleAllowed = true;
                        if (effectiveRole === 'student') {
                          roleAllowed = (hw.classGrade === currentUser?.grade) && (hw.classSection === 'All Sections' || hw.classSection === currentUser?.section);
                        } else if (effectiveRole === 'teacher') {
                          const gradeMatch = !currentUser?.assignedGrades || currentUser.assignedGrades.length === 0 || currentUser.assignedGrades.includes(hw.classGrade);
                          const secMatch = hw.classSection === 'All Sections' || !currentUser?.assignedSections || currentUser.assignedSections.length === 0 || currentUser.assignedSections.includes(hw.classSection);
                          const isMyCreation = hw.givenBy === currentUser?.name || hw.givenBy === 'Teacher';
                          if (hwFilterGrade === 'My Classes') {
                            roleAllowed = (gradeMatch && secMatch) || isMyCreation;
                          } else {
                            roleAllowed = true;
                          }
                        } else {
                          roleAllowed = true;
                        }
                        
                        const matchG = hwFilterGrade === 'All Grades' || 
                                     (hwFilterGrade === 'My Classes' ? roleAllowed : hw.classGrade === hwFilterGrade);
                        const matchS = !hwSearch.trim() || hw.title.toLowerCase().includes(hwSearch.toLowerCase()) || hw.content.toLowerCase().includes(hwSearch.toLowerCase()) || hw.subject.toLowerCase().includes(hwSearch.toLowerCase());
                        
                        return roleAllowed && matchG && matchS;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-2 smart-glass p-12 text-center space-y-3 rounded-3xl border border-dashed border-white/5">
                            <span className="text-4xl block">✨</span>
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Academic Clear Space</h4>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">No online assignments matched the current grade level or filter credentials. Check out alternative grades or enjoy your free hours!</p>
                          </div>
                        );
                      }

                      return filtered.map(hw => {
                        const userEmail = currentUser?.email || 'anonymous@school.edu';
                        const isDone = hw.completedList?.includes(userEmail);

                        const toggleCompleted = () => {
                          if (effectiveRole === 'student' && hw.classGrade !== currentUser?.grade) {
                            showNotification(`⚠️ Mismatch: This homework is assigned to ${hw.classGrade}. Your profile level is ${currentUser.grade}!`);
                            return;
                          }
                          let updatedHw: Homework | null = null;
                          setHomeworkList(prev => prev.map(item => {
                            if (item.id === hw.id) {
                              const list = item.completedList || [];
                              const updatedList = list.includes(userEmail)
                                ? list.filter(m => m !== userEmail)
                                : [...list, userEmail];
                              updatedHw = { ...item, completedList: updatedList };
                              return updatedHw;
                            }
                            return item;
                          }));
                          if (updatedHw) saveSupabaseHomework(updatedHw);
                          showNotification(isDone ? 'Marked assignment incomplete.' : 'Excellent work! Assignment marked complete.');
                        };

                        const handleAskAIHelper = () => {
                          setAiInput(`Greetings! I'm currently working on my ${hw.subject} online homework assigned to ${hw.classGrade} [Section: ${hw.classSection || 'All' }].\n\n**Assignment Title**: ${hw.title}\n**Instructions**:\n${hw.content}\n\nCould you please guide me step-by-step on how to solve this, explaining the theoretical framework?`);
                          setSelectedPersona('study_buddy');
                          setActiveTab('ai_teacher');
                          showNotification('Transmitted assignment parameters directly to Campus AI Mentor!');
                        };

                        return (
                          <div 
                            key={hw.id} 
                            className={`smart-glass p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow ${isDone ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-white/5 hover:border-indigo-500/20'}`}
                          >
                            <div className="space-y-3 flex-1">
                              
                              {/* Metadata indicators */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                    📘 {hw.subject}
                                  </span>
                                  <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                    🏫 {hw.classGrade}
                                  </span>
                                  <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                    🛡️ {hw.classSection || 'All Sections'}
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-slate-400">📅 Due: {hw.dueDate}</span>
                              </div>

                              {/* Title */}
                              <div className="space-y-1">
                                <h4 className="text-sm font-extrabold text-white font-display tracking-tight leading-snug">{hw.title}</h4>
                                <p className="text-[10px] text-slate-500 leading-none">Dispatched on: {hw.createdAt} • Assigned by: {hw.givenBy}</p>
                              </div>

                              {/* Content description rendered as Markdown */}
                              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans space-y-2 select-text">
                                {renderMarkdown(hw.content)}
                              </div>

                              {(effectiveRole === 'teacher' || effectiveRole === 'coordinator' || effectiveRole === 'admin') && hw.completedList && hw.completedList.length > 0 && (
                                <div className="mt-2 text-[10px] bg-slate-900 border border-white/5 p-2 rounded-lg text-slate-400">
                                  <strong>✅ Submissions ({hw.completedList.length}):</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {hw.completedList.map(em => (
                                      <span key={em} className="bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">{em}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>

                            {/* Options panel */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                              
                              {/* Progress checkbox */}
                              <button
                                onClick={toggleCompleted}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${isDone ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' : 'bg-slate-900 hover:bg-slate-850 border border-white/10 text-slate-300'}`}
                              >
                                {isDone ? '✅ Finished!' : '⬜ Mark Completed'}
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleAskAIHelper}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase transition-all"
                                  title="Explain this lesson step-by-step"
                                >
                                  💡 AI Teacher Assistant
                                </button>

                                 {(effectiveRole === 'teacher' || effectiveRole === 'coordinator' || effectiveRole === 'admin' || effectiveRole === 'super_admin') && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setHwEditId(hw.id);
                                        setHwFSubject(hw.subject);
                                        setHwFTitle(hw.title);
                                        setHwFContent(hw.content);
                                        setHwFGrade(hw.classGrade);
                                        setHwFSection(hw.classSection);
                                        setHwFormOpen(true);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-400 transition-all text-xs"
                                      title="Edit assigned homework"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Remove custom assigned homework "${hw.title}" for ${hw.classGrade}?`)) {
                                          setHomeworkList(prev => prev.filter(item => item.id !== hw.id));
                                          deleteSupabaseHomework(hw.id);
                                          showNotification('Class homework removed from databases.');
                                        }
                                      }}
                                      className="p-1.5 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition-all text-xs"
                                      title="Revoke assigned homework"
                                    >
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>

                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                </div>
              )}

              {activeTab === 'houses' && (
                <HouseChampionship currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} />
              )}

              {/* 
                 LOCKED - READ-ONLY - DO NOT MODIFY
                 Material Hub serves as the reference implementation.
                 All future changes to Materials MUST happen via extension, never modification.
              */}
              {activeTab === 'materials' && (
                <div className="space-y-8 animate-fadeIn">
                  
                  {/* Subject and Statistics Banner */}
                  <div className="smart-glass p-6 sm:p-8 rounded-3xl space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 tracking-wider">Academic Material Hub</span>
                        <h3 className="text-2xl font-black font-display text-white">Central Knowledge Vault</h3>
                        <p className="text-xs text-slate-400 max-w-xl">Google Drive + Classroom Notes. Share syllabus outlines, assignment briefs, and questions to accumulate House standings!</p>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                          <button 
                            onClick={async () => {
                              showNotification("Starting URL Repair & Deduplication...");
                              try {
                                let repairCount = 0;
                                let dedupCount = 0;
                                const updatedMaterials = [...materials];
                                
                                for (let i = 0; i < updatedMaterials.length; i++) {
                                  const mat = updatedMaterials[i];
                                  if (mat.url && (!mat.url.startsWith('http') || mat.url.includes('example.com'))) {
                                    const path = mat.storagePath || `materials/${mat.id}_${mat.fileName}`;
                                    try {
                                      const { data } = supabase.storage.from('StudentOS').getPublicUrl(path);
                                      const newUrl = data.publicUrl;
                                      const nextMat = { ...mat, url: newUrl, storagePath: path };
                                      await saveSupabaseMaterial(nextMat);
                                      updatedMaterials[i] = nextMat;
                                      repairCount++;
                                    } catch (err) {
                                      console.error("Failed to repair:", mat.title, err);
                                    }
                                  }
                                }
                                
                                // Phase 2: Deduplication (Keep one copy of 'The Fun they had')
                                const deletedIds = new Set<string>();
                                const theFunMaterials = updatedMaterials.filter(m => m.title && m.title.toLowerCase().includes('the fun they had'));
                                if (theFunMaterials.length > 1) {
                                  const sorted = theFunMaterials.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                  for (let i = 1; i < sorted.length; i++) {
                                    try {
                                      await deleteSupabaseMaterial(sorted[i].id);
                                      deletedIds.add(sorted[i].id);
                                      dedupCount++;
                                    } catch (err) {
                                      console.error("Failed to delete duplicate:", sorted[i].title, err);
                                    }
                                  }
                                }
                                
                                // Also deduplicate by name strictly overall just in case
                                const titleMap = new Set<string>();
                                for (const mat of updatedMaterials) {
                                  if (deletedIds.has(mat.id)) continue;
                                  if (mat.title && mat.title.toLowerCase() === 'the fun they had') continue; // handled above
                                  const key = mat.title.toLowerCase().trim();
                                  if (titleMap.has(key)) {
                                    try {
                                      await deleteSupabaseMaterial(mat.id);
                                      deletedIds.add(mat.id);
                                      dedupCount++;
                                    } catch(e) { }
                                  } else {
                                    titleMap.add(key);
                                  }
                                }

                                const finalFiltered = updatedMaterials.filter(m => !deletedIds.has(m.id));
                                setMaterials(finalFiltered);
                                showNotification(`Complete! Fixed ${repairCount} URLs, Deleted ${dedupCount} Duplicates.`);
                              } catch (e) {
                                console.error(e);
                                showNotification("Repair failed.");
                              }
                            }}
                            className="text-xs font-bold bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 border border-amber-500/30 px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                          >
                            🔧 Repair & Deduplicate
                          </button>

                        <button 
                          onClick={() => setOpenUploadModal(true)}
                          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Share Resource
                        </button>
                      </div>
                    </div>

                    {/* Integrated Sub-Tabs Selector */}
                    <div className="flex border-b border-white/5 gap-2 pb-1.5 scrollbar-none overflow-x-auto">
                      <button 
                        onClick={() => setActiveMaterialSubTab('feed')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${activeMaterialSubTab === 'feed' ? 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        📂 Shared Resources
                      </button>
                      <button 
                        onClick={() => setActiveMaterialSubTab('my_uploads')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${activeMaterialSubTab === 'my_uploads' ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        ☁️ My Uploads
                      </button>
                      <button 
                        onClick={() => setActiveMaterialSubTab('verified')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${activeMaterialSubTab === 'verified' ? 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        ✅ Verified Resources
                      </button>
                      {['teacher', 'admin', 'coordinator', 'super_admin'].includes(effectiveRole) && (
                        <button 
                          onClick={() => setActiveMaterialSubTab('teacher_vault')} 
                          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${activeMaterialSubTab === 'teacher_vault' ? 'bg-red-500/15 border border-red-500/20 text-red-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                          🔒 Teacher Vault
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveMaterialSubTab('saved')} 
                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${activeMaterialSubTab === 'saved' ? 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                      >
                        🔖 Saved Bookmarks {savedMaterialIds.length > 0 && `(${savedMaterialIds.length})`}
                      </button>
                    </div>
                  </div>

                  {/* Main Grid Content Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Filter and List Panel */}
                    <div className="lg:col-span-8 space-y-6">
                      
                      {/* Search and Filters Segment */}
                      <div className="smart-glass p-5 rounded-3xl space-y-4">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={materialsSearchQuery}
                            onChange={e => setMaterialsSearchQuery(e.target.value)}
                            placeholder="Search academic text, year, or term (e.g. 2024 Exam, BST topic)..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-white"
                          />
                          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                        </div>

                        {/* Dropdown Filters Line */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] sm:text-xs">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-bold block uppercase tracking-wider">Target Level</label>
                            <select 
                              value={materialsGradeFilter}
                              onChange={e => setMaterialsGradeFilter(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="All">All Grades</option>
                              <option value="Grade 9">Grade 9</option>
                              <option value="Grade 10">Grade 10</option>
                              <option value="Grade 11">Grade 11</option>
                              <option value="Grade 12">Grade 12</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-500 font-bold block uppercase tracking-wider">Format Classification</label>
                            <select 
                              value={materialsTypeFilter}
                              onChange={e => setMaterialsTypeFilter(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="All">All Formats</option>
                              <option value="pdf">PDF File</option>
                              <option value="ppt">PPT Slide Deck</option>
                              <option value="doc">Word Document</option>
                              <option value="image">Diagram / Image</option>
                              <option value="notes">Lecture Notes</option>
                              <option value="assignment">Assignment Sheet</option>
                              <option value="question-paper">Question Paper</option>
                              <option value="project">Project Work</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-500 font-bold block uppercase tracking-wider">Sorting Order</label>
                            <select 
                              value={materialsSortBy}
                              onChange={e => setMaterialsSortBy(e.target.value)}
                              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="Newest">Newest first</option>
                              <option value="Downloads">Most Downloaded</option>
                              <option value="Likes">Most Liked</option>
                              <option value="Verified">Verified First</option>
                            </select>
                          </div>
                        </div>

                        {/* Subject Selector Responsive Horizontal Strip */}
                        <div className="flex gap-2 pt-2 pb-1 border-t border-white/5 overflow-x-auto scrollbar-none snap-x mask-fade-right">
                          {['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Social Science', 'General'].map(sub => (
                            <button 
                              key={sub}
                              onClick={() => setMaterialsSubjectFilter(sub)}
                              className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex-shrink-0 snap-center ${materialsSubjectFilter === sub ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'border-white/5 bg-slate-900 text-slate-400 hover:text-white'}`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Materials List Generator */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(() => {
                          let displayList = materials;
                          const totalRaw = displayList.length;

                          // Feed, notes, question papers, bookmarks state filter
                          if (activeMaterialSubTab === 'papers') {
                            displayList = displayList.filter(m => m.type === 'question-paper');
                          } else if (activeMaterialSubTab === 'library') {
                            displayList = displayList.filter(m => m.type === 'notes' || m.type === 'ppt');
                          } else if (activeMaterialSubTab === 'saved') {
                            displayList = displayList.filter(m => savedMaterialIds.includes(m.id));
                          } else if (activeMaterialSubTab === 'my_uploads') {
                            displayList = displayList.filter(m => m.uploaderUid === currentUser?.uid);
                          } else if (activeMaterialSubTab === 'verified') {
                            displayList = displayList.filter(m => m.isVerified);
                          } else if (activeMaterialSubTab === 'teacher_vault') {
                            displayList = displayList.filter(m => m.visibility === 'teacher');
                          }
                          const subTabFiltered = displayList.length;

                          // Role-based visibility isolation (Students never see teacher tier material)
                          if (effectiveRole === 'student') {
                            displayList = displayList.filter(m => m.visibility !== 'teacher');
                          }
                          const roleFiltered = displayList.length;

                          // Private resources are only visible to their uploader
                          displayList = displayList.filter(m => m.visibility !== 'private' || m.uploaderUid === currentUser?.uid);
                          const privateFiltered = displayList.length;

                          // Subject specialized filter
                          if (materialsSubjectFilter !== 'All') {
                            displayList = displayList.filter(m => m.subject === materialsSubjectFilter);
                          }
                          const subjectFiltered = displayList.length;

                          // Target Level granular filter
                          if (materialsGradeFilter !== 'All') {
                            displayList = displayList.filter(m => m.visibleToGrades?.includes(materialsGradeFilter) || m.isPublic !== false);
                          }
                          const gradeFiltered = displayList.length;

                          // Type format filter
                          if (materialsTypeFilter !== 'All') {
                            displayList = displayList.filter(m => m.type === materialsTypeFilter);
                          }
                          const typeFiltered = displayList.length;

                          // General Search match
                          if (materialsSearchQuery.trim()) {
                            const searchQuery = materialsSearchQuery.toLowerCase();
                            displayList = displayList.filter(m => 
                              m.title.toLowerCase().includes(searchQuery) || 
                              m.description.toLowerCase().includes(searchQuery) ||
                              m.subject.toLowerCase().includes(searchQuery) ||
                              m.questionPaperYear?.includes(searchQuery)
                            );
                          }
                          const finalFiltered = displayList.length;

                          // Trace rendering stats
                          console.log(
                            `[UI FILTER TRACE] Total in DB: ${totalRaw} | ` +
                            `Sub-Tab "${activeMaterialSubTab}": ${subTabFiltered} | ` +
                            `Role/Private: ${privateFiltered} | ` +
                            `Subject "${materialsSubjectFilter}": ${subjectFiltered} | ` +
                            `Grade "${materialsGradeFilter}": ${gradeFiltered} | ` +
                            `Type "${materialsTypeFilter}": ${typeFiltered} | ` +
                            `Final Visible: ${finalFiltered}`
                          );

                          // Sorting
                          if (materialsSortBy === 'Newest') {
                            displayList.sort((a, b) => {
                              const tA = a.created_at || a.createdAt;
                              const tB = b.created_at || b.createdAt;
                              if (typeof tA === 'number' && typeof tB === 'number') return tB - tA;
                              return String(tB).localeCompare(String(tA));
                            });
                          } else if (materialsSortBy === 'Downloads') {
                            displayList.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
                          } else if (materialsSortBy === 'Likes') {
                            displayList.sort((a, b) => (b.likes || 0) - (a.likes || 0));
                          } else if (materialsSortBy === 'Verified') {
                            displayList.sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0));
                          }

                          if (displayList.length === 0) {
                            return (
                              <div className="smart-glass p-12 rounded-3xl text-center space-y-3 border border-white/5">
                                <span className="text-3xl block">📭</span>
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">No materials found</h4>
                                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">No records match your filters. Upload custom sheets or adjust subject filters to proceed!</p>
                              </div>
                            );
                          }

                          return displayList.map(mat => {
                            const isLiked = mat.likedBy?.includes(currentUser?.uid || '');
                            const isSaved = savedMaterialIds.includes(mat.id);
                            
                            // Style matching subject
                            let subStyle = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                            if (mat.subject === 'Mathematics') subStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                            else if (mat.subject === 'Physics') subStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
                            else if (mat.subject === 'Chemistry') subStyle = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
                            else if (mat.subject === 'Biology') subStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                            else if (mat.subject === 'Computer Science') subStyle = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                            else if (mat.subject === 'English') subStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                            else if (mat.subject === 'Social Science') subStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                            // House badge styles
                            let houseBadge = '';
                            if (mat.uploaderHouse === 'Ruby') houseBadge = '🟥 Ruby House';
                            else if (mat.uploaderHouse === 'Emerald') houseBadge = '🟩 Emerald House';
                            else if (mat.uploaderHouse === 'Sapphire') houseBadge = '🟦 Sapphire House';
                            else if (mat.uploaderHouse === 'Topaz') houseBadge = '🟨 Topaz House';

                            return (
                              <div key={mat.id} className="smart-glass p-4 sm:p-5 rounded-3xl border border-white/5 space-y-4 hover:border-white/10 transition-all w-full max-w-full overflow-hidden flex flex-col justify-between">
                                <div className="space-y-4 w-full min-w-0">
                                  {/* Top Badge Line */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] font-black uppercase text-slate-400">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className={`px-2 py-0.5 rounded border ${subStyle}`}>{mat.subject}</span>
                                      <span className="bg-white/5 px-2 py-0.5 rounded">{mat.type}</span>
                                      {mat.questionPaperYear && (
                                        <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">📅 {mat.questionPaperYear}</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">Shared {mat.createdAt}</span>
                                  </div>

                                  {/* Title Header */}
                                  <div className="space-y-1 w-full min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 max-w-full">
                                      <h4 className="text-sm font-black text-white font-display leading-tight truncate w-full">{mat.title}</h4>
                                      {mat.isVerified && (
                                        <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase font-sans mt-0.5 inline-block">verified faculty gold</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed max-w-full break-words">{mat.description}</p>
                                  </div>

                                  {/* Rich File Attachment Card */}
                                {mat.url && (
                                  <div className="bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden shadow-sm hover:border-indigo-500/10 transition-all">
                                    {/* Item Body based on file classifications */}
                                    {/* 1. IMAGE FILE PREVIEW */}
                                    {((mat.fileType && mat.fileType.startsWith('image/')) || (mat.url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|svg)$/) !== null) || mat.type === 'image') ? (
                                      <div className="relative group/img max-h-[220px] overflow-hidden bg-black/20 flex items-center justify-center border-b border-white/5">
                                        <img 
                                          src={mat.url} 
                                          alt={mat.fileName || 'Attachment Visual'} 
                                          className="max-h-[220px] w-auto object-contain transition-transform group-hover/img:scale-[1.01] duration-300"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider font-extrabold text-white">
                                          🖼️ Digital Image
                                        </div>
                                      </div>
                                    ) : (
                                      /* 2. NON-IMAGE FILE INTERFACES (PDF, AUDIO, VIDEO, OFFICE ASSET) */
                                      <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/10 w-full min-w-0">
                                        <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                                          <div className="bg-slate-900 border border-white/5 w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm">
                                            {mat.fileName?.toLowerCase().endsWith('.pdf') || mat.type === 'pdf' ? '📕' :
                                             (mat.fileName?.toLowerCase().endsWith('.doc') || mat.fileName?.toLowerCase().endsWith('.docx') || mat.type === 'doc') ? '📘' :
                                             (mat.fileName?.toLowerCase().endsWith('.ppt') || mat.fileName?.toLowerCase().endsWith('.pptx') || mat.type === 'ppt') ? '📊' :
                                             (mat.fileType && mat.fileType.startsWith('audio/')) ? '🎵' :
                                             (mat.fileType && mat.fileType.startsWith('video/')) ? '🎥' : '📎'}
                                          </div>
                                          <div className="text-left leading-tight space-y-0.5 min-w-0 flex-1">
                                            <p className="font-extrabold text-white text-xs truncate w-full">{mat.fileName || mat.title || 'Attachment Module'}</p>
                                            <p className="text-[10px] text-slate-500 font-mono font-semibold truncate w-full">
                                              {mat.fileSize ? `${(mat.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Size Unknown'}
                                              <span className="mx-1 text-slate-750 font-sans">•</span>
                                              <span className="uppercase text-[9px] font-bold text-slate-505">{mat.fileType?.split('/')?.[1] || mat.type || 'Binary asset'}</span>
                                            </p>
                                          </div>
                                        </div>

                                        {/* Inline Audio Player fallback */}
                                        {mat.fileType && mat.fileType.startsWith('audio/') && (
                                          <div className="w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                                            <audio src={mat.url} controls className="w-full sm:w-[220px] h-7 scale-[0.9] origin-right" />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Inline Video player preview fallback */}
                                    {mat.fileType && mat.fileType.startsWith('video/') && (
                                      <div className="w-full p-3 sm:p-4 bg-slate-950/20 border-t border-white/5">
                                        <video src={mat.url} controls className="w-full max-h-[220px] rounded-xl bg-black/40 border border-white/5" />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Uploader Line */}
                                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-b border-white/5 py-2 gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span>Uploaded by: <b className="text-white font-black">{mat.uploadedBy}</b></span>
                                    {houseBadge && (
                                      <span className="text-[10px] font-extrabold">{houseBadge}</span>
                                    )}
                                    {mat.uploaderSection && (
                                      <span className="text-[10px] text-indigo-400 uppercase font-black">🧬 {mat.uploaderSection}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-500">
                                    <span>👁️ {mat.views || 0} views</span>
                                    <span>📥 {mat.downloads || 0} downloads</span>
                                    <span>❤️ {mat.likes || 0} likes</span>
                                  </div>
                                </div>
                                </div>

                                {/* Interactive Actions Line */}
                                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                  <div className="flex flex-wrap gap-1.5 w-full">
                                    <button 
                                      onClick={() => handleDownloadMaterial(mat)}
                                      className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-slate-900 border border-indigo-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis"
                                    >
                                      <Download className="w-3.5 h-3.5 shrink-0" /> Open
                                    </button>

                                    <button 
                                      onClick={() => {
                                        setPreviewMaterial(mat);
                                        incrementViewsMaterial(mat);
                                      }}
                                      className="text-[10px] font-bold text-white bg-indigo-500/20 hover:bg-indigo-600 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis"
                                    >
                                      🔍 Preview
                                    </button>

                                    <button 
                                      onClick={() => setShareMaterial(shareMaterial === mat ? null : mat)}
                                      className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis"
                                    >
                                      <span>🟢</span> Share
                                    </button>

                                    <button 
                                      onClick={() => toggleLikeMaterial(mat)}
                                      className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 border flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis ${isLiked ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-white/5 border-white/5 hover:border-rose-500/20 text-slate-300'}`}
                                    >
                                      <Heart className={`w-3.5 h-3.5 shrink-0 ${isLiked ? 'fill-current text-rose-450' : ''}`} /> {mat.likes || 0}
                                    </button>

                                    <button 
                                      onClick={() => toggleBookmarkMaterial(mat.id)}
                                      className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 border flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis ${isSaved ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/5 text-slate-300 hover:border-amber-400/20'}`}
                                    >
                                      <Bookmark className={`w-3.5 h-3.5 shrink-0 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
                                    </button>

                                    <button 
                                      onClick={() => {
                                        setActiveCommentsMaterialId(activeCommentsMaterialId === mat.id ? null : mat.id);
                                        // Increment views passively when engaging with comment threads
                                        incrementViewsMaterial(mat);
                                      }}
                                      className="text-[10px] font-bold bg-white/5 border border-white/5 text-slate-300 hover:border-indigo-400/20 px-3 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 flex-1 min-w-[30%] whitespace-nowrap overflow-hidden text-ellipsis"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> ({mat.comments?.length || 0})
                                    </button>
                                  </div>

                                  {effectiveRole === 'teacher' && (
                                    <div className="flex gap-1.5 w-full xl:w-auto mt-2 xl:mt-0">
                                      <button 
                                        onClick={() => handleVerifyMaterial(mat)}
                                        className={`flex-1 xl:flex-none flex items-center justify-center text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all ${mat.isVerified ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'}`}
                                      >
                                        {mat.isVerified ? '✓ Verified' : 'Verify'}
                                      </button>
                                      <button 
                                        onClick={async () => {
                                          if (confirm(`Revoke / delete resource "${mat.title}" from vault databases permanently?`)) {
                                            try {
                                              const { deleteDoc, doc } = await import('firebase/firestore');
                                              await deleteDoc(doc(db, 'materials', mat.id));
                                              showNotification('Resource removed from academic hub.');
                                            } catch (err) {
                                              handleFirestoreError(err, OperationType.DELETE, `materials/${mat.id}`);
                                            }
                                          }
                                        }}
                                        className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-red-400 text-xs"
                                        title="Delete Material"
                                      >
                                        <Trash className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* WhatsApp Style Forward Interface */}
                                {shareMaterial === mat && (
                                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn text-left">
                                    <div className="bg-[#0b141a] border border-emerald-500/25 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col h-[520px]">
                                      {/* Header */}
                                      <div className="bg-[#1f2c34] px-5 py-4 border-b border-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                          <span className="text-xl">🟢</span>
                                          <div>
                                            <h4 className="text-sm font-black text-white">Forward with WhatsApp Share</h4>
                                            <p className="text-[10px] text-emerald-400 font-extrabold uppercase mt-0.5 tracking-wider">Share to Class Chat Rooms</p>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={() => setShareMaterial(null)}
                                          className="text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all active:scale-90"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Document info preview */}
                                      <div className="p-4 bg-[#111b21] border-b border-white/5">
                                        <div className="p-3 rounded-2xl bg-[#1f2c34]/50 border border-emerald-500/10 flex items-center gap-3">
                                          <span className="text-2xl">📁</span>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-black text-white truncate">{mat.title}</p>
                                            <p className="text-[9px] text-[#8696a0] truncate uppercase">{mat.subject} • {mat.type}</p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Chat Search */}
                                      <div className="px-4 py-2 bg-[#0b141a]">
                                        <input
                                          type="text"
                                          placeholder="Search chat group or friend..."
                                          className="w-full bg-[#1f2c34] border border-transparent rounded-xl px-4.5 py-2.5 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                          onChange={(e) => {
                                            (window as any)._waShareQuery = e.target.value;
                                            setChats([...chats]); // force re-render
                                          }}
                                        />
                                      </div>

                                      {/* Rooms list scroll */}
                                      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin">
                                        {chatRooms
                                          .filter(room => {
                                            const queryStr = ((window as any)._waShareQuery || '').toLowerCase();
                                            if (!queryStr) return true;
                                            return room.name.toLowerCase().includes(queryStr) || room.type.includes(queryStr);
                                          })
                                          .map((room) => {
                                            return (
                                              <button
                                                key={room.id}
                                                onClick={() => {
                                                  const capElement = document.getElementById(`share-caption-${mat.id}`) as HTMLInputElement;
                                                  const customCap = capElement?.value?.trim();
                                                  if (customCap) {
                                                    handleShareMaterialToChat({ ...mat, title: `${mat.title} (${customCap})` }, room.id);
                                                  } else {
                                                    handleShareMaterialToChat(mat, room.id);
                                                  }
                                                  setShareMaterial(null);
                                                }}
                                                className="w-full text-left p-3 rounded-2xl bg-[#111b21] border border-white/5 hover:border-emerald-500/20 hover:bg-[#1f2c34]/40 transition-all flex items-center justify-between gap-3 group active:scale-99"
                                              >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                  <span className="text-xl p-2 bg-[#1f2c34] rounded-full">{room.icon}</span>
                                                  <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs font-bold text-white truncate">{room.name}</span>
                                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                                                        room.type === 'friend' ? 'bg-teal-500/10 text-teal-400' :
                                                        room.type === 'channel' ? 'bg-rose-500/10 text-rose-400' : 'bg-[#25d366]/10 text-[#25d366]'
                                                      }`}>{room.type}</span>
                                                    </div>
                                                    <p className="text-[10px] text-[#8696a0] truncate mt-0.5">{room.description}</p>
                                                  </div>
                                                </div>
                                                
                                                <div className="text-[10px] bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center gap-1 shrink-0">
                                                  <span>🟢</span> Share
                                                </div>
                                              </button>
                                            );
                                          })}
                                      </div>

                                      {/* Footer caption helper */}
                                      <div className="p-4 bg-[#1f2c34] border-t border-white/5 flex gap-2">
                                        <input 
                                          id={`share-caption-${mat.id}`}
                                          type="text"
                                          placeholder="Type a custom message or caption..."
                                          className="flex-1 bg-[#111b21] border border-[#2a3942] rounded-xl px-4 py-2 text-xs text-white placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <button
                                          onClick={() => {
                                            const inp = document.getElementById(`share-caption-${mat.id}`) as HTMLInputElement;
                                            const cap = inp?.value?.trim() || `Shared: "${mat.title}"`;
                                            // Forward with caption custom content added
                                            handleShareMaterialToChat({ ...mat, title: `${mat.title} - ${cap}` }, activeChatTargetId);
                                            if (inp) inp.value = '';
                                            setShareMaterial(null);
                                          }}
                                          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
                                        >
                                          Quick Share ➜
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Collapsible Comments Panel */}
                                {activeCommentsMaterialId === mat.id && (
                                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 space-y-3 animate-fadeIn">
                                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                      <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">💬 Peer Discussion Thread</h5>
                                    </div>
                                    
                                    {/* History list */}
                                    <div className="space-y-2.5 max-h-40 overflow-y-auto scrollbar-thin">
                                      {(mat.comments || []).map((comm) => {
                                        let commBadge = '';
                                        if (comm.house === 'Ruby') commBadge = '🟥 ';
                                        else if (comm.house === 'Emerald') commBadge = '🟩 ';
                                        else if (comm.house === 'Sapphire') commBadge = '🟦 ';
                                        else if (comm.house === 'Topaz') commBadge = '🟨 ';

                                        return (
                                          <div key={comm.id} className="text-xs bg-slate-900/60 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                                            <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold mb-1">
                                              <span>{commBadge}{comm.author}</span>
                                              <span>{comm.createdAt}</span>
                                            </div>
                                            <p className="text-slate-200">{comm.text}</p>
                                          </div>
                                        );
                                      })}
                                      {(mat.comments || []).length === 0 && (
                                        <p className="text-[10px] text-slate-500 italic py-1 text-center">No messages posted. Be the first to start the masterclass discussion!</p>
                                      )}
                                    </div>

                                    {/* Submit box */}
                                    <div className="flex gap-2">
                                      <input 
                                        type="text" 
                                        value={newCommentText}
                                        onChange={e => setNewCommentText(e.target.value)}
                                        placeholder="Type doubt, solution, or revision note..."
                                        className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddComment(mat); }}
                                      />
                                      <button 
                                        onClick={() => handleAddComment(mat)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 rounded-xl transition-all"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Collapsible AI Operations Panel */}
                                <div className="mt-3.5 pt-3.5 border-t border-white/5 space-y-2">
                                  <div className="flex items-center justify-between text-[9px] font-black uppercase text-indigo-400">
                                    <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-400" /> Campus AI Tutor Integration</span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 text-[10px]">
                                    <button 
                                      onClick={() => handleTriggerMaterialAi(mat, 'summarize')}
                                      className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white font-bold text-left sm:text-center flex-1"
                                    >
                                      ✨ Summarize
                                    </button>
                                    <button 
                                      onClick={() => handleTriggerMaterialAi(mat, 'quiz')}
                                      className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white font-bold text-left sm:text-center flex-1"
                                    >
                                      🧠 Generate Quiz
                                    </button>
                                    <button 
                                      onClick={() => handleTriggerMaterialAi(mat, 'explain')}
                                      className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white font-bold text-left sm:text-center flex-1"
                                    >
                                      📖 Explain Chapter
                                    </button>
                                    <button 
                                      onClick={() => handleTriggerMaterialAi(mat, 'revision')}
                                      className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white font-bold text-left sm:text-center flex-1"
                                    >
                                      📓 Revision Notes
                                    </button>
                                    <button 
                                      onClick={() => handleTriggerMaterialAi(mat, 'questions')}
                                      className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 hover:border-indigo-500/20 px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white font-bold text-left sm:text-center flex-1"
                                    >
                                      🎯 Imp Questions
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedMaterialForAi(mat);
                                        setAiActionType('ask');
                                        setAiActionResultText('Type a question inside the terminal block below to cross-evaluate document content!');
                                      }}
                                      className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold px-3 py-1.5 rounded-xl text-left sm:text-center flex-1 hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                      🤖 Ask AI...
                                    </button>
                                  </div>
                                </div>

                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Left Column: Easy Quick Share & Leaderboard */}
                    <div className="lg:col-span-4 space-y-6">
                      
                      {/* Quick Resource Uploader Widget */}
                      <div className="smart-glass p-6 rounded-3xl space-y-4 border border-indigo-500/15">
                        <div className="space-y-1">
                          <h3 className="text-base font-extrabold font-display text-white flex items-center gap-1.5">📤 Quick Share Vault</h3>
                          <p className="text-xs text-slate-400">Share textbook photos, notes, diagrams, or papers with peers instantly.</p>
                        </div>

                        <form onSubmit={handleQuickUploadSubmit} className="space-y-3">
                          {/* File Dropzone */}
                          <div 
                            onDragEnter={handleQuickUploadDrag}
                            onDragOver={handleQuickUploadDrag}
                            onDragLeave={handleQuickUploadDrag}
                            onDrop={handleQuickUploadDrop}
                            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                              quickUploadDragActive 
                                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
                                : 'border-white/10 hover:border-indigo-500/40 bg-slate-950/40 hover:bg-slate-950/60'
                            }`}
                            onClick={() => document.getElementById('quick-file-upload-input')?.click()}
                          >
                            <input 
                              type="file" 
                              id="quick-file-upload-input" 
                              className="hidden" 
                              onChange={handleQuickUploadFileChange}
                            />
                            {quickUploadFile ? (
                              <div className="space-y-1 animate-fadeIn">
                                <span className="text-3xl block">📄</span>
                                <p className="text-xs font-black text-indigo-400 truncate max-w-[220px] mx-auto">{quickUploadFile.name}</p>
                                <p className="text-[10px] text-slate-500">{(quickUploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload className="w-7 h-7 mx-auto text-indigo-400 p-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg animate-bounce mb-1" />
                                <p className="text-xs font-bold text-white">Click or drag & drop file</p>
                                <span className="text-[10px] text-slate-500 block">Notes, Sheets, Images up to 50MB</span>
                              </div>
                            )}
                          </div>

                          {quickUploadFile && (
                            <div className="space-y-3 animate-fadeIn">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resource Title *</label>
                                <input 
                                  type="text"
                                  value={quickUploadTitle}
                                  onChange={e => setQuickUploadTitle(e.target.value)}
                                  placeholder="Name your shared study resource..."
                                  required
                                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                                  <select 
                                    value={quickUploadSubject}
                                    onChange={e => setQuickUploadSubject(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none"
                                  >
                                    <option value="Mathematics">Mathematics</option>
                                    <option value="Physics">Physics</option>
                                    <option value="Chemistry">Chemistry</option>
                                    <option value="Biology">Biology</option>
                                    <option value="Computer Science">Comp Science</option>
                                    <option value="English">English</option>
                                    <option value="Social Science">Social Sci</option>
                                    <option value="General">General</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Format Type</label>
                                  <select 
                                    value={quickUploadType}
                                    onChange={e => setQuickUploadType(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-[11px] text-white focus:outline-none"
                                  >
                                    <option value="notes">Notes</option>
                                    <option value="image">Diagram / Image</option>
                                    <option value="pdf">PDF File</option>
                                    <option value="ppt">PPT/Slide</option>
                                    <option value="assignment">Assignment</option>
                                    <option value="question-paper">Question Paper</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickUploadFile(null);
                                    setQuickUploadTitle('');
                                  }}
                                  className="flex-1 py-1.5 rounded-xl text-[10px] font-semibold bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all text-center"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={quickUploadIsUploading}
                                  className={`flex-1 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold uppercase tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 ${quickUploadIsUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                  {quickUploadIsUploading ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white/25 border-t-white rounded-full animate-spin"></span>
                                      Publishing...
                                    </>
                                  ) : (
                                    '🚀 Share'
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </form>
                      </div>

                      {/* Active House Leaderboard for Material Hub Standings */}
                      <div className="smart-glass p-5 rounded-3xl space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#facc15] flex items-center gap-1.5">🏆 Competitive House stand</h4>
                          <p className="text-[11px] text-slate-400 leading-normal">Contribute, comments, downloads and verified works to elevate your house alliance stand!</p>
                        </div>
                        <div className="space-y-2">
                          {Object.entries({
                            Ruby: { pts: housePoints.Ruby || 750, col: 'text-red-400 bg-red-500/10 border-red-500/20' },
                            Emerald: { pts: housePoints.Emerald || 820, col: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                            Sapphire: { pts: housePoints.Sapphire || 910, col: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                            Topaz: { pts: housePoints.Topaz || 685, col: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
                          }).map(([house, details]) => (
                            <div key={house} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-black/25 border border-white/5">
                              <span className="font-bold">{house === 'Ruby' ? '🟥' : house === 'Emerald' ? '🟩' : house === 'Sapphire' ? '🟦' : '🟨'} {house} House</span>
                              <span className="font-mono text-slate-300 font-extrabold">{details.pts} SP</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Dynamic interactive AI analysis Drawer Modal */}
                  {selectedMaterialForAi && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="relative bg-slate-900 border border-white/10 max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden animate-zoomIn max-h-[85vh] flex flex-col justify-between">
                        
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-indigo-500/10 to-transparent border-b border-white/5 flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Faculty AI Agent</span>
                            <h4 className="text-base font-black text-white font-display leading-snug">{selectedMaterialForAi.title}</h4>
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-mono">Process: {aiActionType.toUpperCase()}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedMaterialForAi(null);
                              setAiUserQuestion('');
                            }}
                            className="bg-slate-800 text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors border border-white/5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Scrollable text container */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                          
                          {aiActionLoading ? (
                            <div className="py-12 text-center space-y-3">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                              <p className="text-xs text-indigo-400 animate-pulse uppercase font-black tracking-widest">Compiling database vectors & loading study answers...</p>
                            </div>
                          ) : (
                            <div className="space-y-4 text-slate-200 text-xs leading-relaxed font-sans whitespace-pre-wrap">
                              {aiActionResultText || 'No result parsed.'}
                            </div>
                          )}

                          {/* Ask input if in "ask" mode */}
                          {aiActionType === 'ask' && !aiActionLoading && (
                            <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ask Custom Question Related to this resource:</label>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={aiUserQuestion}
                                  onChange={e => setAiUserQuestion(e.target.value)}
                                  placeholder="e.g. Can you explain AVL balance factors or list formulas?"
                                  className="flex-1 text-xs bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                                <button 
                                  onClick={() => handleTriggerMaterialAi(selectedMaterialForAi, 'ask')}
                                  className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl transition-all"
                                >
                                  Submit query
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Export Action Footer */}
                        {!aiActionLoading && aiActionResultText && (
                          <div className="p-5 bg-slate-950 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <span className="text-[10px] text-slate-500 font-mono">Format matching: Printable ANSI Markdown text</span>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button 
                                onClick={() => handleExportAiResult(selectedMaterialForAi, 'txt')}
                                className="text-xs font-bold bg-white/5 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-white/5 transition-colors flex-1 sm:flex-initial"
                              >
                                Export TXT
                              </button>
                              <button 
                                onClick={() => handleExportAiResult(selectedMaterialForAi, 'html')}
                                className="text-xs font-bold bg-white/5 text-slate-305 hover:text-white px-3 py-1.5 rounded-xl border border-white/5 transition-colors flex-1 sm:flex-initial"
                              >
                                Export HTML Pages
                              </button>
                              <button 
                                onClick={() => handleExportAiResult(selectedMaterialForAi, 'pdf')}
                                className="text-xs font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-colors flex-1 sm:flex-initial"
                              >
                                Get Printable PDF
                              </button>
                            </div>
                          </div>
                        )}
                        
                      </div>
                    </div>
                  )}

                  {/* Interactive Material Preview Modal & AI Assistance */}
                  {previewMaterial && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto animate-fadeIn">
                      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto text-left">
                        
                        {/* Close button */}
                        <button 
                          onClick={() => setPreviewMaterial(null)}
                          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors border border-white/5"
                        >
                          ✕
                        </button>

                        {/* Heading summary */}
                        <div className="flex items-start gap-3 border-b border-white/5 pb-4">
                          <span className="text-3xl p-2 bg-indigo-500/10 border border-indigo-500/15 rounded-2xl block">📁</span>
                          <div>
                            <span className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                              {previewMaterial.subject} • {previewMaterial.type}
                            </span>
                            <h3 className="text-base font-extrabold text-white mt-1 leading-normal">{previewMaterial.title}</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Shared by {previewMaterial.uploadedBy} • {previewMaterial.createdAt}</p>
                          </div>
                        </div>

                        {/* Internal reading slot */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          
                          {/* Left Column: Real Document Viewer Frame */}
                          <div className="space-y-3.5 bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-between">
                            <div className="space-y-2 h-full flex flex-col">
                              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
                                <span className="font-bold flex items-center gap-1">📖 Integrated Viewer Engine</span>
                                <span className="font-mono text-cyan-300 uppercase tracking-widest">{previewMaterial.fileName?.split('.').pop() || previewMaterial.type || 'DOCUMENT'}</span>
                              </div>

                              {previewMaterial.url?.startsWith('blob:') ? (
                                <div className="w-full h-[300px] rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center p-4 text-center shadow-inner">
                                  <div className="text-4xl mb-4 text-rose-500">⚠️</div>
                                  <p className="text-rose-400 font-bold mb-2">Legacy Material Format Detected</p>
                                  <p className="text-rose-300 text-[10px] max-w-[250px]">This material was uploaded before the Supabase migration and must be re-uploaded.</p>
                                </div>
                              ) : previewMaterial.fileType?.startsWith('video/') || (previewMaterial.url && previewMaterial.url.toLowerCase().match(/\.(mp4|webm|ogg)$/)) ? (
                                <div className="w-full h-[300px] rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center p-2 shadow-inner">
                                  <video controls className="max-h-full max-w-full">
                                    <source src={previewMaterial.url} type={previewMaterial.fileType || 'video/mp4'} />
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                              ) : previewMaterial.fileType?.startsWith('audio/') || (previewMaterial.url && previewMaterial.url.toLowerCase().match(/\.(mp3|wav|ogg)$/)) ? (
                                <div className="w-full h-[300px] rounded-xl border border-white/10 bg-slate-900 flex flex-col items-center justify-center p-4">
                                  <div className="text-4xl mb-4">🎵</div>
                                  <audio controls className="w-full max-w-sm">
                                    <source src={previewMaterial.url} type={previewMaterial.fileType || 'audio/mpeg'} />
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              ) : previewMaterial.url && (previewMaterial.url.toLowerCase().includes('.pdf') || previewMaterial.type === 'pdf' || previewMaterial.fileType === 'application/pdf') ? (
                                <div className="w-full h-[300px] rounded-xl border border-white/10 bg-slate-900 flex flex-col items-center justify-center p-0 overflow-hidden relative">
                                  <iframe src={previewMaterial.url} className="w-full h-full border-none" />
                                </div>
                              ) : previewMaterial.url && (previewMaterial.url.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp|svg)$/) !== null || previewMaterial.type === 'image' || previewMaterial.fileType?.startsWith('image/')) ? (
                                <div className="w-full h-[285px] rounded-xl overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center p-2 shadow-inner">
                                  {(() => {
                                    console.log("[DEBUG] Preview URL:", previewMaterial.url);
                                    return (
                                      <img 
                                        src={previewMaterial.url} 
                                        alt="Attachment Visual Preview"
                                        className="max-h-full max-w-full object-contain roundedReferral" 
                                        referrerPolicy="no-referrer"
                                        onError={(e) => console.error("[DEBUG] Image load error:", e)}
                                      />
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-900 border border-white/5 rounded-xl text-xs space-y-3 font-serif min-h-[220px] max-h-[285px] text-slate-350 leading-relaxed overflow-y-auto select-none">
                                  <h4 className="font-bold text-center text-xs border-b border-white/5 pb-1 text-white truncate px-2">{previewMaterial.fileName || previewMaterial.title}</h4>
                                  <div className="space-y-4 pt-4 flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl text-slate-500">📎</div>
                                    <p className="text-[11px] bg-slate-950/60 p-3 rounded-lg text-slate-400 border border-white/5 italic text-center leading-relaxed">
                                      This file format cannot be previewed directly in the browser.<br/><br/>
                                      <span className="text-indigo-400 font-bold block mt-2">Document Type: {previewMaterial.fileType || previewMaterial.type || 'Unknown Format'}</span>
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-white/5 mt-auto">
                              <span>👁️ {previewMaterial.views || 0} views</span>
                              <span>📥 {previewMaterial.downloads || 0} downloads</span>
                            </div>
                          </div>

                          {/* Right Column: AI Helpers & Quick actions drawer */}
                          <div className="space-y-4 flex flex-col justify-between">
                            
                            <div className="space-y-2.5">
                              <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">💡 Study Helpers & AI Companion</h4>
                              
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <button 
                                  onClick={() => {
                                    setSelectedMaterialForAi(previewMaterial);
                                    setAiActionType('summarize');
                                    handleTriggerMaterialAi(previewMaterial, 'summarize');
                                  }}
                                  className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 p-2.5 rounded-xl text-slate-300 font-bold hover:text-white transition-all text-center"
                                >
                                  ✨ Summarize File
                                </button>
                                <button 
                                  onClick={() => {
                                    setSelectedMaterialForAi(previewMaterial);
                                    setAiActionType('explain');
                                    handleTriggerMaterialAi(previewMaterial, 'explain');
                                  }}
                                  className="bg-white/5 hover:bg-indigo-600/10 border border-white/5 p-2.5 rounded-xl text-slate-300 font-bold hover:text-white transition-all text-center"
                                >
                                  📖 Explain Document
                                </button>
                              </div>
                              
                              {/* If AI output is ready and matches current file preview, render inside */}
                              {selectedMaterialForAi?.id === previewMaterial.id && aiActionResultText && (
                                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-slate-300 max-h-28 overflow-y-auto scrollbar-thin">
                                  <span className="font-extrabold text-[#facc15] uppercase text-[8px] block mb-1">🤖 Campus AI Tutor Output:</span>
                                  <p className="leading-relaxed whitespace-pre-wrap">{aiActionResultText}</p>
                                </div>
                              )}
                              
                              {!aiActionResultText && (
                                <p className="text-[10px] text-slate-500 italic">Select an AI action above. The smart tutor will scan this revision sheet and provide responses instantly.</p>
                              )}
                            </div>

                            {/* Easy Share button to whatsapp styled channel targets */}
                            <div className="space-y-2 pt-2.5 border-t border-white/5">
                              <h4 className="text-[10px] font-black uppercase text-emerald-450 tracking-wider">🟢 Quick Share to Class Chat Rooms:</h4>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { id: 'group-all', name: '🌍 General' },
                                  { id: 'group-math', name: '📐 Math Club' },
                                  { id: 'group-ruby', name: '🟥 Ruby House' },
                                  { id: 'group-emerald', name: '🟩 Emerald House' }
                                ].map(room => (
                                  <button
                                    key={room.id}
                                    onClick={() => {
                                      handleShareMaterialToChat(previewMaterial, room.id);
                                      showNotification(`Shared "${previewMaterial.title}" directly to ${room.name}`);
                                    }}
                                    className="bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-emerald-400 px-2.5 py-1.5 rounded-xl text-[9px] font-black tracking-wide text-center transition-all inline-block hover:scale-103"
                                  >
                                    Share to {room.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                          <button 
                            onClick={() => handleDownloadMaterial(previewMaterial)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all block"
                          >
                            📥 Download Original Link
                          </button>
                          <button 
                            onClick={() => setPreviewMaterial(null)}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs px-5 py-2.5 rounded-xl transition-all block"
                          >
                            Close Preview
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Create / Upload Custom Material Popup Modal */}
                  {openUploadModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-slate-900 border border-white/10 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden animate-zoomIn">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                          <div className="space-y-0.5">
                            <h4 className="text-base font-black text-white font-display leading-tight">Publish Academic Core Resource</h4>
                            <p className="text-xs text-slate-400">Add pdf, spreadsheets, question papers, or notes.</p>
                          </div>
                          <button 
                            onClick={() => setOpenUploadModal(false)}
                            className="bg-slate-800 text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors border border-white/5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleUploadFileMaterial} className="p-6 space-y-4 text-xs">
                          
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resource Name / Title *</label>
                            <input 
                              id="upload-title"
                              required
                              type="text" 
                              placeholder="e.g. Mathematics Sem 2 Calculus, BST exam preparation..."
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category Subject *</label>
                              <select 
                                id="upload-subject"
                                required
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none"
                              >
                                <option value="Mathematics">Mathematics</option>
                                <option value="Physics">Physics</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Biology">Biology</option>
                                <option value="Computer Science">Computer Science</option>
                                <option value="English">English</option>
                                <option value="Social Science">Social Science</option>
                                <option value="General">General/Other</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resource Type *</label>
                              <select 
                                id="upload-type"
                                required
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-white"
                              >
                                <option value="pdf">PDF File</option>
                                <option value="ppt">PPT slide deck</option>
                                <option value="doc">Word Doc</option>
                                <option value="image">Diagram Image</option>
                                <option value="notes">Lecture Notes</option>
                                <option value="assignment">Assignment Sheets</option>
                                <option value="question-paper">Exam Question Paper</option>
                                <option value="project">Project Work</option>
                              </select>
                            </div>
                          </div>

                          {/* Year field for question papers */}
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Question Paper Year (Optional)</label>
                            <input 
                              id="upload-year"
                              type="text" 
                              placeholder="e.g. 2025, 2024 (Only if question paper format)"
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Resource Summary Description *</label>
                            <textarea 
                              id="upload-desc"
                              required
                              rows={3}
                              placeholder="Describe coverage parameters, key concepts, and instructions..."
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none font-sans"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Academic File Content Attachment</label>
                            <input 
                              id="upload-file"
                              type="file" 
                              className="w-full bg-slate-950 text-slate-400 text-xs px-3 py-2.5 rounded-xl border border-white/10 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                            />
                          </div>

                          {/* Granular Permissions Section */}
                          <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-400">
                              <span>Privacy Restrictions (Audience TARGETS)</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={!newMaterialIsPublic} 
                                  onChange={() => setNewMaterialIsPublic(!newMaterialIsPublic)} 
                                  className="sr-only peer"
                                />
                                <div className="w-8 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span className="ml-2 text-[9px] text-slate-500">{newMaterialIsPublic ? 'Public' : 'Custom'}</span>
                              </label>
                            </div>

                            {!newMaterialIsPublic && (
                              <div className="space-y-2 border-t border-white/5 pt-2 animate-fadeIn text-[9px]">
                                {effectiveRole !== 'student' && (
                                  <div className="space-y-1">
                                    <p className="font-bold text-indigo-400 uppercase">Material Visibility Domain:</p>
                                    <select 
                                      value={newMaterialVisibility}
                                      onChange={(e) => setNewMaterialVisibility(e.target.value as any)}
                                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-white"
                                    >
                                      <option value="student">Student Portal (Visible to Everyone)</option>
                                      <option value="teacher">Teacher Vault (Staff Only)</option>
                                      <option value="private">Private (Only Me)</option>
                                    </select>
                                  </div>
                                )}
                                
                                {newMaterialVisibility === 'student' && (
                                  <>
                                    <div className="space-y-1">
                                      <p className="font-bold text-indigo-400 uppercase">Visible to Grade Levels:</p>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => {
                                          const isSel = newMaterialGrades.includes(g);
                                          return (
                                            <button 
                                              type="button" 
                                              key={g}
                                              onClick={() => setNewMaterialGrades(prev => isSel ? prev.filter(x => x !== g) : [...prev, g])}
                                              className={`px-2 py-0.5 rounded-lg border font-bold transition-all ${isSel ? 'bg-indigo-600 text-white border-indigo-500 shadow' : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'}`}
                                            >
                                              {g}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="font-bold text-indigo-400 uppercase">Visible to Section Groups:</p>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {['Astra', 'Elera', 'Solara', 'Vega'].map(sec => {
                                          const isSel = newMaterialSections.includes(sec);
                                          return (
                                            <button 
                                              type="button" 
                                              key={sec}
                                              onClick={() => setNewMaterialSections(prev => isSel ? prev.filter(x => x !== sec) : [...prev, sec])}
                                              className={`px-2 py-0.5 rounded-lg border font-bold transition-all ${isSel ? 'bg-indigo-600 text-white border-indigo-500 shadow' : 'bg-slate-900 text-slate-400 border-white/5 hover:text-white'}`}
                                            >
                                              {sec}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="font-bold text-indigo-400 uppercase">Visible to Houses:</p>
                                      <div className="flex gap-1.5 flex-wrap">
                                        {['Ruby', 'Emerald', 'Sapphire', 'Topaz'].map(h => {
                                          const isSel = newMaterialHouses.includes(h);
                                          return (
                                            <button 
                                              type="button" 
                                              key={h}
                                              onClick={() => setNewMaterialHouses(prev => isSel ? prev.filter(x => x !== h) : [...prev, h])}
                                              className={`px-2 py-0.5 rounded-lg border font-bold transition-all ${isSel ? 'bg-indigo-600 text-white border-indigo-500 shadow' : 'bg-slate-900 text-slate-400 border-white/5'}`}
                                            >
                                              {h}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          <button 
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold uppercase py-3 rounded-2xl tracking-wider transition-all shadow-lg active:scale-95"
                          >
                            🚀 Publish Material to Vaults
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab 5: Interactive Quiz */}
              {activeTab === 'quiz' && (
                <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
                  
                  {/* Quiz starter screen */}
                  {!quizStarted ? (
                    <div className="smart-glass p-8 rounded-3xl space-y-6 text-center shadow-lg">
                      <div className="h-14 w-14 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-3xl mx-auto border border-indigo-500/20">🧠</div>
                      <div className="space-y-1.5">
                        <h3 className="text-2xl font-black font-display text-white">Section Aptitude Evaluation Node</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">Evaluate your comprehensive subject mastery. Scoring above critical thresholds earns substantial house credit standings!</p>
                      </div>

                      {effectiveRole === 'student' ? (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          {Object.keys(MOCK_QUIZZES).map(subject => (
                            <button 
                              key={subject}
                              onClick={() => handleStartQuiz(subject)}
                              className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/5 hover:border-white/10 text-sm font-extrabold text-white transition-all hover:scale-[1.02] active:scale-95 text-left flex justify-between items-center"
                            >
                              <span>📚 {subject}</span>
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-4 space-y-4">
                          <p className="text-xs font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 inline-block px-3 py-1 rounded-full border border-amber-500/20">Teacher / Administrator Layout</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                            <button onClick={() => showNotification("Teacher Quiz view under construction")} className="p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 transition-all">
                              <span className="block text-indigo-400 text-[10px] font-black uppercase mb-1">Module Access</span>
                              <span className="font-bold text-white text-sm">View Active Quizzes</span>
                            </button>
                            <button onClick={() => showNotification("Quiz Reports under development")} className="p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 transition-all">
                              <span className="block text-emerald-400 text-[10px] font-black uppercase mb-1">Metrics</span>
                              <span className="font-bold text-white text-sm">Examine Reports</span>
                            </button>
                            <button onClick={() => showNotification("Quiz Configuration restricted")} className="p-4 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 transition-all">
                              <span className="block text-amber-400 text-[10px] font-black uppercase mb-1">Configuration</span>
                              <span className="font-bold text-white text-sm">Author / Edit Quiz</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Active quiz gameplay */
                    (() => {
                      const questions = MOCK_QUIZZES[quizSubject] || [];
                      const question = questions[quizCurrentIndex];
                      
                      return (
                        <div className="smart-glass p-8 rounded-3xl space-y-6 border border-indigo-500/20 shadow-xl animate-fadeIn">
                          
                          {/* Quiz status indicators */}
                          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                            <span className="bg-indigo-600 text-white font-extrabold uppercase px-2.5 py-1 rounded-xl">
                              {quizSubject} Evaluation
                            </span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-slate-400">Question {quizCurrentIndex + 1}/{questions.length}</span>
                              <span className={`px-2.5 py-1 rounded-lg font-bold font-mono ${quizTimer <= 4 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-900 text-indigo-400'}`}>
                                ⏱️ {quizTimer}s
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-500 h-full transition-all duration-300"
                              style={{ width: `${((quizCurrentIndex) / questions.length) * 100}%` }}
                            />
                          </div>

                          {/* Question details */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-extrabold tracking-widest text-indigo-400 uppercase">Aptitude core query</span>
                            <h4 className="font-bold text-lg text-white leading-relaxed">{question.question}</h4>
                          </div>

                          {/* Options list */}
                          <div className="grid grid-cols-1 gap-2.5">
                            {question.options.map((option, idx) => {
                              let optionBg = 'bg-slate-900 border-white/5 hover:bg-slate-800 text-slate-300';
                              if (quizSubmitted) {
                                if (idx === question.correctOptionIndex) {
                                  optionBg = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                                } else if (quizSelectedOption === idx) {
                                  optionBg = 'bg-red-500/10 border-red-500 text-red-400';
                                } else {
                                  optionBg = 'bg-slate-950/40 border-white/5 text-slate-500';
                                }
                              } else if (quizSelectedOption === idx) {
                                optionBg = 'bg-indigo-500/10 border-indigo-500 text-indigo-400';
                              }

                              return (
                                <button 
                                  key={idx}
                                  disabled={quizSubmitted}
                                  onClick={() => setQuizSelectedOption(idx)}
                                  className={`w-full text-left p-4 rounded-xl text-xs font-semibold border transition-all ${optionBg}`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation summary block on submission */}
                          {quizSubmitted && (
                            <div className="p-4 bg-slate-900/80 rounded-2xl border border-white/5 text-[11px] leading-relaxed space-y-1.5 animate-fadeIn">
                              <p className="font-extrabold text-amber-500 uppercase tracking-widest">Mastery insight Explanation</p>
                              <p className="text-slate-300">{question.explanation}</p>
                            </div>
                          )}

                          {/* Control actions */}
                          <div className="flex gap-2 justify-end">
                            {!quizSubmitted ? (
                              <button 
                                onClick={() => handleQuizSubmit()}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl shadow-md transition-all"
                              >
                                Commit Answer
                              </button>
                            ) : (
                              <button 
                                onClick={handleNextQuizQuestion}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl shadow-md transition-all"
                              >
                                {quizCurrentIndex + 1 < questions.length ? 'Next Question' : 'Wrap Session'}
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })()
                  )}

                </div>
              )}

              {/* Tab 6: Collaborative Feedback Portal */}
              {activeTab === 'feedback' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Add feedback form pane */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="smart-glass p-6 rounded-3xl space-y-4 shadow-sm">
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-base text-white">Create Campus Suggestion</h3>
                          <p className="text-xs text-slate-400">Post constructive notes about facilities, scheduling resources, or calendar conflicts.</p>
                        </div>

                        <form onSubmit={handleAddFeedback} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400">Category Tag</label>
                            <select 
                              value={newFeedbackCategory} 
                              onChange={e => setNewFeedbackCategory(e.target.value as any)}
                              className="w-full text-xs px-3.5 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="facilities">🏫 Facilities & Labs</option>
                              <option value="academic">📚 Coursework Research</option>
                              <option value="events">🏆 House events & Challenges</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400">Feedback Details</label>
                            <textarea 
                              rows={4}
                              value={newFeedbackText}
                              onChange={e => setNewFeedbackText(e.target.value)}
                              placeholder="Please draft details constructively..." 
                              className="w-full p-3.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              required
                            />
                          </div>

                          <button 
                            type="submit"
                            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs tracking-wide uppercase transition-all shadow-md hover:scale-[1.01]"
                          >
                            🚀 Publish on Student Board
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Feed display pane */}
                    <div className="lg:col-span-8 space-y-4">
                      <div className="smart-glass p-6 rounded-3xl space-y-4">
                        <h3 className="text-lg font-black font-display text-white">Active Forums</h3>
                        
                        <div className="space-y-4">
                          {feedbackPosts.map(post => (
                            <div key={post.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all space-y-3.5">
                              
                              {/* Header info */}
                              <div className="flex justify-between items-center flex-wrap gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{post.author}</span>
                                  <span className="text-[10px] text-slate-500 lowercase opacity-80 font-mono">({post.role})</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-indigo-400 font-bold uppercase">{post.category}</span>
                                  <span className={`px-2 py-0.5 rounded uppercase font-bold tracking-wider ${post.status === 'solved' ? 'bg-emerald-500/20 text-emerald-400' : post.status === 'in-progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-840 text-slate-400'}`}>
                                    {post.status}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">{post.text}</p>

                              {/* Footer action detail */}
                              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                                <button 
                                  onClick={() => upvoteFeedback(post.id)}
                                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-300 font-bold transition-all"
                                >
                                  👍 Upvote <span className="text-indigo-400 bg-white/5 px-1.5 py-0.5 rounded ml-1 font-extrabold">{post.votes}</span>
                                </button>

                                {/* Faculty specific override action buttons */}
                                {['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole || '') && (
                                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase">
                                    <button 
                                      onClick={() => handleFacultyStatusUpdate(post.id, 'in-progress')}
                                      className="p-1 px-2 border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 rounded"
                                    >
                                      Mark Progress
                                    </button>
                                    <button 
                                      onClick={() => handleFacultyStatusUpdate(post.id, 'solved')}
                                      className="p-1 px-2 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                    >
                                      Mark Addressed/Solved
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Nested comments reply stream */}
                              {post.replies.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-white/5 bg-black/30 p-3.5 rounded-xl border border-white/5">
                                  <p className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Faculty Feedback</p>
                                  {post.replies.map((rep, idx) => (
                                    <div key={idx} className="space-y-0.5 leading-relaxed text-[11px]">
                                      <p className="font-extrabold text-white">{rep.author} <span className="font-mono text-slate-500 text-[9px]">({rep.role})</span></p>
                                      <p className="text-slate-300">{rep.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                                     {/* Tab 7: AI Teacher Chat Dialog */}
              {activeTab === 'ai_teacher' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 animate-fadeIn">
                  
                  {/* Threads & Files Sidebar (XL: 3 Cols) */}
                  <div className="xl:col-span-3 space-y-4">
                    
                    {/* Threads Manager */}
                    <div className="smart-glass p-4 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div>
                          <h3 className="font-extrabold text-xs text-white">Study Threads</h3>
                          <p className="text-[10px] text-slate-400">Previous sessions & history</p>
                        </div>
                        <button 
                          onClick={handleCreateNewThread}
                          className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase transition-all shadow-sm flex items-center gap-1 active:scale-95"
                          title="New discussion session"
                        >
                          <Plus className="w-3 h-3" /> New
                        </button>
                      </div>

                      {/* Thread List */}
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {aiThreads.map(t => (
                          <div 
                            key={t.id}
                            onClick={() => {
                              setActiveThreadId(t.id);
                              setSelectedPersona(t.personaId);
                              setAiMode(t.mode);
                              if (t.attachedFiles) {
                                setAttachedFiles(t.attachedFiles);
                              } else if (t.attachedFile) {
                                setAttachedFiles([t.attachedFile]);
                              } else {
                                setAttachedFiles([]);
                              }
                            }}
                            className={`group flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${activeThreadId === t.id ? 'border-indigo-500 bg-indigo-500/10 shadow-sm' : 'border-white/5 bg-slate-900/40 hover:bg-slate-850'}`}
                          >
                            <div className="flex items-center gap-2 truncate max-w-[85%]">
                              <span className="text-[11px] leading-none shrink-0">
                                {AI_PERSONAS.find(p => p.id === t.personaId)?.avatarChar || '💬'}
                              </span>
                              <span className="text-[11px] text-slate-200 truncate font-semibold">{t.title}</span>
                            </div>
                            <button 
                              onClick={(e) => handleDeleteThread(t.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-all shrink-0"
                              title="Delete conversation"
                            >
                              <Trash className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* File Attachment Upload Zone */}
                    <div className="smart-glass p-4 rounded-3xl space-y-3.5 shadow-sm">
                      <div>
                        <h3 className="font-extrabold text-xs text-white">Reference Context</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Attach files to direct active instruction</p>
                      </div>

                      {/* Drag & Drop Area */}
                      <div className="relative border border-dashed border-white/10 hover:border-indigo-500/50 bg-slate-950/40 hover:bg-indigo-500/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group">
                        <input 
                          type="file" 
                          id="ai-file-uploader"
                          onChange={handleFileUploadAction}
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="w-5 h-5 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-bold text-slate-200">Upload Study Files</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">Supports PDF, DOCX, PPTX, Images, Text, MD</span>
                      </div>

                      {/* Attached Files Display */}
                      {attachedFiles && attachedFiles.length > 0 && (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                          {attachedFiles.map((file, idx) => {
                            let icon = <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400" />;
                            if (file.name.toLowerCase().endsWith('.pdf')) {
                              icon = <span className="text-xs shrink-0">📕</span>;
                            } else if (file.type.startsWith('image/')) {
                              icon = <span className="text-xs shrink-0">🖼️</span>;
                            }
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] animate-fadeIn">
                                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold truncate max-w-[80%]">
                                  {icon}
                                  <span className="truncate">{file.name}</span>
                                  <span className="text-[8px] text-slate-400 uppercase font-mono">({(file.size / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button 
                                  onClick={() => handleRemoveAttachedFile(file.name)}
                                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-red-400 transition-all shrink-0"
                                  title="Remove attachment"
                                >
                                  <Trash className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Tutor Selection and Interaction Modes (XL: 4 Cols) */}
                  <div className="xl:col-span-4 space-y-4">
                    
                    {/* Tutor Personas list */}
                    <div className="smart-glass p-4 rounded-3xl space-y-3 shadow-sm">
                      <div>
                        <h3 className="font-extrabold text-xs text-white">Select AI Instructor</h3>
                        <p className="text-[10px] text-slate-400">Tutors maintain specific expertise & teaching style profiles.</p>
                      </div>

                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {AI_PERSONAS.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => handleSwitchPersona(p.id)}
                            className={`w-full p-2.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${selectedPersona === p.id ? 'border-indigo-500 bg-indigo-500/10 shadow-sm' : 'border-white/5 bg-slate-900/60 hover:bg-slate-800'}`}
                          >
                            <span className="text-base p-1.5 bg-black/40 rounded-lg block shrink-0">{p.avatarChar}</span>
                            <div className="space-y-0.5 truncate">
                              <p className="font-bold text-xs text-white">{p.name}</p>
                              <p className="text-[9px] text-slate-400 leading-none truncate">Focus: {p.speciality}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Modes Selector */}
                    <div className="smart-glass p-4 rounded-3xl space-y-3.5 shadow-sm">
                      <div>
                        <h3 className="font-extrabold text-xs text-white">Active Tutorial Mode</h3>
                        <p className="text-[10px] text-slate-400 font-medium">Re-orient feedback algorithms on demand</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'explanatory', label: 'Explainer mode', emoji: '📚', desc: 'Detailed concepts' },
                          { id: 'socratic', label: 'Socratic mode', emoji: '🎓', desc: 'Step-by-step guidance' },
                          { id: 'coder', label: 'Coding coach', emoji: '💻', desc: 'Code optimization' },
                          { id: 'quiz_gen', label: 'Quiz exam', emoji: '📝', desc: 'Challenges & grades' }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleSwitchMode(m.id as any)}
                            className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all group ${aiMode === m.id ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/5 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white'}`}
                          >
                            <span className="text-xs">{m.emoji}</span>
                            <div className="mt-1">
                              <p className="text-[10px] font-extrabold leading-none">{m.label}</p>
                              <p className="text-[7.5px] text-slate-500 group-hover:text-slate-400 mt-0.5 leading-tight">{m.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Chat dialog pane (XL: 5 Cols) */}
                  <div className="xl:col-span-12 lg:xl:col-span-5 space-y-4">
                    <div className="smart-glass p-4 rounded-3xl h-[530px] flex flex-col justify-between shadow-lg relative border border-white/5">
                      
                      {/* Dialogue Stream Header Banner */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {AI_PERSONAS.find(p => p.id === selectedPersona)?.avatarChar || '🤖'}
                          </span>
                          <div>
                            <span className="text-xs font-black text-white">
                              {AI_PERSONAS.find(p => p.id === selectedPersona)?.name || 'Study Mate'}
                            </span>
                            <span className="mx-1.5 text-slate-600 text-[10px]">•</span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                              {aiMode.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={handleClearThreadHistory}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[9px] font-bold text-slate-400 hover:text-white border border-white/5 transition-all"
                          title="Flush dialogue entries for this thread"
                        >
                          Clear Chat
                        </button>
                      </div>

                      {/* Dialogue Stream Body */}
                      <div id="ai-dialog-scroll" className="flex-1 overflow-y-auto pr-2 my-3 space-y-3.5 bg-slate-950/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <div className="text-center p-3 border border-white/5 bg-white/5 rounded-2xl">
                          <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest">Dialogue channel connected successfully</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Prompt mathematical derivations, software syntax, essay critiques, or review sheets.</p>
                        </div>

                        {(!activeThread || !activeThread.messages || activeThread.messages.length === 0) && (
                          <div className="py-6 px-4 space-y-6 text-center animate-fadeIn">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400">
                                <Sparkles className="w-8 h-8 animate-pulse" />
                              </div>
                              <h3 className="text-base font-black text-white tracking-tight mt-2">
                                Hi, {currentUser?.name || 'Scholar'}! 👋
                              </h3>
                              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                I am your advanced AI Teacher Copilot and Subject Expert. Ask me anything about your studies, or select one of the high-yield topics below:
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left">
                              {[
                                { icon: '🌌', label: 'Physics', text: 'Explain Quantum Physics to a high school beginner with real-world analogies.' },
                                { icon: '🧪', label: 'Chemistry', text: 'Show me step-by-step how to balance complex chemical equations.' },
                                { icon: '📈', label: 'Calculus', text: 'Solve and explain the derivative of x^2 * sin(x) using the product rule.' },
                                { icon: '💻', label: 'Computer Science', text: 'Explain how closures work in JavaScript with clear code examples.' }
                              ].map((item, i) => (
                                <button
                                  key={i}
                                  onClick={() => setAiInput(item.text)}
                                  className="p-3 bg-slate-900 hover:bg-slate-850 border border-white/5 hover:border-indigo-500/40 rounded-xl transition-all group flex flex-col justify-between h-28 text-left hover:scale-[1.02] active:scale-95 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-[8px] bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-widest">{item.label}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2 group-hover:text-white transition-colors line-clamp-2">
                                    "{item.text}"
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeThread && (activeThread.messages || []).map((m, idx) => {
                          const msgKey = `${activeThread.id}-${idx}`;
                          const isSpeaking = speakingMsgIdx === msgKey;
                          return (
                            <div key={idx} className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600/15 border border-indigo-500/20 text-white ml-auto' : 'bg-slate-900 border border-white/5 text-slate-200 mr-auto'}`}>
                              <span className="text-[8px] uppercase tracking-wider font-extrabold block mb-1.5 text-indigo-400">
                                {m.role === 'user' ? `👤 ${currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : 'Student'} Inquiry` : '🤖 Instructor Response'}
                              </span>
                              <div className="space-y-1">
                                {renderMarkdown(m.content)}
                              </div>
                              
                              {/* Attached Files visual inside bubbles */}
                              {m.files && m.files.length > 0 && (
                                <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2 bg-black/10 -mx-3.5 px-3.5 py-2.5 rounded-b-2xl">
                                  <p className="text-[8px] text-indigo-400 uppercase font-black tracking-wider leading-none mb-1">Attached References:</p>
                                  <div className="flex flex-col gap-1.5">
                                    {m.files.map((file: any, fIdx: number) => {
                                      let icon = '📎';
                                      let colorTheme = 'border-indigo-500/10 bg-indigo-950/10';
                                      if (file.name.toLowerCase().endsWith('.pdf')) {
                                        icon = '📕';
                                        colorTheme = 'border-red-500/10 bg-red-950/10';
                                      } else if (file.type.startsWith('image/')) {
                                        icon = '🖼️';
                                        colorTheme = 'border-emerald-500/10 bg-emerald-950/10';
                                      } else if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
                                        icon = '📘';
                                        colorTheme = 'border-blue-500/10 bg-blue-950/10';
                                      } else if (file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx')) {
                                        icon = '📊';
                                        colorTheme = 'border-amber-500/10 bg-amber-950/10';
                                      } else if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.txt')) {
                                        icon = '📝';
                                        colorTheme = 'border-indigo-500/10 bg-indigo-950/10';
                                      }

                                      const extSize = (file.size / (1024 * 1024)).toFixed(2);
                                      const showMb = Number(extSize) > 0.1 ? `${extSize} MB` : `${(file.size / 1024).toFixed(1)} KB`;

                                      return (
                                        <div key={fIdx} className={`flex items-center justify-between p-2 rounded-xl border ${colorTheme} text-[10px]`}>
                                          <div className="flex items-center gap-2 truncate">
                                            <span className="text-sm shrink-0">{icon}</span>
                                            <div className="truncate text-left leading-tight">
                                              <p className="font-extrabold text-white truncate max-w-[150px]">{file.name}</p>
                                              <p className="text-[8px] text-slate-400 font-mono">{showMb}</p>
                                            </div>
                                          </div>
                                          {file.type.startsWith('image/') && file.content && (
                                            <div className="w-8 h-8 rounded overflow-hidden border border-white/5 shrink-0 bg-black/40">
                                              <img src={file.content} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {m.role !== 'user' && (
                                <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                                  <button
                                    onClick={() => handleCopyToClipboard(m.content)}
                                    className="flex items-center gap-1 hover:text-white hover:bg-white/10 bg-slate-950/40 border border-white/5 px-2.5 py-1 rounded-lg transition-colors font-medium active:scale-95"
                                    title="Copy text content to clipboard"
                                  >
                                    <span>📋</span> Copy
                                  </button>
                                  <button
                                    onClick={() => handleSaveToNotes(m.content)}
                                    className="flex items-center gap-1 hover:text-white hover:bg-white/10 bg-slate-950/40 border border-white/5 px-2.5 py-1 rounded-lg transition-colors font-medium active:scale-95"
                                    title="Construct new archive in Personal Vault Notes"
                                  >
                                    <span>💾</span> Save Note
                                  </button>
                                  <button
                                    onClick={() => handleToggleSpeakMessage(m.content, msgKey)}
                                    className={`flex items-center gap-1 border px-2.5 py-1 rounded-lg transition-colors font-medium active:scale-95 ${isSpeaking ? 'text-rose-400 border-rose-500/30 bg-rose-500/10 font-bold' : 'hover:text-white hover:bg-white/10 bg-slate-950/40 border-white/5'}`}
                                    title={isSpeaking ? "Suspend voice generator output" : "Synthesize study reading"}
                                  >
                                    <span>{isSpeaking ? '⏹️' : '🔊'}</span> {isSpeaking ? 'Stop' : 'Read Aloud'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {aiLoading && (
                          <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/15 rounded-2xl text-[10px] max-w-[80%] mr-auto animate-pulse flex items-center gap-2">
                             <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                             <span>Mentor formulating response guidelines...</span>
                          </div>
                        )}
                      </div>

                      {/* Chat interactive panel */}
                      <div className="space-y-2">
                        
                        {/* Dynamic Status Display for attachments inside typing box */}
                        {attachedFiles && attachedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-2 bg-slate-900/60 rounded-xl border border-white/5 max-h-[110px] overflow-y-auto">
                            {attachedFiles.map((file, idx) => {
                              let icon = '📎';
                              if (file.name.toLowerCase().endsWith('.pdf')) icon = '📕';
                              else if (file.type.startsWith('image/')) icon = '🖼️';
                              else if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) icon = '📘';
                              else if (file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx')) icon = '📊';
                              else if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.txt')) icon = '📝';
                              
                              const kbSize = (file.size / 1024).toFixed(1);

                              return (
                                <div key={idx} className="flex items-center gap-1.5 bg-indigo-950/40 text-[10px] text-indigo-300 px-2.5 py-1 rounded-xl border border-indigo-500/20 shadow-sm transition-all hover:border-indigo-500/40">
                                  <span>{icon}</span>
                                  <span className="truncate max-w-[130px] font-semibold">{file.name}</span>
                                  <span className="text-[8px] text-slate-500 font-mono">({kbSize} KB)</span>
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveAttachedFile(file.name)} 
                                    className="text-slate-400 hover:text-red-400 font-extrabold cursor-pointer ml-1 p-0.5 rounded hover:bg-white/5 active:scale-90 leading-none"
                                    title="Remove attachment"
                                  >
                                    ❌
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAskAIModel()}
                            placeholder={attachedFiles && attachedFiles.length > 0 ? `Ask Mentor about ${attachedFiles.map(f => f.name).join(', ')}...` : "Explicate formulas, code fragments, or query lesson summaries..."}
                            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white font-medium"
                          />
                          <button 
                            onClick={handleAskAIModel}
                            disabled={aiLoading}
                            className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" /> AskAI
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* Tab 8: Peer global chat matrix */}
              {activeTab === 'peer_chat' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-[650px] max-w-6xl mx-auto shadow-xl animate-fadeIn">
                  
                  {/* Left Column: Chat Rooms List (Groups, Friends, Channels) */}
                  <div className={`md:col-span-4 bg-slate-900/80 border border-white/5 rounded-3xl p-4 flex flex-col justify-between ${showChatSidebarMobile ? 'block' : 'hidden md:flex'}`}>
                    <div className="space-y-4 flex-1 flex flex-col min-h-0">
                      
                      {/* Search & Simple Heading */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Class Chat Rooms</h3>
                          <button
                            onClick={() => setIsCreatingRoom(true)}
                            className="bg-indigo-600 hover:bg-indigo-505 text-white text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wide uppercase transition-all shadow-md active:scale-95"
                          >
                            ➕ Create
                          </button>
                        </div>
                        <input
                          type="text"
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          placeholder="Search groups, friends, or channels..."
                          className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Rooms List Scrollable container */}
                      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                        {chatRooms
                          .filter(room => {
                            if (!chatSearchQuery) return true;
                            return room.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) || 
                                   room.type.toLowerCase().includes(chatSearchQuery.toLowerCase());
                          })
                          .map((room) => {
                            const isActive = activeChatTargetId === room.id;
                            let badgeStyle = "bg-indigo-500/10 text-indigo-400";
                            if (room.type === "friend") badgeStyle = "bg-teal-500/10 text-teal-400";
                            if (room.type === "channel") badgeStyle = "bg-rose-500/10 text-rose-400";

                            return (
                              <button
                                key={room.id}
                                onClick={() => {
                                  setActiveChatTargetId(room.id);
                                  setShowChatSidebarMobile(false);
                                }}
                                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 ${isActive ? 'bg-indigo-600/15 border-indigo-600/40 text-white' : 'bg-slate-950/20 border-white/5 hover:border-white/10 hover:bg-slate-950/40 text-slate-350'}`}
                              >
                                <span className="text-xl">{room.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-black truncate">{room.name}</span>
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${badgeStyle}`}>
                                      {room.type}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{room.description}</p>
                                </div>
                              </button>
                            );
                          })}
                      </div>

                    </div>
                    
                    {/* User Mini status footer */}
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-400">
                      <span>My House status:</span>
                      <span className="font-extrabold text-indigo-400">⚡ Online & ready</span>
                    </div>
                  </div>

                  {/* Right Column: Chat Dialog box */}
                  <div className={`md:col-span-8 bg-slate-900/80 border border-white/5 rounded-3xl p-5 flex flex-col justify-between ${!showChatSidebarMobile ? 'flex' : 'hidden md:flex'}`}>
                    
                    {/* Heading bar */}
                    {(() => {
                      const activeRoomInfo = chatRooms.find(r => r.id === activeChatTargetId) || { id: 'group-all', name: 'All Students Group', type: 'group', icon: '🌍', description: 'General chat for all students' };

                      return (
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setShowChatSidebarMobile(true)}
                              className="md:hidden p-1.5 bg-white/5 rounded-lg border border-white/10 text-white text-[11px]"
                            >
                              ← Rooms
                            </button>
                            <span className="text-2xl">{activeRoomInfo.icon}</span>
                            <div>
                              <h4 className="font-extrabold text-sm text-white">{activeRoomInfo.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">{activeRoomInfo.description}</p>
                              {(activeRoomInfo as any).code && <p className="text-[10px] font-mono text-emerald-400 font-bold mt-1">Code: {(activeRoomInfo as any).code}</p>}
                            </div>
                          </div>
                          
                          {activeRoomInfo.type === 'channel' && (
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold mr-2">
                              📢 Broadcast Only
                            </span>
                          )}
                          {(activeRoomInfo as any).creatorId === currentUser?.uid && (
                            <button 
                              onClick={() => setShowGroupSettings(true)}
                              className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-md font-bold hover:bg-indigo-500/20 transition-all"
                            >
                              ⚙️ Group Settings
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Chat Bubble Feed Container */}
                    <div id="chat-scroll-view" className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-1 bg-slate-950/40 p-4 rounded-2xl border border-white/5 shadow-inner">
                      
                      {/* Welcome message */}
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center text-[10px] text-slate-400 font-medium">
                        🛡️ Messages are secure and private to the StudentOS system. Keep discussions respectful and fun.
                      </div>

                      {/* Mock legacy text to retain previous contents if group-all is active */}
                      {activeChatTargetId === 'group-all' && (
                        <>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 max-w-[85%] space-y-1 mr-auto animate-fadeIn">
                            <span className="text-xs font-bold text-emerald-400 block pb-0.5">Siddharth Sen (student • Emerald House):</span>
                            <p className="text-xs text-slate-350">Finished the Computer Science Binary Trees quiz! Added +50 points to Emerald House standings. Let’s head the charts this term!</p>
                            <span className="text-[8px] text-slate-500 block text-right">09:12 AM</span>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 max-w-[85%] space-y-1 mr-auto animate-fadeIn col flex flex-col gap-1">
                            <span className="text-xs font-bold text-blue-400 block pb-0.5">Meera Jain (student • Sapphire House):</span>
                            <p className="text-xs text-slate-350">Does anyone have the Calculus derivatives cheat sheet handy? It’s not in the Materials Hub yet.</p>
                            <span className="text-[8px] text-slate-500 block text-right font-mono">10:04 AM</span>
                          </div>
                        </>
                      )}

                      {/* Filtered Active Messages */}
                      {chats.filter(c => c.targetId === activeChatTargetId || (!c.targetId && activeChatTargetId === 'group-all')).map(c => {
                        const isMine = c.ownerUid === currentUser?.uid;
                        return (
                          <div key={c.id} className={`p-4 rounded-2xl border max-w-[85%] space-y-1 animate-fadeIn flex flex-col gap-1 ${isMine ? 'ml-auto bg-indigo-500/10 border-indigo-500/20' : 'mr-auto bg-white/5 border-white/5'}`}>
                            <span className={`text-xs font-bold block pb-0.5 ${c.role === 'teacher' ? 'text-amber-400' : 'text-blue-400'}`}>
                              {c.name} ({c.role}{c.house ? ` • ${c.house} House` : ''}):
                            </span>
                            <p className="text-xs text-slate-350">{c.message}</p>
                            <span className="text-[8px] text-slate-500 block text-right font-mono">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                      
                      {chats.filter(c => c.targetId === activeChatTargetId || (!c.targetId && activeChatTargetId === 'group-all')).length === 0 && (
                        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
                          <p className="text-[11px] text-slate-500 italic">No messages yet. Say hello!</p>
                        </div>
                      )}
                    </div>

                    {/* Chat messaging input drawer */}
                    {(() => {
                      const activeRoomInfo2 = chatRooms.find(r => r.id === activeChatTargetId) || { type: 'group' };

                      const isBroadcastChannel = activeRoomInfo2.type === 'channel';
                      const canPost = !isBroadcastChannel || effectiveRole === 'teacher';

                      if (!canPost) {
                        return (
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-center text-[10px] text-red-400 font-semibold leading-relaxed">
                            📢 Only teachers are permitted to broadcast or update announcements inside this school channel.
                          </div>
                        );
                      }

                      return (
                        <div className="flex gap-2 bg-slate-950 p-2.5 rounded-2xl border border-white/5">
                          <input 
                            type="text"
                            value={newChatText}
                            onChange={e => setNewChatText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                            placeholder={`Send a chat message...`}
                            className="flex-1 bg-transparent border-0 focus:outline-none text-xs text-white px-3 font-medium text-left"
                          />
                          <button 
                            onClick={() => handleSendChat()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-5 py-2 rounded-xl transition-all"
                          >
                            Send
                          </button>
                        </div>
                      );
                    })()}

                  </div>

                  {/* Create New Room Modal */}
                  {isCreatingRoom && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                      <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
                        <button 
                          onClick={() => setIsCreatingRoom(false)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
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
                            className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase tracking-widest font-mono"
                          />
                          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors">
                            Join
                          </button>
                        </form>
                        
                        <div className="h-px bg-white/10 my-4" />

                        <div>
                          <h3 className="text-base font-black text-white">Create New Chat Room</h3>
                          <p className="text-xs text-slate-400 mt-1">Start a private friend dialogue, study group alliance, or announce a broadcast channel.</p>
                        </div>
                        
                        <form onSubmit={handleCreateRoom} className="space-y-3.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Room Name</label>
                            <input 
                              type="text"
                              value={newRoomName}
                              onChange={e => setNewRoomName(e.target.value)}
                              placeholder="e.g. Physics Revision, Meera J., Ruby Alliance"
                              required
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {(['group', 'friend', 'channel'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setNewRoomType(t);
                                  if (t === 'friend') setNewRoomIcon('🧑‍🎓');
                                  else if (t === 'channel') setNewRoomIcon('📢');
                                  else setNewRoomIcon('📐');
                                }}
                                className={`py-1.5 rounded-xl text-[10px] font-black uppercase text-center border transition-all ${newRoomType === t ? 'bg-indigo-600/20 border-indigo-500 text-white font-black' : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/10'}`}
                              >
                                {t === 'group' && '🌍 '}
                                {t === 'friend' && '🧑‍🎓 '}
                                {t === 'channel' && '📢 '}
                                {t}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Icon Emoji</label>
                              <select 
                                value={newRoomIcon}
                                onChange={e => setNewRoomIcon(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="📐">📐 Math/Study</option>
                                <option value="🧪">🧪 Science </option>
                                <option value="🌍">🌍 Global/All</option>
                                <option value="📢">📢 Announcement</option>
                                <option value="🧑‍🎓">🧑‍🎓 Student/Friend</option>
                                <option value="🟥">🟥 Ruby House</option>
                                <option value="🟩">🟩 Emerald House</option>
                                <option value="🟦">🟦 Sapphire House</option>
                                <option value="🟧">🟧 Topaz House</option>
                                <option value="🏆">🏆 Sports/Cultural</option>
                                <option value="💬">💬 Chat Bubble</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Room Description</label>
                              <input 
                                type="text"
                                value={newRoomDescription}
                                onChange={e => setNewRoomDescription(e.target.value)}
                                placeholder="Short details or tagline..."
                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsCreatingRoom(false)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-transparent text-slate-400 hover:text-white transition-all"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-4.5 py-2 rounded-xl bg-orange-605 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95"
                            >
                              Create Room
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab 9: Faculty Dashboard View */}
              {activeTab === 'faculty' && effectiveRole === 'teacher' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex gap-4 items-center bg-slate-900 border border-white/5 rounded-3xl p-6">
                    <span className="text-4xl">👨‍🏫</span>
                    <div>
                      <h3 className="text-2xl font-black font-display text-white">Faculty Center</h3>
                      <p className="text-xs text-slate-400">Manage your assigned classes and section performances here.</p>
                    </div>
                  </div>
                  <StudentMarksCenter currentUser={currentUser} effectiveRole={effectiveRole} showNotification={showNotification} />
                </div>
              )}

              {/* Tab 10: Attendance Manager */}
              {activeTab === 'attendance_manager' && ['teacher', 'coordinator', 'admin', 'super_admin'].includes(effectiveRole) && (
                <AttendanceManager currentUser={currentUser} effectiveRole={effectiveRole} />
              )}

              {/* Tab 11: Admin Center */}
              {activeTab === 'admin' && (effectiveRole === 'admin' || effectiveRole === 'super_admin') && (
                <AdminCenter currentUser={currentUser} showNotification={showNotification} />
              )}

            </main>

            {/* Orion (Jarvis) Drawer Overlay */}
            {isJarvisActive && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm animate-fadeIn" 
                  onClick={() => setIsJarvisActive(false)}
                />
                
                {/* Modal Overlay for Orion */}
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-fadeIn pointer-events-none">
                  <div className="w-full max-w-6xl h-full max-h-[85vh] pointer-events-auto shadow-[0_0_80px_-15px_rgba(79,70,229,0.3)] rounded-3xl overflow-hidden relative border border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-950/95 to-violet-900/20 backdrop-blur-3xl" />
                    <div className="relative h-full w-full">
                  <StudentOSJarvis 
                    onClose={() => setIsJarvisActive(false)}
                    activeTab={activeTab}
                    setActiveTab={handleTabSelect}
                    clearWhiteboard={clearCanvas}
                    drawShapeOnWhiteboard={drawShapeOnWhiteboard}
                    setTriggerQuickQuiz={(val: boolean) => setQuizStarted(val)}
                    saveWhiteboard={() => {
                      const canvas = whiteboardRef.current;
                      if (canvas) {
                        try {
                          const url = canvas.toDataURL('image/png');
                          const link = document.createElement('a');
                          link.download = `whiteboard-snapshot-${Date.now()}.png`;
                          link.href = url;
                          link.click();
                          showNotification('✓ Whiteboard snapshot compiled and downloaded successfully!');
                        } catch (e) {
                          showNotification('Failed to generate blackboard snapshot.');
                        }
                      }
                    }}
                    setSearchMaterialsQuery={setMaterialsSearchQuery}
                    showNotification={showNotification}
                    createVaultNote={(title: string, content: string, subject: string) => {
                      const newId = 'note-' + Date.now();
                      const newNote = {
                        id: newId,
                        title: title || 'AI Research Notes',
                        subject: subject || 'Orion Generated',
                        content: content || '',
                        createdAt: new Date().toLocaleDateString(),
                        icon: '🧠',
                        coverBg: 'bg-gradient-to-r from-violet-600 to-indigo-900',
                        userId: currentUser?.uid || 'guest'
                      };
                      setVaultNotes(prev => {
                        const updated = [...prev, newNote];
                        if (currentUser) {
                          (async () => {
       const newArr = updated;
       for (const n of newArr) {
          saveVaultNoteToSupabase(n).catch(()=>{});
       }
     })();
                        }
                        return updated;
                      });
                    }}
                    onSuperAdminUnlocked={async () => {
                      setIsSuperAdmin(true);
                      setSimulatedRole('admin');
                      if (currentUser && currentUser.uid) {
                        try {
                          const updatedProfile = {
                            ...currentUser,
                            role: 'super_admin' as const,
                            accountStatus: 'approved' as const
                          };
                          try {
                            await saveSupabaseUserProfile(updatedProfile);
                          } catch (sbErr) {
                            console.error('[Supabase] Failed to elevate role in Supabase:', sbErr);
                            throw sbErr;
                          }
                          showNotification('SYSTEM: Database authority elevated to Super Admin.');
                        } catch (e) {
                          console.error('Failed to elevate role:', e);
                        }
                      }
                    }}
                    currentUser={currentUser}
                    effectiveRole={effectiveRole as any}
                  />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      
      {/* Group Settings Modal */}
      {showGroupSettings && activeChatTargetId && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl animate-fadeIn">
            <div className="absolute top-4 right-4 flex gap-2">
               {(() => {
                 const room = chatRooms.find(r => r.id === activeChatTargetId);
                 if (room && room.creatorId === currentUser?.uid) {
                    return (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
                            // Call delete group logically (placeholder for DB delete)
                            setChatRooms(prev => prev.filter(r => r.id !== activeChatTargetId));
                            setActiveChatTargetId('group-all');
                            setShowGroupSettings(false);
                            showNotification('Group deleted successfully.');
                          }
                        }}
                        className="text-[10px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/20 font-bold uppercase transition-all"
                      >
                        Delete Group
                      </button>
                    );
                 }
                 return null;
               })()}
              <button
                onClick={() => setShowGroupSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            
            <h2 className="text-xl font-black text-white mb-6">Group Settings</h2>
            
            {(() => {
              const room = chatRooms.find(r => r.id === activeChatTargetId);
              if (!room) return null;
              
              return (
                <div className="space-y-4">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Group Name</label>
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         defaultValue={room.name} 
                         id="edit-group-name"
                         className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white" 
                       />
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</label>
                     <textarea 
                       defaultValue={room.description} 
                       id="edit-group-desc"
                       rows={2}
                       className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none" 
                     />
                   </div>
                   
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Icon</label>
                     <input 
                       type="text" 
                       defaultValue={room.icon} 
                       id="edit-group-icon"
                       className="w-20 text-center bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-base text-white" 
                     />
                   </div>
                   
                   <div className="pt-2">
                     <button
                       onClick={() => {
                         const newName = (document.getElementById('edit-group-name') as HTMLInputElement).value;
                         const newDesc = (document.getElementById('edit-group-desc') as HTMLTextAreaElement).value;
                         const newIcon = (document.getElementById('edit-group-icon') as HTMLInputElement).value;
                         
                         const updatedRoom = { ...room, name: newName, description: newDesc, icon: newIcon };
                         setChatRooms(prev => prev.map(r => r.id === room.id ? updatedRoom : r));
                         // Assume saving to DB logic is implemented by syncing state here
                         setShowGroupSettings(false);
                         showNotification('Group settings updated!');
                       }}
                       className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all"
                     >
                       Save Changes
                     </button>
                   </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* DEV & SUPER ADMIN Role Switcher */}
      {false && (
        <div className="fixed bottom-4 right-4 z-[100] bg-slate-900 border border-indigo-500/50 shadow-[0_0_40px_rgba(79,70,229,0.3)] p-4 rounded-2xl flex flex-col gap-2 max-w-xs animate-fadeIn">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">
              {isSuperAdmin ? '⚡ Super Admin Mode' : '🛠️ Dev Role Switcher'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mb-2 leading-tight">
            Original auth role: <strong className="text-white">{currentUser.role}</strong><br/>
            Simulated role: <strong className="text-emerald-400">{effectiveRole}</strong>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(['student', 'teacher', 'coordinator', 'admin'] as UserRole[]).map(role => (
              <button
                key={role}
                onClick={() => setSimulatedRole(role)}
                className={`text-[10px] uppercase font-bold py-1.5 px-2 rounded border transition-all ${effectiveRole === role ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
              >
                {role}
              </button>
            ))}
          </div>
          <button 
            onClick={() => {
              setSimulatedRole(null);
              if (isSuperAdmin) setIsSuperAdmin(false);
            }}
            className="mt-1 text-[10px] uppercase font-bold py-1.5 px-2 rounded bg-slate-950 text-slate-400 hover:text-white border border-white/5 transition-all w-full"
          >
            {isSuperAdmin ? 'Exit Super Admin Mode' : 'Reset to Auth Role'}
          </button>
        </div>
      )}

      {/* Privileged PIN Verification Modal Gate */}
      {isPinModalOpen && securityVerificationAcc && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] overflow-y-auto flex items-center justify-center p-4">
          <div className="smart-glass max-w-md w-full p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 animate-fadeIn text-center">
            <div className="space-y-2">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 items-center justify-center text-2xl">🔒</div>
              <h2 className="text-xl font-black font-display text-white">Privileged Gate Verification</h2>
              <p className="text-xs text-slate-400">
                A security challenge is active for administrative roles. Enter the 4-digit security PIN for <strong className="text-white">{securityVerificationAcc.name}</strong> to proceed.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <input
                  type="password"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={enteredVerificationPin}
                  onChange={(e) => {
                    setEnteredVerificationPin(e.target.value.replace(/\D/g, ''));
                    setPinVerificationError('');
                  }}
                  placeholder="••••"
                  className="w-full text-center text-2xl tracking-widest font-mono py-3.5 rounded-2xl bg-slate-900 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                  autoFocus
                />
                {pinVerificationError && (
                  <p className="text-xs font-semibold text-red-400 animate-pulse mt-1.5">{pinVerificationError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyPinAndLogin}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all shadow-lg"
                >
                  Verify PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
