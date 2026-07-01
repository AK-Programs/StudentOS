import { supabase } from './supabase';

/**
 * Uploads a file to Supabase Storage (StudentOS bucket).
 * Returns { url, path }
 */
export const uploadFileToStorage = async (
  file: File, 
  folder: string = 'materials'
): Promise<{ url: string; path: string }> => {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${folder}/${timestamp}_${cleanName}`;

  console.log(`[Supabase Upload] Uploading to: ${filePath}`);

  const { data, error } = await supabase.storage
    .from('StudentOS')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('[Supabase Upload Error]', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('StudentOS')
    .getPublicUrl(filePath);

  console.log('[Supabase Upload] Success');

  return {
    url: publicUrlData.publicUrl,
    path: filePath
  };
};

/**
 * Deletes a file from Supabase Storage (cleanup helper)
 */
export const deleteFileFromStorage = async (filePath: string): Promise<void> => {
  try {
    const { error } = await supabase.storage.from('StudentOS').remove([filePath]);
    if (error) throw error;
    console.log('[Supabase] File deleted for cleanup:', filePath);
  } catch (err) {
    console.warn('[Supabase] Cleanup delete failed:', err);
  }
};
