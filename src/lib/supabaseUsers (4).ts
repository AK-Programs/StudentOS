import { supabase } from './supabase';
import { UserProfile, UserRole } from '../types';

export interface SupabaseUser {
  id?: string;
  email: string;
  full_name: string;
  role: string;
  permissions?: string[];
  created_at?: string;
}

/**
 * Maps a Supabase user row to a frontend UserProfile
 */
export function mapSupabaseUserToProfile(u: any): UserProfile {
  return {
    uid: u.id || u.uid || u.firebase_uid || '',
    email: u.email?.toLowerCase(),
    name: u.name || u.full_name || 'Student',
    role: u.role as UserRole,
    permissions: u.permissions || [],
    grade: u.grade || u.class || '',
    section: u.section || '',
    house: u.house || '',
    department: u.department || null,
    subjects: u.subjects || [],
    specialtySubject: u.specialty_subject || null,
    designation: u.designation || null,
    photoURL: u.photo_url || u.profile_image || u.photoURL || '',
    avatar: u.photo_url || u.profile_image || u.photoURL || '',
    accountStatus: u.account_status || u.accountStatus || 'approved',
    pin: u.pin || '',
    requestedRole: u.requested_role || u.requestedRole || u.role,
    studyHours: u.studyHours || 14,
    quizzesTaken: u.quizzesTaken || 5,
    streakDays: u.streakDays || 8,
    lastLogin: u.lastLogin || Date.now(),
    raw_data: u.raw_data || null,
  };
}

/**
 * Maps a frontend UserProfile to a Supabase user row format
 */
export function mapProfileToSupabaseUser(profile: UserProfile): Partial<SupabaseUser> {
  return {
    email: profile.email?.toLowerCase(),
    full_name: profile.name,
    role: profile.role,
    permissions: profile.permissions || [],
  };
}

/**
 * Checks if a string is a valid UUID
 */
function isValidUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Fetches a user profile from Supabase user_profiles table.
 * If not found, falls back to old `users` table for legacy compatibility.
 */
export async function getSupabaseUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  console.log('[SUPABASE-USERS] Fetching profile for uid:', uid, 'email:', email);
  let data: any = null;

  // 1. Try querying by id if it is a valid UUID
  if (isValidUUID(uid)) {
    try {
      const { data: res, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (!err && res) {
        data = res;
        console.log('[SUPABASE-USERS] Found profile by id in user_profiles');
      }
    } catch (e) { }
  }

  // 2. Fallback to email in user_profiles
  if (!data && email) {
    try {
      const normalized = email.toLowerCase();
      const { data: res, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();
      if (!err && res) {
        data = res;
        console.log('[SUPABASE-USERS] Found profile by email in user_profiles');
      }
    } catch (e) { }
  }

  // 3. Fallback to old `users` table
  let foundInLegacy = false;
  if (!data) {
    try {
      if (isValidUUID(uid)) {
        const { data: oldRes } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
        if (oldRes) data = oldRes;
      }
      if (!data && email) {
        const { data: oldRes } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
        if (oldRes) data = oldRes;
      }
      if (!data) {
        const { data: oldRes } = await supabase.from('users').select('*').eq('firebase_uid', uid).maybeSingle();
        if (oldRes) data = oldRes;
      }
      if (data) {
        console.log('[SUPABASE-USERS] Profile found in legacy users table, will map correctly.');
        foundInLegacy = true;
      }
    } catch (e) {}
  }

  if (!data) return null;

  const profile = mapSupabaseUserToProfile(data);

  if (uid && isValidUUID(uid)) {
    profile.uid = uid;
  }

  // Backfill to new table
  if (foundInLegacy) {
    console.log('[SUPABASE-USERS] Migrating legacy profile to user_profiles table');
    saveSupabaseUserProfile(profile).catch(err => console.error("Failed to migrate legacy profile", err));
  }

  return profile;
}

/**
 * Creates or updates a user profile in Supabase `user_profiles` table.
 */
export async function saveSupabaseUserProfile(profile: UserProfile): Promise<UserProfile> {
  console.log('[SUPABASE-USERS] Saving user profile:', profile.uid);

  let targetId = profile.uid;

  if (!isValidUUID(targetId!)) {
     console.warn("[SUPABASE-USERS] Cannot save to user_profiles with non-UUID id:", targetId);
     return profile;
  }

  const upsertData: any = {
    id: targetId,
    uid: targetId,
    email: profile.email?.toLowerCase() || '',
    name: profile.name || '',
    role: profile.role || 'student',
    grade: profile.grade || null,
    section: profile.section || null,
    house: profile.house || null,
    department: (profile as any).department || null,
    subjects: (profile as any).subjects || [],
    specialty_subject: (profile as any).specialtySubject || null,
    designation: (profile as any).designation || null,
    photo_url: profile.photoURL || null,
    requested_role: profile.requestedRole || profile.role,
    account_status: profile.accountStatus || 'approved',
    raw_data: profile.raw_data || null,
  };

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(upsertData, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    
    return mapSupabaseUserToProfile(data);
  } catch (error) {
    console.error('[SUPABASE-USERS] Failed to save user profile:', error);
    throw error;
  }
}

/**
 * Fetches all registered users from Supabase `user_profiles`
 */
export async function fetchAllSupabaseUsers(): Promise<UserProfile[]> {
  console.log('[SUPABASE-USERS] Fetching all registered users...');
  
  const results: UserProfile[] = [];
  const addedIds = new Set<string>();

  // Fetch from user_profiles
  const { data: profiles, error: pErr } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!pErr && profiles) {
    profiles.forEach(p => {
      const mapped = mapSupabaseUserToProfile(p);
      results.push(mapped);
      addedIds.add(mapped.uid || '');
    });
  }

  // Fallback to old users table for un-migrated users
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (!uErr && users) {
    users.forEach(u => {
      const mapped = mapSupabaseUserToProfile(u);
      if (mapped.uid && !addedIds.has(mapped.uid)) {
        results.push(mapped);
        addedIds.add(mapped.uid);
      }
    });
  }
  
  return results;
}

/**
 * Deletes a user profile from Supabase
 */
export async function deleteSupabaseUser(uid: string): Promise<void> {
  console.log('[SUPABASE-USERS] Deleting user with id:', uid);
  
  // Delete from user_profiles
  if (isValidUUID(uid)) {
    const { error: pErr } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', uid);
    if (pErr) console.error('[SUPABASE-USERS] Error deleting from user_profiles:', pErr);
  }

  // Delete from legacy users table just in case
  const { error: uErr } = await supabase
    .from('users')
    .delete()
    .eq(isValidUUID(uid) ? 'id' : 'firebase_uid', uid);

  if (uErr) {
    console.warn('[SUPABASE-USERS] Could not delete from legacy users table (might be fine):', uErr);
  }
}
