import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, AttendanceStatus, UserRole } from '../types';
import { fetchStudentsByGradeSection } from '../lib/studentFilters';
import { computeAttendanceStats } from '../lib/utils';
import { GRADES, SECTIONS } from '../lib/constants';
import { supabase } from '../lib/supabase';

export default function AttendanceManager({ currentUser, effectiveRole }: { currentUser: UserProfile; effectiveRole: UserRole | undefined }) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 10');
  const [selectedSection, setSelectedSection] = useState<string>('Solara');
  const [loading, setLoading] = useState(false);
  
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, [date, selectedGrade, selectedSection]);

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const allStudents = await fetchStudentsByGradeSection(selectedGrade, selectedSection);
      setStudents(allStudents);

      // 2. Fetch Attendance
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
        
      if (error) throw error;
      
      const attendanceMap: Record<string, AttendanceRecord> = {};
      data?.forEach((rec: any) => {
        attendanceMap[rec.user_id] = {
          id: rec.id,
          date: rec.date,
          grade: selectedGrade, // Simplified as it is not stored in attendance table
          section: selectedSection, // Simplified
          studentId: rec.user_id,
          status: rec.status,
        };
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const markStatus = async (studentId: string, status: AttendanceStatus, studentName: string) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          user_id: studentId,
          date: date,
          status: status,
        }, { onConflict: 'user_id, date' });
        
      if (error) throw error;
      fetchStudentsAndAttendance();
    } catch (err) {
      console.error('Failed to mark attendance:', err);
    }
  };

  const markAll = async (status: AttendanceStatus) => {
    try {
      const records = students.map(s => ({
        user_id: s.uid,
        date: date,
        status: status,
      }));
      const { error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'user_id, date' });
        
      if (error) throw error;
      fetchStudentsAndAttendance();
    } catch (err) {
      console.error('Failed to mark all attendance:', err);
    }
  };

  // Stats
  const total = students.length;
  const attVals = Object.values(attendance) as AttendanceRecord[];
  const { presentCount, absentCount, lateCount, markedCount } = computeAttendanceStats(attVals);
  const percentage = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  return (
    <div className="smart-glass p-6 md:p-8 rounded-3xl space-y-6 max-w-5xl mx-auto animate-fadeIn w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black font-display text-white">Attendance Manager</h3>
          <p className="text-xs text-slate-400">Mark daily attendance for students.</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm"
          />
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm">
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm">
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      
      <div className="bg-slate-950/50 rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <th className="p-4">Student</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {students.map(s => (
              <tr key={s.uid} className="hover:bg-slate-900/40">
                <td className="p-4">{s.name}</td>
                <td className="p-4 capitalize">{attendance[s.uid!]?.status || 'Pending'}</td>
                <td className="p-4 text-right flex gap-2 justify-end">
                  <button onClick={() => markStatus(s.uid!, 'present', s.name)} className="px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-[10px]">Present</button>
                  <button onClick={() => markStatus(s.uid!, 'absent', s.name)} className="px-2 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px]">Absent</button>
                  <button onClick={() => markStatus(s.uid!, 'late', s.name)} className="px-2 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px]">Late</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
