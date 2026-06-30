import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, AttendanceRecord } from '../types';

export default function StudentAttendanceView({ currentUser }: { currentUser: UserProfile }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const fetchMyAttendance = async () => {
      setLoading(true);
      try {
        const attRef = collection(db, 'attendance');
        const qAtt = query(attRef, where('studentId', '==', currentUser.email));
        const attSnap = await getDocs(qAtt);
        const myData: AttendanceRecord[] = [];
        attSnap.forEach(d => myData.push(d.data() as AttendanceRecord));
        setRecords(myData);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'attendance');
      } finally {
        setLoading(false);
      }
    };
    fetchMyAttendance();
  }, [currentUser]);

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;
  const lateCount = records.filter(r => r.status === 'late').length;
  const leaveCount = records.filter(r => r.status === 'leave').length;
  const holidayCount = records.filter(r => r.status === 'holiday').length;
  
  // Percentage calculation excludes holidays
  const markedCount = presentCount + absentCount + lateCount + leaveCount;
  const validPresent = presentCount + lateCount; // Late is considered present for percentage here, though sometimes partial
  const percentage = markedCount > 0 ? Math.round((validPresent / markedCount) * 100) : 0;

  if (loading) return <div className="text-slate-400 p-8 text-center">Loading attendance data...</div>;

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="p-6 bg-slate-950/50 border border-white/5 rounded-2xl flex flex-col items-center text-center w-full">
        <span className="text-4xl block mb-2">📅</span>
        <h4 className="text-xl font-bold text-white mt-2">Attendance Dashboard</h4>
        <p className="text-sm text-slate-400 mt-1">Overall Attendance: <strong className="text-emerald-400">{percentage}%</strong></p>
        
        <div className="w-full max-w-lg h-4 bg-slate-900 rounded-full overflow-hidden mt-4">
          <div className="h-full bg-emerald-500" style={{ width: `${percentage}%` }}></div>
        </div>
        <div className="flex justify-between w-full max-w-lg text-xs text-slate-500 font-mono mt-2">
          <span>0%</span>
          <span>Target: 75%</span>
          <span>100%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 w-full">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold sm:order-2 sm:mt-1">Present</div>
          <div className="text-emerald-400 font-bold text-2xl sm:order-1">{presentCount}</div>
        </div>
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold sm:order-2 sm:mt-1">Late</div>
          <div className="text-amber-400 font-bold text-2xl sm:order-1">{lateCount}</div>
        </div>
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold sm:order-2 sm:mt-1">Leave</div>
          <div className="text-blue-400 font-bold text-2xl sm:order-1">{leaveCount}</div>
        </div>
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center flex flex-col items-center justify-center">
          <div className="text-[10px] text-slate-400 uppercase font-bold sm:order-2 sm:mt-1">Absent</div>
          <div className="text-red-400 font-bold text-2xl sm:order-1">{absentCount}</div>
        </div>
        <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-xl text-center flex flex-col items-center justify-center col-span-2 sm:col-span-1">
          <div className="text-[10px] text-slate-400 uppercase font-bold sm:order-2 sm:mt-1">Holiday</div>
          <div className="text-slate-400 font-bold text-2xl sm:order-1">{holidayCount}</div>
        </div>
      </div>

      <div className="mt-6">
        <h5 className="font-bold text-white mb-3 tracking-wide">Recent Records</h5>
        {records.length === 0 ? (
          <p className="text-slate-400 text-sm">No attendance records found.</p>
        ) : (
          <div className="bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-900 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(r => (
                    <tr key={r.date} className="hover:bg-slate-900/40">
                      <td className="p-4 font-mono text-slate-300">{r.date}</td>
                      <td className="p-4 text-right">
                        {r.status === 'present' && <span className="text-emerald-400 font-bold uppercase text-[10px] bg-emerald-500/10 px-2 py-1 rounded">Present</span>}
                        {r.status === 'absent' && <span className="text-red-400 font-bold uppercase text-[10px] bg-red-500/10 px-2 py-1 rounded">Absent</span>}
                        {r.status === 'late' && <span className="text-amber-400 font-bold uppercase text-[10px] bg-amber-500/10 px-2 py-1 rounded">Late</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
