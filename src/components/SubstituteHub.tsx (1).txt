import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { Calendar, Users, ShieldAlert, Check, Plus, Trash2, ArrowRight, Bell, Clock, BookOpen } from 'lucide-react';

export interface SubstituteAssignment {
  id: string;
  classGrade: string; // e.g. "Grade 10 Solara"
  period: string; // e.g. "Period 3 (10:30 - 11:30)"
  subject: string; // e.g. "Mathematics"
  absentTeacherName: string;
  substituteTeacherName: string;
  workAssigned: string;
  status: 'Assigned' | 'In Progress' | 'Completed';
  date: string; // YYYY-MM-DD
}

const DEFAULT_TEACHERS = [
  'Dr. Sarah Jenkins',
  'Prof. Alex Mercer',
  'Mrs. Clara Higgins',
  'Mr. Raj Patel',
  'Miss Emma Watson',
  'Mr. Bruce Wayne',
  'Ms. Diana Prince'
];

const DEFAULT_CLASSES = [
  'Grade 9 Astra',
  'Grade 9 Elara',
  'Grade 10 Solara',
  'Grade 10 Vega',
  'Grade 11 Astra',
  'Grade 12 Vega'
];

const DEFAULT_PERIODS = [
  'Period 1 (08:30 - 09:30)',
  'Period 2 (09:30 - 10:30)',
  'Period 3 (10:45 - 11:45)',
  'Period 4 (11:45 - 12:45)',
  'Period 5 (13:30 - 14:30)',
  'Period 6 (14:30 - 15:30)'
];

const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English Literature',
  'Computer Science',
  'History & Civics',
  'Geography'
];

export const SubstituteHub = ({ currentUser, effectiveRole, showNotification }: any) => {
  const [assignments, setAssignments] = useState<SubstituteAssignment[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  // Form States
  const [classGrade, setClassGrade] = useState(DEFAULT_CLASSES[0]);
  const [period, setPeriod] = useState(DEFAULT_PERIODS[0]);
  const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [absentTeacher, setAbsentTeacher] = useState(DEFAULT_TEACHERS[0]);
  const [subTeacher, setSubTeacher] = useState(DEFAULT_TEACHERS[1]);
  const [workAssigned, setWorkAssigned] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Read/Write LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('s_os_substitute_assignments');
      if (stored) {
        setAssignments(JSON.parse(stored));
      } else {
        // Mock default list
        const initial: SubstituteAssignment[] = [
          {
            id: 'sub-1',
            classGrade: 'Grade 10 Solara',
            period: 'Period 3 (10:45 - 11:45)',
            subject: 'Physics',
            absentTeacherName: 'Dr. Sarah Jenkins',
            substituteTeacherName: 'Prof. Alex Mercer',
            workAssigned: 'Read Chapter 4 on Electromagnetism and solve exercises 1-5.',
            status: 'Assigned',
            date: new Date().toISOString().split('T')[0]
          },
          {
            id: 'sub-2',
            classGrade: 'Grade 9 Elara',
            period: 'Period 1 (08:30 - 09:30)',
            subject: 'Mathematics',
            absentTeacherName: 'Mrs. Clara Higgins',
            substituteTeacherName: 'Mr. Raj Patel',
            workAssigned: 'Practice quadratic formula worksheets distributed in class.',
            status: 'Completed',
            date: new Date().toISOString().split('T')[0]
          }
        ];
        setAssignments(initial);
        localStorage.setItem('s_os_substitute_assignments', JSON.stringify(initial));
      }
    } catch (_) {}
  }, []);

  const saveAssignments = async (list: SubstituteAssignment[]) => {
    setAssignments(list);
    try {
      await supabase.from('notes').upsert({
        id: 'global_substitutes',
        title: 'Substitute Hub Data',
        subject: 'System',
        content: JSON.stringify(list),
        created_at: new Date().toISOString()
      });
    } catch (e) {}
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();

    if (absentTeacher === subTeacher) {
      showNotification('⚠️ Absent teacher and substitute teacher cannot be the same person!');
      return;
    }

    const newAssign: SubstituteAssignment = {
      id: `sub-${Date.now()}`,
      classGrade,
      period,
      subject,
      absentTeacherName: absentTeacher,
      substituteTeacherName: subTeacher,
      workAssigned: workAssigned || 'General reading session under supervision.',
      status: 'Assigned',
      date: assignmentDate
    };

    const updated = [newAssign, ...assignments];
    saveAssignments(updated);
    setWorkAssigned('');
    setFormOpen(false);
    showNotification(`✓ Substitute assigned: ${subTeacher} for ${classGrade}`);

    // Trigger local broadcast notification
    try {
      const alerts = JSON.parse(localStorage.getItem('s_os_notif_alerts') || '[]');
      alerts.unshift({
        id: `notif-${Date.now()}`,
        title: 'New Substitute Assigned',
        message: `${subTeacher} will conduct ${subject} for ${classGrade} during ${period}.`,
        role: 'all',
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      localStorage.setItem('s_os_notif_alerts', JSON.stringify(alerts.slice(0, 20)));

      // Dispatch global notification event
      const gEvent = new CustomEvent('s_os_notification_created', {
        detail: {
          title: '📋 Standby Duty Assigned',
          message: `${subTeacher} is assigned to cover ${subject} for ${classGrade} during ${period}.`,
          type: 'substitute'
        }
      });
      window.dispatchEvent(gEvent);
    } catch (_) {}
  };

  const handleDeleteAssignment = (id: string) => {
    if (!confirm('Are you sure you want to delete this substitute assignment?')) return;
    const filtered = assignments.filter(a => a.id !== id);
    saveAssignments(filtered);
    showNotification('✓ Substitute assignment removed.');
  };

  const handleToggleStatus = (id: string) => {
    const updated = assignments.map(a => {
      if (a.id === id) {
        const nextStatus: any = a.status === 'Assigned' ? 'In Progress' : a.status === 'In Progress' ? 'Completed' : 'Assigned';
        return { ...a, status: nextStatus };
      }
      return a;
    });
    saveAssignments(updated);
    showNotification('✓ Assignment status updated.');
  };

  // Roles checking
  const canManage = ['coordinator', 'admin', 'super_admin'].includes(effectiveRole);

  // Filter list based on current user
  const relevantAssignments = assignments.filter(assign => {
    if (effectiveRole === 'student') {
      // Students see assignments for their class grade only
      return assign.classGrade.startsWith(currentUser?.grade || 'Grade 10');
    }
    if (effectiveRole === 'teacher') {
      // Teachers see where they are either the absent teacher or the substitute teacher
      return assign.substituteTeacherName === currentUser?.name || assign.absentTeacherName === currentUser?.name;
    }
    return true; // Staff see all assignments
  });

  // Check if current teacher is subbing today
  const mySubLectures = assignments.filter(a => a.substituteTeacherName === currentUser?.name && a.status !== 'Completed');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            📋 Faculty Substitute Hub
          </h2>
          <p className="text-slate-400 text-sm">
            Coordinate standby cover lists, assign class lessons, and notify teachers of substitute schedules automatically.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-lg"
          >
            <Plus className="w-4.5 h-4.5" /> New Standby Assign
          </button>
        )}
      </div>

      {/* Standby Alert banner for Teachers */}
      {effectiveRole === 'teacher' && mySubLectures.length > 0 && (
        <div className="p-4.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-start gap-3.5 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider">⚠️ Substitution Duty Pending Today</h4>
            <p className="text-xs text-slate-300">
              You have been scheduled for <strong>{mySubLectures.length} standby class coverage lectures</strong> today. Please check the assignment grid below for student worksheet details.
            </p>
          </div>
        </div>
      )}

      {/* Creation Form */}
      {canManage && formOpen && (
        <form onSubmit={handleCreateAssignment} className="bg-slate-900 border-2 border-indigo-500/20 p-6 rounded-2xl space-y-4 animate-slideDown shadow-2xl">
          <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider">
            Create Standby Lecture Substitution
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Class Section</label>
              <select
                value={classGrade}
                onChange={e => setClassGrade(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {DEFAULT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Period Interval</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {DEFAULT_PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subject Stream</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Absent Teacher</label>
              <select
                value={absentTeacher}
                onChange={e => setAbsentTeacher(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {DEFAULT_TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Standby Substitute Teacher</label>
              <select
                value={subTeacher}
                onChange={e => setSubTeacher(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                {DEFAULT_TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Effective Date</label>
              <input
                type="date"
                value={assignmentDate}
                onChange={e => setAssignmentDate(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lesson Work / Tasks Assigned</label>
            <textarea
              placeholder="E.g., complete physics workbook chapter 5 or study lab guidelines..."
              rows={3}
              value={workAssigned}
              onChange={e => setWorkAssigned(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="px-4 py-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Confirm Cover Duty
            </button>
          </div>
        </form>
      )}

      {/* Main Grid display of assignments */}
      <div className="bg-slate-950/40 border border-white/10 p-6 rounded-3xl space-y-4">
        <h3 className="text-sm font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
          <span>📅</span> Live Substitute Registry
        </h3>

        {relevantAssignments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-mono">
            📋 No substitute assignments active for your filter role today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relevantAssignments.map(assign => (
              <div
                key={assign.id}
                className="bg-slate-900 border border-white/10 p-5 rounded-2xl hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[9px] font-black uppercase tracking-wider">
                      {assign.classGrade}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                      assign.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                      assign.status === 'In Progress' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {assign.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white">{assign.subject} Coverage</h4>

                  {/* substitution mapping diagram */}
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-1 text-xs">
                    <p className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Absent: <strong className="text-slate-200">{assign.absentTeacherName}</strong>
                    </p>
                    <div className="pl-3.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">substituted by</div>
                    <p className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Cover: <strong className="text-white">{assign.substituteTeacherName}</strong>
                    </p>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-slate-400 flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> {assign.period}
                    </p>
                    <p className="text-slate-400 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {assign.date}
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> Assigned Workbook tasks:
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      "{assign.workAssigned}"
                    </p>
                  </div>
                </div>

                {/* Cover controls */}
                <div className="pt-3.5 border-t border-white/5 flex justify-between items-center">
                  {canManage || assign.substituteTeacherName === currentUser?.name ? (
                    <button
                      onClick={() => handleToggleStatus(assign.id)}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg flex items-center gap-1 border border-white/5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Progress Status
                    </button>
                  ) : (
                    <div></div>
                  )}

                  {canManage && (
                    <button
                      onClick={() => handleDeleteAssignment(assign.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
