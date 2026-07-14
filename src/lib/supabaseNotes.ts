import { supabase } from './supabase';
import { VaultNote } from '../types';

export async function getVaultNotes(userId: string): Promise<VaultNote[]> {
  try {
    const { data, error } = await supabase.from('notes').select('*').eq('user_id', userId);
    if (error) {
      if (error.code === '42P01') {
         return getLocalVaultNotes(userId);
      }
      throw error;
    }
    if (data) {
       return data.map(n => ({
         id: n.id,
         title: n.title,
         content: n.content,
         createdAt: n.created_at || new Date().toLocaleDateString(),
         subject: n.subject || '',
         icon: n.icon || '📝',
         coverBg: n.cover_bg || 'bg-gradient-to-r from-violet-600 to-indigo-900',
         userId: n.user_id
       }));
    }
  } catch (err) {
    console.error("Failed to get notes from supabase", err);
  }
  return getLocalVaultNotes(userId);
}

export async function saveVaultNoteToSupabase(note: VaultNote): Promise<void> {
  saveLocalVaultNote(note);
  try {
    const { error } = await supabase.from('notes').upsert({
       id: note.id,
       title: note.title,
       content: note.content,
       subject: note.subject,
       icon: note.icon,
       cover_bg: note.coverBg,
       user_id: note.userId,
       created_at: note.createdAt
    });
    if (error && error.code !== '42P01') throw error;
  } catch (err) {
    console.error("Failed to save note to supabase", err);
  }
}

export async function deleteVaultNoteFromSupabase(noteId: string, userId: string): Promise<void> {
  deleteLocalVaultNote(noteId, userId);
  try {
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error && error.code !== '42P01') throw error;
  } catch (err) {}
}

function getLocalVaultNotes(userId: string): VaultNote[] {
  try {
    const saved = localStorage.getItem(`s_os_notes_${userId}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

function saveLocalVaultNote(note: VaultNote) {
  try {
    const saved = localStorage.getItem(`s_os_notes_${note.userId || 'guest'}`);
    let arr: VaultNote[] = saved ? JSON.parse(saved) : [];
    const idx = arr.findIndex(n => n.id === note.id);
    if (idx >= 0) arr[idx] = note;
    else arr.push(note);
    localStorage.setItem(`s_os_notes_${note.userId || 'guest'}`, JSON.stringify(arr));
  } catch (e) {}
}

function deleteLocalVaultNote(noteId: string, userId: string) {
  try {
    const saved = localStorage.getItem(`s_os_notes_${userId}`);
    if (saved) {
      let arr: VaultNote[] = JSON.parse(saved);
      arr = arr.filter(n => n.id !== noteId);
      localStorage.setItem(`s_os_notes_${userId}`, JSON.stringify(arr));
    }
  } catch (e) {}
}
