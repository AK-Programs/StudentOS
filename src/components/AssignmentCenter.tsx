import React, { useState } from 'react';
import { AssignmentUploadForm } from './AssignmentUploadForm';
import { ResourceCategory } from '../types';
import { uploadFileToStorage } from '../lib/storageHelper';

export const AssignmentCenter: React.FC = () => {
  const [activeUploadType, setActiveUploadType] = useState<ResourceCategory>('assignment');

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Resource Center</h2>
      
      <div className="flex gap-4">
        <button onClick={() => setActiveUploadType('assignment')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'assignment' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Assignment</button>
        <button onClick={() => setActiveUploadType('timetable')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'timetable' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Timetable</button>
        <button onClick={() => setActiveUploadType('worksheet')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'worksheet' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Worksheet</button>
        <button onClick={() => setActiveUploadType('gallery')} className={`px-4 py-2 rounded-xl font-bold text-xs ${activeUploadType === 'gallery' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Photo Gallery</button>
      </div>

      <div className="p-4 bg-slate-800 rounded-xl mb-4 border border-rose-500">
        <h3 className="text-lg text-rose-400 font-bold mb-2">TEST UPLOAD DIRECTLY ({activeUploadType.toUpperCase()})</h3>
        <input type="file" id="testFileInputAssig" className="text-white mb-2 block" />
        <button 
          type="button" 
          onClick={async () => {
            const testInput = document.getElementById('testFileInputAssig') as HTMLInputElement;
            if (testInput?.files && testInput.files[0]) {
              const file = testInput.files[0];
              console.log("TEST UPLOAD - FILE OBJECT", file, file?.name, file?.size, file?.type);
              try {
                const { url, path } = await uploadFileToStorage(file, 'materials');
                alert('Test upload success! URL: ' + url);
              } catch (err: any) {
                console.error("FULL ERROR", JSON.stringify(err), err, err.stack);
                alert('Test upload failed: ' + err.message);
              }
            }
          }} 
          className="bg-rose-600 px-3 py-1 rounded text-white text-xs font-bold"
        >
          Execute Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-800 rounded-xl">
          <h3 className="text-lg text-white font-bold capitalize">Upload {activeUploadType}</h3>
          <p className="text-xs text-slate-400 mb-4">Using master template upload architecture.</p>
          <AssignmentUploadForm key={activeUploadType} category={activeUploadType} onSuccess={() => alert('Uploaded!')} />
        </div>
      </div>
    </div>
  );
};
