import { AttendanceRecord, AttendanceStatus, UserProfile } from '../types';
import { EDITABLE_ROLES } from './constants';

/**
 * Generates a unique ID combining timestamp and random suffix.
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Returns true when the given role is allowed to create/edit content.
 */
export function canEditContent(role: string | undefined): boolean {
  return !!role && (EDITABLE_ROLES as readonly string[]).includes(role);
}

/**
 * Counts attendance statistics from an array of attendance records.
 */
export function computeAttendanceStats(records: AttendanceRecord[]) {
  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;
  const holidayCount = records.filter(r => r.status === 'holiday').length;
  const markedCount = presentCount + absentCount + lateCount + leaveCount;
  return { presentCount, absentCount, lateCount, leaveCount, holidayCount, markedCount };
}

/**
 * Filters a student list by teacher's assigned grades and sections.
 */
export function filterStudentsByTeacherAssignment(
  students: UserProfile[],
  assignedGrades: string[],
  assignedSections: string[],
): UserProfile[] {
  return students.filter(s => {
    const gradeMatch = assignedGrades.includes('All Grades') || assignedGrades.includes(s.grade || '');
    const sectionMatch = assignedSections.includes('All Sections') || assignedSections.includes(s.section || '');
    return gradeMatch && sectionMatch;
  });
}
