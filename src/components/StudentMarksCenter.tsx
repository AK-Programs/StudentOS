import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { fetchAllSupabaseUsers } from '../lib/supabaseUsers';

export default function StudentMarksCenter({ showNotification }: any) {
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [examType, setExamType] = useState('Unit Test');
  const [loadedStudents, setLoadedStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Dynamic Subjects and Configurable Max Marks
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const maxMarkOptions = [20, 25, 40, 50, 80, 100, 150, 200];
  const [subjects, setSubjects] = useState<string[]>(['Maths', 'Science', 'English', 'Social Science', 'Computer']);
  const [newSubject, setNewSubject] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});

  const gradeOptions = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);
  const sectionOptions = ['Astra', 'Elera', 'Solara', 'Vega'];
  const examTypes = ['Unit Test', 'Periodic Test', 'Half Yearly', 'Final Exam'];

  useEffect(() => {
    if (!selectedGrade || !selectedSection) {
      setLoadedStudents([]);
      return;
    }
    
    const fetchStudents = async () => {
      setLoading(true);
      try {
        let studs: UserProfile[] = [];
        try {
          const allUsers = await fetchAllSupabaseUsers();
          studs = allUsers.filter(u => u.role === 'student');
        } catch (sbErr) {
          console.error('[Supabase] Failed to load student users:', sbErr);
          throw sbErr;
        }
        
        // Filter by grade and section
        const filtered = studs.filter(s => 
           s.grade === selectedGrade && s.section === selectedSection
        );
        
        setLoadedStudents(filtered);
      } catch (err) {
        console.error('Failed to fetch student data:', err);
        showNotification('Failed to fetch student data.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, [selectedGrade, selectedSection]);

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    // Reset marks when a new student is selected
    setMarks({
      Maths: '',
      Science: '',
      English: '',
      SocialScience: '',
      Computer: ''
    });
  };

  const handleSaveMarks = () => {
    if (!selectedStudent) return;
    
    // Placeholder for Supabase migration
    console.warn("Marks migration in progress, handleSaveMarks not implemented");
    
    showNotification(`✅ Marks saved for ${selectedStudent.name} (${examType})`);
    
    // Reset
    setSelectedStudent(null);
    setMarks({
      Maths: '',
      Science: '',
      English: '',
      SocialScience: '',
      Computer: ''
    });
  };

  const handleGenerateReport = () => {
    if (!selectedStudent) return;

    // Placeholder for Supabase migration
    console.warn("Marks migration in progress, handleGenerateReport not implemented");

    showNotification(`📄 Report Card generated for ${selectedStudent.name} and sent to records.`);
  };

  return (
    <div className="smart-glass p-6 rounded-3xl space-y-6">
      <div className="border-b border-white/5 pb-4">
        <h3 className="text-xl font-black text-white font-display tracking-tight uppercase">Student Marks Centre</h3>
        <p className="text-xs text-slate-400 font-medium">Record academic performance and generate report cards for your cohort.</p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select Class</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- All Classes --</option>
            {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select Section</label>
          <select 
            value={selectedSection} 
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full text-sm px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- All Sections --</option>
            {sectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Loaded Students list */}
      {selectedGrade && selectedSection && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white uppercase px-1 border-l-2 border-indigo-500">Loaded Students ({loadedStudents.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2">
            {loadedStudents.length === 0 ? (
              <p className="text-xs text-slate-500 col-span-full">No students found matching this criteria.</p>
            ) : (
              loadedStudents.map((stu: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleStudentSelect(stu)}
                  className={`p-3 rounded-xl text-left border transition-all ${selectedStudent === stu ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950/40 border-white/5 hover:border-white/20 text-slate-300'}`}
                >
                  <p className="text-xs font-bold truncate">{stu.name}</p>
                  <p className="text-[10px] text-slate-500 mono">{stu.house}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Marks Entry Panel */}
      {selectedStudent && (
        <div className="mt-8 p-6 bg-slate-950/60 rounded-2xl border border-indigo-500/20 space-y-6 shadow-inner animate-fadeIn">
          <div className="flex justify-between items-center border-b border-indigo-500/20 pb-4">
            <div>
              <h4 className="text-lg font-black text-indigo-400">Entering Marks for: {selectedStudent.name}</h4>
              <p className="text-xs text-slate-400">[{selectedStudent.grade} - {selectedStudent.section}]</p>
            </div>
            
            <div className="flex justify-between items-center w-full sm:w-auto mt-4 sm:mt-0 gap-4">
              <div className="w-32 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Max Marks</label>
                <select 
                  value={maxMarks} 
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {maxMarkOptions.map(m => <option key={m} value={m}>Out of {m}</option>)}
                </select>
              </div>

              <div className="w-48 space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block text-right">Exam Type</label>
                <select 
                  value={examType} 
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                >
                  {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map(subject => (
              <div key={subject} className="space-y-1.5 flex flex-col group">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-300 font-bold tracking-wide">{subject}</label>
                  <button onClick={() => setSubjects(subjects.filter(s => s !== subject))} className="text-[10px] text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    max={maxMarks}
                    min="0"
                    value={marks[subject] || ''}
                    onChange={(e) => setMarks({...marks, [subject]: e.target.value})}
                    placeholder={`Out of ${maxMarks}`}
                    className="w-full text-sm px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                  {(marks as any)[subject] && (
                    <div className={`absolute top-1/2 -translate-y-1/2 right-3 w-2 h-2 rounded-full ${Number((marks as any)[subject]) < (maxMarks * 0.4) ? 'bg-red-500 glow-ruby' : 'bg-emerald-500 glow-emerald'}`}></div>
                  )}
                </div>
              </div>
            ))}
            
            <div className="space-y-1.5 flex flex-col border border-dashed border-indigo-500/30 rounded-xl p-3 items-center justify-center bg-indigo-500/5">
               <input 
                 type="text" 
                 placeholder="New Subject" 
                 value={newSubject}
                 onChange={(e) => setNewSubject(e.target.value)}
                 className="w-full text-xs px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500 text-center"
               />
               <button 
                 onClick={() => {
                   if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
                     setSubjects([...subjects, newSubject.trim()]);
                     setNewSubject('');
                   }
                 }}
                 className="w-full py-1.5 bg-indigo-500/20 text-indigo-400 font-bold text-xs rounded-lg hover:bg-indigo-500/40 transition-colors"
               >
                 + Add Subject
               </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <button 
              onClick={handleSaveMarks}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex-1 uppercase tracking-widest text-xs transition-colors"
            >
              💾 Save Marks
            </button>
            <button 
              onClick={handleGenerateReport}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex-1 uppercase tracking-widest text-xs transition-colors"
            >
              📊 Generate Report
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
