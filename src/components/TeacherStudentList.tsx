import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export default function TeacherStudentList({ currentUser }: { currentUser: UserProfile }) {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach(d => list.push(d.data() as UserProfile));
      
      const teacherGrades = currentUser.assignedGrades || [];
      const teacherSections = currentUser.assignedSections || [];
      
      const filtered = list.filter(s => {
         const gradeMatch = teacherGrades.includes('All Grades') || teacherGrades.includes(s.grade || '');
         const sectionMatch = teacherSections.includes('All Sections') || teacherSections.includes(s.section || '');
         return gradeMatch && sectionMatch;
      });
      setStudents(filtered);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grades = currentUser.assignedGrades || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {grades.map(grade => (
           <div 
             key={grade} 
             onClick={() => setSelectedGrade(selectedGrade === grade ? null : grade)}
             className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedGrade === grade ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:border-indigo-500/30'}`}
           >
             <h5 className="font-bold text-indigo-400">{grade}</h5>
             <p className="text-xs text-slate-400 mb-2">Sections: {(currentUser.assignedSections || []).join(', ')}</p>
             <div className="text-[10px] text-white bg-indigo-500/20 px-2 py-1 rounded inline-block font-bold">
                {selectedGrade === grade ? 'Close Roster' : 'View Roster'}
             </div>
           </div>
        ))}
      </div>

      {selectedGrade && (
        <div className="animate-fadeIn p-6 bg-slate-900 border border-white/10 rounded-3xl">
          <h4 className="text-lg font-bold text-white mb-4">Roster: {selectedGrade}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-white/5">
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">Student Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3 rounded-tr-xl">House</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {loading ? (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-500">Loading...</td></tr>
                ) : students.filter(s => s.grade === selectedGrade).length === 0 ? (
                   <tr><td colSpan={4} className="text-center py-4 text-slate-500">No students found.</td></tr>
                ) : (
                   students.filter(s => s.grade === selectedGrade).map(s => (
                     <tr key={s.email} className="hover:bg-white/5">
                       <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                       <td className="px-4 py-3 text-slate-400 text-xs">{s.email}</td>
                       <td className="px-4 py-3 text-xs">{s.section || 'Unassigned'}</td>
                       <td className="px-4 py-3">
                         <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${s.house === 'Ruby' ? 'bg-red-500/20 text-red-400' : s.house === 'Emerald' ? 'bg-emerald-500/20 text-emerald-400' : s.house === 'Sapphire' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.house || 'Unassigned'}</span>
                       </td>
                     </tr>
                   ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
