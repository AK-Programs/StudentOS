import React, { useState } from 'react';
import { UserProfile } from '../types';
import TeacherStudentList from './TeacherStudentList';
import TeacherStudentReports from './TeacherStudentReports';
import StudentMarksCenter from './StudentMarksCenter';

export default function TeacherProfile({ currentUser, handleSaveProfile, profileNameInput, setProfileNameInput, profileAvatar, setProfileAvatar, profileTab, setProfileTab }: any) {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Teacher Information */}
      <section className="bg-slate-900 border border-white/5 p-6 md:p-8 rounded-3xl space-y-6">
        <h3 className="text-xl font-black text-white font-display border-b border-white/5 pb-4">Teacher Information</h3>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img src={profileAvatar} className="w-24 h-24 rounded-2xl object-cover border border-white/10" alt="Avatar"/>
          <div className="flex-1 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Full Name</label>
                <div className="text-sm px-4 py-3 bg-white/5 rounded-xl text-white font-medium">{currentUser.name}</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Assigned Subject</label>
                <div className="text-sm px-4 py-3 bg-white/5 rounded-xl text-white font-medium">{currentUser.specialtySubject || 'General Science'}</div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-400">Assigned Classes & Sections</label>
                <div className="text-sm px-4 py-3 bg-white/5 rounded-xl text-white font-medium">{(currentUser.assignedClasses || []).map((c: string) => c.replace('_', ' - ')).join(', ') || 'None Assigned'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation for specific modules */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5 gap-1 mb-6 flex-wrap">
         {['my_students', 'reports', 'marks_center'].map((pt) => (
           <button
             key={pt}
             onClick={() => setProfileTab(pt)}
             className={`py-3 px-2 sm:px-4 flex-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all min-w-[70px] ${
                profileTab === pt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
             }`}
           >
              {pt === 'my_students' && 'My Students'}
              {pt === 'reports' && 'Reports'}
              {pt === 'marks_center' && 'Marks Centre'}
           </button>
         ))}
      </div>

      <div className="w-full">
         {profileTab === 'my_students' && (
           <TeacherStudentList currentUser={currentUser} />
         )}
         {profileTab === 'reports' && (
           <TeacherStudentReports currentUser={currentUser} />
         )}
         {profileTab === 'marks_center' && (
           <StudentMarksCenter currentUser={currentUser} />
         )}
      </div>
    </div>
  );
}
