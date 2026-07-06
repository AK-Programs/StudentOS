import React, { useState } from 'react';
import { uploadFileToStorage } from '../lib/storageHelper';
import { saveSupabaseResource } from '../lib/supabaseResources';
import { ResourceCategory } from '../types';

interface Props {
  category: ResourceCategory;
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export const AssignmentUploadForm: React.FC<Props> = ({ category, onSuccess, onError }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classGrade, setClassGrade] = useState('');
  const [classSection, setClassSection] = useState('All Sections');
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setUploadError(null);
    try {
      let fileUrl = '';
      let storagePath = '';
      let finalGalleryUrls: any[] = [];
      
      if (category === 'gallery' && files.length > 0) {
        for (const f of files) {
          const { url, path } = await uploadFileToStorage(f, 'materials');
          finalGalleryUrls.push({ url, name: f.name });
        }
      } else if (file) {
        const { url, path } = await uploadFileToStorage(file, 'materials');
        fileUrl = url;
        storagePath = path;
      }
      
      const matId = Math.random().toString(36).substring(7);
      
      const dataToSave = {
        id: matId,
        title: title || '',
        content: description || '',
        description: description || '',
        type: category || 'resource',
        resourceType: category || 'resource',
        targetGrade: classGrade || 'All Grades',
        class: classGrade || 'All Grades',
        targetSection: classSection || 'All Sections',
        section: classSection || 'All Sections',
        url: fileUrl || null,
        fileUrl: fileUrl || null,
        fileData: fileUrl || null,
        storagePath: storagePath || null,
        galleryUrls: finalGalleryUrls,
        fileName: file?.name || null,
        createdAt: Date.now(),
        created_at: Date.now(),
        author: 'Teacher'
      };

      console.log("MODULE DATA", dataToSave);

      const tableName = category === 'assignment' ? 'assignments' : 'school_resources';
      await saveSupabaseResource(tableName as any, dataToSave);
      onSuccess();
    } catch (err: any) {
      const msg = `Upload failed: ${err?.message || 'Unknown error'}`;
      console.error('[AssignmentUploadForm]', msg, err);
      setUploadError(msg);
      onError?.(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-900 rounded-xl">
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-400 text-xs">
          {uploadError}
        </div>
      )}
      <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 bg-slate-800 rounded text-white" />
      <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 bg-slate-800 rounded text-white" />
      <div className="flex gap-4">
        <input type="text" placeholder="Class Grade (e.g., 10)" value={classGrade} onChange={e => setClassGrade(e.target.value)} className="w-1/2 p-2 bg-slate-800 rounded text-white" />
        <input type="text" placeholder="Section (e.g., A)" value={classSection} onChange={e => setClassSection(e.target.value)} className="w-1/2 p-2 bg-slate-800 rounded text-white" />
      </div>
      
      {category === 'gallery' ? (
        <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files || []))} className="w-full text-white" />
      ) : (
        <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-white" />
      )}
      
      <button type="submit" disabled={isUploading} className="bg-indigo-600 text-white p-2 rounded w-full font-bold">
        {isUploading ? 'Uploading...' : 'Upload Resource'}
      </button>
    </form>
  );
};
