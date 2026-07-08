import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, AttendanceStatus, UserRole } from '../types';
import { fetchAllSupabaseUsers } from '../lib/supabaseUsers';
import { supabase } from '../lib/supabase';
import { Calendar, Check, X, Clock, FileText, Download } from 'lucide-react';

export default function AttendanceManager({ currentUser, effectiveRole }: { currentUser: UserProfile; effectiveRole: UserRole | undefined }) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'reports'>('attendance');
  
  // Attendance State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 10');
  const [selectedSection, setSelectedSection] = useState<string>('Solara');
  const [loading, setLoading] = useState(false);
  const [targetUsers, setTargetUsers] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  
  // Leave State
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveDates, setLeaveDates] = useState('');

  // Target role determination based on hierarchy
  const targetRoleToManage = 
    effectiveRole === 'teacher' ? 'student' :
    effectiveRole === 'coordinator' ? 'teacher' :
    (effectiveRole === 'admin' || effectiveRole === 'super_admin') ? 'coordinator' : null;

  useEffect(() => {
    if (activeTab === 'attendance') fetchUsersAndAttendance();
    if (activeTab === 'leaves') fetchLeaveRequests();
  }, [date, selectedGrade, selectedSection, activeTab, effectiveRole]);

  const fetchUsersAndAttendance = async () => {
    if (!targetRoleToManage) return;
    setLoading(true);
    try {
      const allUsers = await fetchAllSupabaseUsers();
      
      let filtered = allUsers.filter(u => u.role === targetRoleToManage);
      
      // Visibility Rules
      if (effectiveRole === 'teacher') {
        filtered = filtered.filter(u => u.grade === selectedGrade && u.section === selectedSection);
      }
      
      setTargetUsers(filtered);

      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
        
      if (error && error.code !== '42P01') throw error; // Ignore missing table

      const attendanceMap: Record<string, AttendanceRecord> = {};
      data?.forEach((rec: any) => {
        attendanceMap[rec.user_id] = {
          id: rec.id,
          date: rec.date,
          grade: selectedGrade,
          section: selectedSection,
          studentId: rec.user_id,
          status: rec.status,
        };
      });
      setAttendance(attendanceMap);
    } catch (err: any) {
      console.error('Failed to load attendance:', err);
      if (err.code === '42P01') {
         // Table missing
      }
    } finally {
      setLoading(false);
    }
  };

  const markStatus = async (uid: string, status: AttendanceStatus) => {
    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          user_id: uid,
          date: date,
          status: status,
        }, { onConflict: 'user_id, date' });
        
      if (error && error.code !== '42P01') throw error;
      fetchUsersAndAttendance();
    } catch (err: any) {
      console.error('Failed to mark attendance:', err);
      if (err.code === '42P01') alert("Attendance table missing in Supabase.");
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error && error.code !== '42P01') throw error;
      setLeaveRequests(data || []);
    } catch (err: any) {
      console.error('Failed to fetch leaves:', err);
    }
  };

  const applyLeave = async () => {
    if (!leaveReason.trim() || !leaveDates.trim()) return;
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: currentUser.uid,
          user_name: currentUser.name,
          user_role: effectiveRole,
          reason: leaveReason,
          dates: leaveDates,
          status: 'pending'
        });
        
      if (error && error.code !== '42P01') throw error;
      setShowLeaveForm(false);
      setLeaveReason('');
      setLeaveDates('');
      fetchLeaveRequests();
      alert("Leave request submitted successfully.");
    } catch (err: any) {
      console.error('Failed to apply leave:', err);
      if (err.code === '42P01') alert("leave_requests table missing in Supabase.");
    }
  };

  const updateLeaveStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status })
        .eq('id', id);
        
      if (error && error.code !== '42P01') throw error;
      fetchLeaveRequests();
    } catch (err: any) {
      console.error('Failed to update leave:', err);
    }
  };

  if (!targetRoleToManage && effectiveRole !== 'super_admin') {
    return <div className="p-8 text-center text-white">You do not have permission to manage attendance.</div>;
  }

  return (
    <div className="smart-glass p-6 md:p-8 rounded-3xl space-y-6 max-w-6xl mx-auto animate-fadeIn w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black font-display text-white">Attendance & Leaves</h3>
          <p className="text-xs text-slate-400">Hierarchical attendance management and leave workflows.</p>
        </div>
        <div className="flex bg-slate-900 rounded-xl p-1 border border-white/10">
          <button 
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Mark Attendance
          </button>
          <button 
            onClick={() => setActiveTab('leaves')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'leaves' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Leave Requests
          </button>
        </div>
      </div>

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-sm"
            />
            {effectiveRole === 'teacher' && (
              <>
                <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-sm">
                  {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-sm">
                  {['Astra', 'Elera', 'Solara', 'Vega'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 bg-slate-950 px-3 py-2 rounded-xl border border-white/5">
                Managing: <span className="text-indigo-400 uppercase tracking-widest">{targetRoleToManage}s</span>
              </span>
            </div>
          </div>
          
          <div className="bg-slate-950/50 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {targetUsers.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-900/40">
                    <td className="p-4 font-bold text-white">{u.name}</td>
                    <td className="p-4 text-xs text-slate-400">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        attendance[u.uid!]?.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                        attendance[u.uid!]?.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                        attendance[u.uid!]?.status === 'late' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {attendance[u.uid!]?.status || 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                      <button onClick={() => markStatus(u.uid!, 'present')} className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-[10px] transition-colors"><Check className="w-3 h-3 inline mr-1"/>Present</button>
                      <button onClick={() => markStatus(u.uid!, 'absent')} className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-[10px] transition-colors"><X className="w-3 h-3 inline mr-1"/>Absent</button>
                      <button onClick={() => markStatus(u.uid!, 'late')} className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-lg text-[10px] transition-colors"><Clock className="w-3 h-3 inline mr-1"/>Late</button>
                    </td>
                  </tr>
                ))}
                {targetUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500 text-xs">No {targetRoleToManage}s found for this selection.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-white/5">
            <div>
              <h4 className="text-sm font-bold text-white">Leave Management</h4>
              <p className="text-xs text-slate-400">Apply for leaves and manage incoming requests.</p>
            </div>
            <button 
              onClick={() => setShowLeaveForm(!showLeaveForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
            >
              + Apply for Leave
            </button>
          </div>

          {showLeaveForm && (
            <div className="bg-slate-950 p-6 rounded-2xl border border-indigo-500/30 space-y-4 animate-fadeIn">
              <h5 className="text-sm font-bold text-white border-b border-white/10 pb-2">New Leave Application</h5>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Dates Required</label>
                  <input type="text" value={leaveDates} onChange={e => setLeaveDates(e.target.value)} placeholder="e.g. Oct 12 - Oct 15" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Reason for Leave</label>
                  <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} rows={3} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white text-sm" placeholder="Detailed explanation..."></textarea>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setShowLeaveForm(false)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700">Cancel</button>
                  <button onClick={applyLeave} disabled={!leaveReason || !leaveDates} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 disabled:opacity-50">Submit Request</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h5 className="text-sm font-bold text-white">My Requests & Approvals</h5>
            {leaveRequests.filter(req => req.user_id === currentUser.uid || req.user_role === targetRoleToManage).map(req => (
              <div key={req.id} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{req.user_name}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-white/5">{req.user_role}</span>
                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-wider ${
                      req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      req.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{req.status}</span>
                  </div>
                  <div className="text-xs text-slate-400">Dates: <strong className="text-white">{req.dates}</strong></div>
                  <p className="text-xs text-slate-300 mt-1 italic">"{req.reason}"</p>
                </div>
                {req.user_role === targetRoleToManage && req.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateLeaveStatus(req.id, 'approved')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 rounded-lg text-xs font-bold transition-all"><Check className="w-4 h-4" /></button>
                    <button onClick={() => updateLeaveStatus(req.id, 'rejected')} className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-lg text-xs font-bold transition-all"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
            {leaveRequests.length === 0 && (
              <div className="p-8 text-center bg-slate-900 border border-white/5 rounded-2xl text-slate-500 text-xs">
                No leave requests found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
