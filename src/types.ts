/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'teacher' | 'coordinator' | 'admin' | 'super_admin';

export type HouseType = 'Ruby' | 'Emerald' | 'Sapphire' | 'Topaz';
export type SectionType = 'Astra' | 'Elera' | 'Solara' | 'Vega';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

export interface AttendanceRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  grade: string;
  section: string;
  studentId: string;
  studentName?: string;
  status: AttendanceStatus;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  uid?: string;
  requestedRole?: 'student' | 'teacher' | 'coordinator' | 'admin';
  accountStatus?: 'approved' | 'rejected' | 'pending_teacher' | 'pending_coordinator' | 'pending_admin' | 'active';
  grade?: string; // e.g. "Grade 10"
  section?: SectionType;
  house?: HouseType;
  rollNumber?: string;
  department?: string;
  subjects?: string[];
  designation?: string;
  specialtySubject?: string; // For teachers
  assignedGrades?: string[]; // For teachers
  assignedSections?: string[]; // For teachers
  avatar?: string;
  photoURL?: string;
  lastLogin?: number;
  studyHours?: number;
  quizzesTaken?: number;
  streakDays?: number;
  pin?: string;
  grant_all_permissions?: boolean;
  permissions?: string[];
}

export interface RecentAccount {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: string;
  lastLogin: number;
}

export interface QuizResult {
  id?: string;
  quizId?: string;
  studentEmail: string;
  score: number;
  totalQuestions: number;
  timestamp?: string;
}

export interface HouseStats {
  points: number;
  rank: number;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  subject?: string;
  userId?: string;
  createdAt?: string;
}

export interface ScheduleItem {
  id: string;
  subject: string;
  time: string;
  day: string; // e.g., "Monday"
}

export interface VaultNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  subject: string;
  icon?: string; // e.g. "📝", "💡", "🧪"
  coverBg?: string; // e.g. "bg-gradient-to-r from-blue-600 to-indigo-900"
  userId?: string;
}

export interface Homework {
  id: string;
  classGrade: string; // e.g. "Grade 1" to "Grade 12"
  classSection: SectionType | 'All Sections'; // Target section or broadcast to all
  subject: string;
  title: string;
  content: string; // supports Markdown instructions
  dueDate: string;
  givenBy: string;
  createdAt: string;
  completedList: string[]; // array of student emails who checked this homework
}

export interface Lesson {
  id: string;
  title: string;
  subject: string;
  presentedBy: string;
  slides: string[]; // text content of each slide
  currentSlideIndex: number;
  isActive: boolean;
  smartBoardNotes?: string;
}

export interface FeedbackPost {
  id: string;
  author: string;
  role: UserRole;
  text: string;
  votes: number;
  replies: { author: string; role: UserRole; text: string; createdAt: string }[];
  category: 'facilities' | 'academic' | 'events' | 'other';
  status: 'pending' | 'in-progress' | 'solved' | 'planned';
  createdAt: string;
}

export type ResourceCategory = 'material' | 'timetable' | 'assignment' | 'worksheet' | 'notice' | 'homework' | 'gallery';

export interface MaterialResource {
  id: string;
  title: string;
  subject: string; // "Mathematics" | "Physics" | "Chemistry" | "Biology" | "English" | "Computer Science" | "Social Science" | "General"
  category?: ResourceCategory; // Added this, optional for backward compatibility
  type: 'pdf' | 'link' | 'image' | 'formula-sheet' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'notes' | 'assignment' | 'question-paper' | 'project' | 'text' | 'gallery-image';
  url?: string;
  fileUrl?: string;
  file_url?: string;
  attachment_url?: string;
  storagePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  description: string;
  uploadedBy: string; // Name of uploader
  uploaderUid?: string;
  uploaderHouse?: string;
  uploaderSection?: string;
  createdAt: string;
  created_at?: number | string;
  classGrade?: string; // Added this
  classSection?: SectionType | 'All Sections'; // Added this
  dueDate?: string; // Added this
  isPublic?: boolean;
  visibility?: 'student' | 'teacher' | 'private';
  visibleToGrades?: string[];
  visibleToSections?: string[];
  visibleToHouses?: string[];
  downloads?: number;
  likes?: number;
  likedBy?: string[]; // uids of users who liked this
  views?: number;
  isVerified?: boolean; // Teacher Verified
  comments?: {
    id: string;
    author: string;
    house?: string;
    text: string;
    createdAt: string;
  }[];
  questionPaperYear?: string; // e.g. "2025" or "2024" Or "Midterm"
  aiSummary?: string;
  aiQuiz?: string;
  aiExplain?: string;
  aiRevisionNotes?: string;
  aiImportantQuestions?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  name: string;
  role: UserRole;
  house?: HouseType;
  message: string;
  createdAt: string;
  targetId?: string;
  sharedMaterialId?: string;
  ownerUid?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'group' | 'friend' | 'channel';
  icon: string;
  description: string;
}

export interface AITeacherPersona {
  id: string;
  name: string;
  speciality: string;
  style: string;
  systemPrompt: string;
  avatarChar: string;
  avatarColor: string;
}

export interface StudentReport {
  id: string; // usually UID or student ID
  name: string;
  classGrade: string;
  section: SectionType;
  house: HouseType;
  streakDays: number;
  materialsUploaded: number;
  notesCreated: number;
  quizzesCompleted: number;
  assignmentsCompleted: number;
  communityContributions: number;
  recentActivity: string[];
}

export interface HouseAnalytics {
  id: HouseType; // 'Ruby' | 'Emerald' | 'Sapphire' | 'Topaz'
  points: number;
  materialsShared: number;
  quizzesWon: number;
  participation: number; // custom score or attendance
}

export interface SectionAnalytics {
  id: SectionType; // 'Astra' | 'Elera' | 'Solara' | 'Vega'
  totalStudents: number;
  studyActivity: number; // e.g. average study hours
  quizScores: number; // average quiz percentage or count
  materialContributions: number;
}

export interface TeacherCommand {
  id: string;
  commandText: string;
  recognizedAt: string;
  parsedAction: string;
  status: 'success' | 'unknown' | 'error';
}

export interface JarvisHistoryItem {
  id: string;
  prompt: string;
  response: string;
  timestamp: string;
  actionExecuted?: string;
}

