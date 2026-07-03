import { supabase } from './supabase';
import { UserProfile, UserRole, SectionType, HouseType } from '../types';

export interface SupabaseUser {
  id?: string;
  firebase_uid?: string;
  email: string;
  name?: string;
  full_name?: string;
  role: string;
  class: string;
  section: string;
  house: string;
  profile_image: string;
  permissions?: string[];
  created_at?: string;
}

/**
 * Maps a Supabase user row to a frontend UserProfile
 */
export function mapSupabaseUserToProfile(u: any): UserProfile {
  return {
    uid: u.id || u.firebase_uid || '',
    email: u.email,
    name: u.name || 'Student',
    role: u.role as UserRole,
    grade: u.class || 'Grade 10',
    section: (u.section || 'Solara') as SectionType,
    house: (u.house || 'Ruby') as HouseType,
    photoURL: u.profile_image || '',
    avatar: u.profile_image || '',
    accountStatus: 'approved',
    studyHours: 14,
    quizzesTaken: 5,
    streakDays: 8,
    lastLogin: Date.now(),
    permissions: [],
  };
}

/**
 * Maps a frontend UserProfile to a Supabase user row format
 */
export function mapProfileToSupabaseUser(profile: UserProfile): Partial<SupabaseUser> {
  return {
    firebase_uid: profile.uid || '',
    email: profile.email,
    name: profile.name,
    role: profile.role,
    class: profile.grade || 'Grade 10',
    section: profile.section || 'Solara',
    house: profile.house || 'Ruby',
    profile_image: profile.photoURL || profile.avatar || '',
  };
}

/**
 * Fetches a user profile from Supabase by uid
 */
export async function getSupabaseUserProfile(uid: string): Promise<UserProfile | null> {
  console.log('[SUPABASE-USERS] Fetching profile for uid:', uid);
  
  // Query users table, allowing search by id OR firebase_uid to be fully robust
  let { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`id.eq.${uid},firebase_uid.eq.${uid}`)
    .maybeSingle();

  if (error) {
    console.warn('[SUPABASE-USERS] Combined or query failed, trying standard eq:', error);
    const { data: secondTry, error: secondError } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
      
    if (secondError) {
      console.error('[SUPABASE-USERS] Error fetching user profile:', secondError);
      throw secondError;
    }
    data = secondTry;
  }

  if (!data) return null;
  return mapSupabaseUserToProfile(data);
}

/**
 * Creates or updates a user profile in Supabase
 */
export async function saveSupabaseUserProfile(profile: UserProfile): Promise<UserProfile> {
  console.log('[SUPABASE-USERS] Saving user profile:', profile.uid);
  const dbUser = mapProfileToSupabaseUser(profile);

  // Check if user exists
  const { data: existing, error: fetchErr } = await supabase
    .from('users')
    .select('id')
    .or(`id.eq.${profile.uid},firebase_uid.eq.${profile.uid}`)
    .maybeSingle();

  if (fetchErr) {
    console.error('[SUPABASE-USERS] Error checking existing user:', fetchErr);
  }

  let result;
  if (existing) {
    console.log('[SUPABASE-USERS] Updating existing row id:', existing.id);
    const { data, error } = await supabase
      .from('users')
      .update(dbUser)
      .or(`id.eq.${profile.uid},firebase_uid.eq.${profile.uid}`)
      .select()
      .single();

    if (error) {
      console.error('[SUPABASE-USERS] Update error:', error);
      throw error;
    }
    result = data;
  } else {
    // To be perfectly robust for both schemas, we write both `id` and `firebase_uid`
    const insertPayload = {
      id: profile.uid,
      ...dbUser
    };
    console.log('[SUPABASE-USERS] Inserting new row for:', profile.uid, 'Data:', JSON.stringify(insertPayload));
    const { data, error } = await supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.warn('[SUPABASE-USERS] Conflict on email, trying update by email:', dbUser.email);
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update(dbUser)
          .eq('email', dbUser.email)
          .select()
          .single();
        if (updateError) throw updateError;
        result = updateData;
      } else {
        console.error('[SUPABASE-USERS] Insert error details:', JSON.stringify(error));
        console.error('[SUPABASE-USERS] Insert error:', error);
        throw error;
      }
    } else {
      result = data;
    }
  }

  return mapSupabaseUserToProfile(result);
}

/**
 * Fetches all registered users from Supabase
 */
export async function fetchAllSupabaseUsers(): Promise<UserProfile[]> {
  console.log('[SUPABASE-USERS] Fetching all registered users...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[SUPABASE-USERS] Error fetching all users:', error);
    throw error;
  }

  return (data || []).map(mapSupabaseUserToProfile);
}

/**
 * Deletes a user profile from Supabase
 */
export async function deleteSupabaseUser(uid: string): Promise<void> {
  console.log('[SUPABASE-USERS] Deleting user with firebase_uid:', uid);
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('firebase_uid', uid);

  if (error) {
    console.error('[SUPABASE-USERS] Error deleting user:', error);
    throw error;
  }
}
