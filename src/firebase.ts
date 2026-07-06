// Stub file replacing Firebase completely with Supabase-backed or mockup variables.
// No firebase imports are present.
import { supabase } from './lib/supabase';

export const auth: any = {
  currentUser: null
};

export const db: any = {};
export const storage: any = {};

export class GoogleAuthProvider {
  setCustomParameters(...args: any[]) {}
}

export async function signInWithPopup(...args: any[]) {
  return { user: null };
}

export async function signOut(...args: any[]) {}

export function doc(...args: any[]): any { return {}; }
export function collection(...args: any[]): any { return {}; }
export function query(...args: any[]): any { return {}; }
export function where(...args: any[]): any { return {}; }
export function onSnapshot(...args: any[]): any { return () => {}; }
export async function setDoc(...args: any[]) {}
export async function updateDoc(...args: any[]) {}
export async function deleteDoc(...args: any[]) {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('[STUB] Firestore Error Handled:', error, operationType, path);
  throw error;
}

interface NotificationPayload {
  title: string;
  message: string;
  type: string;
  targetGrades?: string[];
  targetSections?: string[];
  specificUserId?: string;
}

export const sendNotificationToUsers = async (data: NotificationPayload) => {
  const notif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    title: data.title,
    message: data.message,
    type: data.type,
    targetGrades: data.targetGrades || [],
    targetSections: data.targetSections || [],
    read: false,
    createdAt: new Date().toISOString()
  };

  // Save to Supabase
  try {
    await supabase.from('notifications').upsert({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target_grades: notif.targetGrades,
      target_sections: notif.targetSections,
      read: false,
      created_at: Date.now()
    });
  } catch (err) {
    // Table may not exist; fall through to localStorage
  }

  // Also append to current user's localStorage notifications for immediate visibility
  try {
    const userJson = localStorage.getItem('s_os_user');
    if (userJson) {
      const user = JSON.parse(userJson);
      const key = `s_os_notifications_${user.uid}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(notif);
      if (existing.length > 50) existing.length = 50;
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {
    // localStorage may be unavailable
  }
};
