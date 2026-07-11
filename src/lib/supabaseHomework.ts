import { supabase } from './supabase';
import { Homework } from '../types';

export async function getSupabaseHomework(): Promise<Homework[]> {
  try {
    const { data, error } = await supabase.from('homework').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.code === '42P01') {
        console.warn('Homework table missing in Supabase, using local.');
      } else {
        throw error;
      }
    } else if (data) {
      return data.map(item => ({
        id: item.id,
        title: item.title,
        subject: item.subject,
        content: item.content,
        dueDate: item.due_date,
        classGrade: item.class_grade,
        classSection: item.class_section,
        givenBy: item.given_by,
        createdAt: item.created_at,
        completedList: typeof item.completed_list === 'string' ? JSON.parse(item.completed_list) : (item.completed_list || [])
      }));
    }
  } catch (err) {
    console.error('Supabase get homework error:', err);
  }
  
  // Fallback
  try {
    const cached = localStorage.getItem('s_os_homework_global');
    if (cached) return JSON.parse(cached);
  } catch(e) {}
  return [];
}

export async function saveSupabaseHomework(hw: Homework): Promise<void> {
  // Local fallback save first
  try {
    const cached = localStorage.getItem('s_os_homework_global');
    let list: Homework[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(h => h.id === hw.id);
    if (idx >= 0) list[idx] = hw;
    else list.unshift(hw);
    localStorage.setItem('s_os_homework_global', JSON.stringify(list));
  } catch(e) {}

  try {
    const dbRow = {
      id: hw.id,
      title: hw.title,
      subject: hw.subject,
      content: hw.content,
      due_date: hw.dueDate,
      class_grade: hw.classGrade,
      class_section: hw.classSection,
      given_by: hw.givenBy,
      created_at: hw.createdAt,
      completed_list: JSON.stringify(hw.completedList || [])
    };
    const { error } = await supabase.from('homework').upsert(dbRow);
    if (error && error.code !== '42P01') throw error;
  } catch (err) {
    console.warn('Supabase save homework error (offline fallback used):', err);
  }
}

export async function deleteSupabaseHomework(id: string): Promise<void> {
  // Local fallback delete first
  try {
    const cached = localStorage.getItem('s_os_homework_global');
    if (cached) {
      let list: Homework[] = JSON.parse(cached);
      list = list.filter(h => h.id !== id);
      localStorage.setItem('s_os_homework_global', JSON.stringify(list));
    }
  } catch(e) {}

  try {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error && error.code !== '42P01') throw error;
  } catch (err) {
    console.warn('Supabase delete homework error (offline fallback used):', err);
  }
}
