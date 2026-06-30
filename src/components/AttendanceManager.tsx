import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sendNotificationToUsers } from '../firebase';
import { UserProfile, AttendanceRecord, AttendanceStatus, UserRole } from '../types';

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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', 'in', ['student']));
      const snapshot = await getDocs(q);
      const allStudents: UserProfile[] = [];
      snapshot.forEach(d => {
        const u = d.data() as UserProfile;
        if (u.grade === selectedGrade && u.section === selectedSection) {
          allStudents.push(u);
        }
      });
      setStudents(allStudents);

      // 2. Fetch Attendance
      const attRef = collection(db, 'attendance');
      const qAtt = query(attRef, where('date', '==', date), where('grade', '==', selectedGrade), where('section', '==', selectedSection));
      const attSnap = await getDocs(qAtt);
      
      const attMap: Record<string, AttendanceRecord> = {};
      attSnap.forEach(d => {
        const record = d.data() as AttendanceRecord;
        attMap[record.studentId] = record;
      });

      // Prefill weekends as holiday if no records exist yet for a student
      const d = new Date(date);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isWeekend) {
        allStudents.forEach(stu => {
          if (!attMap[stu.email]) {
            attMap[stu.email] = {
              date,
              grade: selectedGrade,
              section: selectedSection,
              studentId: stu.email,
              studentName: stu.name,
              status: 'holiday'
            };
          }
        });
      }

      setAttendance(attMap);

    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const markStatus = async (studentId: string, status: AttendanceStatus, studentName: string) => {
    const recordId = `${date}_${selectedGrade}_${selectedSection}_${studentId}`.replace(/\s+/g, '');
    const newRecord: AttendanceRecord = {
      date,
      grade: selectedGrade,
      section: selectedSection,
      studentId,
      studentName,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email
    };
    
    // Optimistic update
    setAttendance(prev => ({ ...prev, [studentId]: newRecord }));

    try {
      await setDoc(doc(db, 'attendance', recordId), newRecord);
      await sendNotificationToUsers({
        title: '📢 Attendance Published',
        message: `Attendance for ${date} is marked: ${status.toUpperCase()}.`,
        type: 'attendance',
        specificUserId: studentId
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `attendance/${recordId}`);
    }
  };

  const markAll = async (status: AttendanceStatus) => {
    if (!students.length) return;
    const newAtt = { ...attendance };
    const promises = [];
    
    for (const student of students) {
      const recordId = `${date}_${selectedGrade}_${selectedSection}_${student.email}`.replace(/\s+/g, '');
      const newRecord: AttendanceRecord = {
        date,
        grade: selectedGrade,
        section: selectedSection,
        studentId: student.email,
        studentName: student.name,
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email
      };
      newAtt[student.email] = newRecord;
      promises.push(setDoc(doc(db, 'attendance', recordId), newRecord));
    }
    
    setAttendance(newAtt);
    try {
      await Promise.all(promises);
      for (const student of students) {
        sendNotificationToUsers({
          title: '📢 Attendance Published',
          message: `Attendance for ${date} is marked: ${status.toUpperCase()}.`,
          type: 'attendance',
          specificUserId: student.email
        }).catch(e => console.error('Error sending attendance notification:', e));
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'attendance');
    }
  };

  // Stats
  const total = students.length;
  const attVals = Object.values(attendance) as AttendanceRecord[];
  const presentCount = attVals.filter(a => a.status === 'present').length;
  const absentCount = attVals.filter(a => a.status === 'absent').length;
  const lateCount = attVals.filter(a => a.status === 'late').length;
  const markedCount = presentCount + absentCount + lateCount;
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
            {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-sm">
            {['Astra', 'Elera', 'Solara', 'Vega'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-center">
          <div className="text-3xl font-black text-white">{total}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Total Students</div>
        </div>
        <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center">
          <div className="text-3xl font-black text-emerald-400">{presentCount}</div>
          <div className="text-[10px] text-emerald-500 uppercase font-bold mt-1">Present</div>
        </div>
        <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center">
          <div className="text-3xl font-black text-red-400">{absentCount}</div>
          <div className="text-[10px] text-red-500 uppercase font-bold mt-1">Absent</div>
        </div>
        <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 text-center">
          <div className="text-3xl font-black text-indigo-400">{percentage}%</div>
          <div className="text-[10px] text-indigo-500 uppercase font-bold mt-1">Present %</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => markAll('present')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
          ✓ Mark All Present
        </button>
        <button onClick={() => markAll('absent')} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
          ✗ Mark All Absent
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading student roster...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl text-slate-400 text-sm">
          No students found in {selectedGrade} - {selectedSection}.
        </div>
      ) : (
        <div className="bg-slate-950/50 rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Student</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {students.map(student => {
                  const currStatus = attendance[student.email]?.status;
                  return (
                    <tr key={student.email} className="hover:bg-slate-900/40">
                      <td className="p-4">
                        <div className="font-bold text-white">{student.name}</div>
                        <div className="text-[10px] text-slate-500">{student.email}</div>
                      </td>
                      <td className="p-4">
                        {currStatus === 'present' && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Present</span>}
                        {currStatus === 'absent' && <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Absent</span>}
                        {currStatus === 'late' && <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Late</span>}
                        {currStatus === 'leave' && <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Leave</span>}
                        {currStatus === 'holiday' && <span className="text-slate-400 bg-slate-500/10 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Holiday</span>}
                        {!currStatus && <span className="text-slate-500 text-[10px] font-bold uppercase">Not marked</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex bg-slate-900 rounded-lg p-1 border border-white/5 space-x-1">
                          <button 
                            onClick={() => markStatus(student.email, 'present', student.name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${currStatus === 'present' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Present"
                          >
                            P
                          </button>
                          <button 
                            onClick={() => markStatus(student.email, 'absent', student.name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${currStatus === 'absent' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Absent"
                          >
                            A
                          </button>
                          <button 
                            onClick={() => markStatus(student.email, 'late', student.name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${currStatus === 'late' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Late"
                          >
                            L
                          </button>
                          <button 
                            onClick={() => markStatus(student.email, 'leave', student.name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${currStatus === 'leave' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Leave"
                          >
                            LE
                          </button>
                          <button 
                            onClick={() => markStatus(student.email, 'holiday', student.name)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${currStatus === 'holiday' ? 'bg-slate-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                            title="Holiday"
                          >
                            H
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
