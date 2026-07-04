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
    uid: u.firebase_uid || u.id || '',
    email: u.email?.toLowerCase(),
    name: u.name || u.full_name || 'Student',
    role: u.role as UserRole,
    permissions: u.permissions || [],
    grade: u.class || u.grade || 'Grade 10',
    section: u.section || 'Solara',
    house: u.house || 'Ruby',
    photoURL: u.profile_image || u.photoURL || '',
    avatar: u.profile_image || u.photoURL || '',
    accountStatus: u.accountStatus || 'approved',
    pin: u.pin || '',
    requestedRole: u.requestedRole || u.role,
    studyHours: u.studyHours || 14,
    quizzesTaken: u.quizzesTaken || 5,
    streakDays: u.streakDays || 8,
    lastLogin: u.lastLogin || Date.now(),
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
 * Trial-and-error executor that automatically detects and strips non-existent columns from Postgres queries
 */
async function safeExecuteWithRetry(operation: (payload: any) => Promise<any>, initialPayload: any): Promise<any> {
  const payload = { ...initialPayload };
  const maxRetries = 12;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation(payload);
    } catch (err: any) {
      const errMsg = err?.message || '';
      const errCode = err?.code;
      
      // If error is undefined column (Postgres 42703) or mentions missing columns
      if (errCode === '42703' || errMsg.includes('column') && (errMsg.includes('does not exist') || errMsg.includes('not found'))) {
        // Attempt to parse the offending column name from the error message
        const match = errMsg.match(/column "(.*?)"/);
        if (match && match[1]) {
          const colName = match[1];
          console.warn(`[SUPABASE-SAFE] Stripping non-existent column "${colName}" and retrying...`);
          delete payload[colName];
          continue;
        } else {
          // Fallback: strip common columns one by one
          const suspects = [
            'permissions', 'full_name', 'name', 'firebase_uid', 'photoURL', 'profile_image', 
            'pin', 'requestedRole', 'accountStatus', 'grade', 'specialtySubject', 'class', 'id'
          ];
          let removedAny = false;
          for (const suspect of suspects) {
            if (suspect in payload) {
              console.warn(`[SUPABASE-SAFE] Stripping suspect column "${suspect}" and retrying...`);
              delete payload[suspect];
              removedAny = true;
              break;
            }
          }
          if (removedAny) continue;
        }
      }
      
      // If it is any other database error, rethrow
      throw err;
    }
  }
  throw new Error("Too many retries attempting to strip non-existent columns from query.");
}

/**
 * Fetches a user profile from Supabase by uid and optionally email
 */
export async function getSupabaseUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  console.log('[SUPABASE-USERS] Fetching profile for uid:', uid, 'email:', email);
  let data = null;

  // 1. Try querying by id if it is a valid UUID
  if (isValidUUID(uid)) {
    try {
      const { data: res, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (!err && res) {
        data = res;
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by id threw exception (UUID mismatch?):', e);
    }
  }

  // 2. Try querying by firebase_uid
  if (!data) {
    try {
      const { data: res, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', uid)
        .maybeSingle();
      if (!err && res) {
        data = res;
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by firebase_uid failed:', e);
    }
  }

  // 3. Try querying by email (normalized to lowercase)
  if (!data && email) {
    try {
      const normalized = email.toLowerCase();
      const { data: res, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();
      if (!err && res) {
        data = res;
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by email failed:', e);
    }
  }

  if (!data) return null;
  return mapSupabaseUserToProfile(data);
}

/**
 * Creates or updates a user profile in Supabase
 */
export async function saveSupabaseUserProfile(profile: UserProfile): Promise<UserProfile> {
  console.log('[SUPABASE-USERS] Saving user profile:', profile.uid);

  // Check if user exists by id OR firebase_uid OR email
  let existing: any = null;

  if (isValidUUID(profile.uid)) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile.uid)
        .maybeSingle();
      if (data) existing = data;
    } catch (e) {}
  }

  if (!existing) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', profile.uid)
        .maybeSingle();
      if (data) existing = data;
    } catch (e) {}
  }

  if (!existing && profile.email) {
    try {
      const normalized = profile.email.toLowerCase();
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();
      if (data) existing = data;
    } catch (e) {}
  }

  // Construct initial full payload representing all possible database column shapes
  const initialPayload: any = {
    firebase_uid: profile.uid,
    email: profile.email?.toLowerCase(),
    name: profile.name,
    full_name: profile.name,
    role: profile.role,
    class: profile.grade || 'Grade 10',
    grade: profile.grade || 'Grade 10',
    section: profile.section || 'Solara',
    house: profile.house || 'Ruby',
    profile_image: profile.photoURL || '',
    photoURL: profile.photoURL || '',
    pin: profile.pin || '',
    requestedRole: profile.requestedRole || profile.role,
    accountStatus: profile.accountStatus || 'approved'
  };

  // If uid is a valid UUID, we can pass it as the Primary Key id
  if (isValidUUID(profile.uid)) {
    initialPayload.id = profile.uid;
  }

  const executeOperation = async (payload: any) => {
    if (existing) {
      console.log('[SUPABASE-USERS] Updating existing row in users:', existing.id || existing.firebase_uid);
      const query = supabase.from('users').update(payload);
      if (existing.id) {
        query.eq('id', existing.id);
      } else {
        query.eq('firebase_uid', profile.uid);
      }
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    } else {
      console.log('[SUPABASE-USERS] Inserting new row in users');
      const { data, error } = await supabase
        .from('users')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  };

  try {
    const result = await safeExecuteWithRetry(executeOperation, initialPayload);
    return mapSupabaseUserToProfile(result);
  } catch (error) {
    console.error('[SUPABASE-USERS] Failed to save user profile after column retries:', error);
    throw error;
  }
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
  console.log('[SUPABASE-USERS] Deleting user with id:', uid);
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', uid);

  if (error) {
    console.error('[SUPABASE-USERS] Error deleting user:', error);
    throw error;
  }
}
