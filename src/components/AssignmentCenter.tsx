import React, { useState } from 'react';
import { AssignmentUploadForm } from './AssignmentUploadForm';
import { ResourceCategory } from '../types';

export const AssignmentCenter: React.FC = () => {
  const [activeUploadType, setActiveUploadType] = useState<ResourceCategory>('assignment');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Resource Center</h2>
      
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <button onClick={() => setActiveUploadType('assignment')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'assignment' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Assignment</button>
        <button onClick={() => setActiveUploadType('timetable')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'timetable' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Timetable</button>
        <button onClick={() => setActiveUploadType('worksheet')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'worksheet' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Worksheet</button>
        <button onClick={() => setActiveUploadType('gallery')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'gallery' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Photo Gallery</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800 rounded-xl">
          <h3 className="text-lg text-white font-bold capitalize">Upload {activeUploadType}</h3>
          <p className="text-xs text-slate-400 mb-4">Upload and share resources with your class.</p>
          <AssignmentUploadForm key={activeUploadType} category={activeUploadType} onSuccess={() => {}} />
        </div>
      </div>
    </div>
  );
};
