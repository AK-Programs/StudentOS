import { UserProfile } from '../types';
import { fetchAllSupabaseUsers } from './supabaseUsers';

/**
 * Fetches all users from Supabase and returns only those with role === 'student'.
 */
export async function fetchStudentUsers(): Promise<UserProfile[]> {
  const allUsers = await fetchAllSupabaseUsers();
  return allUsers.filter(u => u.role === 'student');
}

/**
 * Fetches students filtered by grade and section.
 */
export async function fetchStudentsByGradeSection(grade: string, section: string): Promise<UserProfile[]> {
  const students = await fetchStudentUsers();
  return students.filter(s => s.grade === grade && s.section === section);
}
