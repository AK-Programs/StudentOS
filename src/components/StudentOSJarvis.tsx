import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Send, Volume2, Sparkles, Sliders, Users, 
  BarChart3, Award, Settings, Terminal, Play, RotateCcw, 
  Layers, Plus, Trash2, CheckCircle, RefreshCw, X, Square, BookOpen, FileText, HelpCircle, Layout
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  // TODO: Add Supabase imports
} from '../lib/supabaseChat';
import { StudentReport, HouseAnalytics, SectionAnalytics, TeacherCommand, JarvisHistoryItem } from '../types';

interface StudentOSJarvisProps {
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clearWhiteboard?: () => void;
  drawShapeOnWhiteboard?: (shape: string, text?: string) => void;
  saveWhiteboard?: () => void;
  setSearchMaterialsQuery?: (query: string) => void;
  setTriggerQuickQuiz?: (start: boolean) => void;
  showNotification: (msg: string) => void;
  onSuperAdminUnlocked?: () => void;
  currentUser: any;
  effectiveRole: string;
}

export const StudentOSJarvis: React.FC<StudentOSJarvisProps> = ({
  onClose,
  activeTab,
  setActiveTab,
  clearWhiteboard,
  drawShapeOnWhiteboard,
  saveWhiteboard,
  setSearchMaterialsQuery,
  setTriggerQuickQuiz,
  showNotification,
  onSuperAdminUnlocked,
  currentUser,
  effectiveRole
}) => {
  // Navigation & Analytics Selection inside Jarvis
  const [activeJarvisSection, setActiveJarvisSection] = useState<'home' | 'reports' | 'houses' | 'sections' | 'history'>('home');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Voice & Input State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [commandText, setCommandText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [jarvisFeedback, setJarvisFeedback] = useState<string>('Greetings, Professor. StudentOS Orion is ready. Speak or type a command to control the smart classroom.');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticError, setDiagnosticError] = useState<{name: string, message: string} | null>(null);

  
  // Data list states fetched from Firestore
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [houses, setHouses] = useState<HouseAnalytics[]>([]);
  const [sections, setSections] = useState<SectionAnalytics[]>([]);
  const [historyItems, setHistoryItems] = useState<JarvisHistoryItem[]>([]);
  const [commandAudit, setCommandAudit] = useState<TeacherCommand[]>([]);

  // Detailed modal or focus state
  const [selectedStudent, setSelectedStudent] = useState<StudentReport | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchStudentTerm, setSearchStudentTerm] = useState<string>('');

  // Speech Recognition Object Ref
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (window as any).msSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false; // we'll handle continuous via onend restart for mobile/smart-board reliability
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        shouldListenRef.current = true;
        setJarvisFeedback('🎤 Listening');
      };

      rec.onresult = async (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setCommandText(speechToText);
        showNotification(`🎙️ Heard: "${speechToText}"`);
        // Pause listening to process the command
        shouldListenRef.current = false;
        rec.stop();
        await executeVoiceCommand(speechToText);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        shouldListenRef.current = false;
        setIsListening(false);
        if (err.error === 'no-speech') {
          setJarvisFeedback('No speech was detected. Please try speaking again.');
        } else if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setJarvisFeedback('❌ Permission Denied: Microphone access was blocked by your browser.');
        } else {
          setJarvisFeedback(`❌ Speech systems issue: ${err.error}. Still ready for text input!`);
        }
      };

      rec.onend = () => {
        if (shouldListenRef.current) {
          try {
            rec.start();
          } catch(e) {
            console.error("Auto-restart failed:", e);
            setIsListening(false);
            shouldListenRef.current = false;
          }
        } else {
          setIsListening(false);
          setJarvisFeedback('⏸ Stopped');
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  // TODO: Migrate to Supabase
  useEffect(() => {
    // Placeholder to fix compilation
    setReports([]);
    setHouses([]);
    setSections([]);
    setHistoryItems([]);
    setCommandAudit([]);
  }, [currentUser]);



  const toggleListening = async () => {
    setJarvisFeedback('🎙️ Voice Commands are Coming Soon / Under Development. Please use text input.');
    return;
  };

  // Speaks feedback aloud using browser speech synth if available
  const speakFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Perform AI parsing fallback with Gemini/OpenRouter using our robust Express server
  const queryJarvisAIStream = async (command: string): Promise<{ responseText: string; action: string; targetValue?: string }> => {
    try {
      let aiText = '';
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `You are StudentOS Jarvis, the advanced AI Teacher Copilot for smart classroom boards.
            The user is a classroom instructor. They just spoke or typed this command: "${command}".
            
            Analyze this command. You must respond as a smart home helper / educational copilot in EXACTLY 1 response block. 
            Your return message must start with a JSON bracket representing:
            {
              "responseText": "Speakable reply to teacher. Clean, audio-friendly, professional.",
              "action": "one of: [navigate_tab, clear_whiteboard, save_whiteboard, search_materials, show_student_report, show_house_rankings, show_section_rankings, explain_concept, generate_quiz, write_on_whiteboard, draw_on_whiteboard]",
              "targetValue": "Any extracted argument like subject, name, tab, exact text to write on whiteboard, or shape name to draw (circle, rect, triangle, arrow, star)"
            }
            Give helpful context but keep the JSON format extremely perfect at the top or as the absolute response. Do not add raw markdown outside the JSON.`,
            persona: 'study_buddy',
            level: 'Secondary',
            mode: 'explanatory'
          })
        });

        if (!response.ok) throw new Error('API request failed');
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          throw new Error('API not available (static deployment)');
        }
        
        if (!response.ok) {
           throw new Error('API not available (static deployment)');
        }
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        aiText = data.text;
      } catch (apiErr: any) {
        console.log("Server API failed, falling back to client-side AI for Jarvis:", apiErr);
        const { clientSideGemini } = await import('../lib/clientAiFallback');
        const prompt = `You are StudentOS Jarvis, the advanced AI Teacher Copilot for smart classroom boards.
            The user is a classroom instructor. They just spoke or typed this command: "${command}".
            
            Analyze this command. You must respond as a smart home helper / educational copilot in EXACTLY 1 response block. 
            Your return message must start with a JSON bracket representing:
            {
              "responseText": "Speakable reply to teacher. Clean, audio-friendly, professional.",
              "action": "one of: [navigate_tab, clear_whiteboard, save_whiteboard, search_materials, show_student_report, show_house_rankings, show_section_rankings, explain_concept, generate_quiz, write_on_whiteboard, draw_on_whiteboard]",
              "targetValue": "Any extracted argument like subject, name, tab, exact text to write on whiteboard, or shape name to draw (circle, rect, triangle, arrow, star)"
            }
            Give helpful context but keep the JSON format extremely perfect at the top or as the absolute response. Do not add raw markdown outside the JSON.`;
        aiText = await clientSideGemini(prompt);
      }
      
      // Parse JSON from returned text
      try {
        const jsonMatch = aiText.match(/\{[\s\S]*?\}/);
        if (jsonMatch && jsonMatch[0] !== 'undefined') {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Fallback regex JSON parsing failed:', e);
      }

      // If parsing fails, build static structured outcome based on AI raw string
      return {
        responseText: aiText.length > 150 ? aiText.substring(0, 150) + "..." : aiText,
        action: 'unknown'
      };
    } catch (err: any) {
      console.error('Jarvis remote parsing failed:', err);
      return {
        responseText: `I am executing voice protocol locally. Analyzing control criteria for "${command}".`,
        action: 'unknown'
      };
    }
  };

  // Command Parser & Executor
  const executeVoiceCommand = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setIsProcessing(true);
    const textLow = textToParse.toLowerCase();
    
    // Super Admin trigger
    if (textLow.includes('naitik kashyap') || textLow.includes('super admin protocol')) {
      if (effectiveRole === 'super_admin') {
        setJarvisFeedback('Super Admin credentials verified via Firestore role. Control Center activated.');
        speakFeedback('Super Admin credentials verified.');
        if (onSuperAdminUnlocked) onSuperAdminUnlocked();
        showNotification('SYSTEM: Super Admin Mode Activated.');
      } else {
        setJarvisFeedback('Access Denied: You lack the required Super Admin Firestore role.');
        speakFeedback('Access Denied.');
        showNotification('SYSTEM: Auth Failed.');
      }
      setIsProcessing(false);
      return;
    }

    let resolvedFeedback = '';
    let actionTriggered = 'unknown';
    let targetParam = '';

    // Direct routing definitions
    if (textLow.includes('assignment')) {
      setActiveTab('assignments');
      resolvedFeedback = 'Opening the Assignment Center.';
      actionTriggered = 'navigate_tab';
      targetParam = 'assignments';
    }
    else if (textLow.includes('attendance')) {
      setActiveTab('attendance_manager');
      resolvedFeedback = 'Opening Attendance Manager.';
      actionTriggered = 'navigate_tab';
      targetParam = 'attendance_manager';
    }
    else if (textLow.includes('faculty') || textLow.includes('teacher dashboard')) {
      setActiveTab('faculty');
      resolvedFeedback = 'Opening the Faculty Center.';
      actionTriggered = 'navigate_tab';
      targetParam = 'faculty';
    }
    else if (textLow.includes('timetable') || textLow.includes('schedule')) {
      setActiveTab('timetable_viewer');
      resolvedFeedback = 'Opening Timetables.';
      actionTriggered = 'navigate_tab';
      targetParam = 'timetable_viewer';
    }
    else if (textLow.includes('worksheet')) {
      setActiveTab('worksheet_viewer');
      resolvedFeedback = 'Opening Worksheets.';
      actionTriggered = 'navigate_tab';
      targetParam = 'worksheet_viewer';
    }
    else if (textLow.includes('notice') || textLow.includes('announcement')) {
      setActiveTab('notice_viewer');
      resolvedFeedback = 'Opening Class Notices.';
      actionTriggered = 'navigate_tab';
      targetParam = 'notice_viewer';
    }
    // A. Local Rule-Based Fast Parser
    else if (textLow.includes('whiteboard') || textLow.includes('canvas')) {
      if (textLow.includes('clear') || textLow.includes('clean') || textLow.includes('wipe')) {
        resolvedFeedback = 'Clearing the Smart Board whiteboard immediately, Professor.';
        actionTriggered = 'clear_whiteboard';
        if (clearWhiteboard) clearWhiteboard();
      } else if (textLow.includes('save') || textLow.includes('download')) {
        resolvedFeedback = 'Compiling and saving your whiteboard illustration. Exporting PNG locally.';
        actionTriggered = 'save_whiteboard';
        if (saveWhiteboard) saveWhiteboard();
      } else {
        resolvedFeedback = 'Opening the Interactive Whiteboard dashboard.';
        actionTriggered = 'navigate_tab';
        targetParam = 'whiteboard';
        setActiveTab('whiteboard');
      }
    } 
    else if (textLow.includes('material') || textLow.includes('physics') || textLow.includes('physics') || textLow.includes('math') || textLow.includes('pdf')) {
      setActiveTab('materials');
      actionTriggered = 'navigate_tab';
      targetParam = 'materials';
      
      let searchSub = '';
      if (textLow.includes('physics') || textLow.includes('chapter 3')) {
        searchSub = 'Physics';
      } else if (textLow.includes('mathematics') || textLow.includes('math')) {
        searchSub = 'Mathematics';
      } else if (textLow.includes('cell') || textLow.includes('biology')) {
        searchSub = 'Biology';
      } else if (textLow.includes('paper')) {
        searchSub = 'question-paper';
      }

      if (searchSub) {
        if (setSearchMaterialsQuery) setSearchMaterialsQuery(searchSub);
        resolvedFeedback = `Switching to Material Hub. Querying resources matching "${searchSub}".`;
        actionTriggered = 'search_materials';
      } else {
        resolvedFeedback = 'Redirecting teachers to the public Materials Hub folder database.';
      }
    } 
    else if (textLow.includes('quiz')) {
      setActiveTab('quiz');
      actionTriggered = 'navigate_tab';
      targetParam = 'quiz';
      if (textLow.includes('start') || textLow.includes('generate') || textLow.includes('create')) {
        if (setTriggerQuickQuiz) setTriggerQuickQuiz(true);
        resolvedFeedback = 'Initiating classroom quiz generator engine. Compiling questions now.';
        actionTriggered = 'generate_quiz';
      } else {
        resolvedFeedback = 'Opening Interactive Quiz desk. Current leaderboard is live.';
      }
    }
    else if (textLow.includes('planner') || textLow.includes('lesson') || textLow.includes('schedule')) {
      setActiveTab('planner');
      resolvedFeedback = 'Displaying teacher lesson plans and academic target planner.';
      actionTriggered = 'navigate_tab';
      targetParam = 'planner';
    }
    else if (textLow.includes('notes') && (textLow.includes('open') || textLow.includes('show'))) {
      setActiveTab('notes');
      resolvedFeedback = 'Opening your Personal Notes vault.';
      actionTriggered = 'navigate_tab';
      targetParam = 'notes';
    }
    else if (textLow.includes('dashboard') || textLow.includes('home')) {
      setActiveTab('dashboard');
      resolvedFeedback = 'Returning to the main dashboard.';
      actionTriggered = 'navigate_tab';
      targetParam = 'dashboard';
    }
    else if (textLow.includes('focus') || textLow.includes('timer') || textLow.includes('pomodoro')) {
      setActiveTab('pomodoro');
      resolvedFeedback = 'Opening the Deep Focus Timer engine.';
      actionTriggered = 'navigate_tab';
      targetParam = 'pomodoro';
    }
    else if (textLow.includes('teach') || textLow.includes('explain') || textLow.includes('newton')) {
      setActiveTab('ai_teacher');
      resolvedFeedback = `Directing details to Professor Elara on the AI Teacher panel: "${textToParse}".`;
      actionTriggered = 'explain_concept';
      targetParam = 'ai_teacher';
    }
    else if (textLow.includes('house') || textLow.includes('rank') || textLow.includes('leaderboard') || textLow.includes('ruby') || textLow.includes('emerald')) {
      setActiveJarvisSection('houses');
      resolvedFeedback = 'Gathering live analytics. Presenting School House Leaderboard standings.';
      actionTriggered = 'show_house_rankings';
    }
    else if (textLow.includes('section') || textLow.includes('astra') || textLow.includes('elera') || textLow.includes('solara') || textLow.includes('vega')) {
      setActiveJarvisSection('sections');
      resolvedFeedback = 'Filtering classroom metrics by school sections: Astra, Elera, Solara, Vega.';
      actionTriggered = 'show_section_rankings';
    }
    else if (textLow.includes('student') || textLow.includes('report') || textLow.includes('aditya') || textLow.includes('chloe')) {
      setActiveJarvisSection('reports');
      actionTriggered = 'show_student_report';
      
      let matchedStudent = null;
      if (textLow.includes('aditya')) {
        matchedStudent = reports.find(r => r.name.toLowerCase().includes('aditya'));
      } else if (textLow.includes('chloe')) {
        matchedStudent = reports.find(r => r.name.toLowerCase().includes('chloe'));
      }

      if (matchedStudent) {
        setSelectedStudent(matchedStudent);
        resolvedFeedback = `Accessing secure ledger. Displaying full report card for ${matchedStudent.name}.`;
      } else {
        resolvedFeedback = 'Opening Student Classroom Report dashboard.';
      }
    }
    else if (textLow.includes('draw') && textLow.includes('circle')) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('circle');
      resolvedFeedback = 'Drawing a circle on the interactive whiteboard.';
      actionTriggered = 'draw_circle';
    }
    else if (textLow.includes('draw') && (textLow.includes('rectangle') || textLow.includes('rect') || textLow.includes('square'))) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('rect');
      resolvedFeedback = 'Drawing a rectangle on the interactive whiteboard.';
      actionTriggered = 'draw_rect';
    }
    else if (textLow.includes('draw') && textLow.includes('triangle')) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('triangle');
      resolvedFeedback = 'Drawing a triangle on the interactive whiteboard.';
      actionTriggered = 'draw_triangle';
    }
    else if (textLow.includes('draw') && textLow.includes('arrow')) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('arrow');
      resolvedFeedback = 'Drawing an arrow on the interactive whiteboard.';
      actionTriggered = 'draw_arrow';
    }
    else if (textLow.includes('draw') && textLow.includes('star')) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('star');
      resolvedFeedback = 'Drawing a star on the interactive whiteboard.';
      actionTriggered = 'draw_star';
    }
    else if (textLow.includes('write') && textLow.includes('newton')) {
      setActiveTab('whiteboard');
      if (drawShapeOnWhiteboard) drawShapeOnWhiteboard('text', "Newton's Laws:\n1. Inertia\n2. F=ma\n3. Action/Reaction");
      resolvedFeedback = 'Writing Newton\'s Laws on the whiteboard.';
      actionTriggered = 'draw_text';
    }
    else if (textLow.includes('slide') && (textLow.includes('new') || textLow.includes('create') || textLow.includes('add'))) {
      setActiveTab('whiteboard');
      if (typeof (window as any).whiteboardCreateSlide === 'function') (window as any).whiteboardCreateSlide();
      resolvedFeedback = 'Creating a new slide on the interactive whiteboard.';
      actionTriggered = 'slide_new';
    }
    else if (textLow.includes('slide') && (textLow.includes('next') || textLow.includes('forward'))) {
      setActiveTab('whiteboard');
      if (typeof (window as any).whiteboardNextSlide === 'function') (window as any).whiteboardNextSlide();
      resolvedFeedback = 'Switching to the next slide.';
      actionTriggered = 'slide_next';
    }
    else if (textLow.includes('slide') && (textLow.includes('previous') || textLow.includes('back'))) {
      setActiveTab('whiteboard');
      if (typeof (window as any).whiteboardPrevSlide === 'function') (window as any).whiteboardPrevSlide();
      resolvedFeedback = 'Switching to the previous slide.';
      actionTriggered = 'slide_prev';
    }
    else if (textLow.includes('announcement') || textLow.includes('event')) {
      setActiveTab('faculty');
      resolvedFeedback = 'Reviewing school announcements, active events, and suggestions ledger.';
      actionTriggered = 'navigate_tab';
    }

    else if (textLow.includes('close') || textLow.includes('exit') || textLow.includes('dismiss') || textLow.includes('hide')) {
      resolvedFeedback = 'Closing Orion overlay.';
      actionTriggered = 'close_orion';
    }

    const allowedTabs = ['materials', 'whiteboard', 'ai_teacher', 'quiz', 'planner', 'feedback', 'homework', 'chats', 'assignments', 'timetable_viewer', 'worksheet_viewer', 'notice_viewer', 'attendance_manager', 'dashboard'];
    // B. Call backend AI Fallback if no specific trigger matched
    if (!resolvedFeedback) {
      const aiVerdict = await queryJarvisAIStream(textToParse);
      resolvedFeedback = aiVerdict.responseText;
      actionTriggered = aiVerdict.action;
      
      // Handle the parsed actions from AI dynamically!
      if (actionTriggered === 'navigate_tab' && aiVerdict.targetValue) {
        if (allowedTabs.includes(aiVerdict.targetValue)) {
          setActiveTab(aiVerdict.targetValue);
        } else if (aiVerdict.targetValue.includes('assignment')) {
          setActiveTab('assignments');
        } else if (aiVerdict.targetValue.includes('attendance')) {
          setActiveTab('attendance_manager');
        }
      } else if (actionTriggered === 'clear_whiteboard' && clearWhiteboard) {
          clearWhiteboard();
        } else if (actionTriggered === 'save_whiteboard' && saveWhiteboard) {
          saveWhiteboard();
        } else if (actionTriggered === 'search_materials' && aiVerdict.targetValue) {
          setActiveTab('materials');
          if (setSearchMaterialsQuery) setSearchMaterialsQuery(aiVerdict.targetValue);
        } else if (actionTriggered === 'show_student_report') {
          setActiveJarvisSection('reports');
          if (aiVerdict.targetValue) {
            const matched = reports.find(r => r.name.toLowerCase().includes(aiVerdict.targetValue!.toLowerCase()));
            if (matched) setSelectedStudent(matched);
          }
        } else if (actionTriggered === 'show_house_rankings') {
          setActiveJarvisSection('houses');
        } else if (actionTriggered === 'show_section_rankings') {
          setActiveJarvisSection('sections');
        } else if (actionTriggered === 'generate_quiz' && setTriggerQuickQuiz) {
          setActiveTab('quiz');
          setTriggerQuickQuiz(true);
        } else if (actionTriggered === 'explain_concept') {
          setActiveTab('ai_teacher');
        } else if ((actionTriggered === 'write_on_whiteboard' || actionTriggered === 'draw_on_whiteboard') && aiVerdict.targetValue) {
          setActiveTab('whiteboard');
          if (drawShapeOnWhiteboard) {
            if (actionTriggered === 'write_on_whiteboard') {
              drawShapeOnWhiteboard('text', aiVerdict.targetValue);
            } else {
              drawShapeOnWhiteboard(aiVerdict.targetValue.toLowerCase());
            }
          }
        }
    }

    setJarvisFeedback(resolvedFeedback);
    speakFeedback(resolvedFeedback);

    // Save history to Supabase
    try {
      if (currentUser?.uid) {
        const histId = `jarvis-${Date.now()}`;
        await supabase.from('orion_chats').insert([{
          id: histId,
          user_id: currentUser.uid,
          user_email: currentUser.email,
          role: currentUser.role,
          prompt: textToParse,
          response: resolvedFeedback,
          created_at: new Date().toISOString(),
          action_executed: actionTriggered
        }]);

        const auditId = `audit-${Date.now()}`;
        await supabase.from('teacher_commands').insert([{
          id: auditId,
          user_id: currentUser.uid,
          command_text: textToParse,
          recognized_at: new Date().toISOString(),
          parsed_action: actionTriggered,
          status: actionTriggered !== 'unknown' ? 'success' : 'error'
        }]);
      }
    } catch (e) {
      console.error('Failed to log Jarvis event audit:', e);
    }

    setIsProcessing(false);

    // Close panel seamlessly on UI navigation triggers so the users immediately see the new screen
    const navActions = ['navigate_tab', 'search_materials', 'explain_concept', 'generate_quiz', 'close_orion'];
    if (navActions.includes(actionTriggered) && onClose) {
      setTimeout(() => {
        onClose();
      }, 1500); // 1.5s delay allows reading/speech initiation before transitioning nicely 
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeVoiceCommand(commandText);
  };

  // Quick Action triggers for smart board touch use
  const handleQuickTouchAction = (cmd: string) => {
    setCommandText(cmd);
    executeVoiceCommand(cmd);
  };

  // Filter student lists
  const filteredReports = reports.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchStudentTerm.toLowerCase()) || 
                          r.classGrade.toLowerCase().includes(searchStudentTerm.toLowerCase());
    const matchesHouse = statusFilter ? r.house === statusFilter || r.section === statusFilter : true;
    return matchesSearch && matchesHouse;
  });

  return (
    <div className={`smart-glass flex flex-col justify-between overflow-hidden relative transition-all duration-300 border border-indigo-500/20 shadow-2xl rounded-3xl ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-950/95 p-6 h-[calc(100vh-2rem)]' : 'h-[620px] bg-slate-900/90 p-5'
    }`}>
      
      {/* 1. TOP HUD / HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 gap-4 flex-wrap relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Close Orion"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 pr-10">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center animate-pulse">
              <span className="text-xl">🎙️</span>
            </div>
            {isListening && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 animate-ping border border-slate-950" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black font-display text-white tracking-widest uppercase">StudentOS Orion</h2>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold">Teacher Copilot v2.8</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Vocally driving smart-board operations & school intelligence feeds</p>
          </div>
        </div>

        {/* Sections Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button 
            onClick={() => setActiveJarvisSection('home')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              activeJarvisSection === 'home' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            <Layout className="w-3 h-3" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveJarvisSection('reports')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              activeJarvisSection === 'reports' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" /> Student Reports
          </button>
          <button 
            onClick={() => setActiveJarvisSection('houses')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              activeJarvisSection === 'houses' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            <Award className="w-3 h-3" /> Houses
          </button>
          <button 
            onClick={() => setActiveJarvisSection('sections')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              activeJarvisSection === 'sections' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3 h-3" /> Sections
          </button>
          <button 
            onClick={() => setActiveJarvisSection('history')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              activeJarvisSection === 'history' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" /> Voice Log
          </button>
          
          <button 
            onClick={() => setShowDiagnostics(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
              showDiagnostics ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950/60 text-slate-400 border-white/5 hover:text-white hover:border-emerald-500/30'
            }`}
          >
            <Mic className="w-3 h-3" /> Diagnostics
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Sizing & Close tools */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle fullscreen smart-board layout"
            className="p-1 px-2 rounded-lg bg-slate-950/45 text-slate-400 hover:text-white border border-white/5 text-[10px] uppercase font-bold"
          >
            {isFullscreen ? 'Exit Full' : 'Fullscreen'}
          </button>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BODY GRAPHICS PANELS */}
      <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0 space-y-4">
        
        {/* A. GENERAL DOCK (ACTIVE LISTEN / INSTRUCTIONS) */}
        <div className="smart-glass p-4 rounded-2xl bg-slate-950/45 border border-indigo-500/10 flex items-start gap-3 relative overflow-hidden backdrop-blur-md">
          {/* Neon background light flare */}
          <div className="absolute right-0 top-0 h-20 w-20 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="h-8 w-8 rounded-full bg-indigo-500/25 border border-indigo-400/35 flex items-center justify-center text-indigo-300 mt-0.5 flex-shrink-0 animate-pulse">
            <Volume2 className="w-4 h-4" />
          </div>
          <div className="space-y-1.5 flex-1 select-text">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Orion Guidance System</span>
            <p className="text-xs text-slate-350 leading-relaxed font-sans">{jarvisFeedback}</p>
            {isListening && (
              <div className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 py-1 px-2.5 rounded-lg text-[10px] font-bold w-fit animate-pulse font-mono">
                <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                Jarvis Listening... Please speak your smart-board command clearly
              </div>
            )}
          </div>
        </div>

        {/* DIAGNOSTICS PANEL (New feature) */}
        {showDiagnostics && (
          <div className="smart-glass p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col gap-2 overflow-x-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest font-mono">Microphone Diagnostics</span>
              <button onClick={() => setShowDiagnostics(false)} className="text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-500/20 text-[10px]">Close</button>
            </div>
            <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
              <p><strong>Browser:</strong> {navigator.userAgent}</p>
              <p><strong>navigator.mediaDevices:</strong> {String(!!navigator.mediaDevices)}</p>
              <p><strong>getUserMedia:</strong> {String(!!navigator.mediaDevices?.getUserMedia)}</p>
              <p><strong>SpeechRecognition:</strong> {String(!!(window as any).SpeechRecognition)}</p>
              <p><strong>webkitSpeechRecognition:</strong> {String(!!(window as any).webkitSpeechRecognition)}</p>
              
              {diagnosticError && (
                <div className="mt-2 p-2 bg-red-950/50 border border-red-500/30 rounded text-red-200">
                  <p className="font-bold text-red-400 mb-1">Error Captured:</p>
                  <p><strong>Name:</strong> {diagnosticError.name}</p>
                  <p><strong>Message:</strong> {diagnosticError.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* B. SECTION: HOME SMART BOARD TOUCH PANEL */}
        {activeJarvisSection === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Quick Touch Commander Column (Col: 7) */}
            <div className="md:col-span-7 space-y-3">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">🗣️ Classroom Command Deck (One-Touch Execution)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {/* Whiteboard commands */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">🖌️ Whiteboard Touch Ops</span>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => handleQuickTouchAction('Start whiteboard')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Start whiteboard</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-indigo-500/20 font-bold">Go</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Clear board')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Clear board</span>
                      <span className="text-[8px] bg-red-500/10 text-red-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-red-500/25 font-bold">Wipe</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Save whiteboard')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Save whiteboard</span>
                      <span className="text-[8px] bg-emerald-500/10 text-emerald-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-emerald-500/25 font-bold">Export</span>
                    </button>
                  </div>
                </div>

                {/* AI teacher commands */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">🎓 AI Subject Facilitation</span>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => handleQuickTouchAction('Explain Newton\'s Laws')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Explain Newton's Laws</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-indigo-500/20 font-bold">AI</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Create a lesson plan')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Create lesson plan</span>
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 py-0.5 px-1.5 rounded uppercase group-hover:bg-amber-500/25 font-bold">Plan</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Generate MCQs')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Generate MCQs</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-indigo-500/20 font-bold">Test</span>
                    </button>
                  </div>
                </div>

                {/* Material Hub & Navigation commands */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">📁 Material Hub Directory</span>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => handleQuickTouchAction('Open Material Hub')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Open Material Hub</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-indigo-500/20 font-bold">Open</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Open Physics materials')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Open Physics materials</span>
                      <span className="text-[8px] bg-teal-500/10 text-teal-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-teal-500/25 font-bold">Search</span>
                    </button>
                  </div>
                </div>

                {/* Ledger & School reports */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">📈 Ledger & Statistics</span>
                  <div className="flex flex-col gap-1.5">
                    <button 
                      onClick={() => handleQuickTouchAction('Show student reports')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Show student reports</span>
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 py-0.5 px-1.5 rounded uppercase group-hover:bg-amber-500/25 font-bold">View</span>
                    </button>
                    <button 
                      onClick={() => handleQuickTouchAction('Show Aditya\'s report')}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[10px] text-slate-300 text-left rounded-lg font-mono flex items-center justify-between group transition-all"
                    >
                      <span>Show Aditya's report</span>
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 py-0.5 px-1.5 rounded uppercase group-hover:bg-indigo-500/20 font-bold">Card</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Live Standings Summary Panel (Col: 5) */}
            <div className="md:col-span-5 space-y-3">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">🏆 Inter-House Championship Summary</span>
              
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
                {houses.length > 0 ? (
                  <div className="space-y-2">
                    {houses.map((house, idx) => (
                      <div 
                        key={house.id} 
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 hover:bg-slate-900 transition-colors border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">{idx+1}.</span>
                          <span className={`text-xs font-black font-display uppercase ${
                            house.id === 'Ruby' ? 'text-red-400' : 
                            house.id === 'Emerald' ? 'text-emerald-400' :
                            house.id === 'Sapphire' ? 'text-indigo-400' : 'text-amber-450'
                          }`}>{house.id}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-slate-400"><BookOpen className="w-2.5 h-2.5 inline mr-1" /> {house.materialsShared} Docs</span>
                          <span className="text-xs font-bold text-white font-mono bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/25">{house.points} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs font-mono">Standings sync pending...</div>
                )}

                <div className="pt-2 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => setActiveJarvisSection('houses')}
                    className="w-full text-center py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] uppercase font-black rounded-lg tracking-wider transition-colors border border-indigo-500/20"
                  >
                    Launch Full Standing Analytics
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">📡 Recent Orion Commands</span>
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {commandAudit.length > 0 ? (
                    commandAudit.slice(0, 8).map((cmd) => (
                      <div key={cmd.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-white/5 transition-colors">
                        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cmd.status === 'success' ? 'bg-emerald-500 shadow-[0_0_5px_theme(colors.emerald.500)]' : 'bg-red-500 shadow-[0_0_5px_theme(colors.red.500)]'}`} />
                        <span className="text-[10px] text-slate-300 font-mono flex-1 truncate">{cmd.commandText}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-slate-500 text-center py-4 italic bg-slate-900/40 rounded-xl">Tracking logs empty. Awaiting voice commands...</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* C. STUDENT REPORT DASHBOARD */}
        {activeJarvisSection === 'reports' && (
          <div className="space-y-4">
            
            {/* Header controls for reports */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/45 p-3 rounded-2xl border border-white/5">
              <div className="space-y-0.5">
                <span className="text-[9px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">Database Registry Node</span>
                <h3 className="text-xs font-black text-white font-display uppercase">Student Classroom Report Cards</h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Identify student..." 
                  value={searchStudentTerm}
                  onChange={e => setSearchStudentTerm(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none focus:border-indigo-500/50 w-full sm:w-44"
                />

                <select 
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 text-xs px-3 py-1.5 rounded-xl text-white outline-none focus:border-indigo-500/50"
                >
                  <option value="">All Filters</option>
                  <option value="Astra">Astra Section</option>
                  <option value="Elera">Elera Section</option>
                  <option value="Solara">Solara Section</option>
                  <option value="Vega">Vega Section</option>
                  <option value="Ruby">Ruby House</option>
                  <option value="Emerald">Emerald House</option>
                  <option value="Sapphire">Sapphire House</option>
                  <option value="Topaz">Topaz House</option>
                </select>
              </div>
            </div>

            {/* Main table list */}
            {selectedStudent ? (
              // Individual Student Report Focus Card
              <div className="smart-glass p-5 rounded-2xl bg-slate-950/60 border border-indigo-500/30 space-y-4 animate-scaleUp">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-slate-900 border-2 border-indigo-500/30 flex items-center justify-center text-xl">
                      🧑‍🎓
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white font-display uppercase tracking-wider">{selectedStudent.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {selectedStudent.classGrade} • {selectedStudent.section} Section • 
                        <span className={`font-black uppercase ml-1 ${
                          selectedStudent.house === 'Ruby' ? 'text-red-400' : 
                          selectedStudent.house === 'Emerald' ? 'text-emerald-400' :
                          selectedStudent.house === 'Sapphire' ? 'text-indigo-400' : 'text-amber-450'
                        }`}>{selectedStudent.house} House</span>
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedStudent(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-[9px] uppercase font-black text-indigo-400 hover:text-indigo-300"
                  >
                    ← Back to Registry
                  </button>
                </div>

                {/* Score indicators grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Streak Tally</span>
                    <span className="text-lg font-black text-amber-500 font-mono">🔥 {selectedStudent.streakDays} Days</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Docs Uploaded</span>
                    <span className="text-lg font-black text-indigo-400 font-mono">📁 {selectedStudent.materialsUploaded}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Notes Saved</span>
                    <span className="text-lg font-black text-teal-400 font-mono">📝 {selectedStudent.notesCreated}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Quizzes Done</span>
                    <span className="text-lg font-black text-pink-400 font-mono">🎮 {selectedStudent.quizzesCompleted}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Homework Done</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">✅ {selectedStudent.assignmentsCompleted}</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Contributions</span>
                    <span className="text-lg font-black text-amber-450 font-mono">🏆 {selectedStudent.communityContributions}</span>
                  </div>
                </div>

                {/* Recent activity list */}
                <div className="space-y-2">
                  <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">🕒 Recent Academic Activity</span>
                  <div className="space-y-1">
                    {selectedStudent.recentActivity && selectedStudent.recentActivity.map((act, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-white/5">
                        <span className="text-indigo-400 font-mono">▶</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Student table register
              <div className="bg-slate-950/65 rounded-2xl border border-white/5 overflow-hidden">
                {filteredReports.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <div className="text-3xl">👥</div>
                    <p className="text-slate-300 font-extrabold uppercase font-display text-xs tracking-wider">No Student Analytics Found</p>
                    <p className="text-slate-500 font-mono text-[10px] max-w-md mx-auto">
                      There are currently no active student reports or academic tracking nodes linked to the system database.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-hidden">
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-white/10 text-slate-450 uppercase tracking-wider text-[10px] font-black">
                            <th className="p-3">Student name</th>
                            <th className="p-3 text-center">House</th>
                            <th className="p-3 text-center">Section</th>
                            <th className="p-3 text-center">Streak</th>
                            <th className="p-3 text-center">Contributions</th>
                            <th className="p-3 text-center">Quizzes</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredReports.map(st => (
                            <tr key={st.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-3">
                                <div className="font-extrabold text-white uppercase font-display">{st.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{st.classGrade}</div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded-full ${
                                  st.house === 'Ruby' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                  st.house === 'Emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  st.house === 'Sapphire' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                                                           'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {st.house}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono text-slate-350">{st.section}</td>
                              <td className="p-3 text-center font-mono text-amber-500 font-bold">🔥 {st.streakDays}d</td>
                              <td className="p-3 text-center font-mono text-indigo-400 font-bold">{st.communityContributions} pts</td>
                              <td className="p-3 text-center font-mono text-slate-400">{st.quizzesCompleted}</td>
                              <td className="p-3 text-right">
                                <button 
                                  onClick={() => setSelectedStudent(st)}
                                  className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase transition-transform hover:scale-105"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Stacked Cards for Reports */}
                    <div className="md:hidden divide-y divide-white/5">
                      {filteredReports.map(st => (
                        <div key={st.id} className="p-4 space-y-3 hover:bg-slate-900/40 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-extrabold text-white uppercase font-display text-sm">{st.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{st.classGrade}</div>
                            </div>
                            <span className={`text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-full ${
                              st.house === 'Ruby' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                              st.house === 'Emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              st.house === 'Sapphire' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                                                       'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {st.house}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="bg-white/5 px-2 py-1 rounded border border-white/5 font-mono text-slate-400">Sec: {st.section}</span>
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded font-bold font-mono">🔥 {st.streakDays}d</span>
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded font-bold font-mono">{st.communityContributions} pts</span>
                          </div>
                          <button 
                            onClick={() => setSelectedStudent(st)}
                            className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase transition-transform"
                          >
                            Inspect Profile Analytics
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* D. HOUSE ANALYTICS LEADERBOARD */}
        {activeJarvisSection === 'houses' && (
          <div className="space-y-4">
            <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">💎 School House Championship Leaderboard</span>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {houses.map((house, index) => (
                <div 
                  key={house.id} 
                  className="smart-glass p-4 rounded-2xl bg-slate-950/60 border border-white/5 relative flex flex-col justify-between"
                >
                  {/* Rank Badge */}
                  <span className="absolute top-3 right-3 text-2xl font-mono opacity-25">#0{index+1}</span>
                  
                  <div className="space-y-1.5">
                    <span className={`text-base font-black font-display uppercase tracking-widest ${
                      house.id === 'Ruby' ? 'text-red-400' : 
                      house.id === 'Emerald' ? 'text-emerald-400' :
                      house.id === 'Sapphire' ? 'text-indigo-400' : 'text-amber-450'
                    }`}>{house.id}</span>
                    <p className="text-2xl font-black font-mono text-white tracking-tight">{house.points} <span className="text-[10px] text-slate-400 font-bold">pts</span></p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>📁 Materials Shared:</span>
                      <span className="text-slate-300 font-bold">{house.materialsShared}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🏆 Quizzes Won:</span>
                      <span className="text-slate-300 font-bold">{house.quizzesWon}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>🙋 Class Attendance:</span>
                      <span className="text-emerald-400 font-bold">{house.participation}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* E. SECTION ANALYTICS OVERVIEW */}
        {activeJarvisSection === 'sections' && (
          <div className="space-y-4">
            <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">📊 Classroom Sections Performance Indicators</span>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {sections.map((sec) => (
                <div 
                  key={sec.id} 
                  className="smart-glass p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-black font-display text-indigo-300 uppercase">Section {sec.id}</span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-bold uppercase font-mono">Active</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Enrollment:</span>
                      <span className="text-white font-bold">{sec.totalStudents} Pupils</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Activity:</span>
                      <span className="text-amber-500 font-bold">{sec.studyActivity} Hr/Wk</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Quiz Score:</span>
                      <span className="text-emerald-400 font-bold">{sec.quizScores}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Material Contribs:</span>
                      <span className="text-indigo-400 font-bold">{sec.materialContributions} Docs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* F. VOICE LOGS & COMMAND HISTORY */}
        {activeJarvisSection === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Command audit list */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-3">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">📃 Recents Voice Recognitions</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {commandAudit.length > 0 ? (
                  commandAudit.map((aud) => (
                    <div key={aud.id} className="p-2.5 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="text-slate-300">"{aud.commandText}"</div>
                        <div className="text-[8px] text-slate-500">{new Date(aud.recognizedAt).toLocaleTimeString()}</div>
                      </div>
                      <span className={`text-[8px] uppercase tracking-wider py-0.5 px-2 rounded-full font-bold ${
                        aud.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {aud.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-xs text-center py-6 font-mono">No command audit logs matched.</div>
                )}
              </div>
            </div>

            {/* Response dialogue history */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-3">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase font-mono tracking-wider block">💬 Conversational Dialogues (Chat logs)</span>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {historyItems.length > 0 ? (
                  historyItems.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5 text-xs">
                      <div className="font-mono text-slate-450 italic">🗣️ "{item.prompt}"</div>
                      <div className="font-sans text-indigo-350 bg-slate-950/40 p-2 rounded-lg leading-relaxed text-[11px] border border-white/5">{item.response}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 text-xs text-center py-6 font-mono">No active Jarvis voice history logs found.</div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* 3. INPUT ZONE / SPEECH CONTROLLER */}
      <div className="pt-4 border-t border-white/10 flex items-center gap-3 bg-slate-900/60 backdrop-blur rounded-2xl mt-2 p-2">
        
        {/* Float design mic selector */}
        <div className="relative group flex items-center justify-center">
          <button 
            type="button"
            className="h-11 w-11 rounded-full flex items-center justify-center transition-all bg-slate-800 text-slate-500 cursor-not-allowed"
            title="Voice Commands Under Development"
          >
            <Mic className="w-5 h-5 opacity-50" />
          </button>
          <div className="hidden group-hover:block absolute -top-8 bg-slate-800 text-[10px] text-white px-2 py-1 rounded shadow pointer-events-none whitespace-nowrap z-50">Voice Commands Under Development</div>
        </div>

        {/* Text submit form bar */}
        <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
          <input 
            type="text" 
            placeholder="Query Orion... (e.g., 'Open Physics Hub', 'Start whiteboard')"
            value={commandText}
            onChange={e => setCommandText(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-all font-mono disabled:opacity-55"
          />

          <button 
            type="submit" 
            disabled={isProcessing || !commandText.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-900 text-white disabled:text-slate-500 rounded-2xl font-black text-xs uppercase cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" /> Execute
          </button>
        </form>

      </div>
    </div>
  );
};
