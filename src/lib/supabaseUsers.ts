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
  const maxRetries = 15;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation(payload);
    } catch (err: any) {
      const errMsg = err?.message || '';
      const errCode = err?.code;
      
      const isColumnError = 
        errCode === '42703' || 
        errCode === 'PGRST204' ||
        (errMsg.toLowerCase().includes('column') && (
          errMsg.toLowerCase().includes('does not exist') || 
          errMsg.toLowerCase().includes('not found') || 
          errMsg.toLowerCase().includes('could not find')
        ));

      if (isColumnError) {
        // 1. Check Postgres style: column "col"
        let match = errMsg.match(/column "(.*?)"/);
        // 2. Check PostgREST style: 'col' column
        if (!match) {
          match = errMsg.match(/['"](.*?)['"] column/);
        }

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
 * Fetches a user profile from Supabase by uid and optionally email.
 * After locating the user, always returns the profile with uid set to the
 * Supabase auth UUID (the `uid` parameter) so the app always uses the
 * correct identifier regardless of what is stored in firebase_uid.
 */
export async function getSupabaseUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  console.log('[SUPABASE-USERS] Fetching profile for uid:', uid, 'email:', email);
  let data: any = null;
  let foundByEmail = false;

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
        console.log('[SUPABASE-USERS] Found profile by id (UUID match)');
      } else if (err) {
        console.warn('[SUPABASE-USERS] Query by id error:', err.message || err);
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by id threw exception:', e);
    }
  }

  // 2. Try querying by firebase_uid (covers the case where firebase_uid was
  //    previously linked to the Supabase auth UUID by a prior sign-in)
  if (!data) {
    try {
      const { data: res, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('firebase_uid', uid)
        .maybeSingle();
      if (!err && res) {
        data = res;
        console.log('[SUPABASE-USERS] Found profile by firebase_uid');
      } else if (err) {
        console.warn('[SUPABASE-USERS] Query by firebase_uid error:', err.message || err);
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by firebase_uid failed:', e);
    }
  }

  // 3. Try querying by email — this is the critical fallback when an admin
  //    manually added the user to the table before they ever signed in via OAuth.
  //    After finding by email we asynchronously link firebase_uid = uid so
  //    future logins hit steps 1 or 2 instead.
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
        foundByEmail = true;
        console.log('[SUPABASE-USERS] Found profile by email (admin-added user)');
      } else if (err) {
        console.warn('[SUPABASE-USERS] Query by email error:', err.message || err);
      }
    } catch (e) {
      console.warn('[SUPABASE-USERS] Query by email failed:', e);
    }
  }

  if (!data) return null;

  const profile = mapSupabaseUserToProfile(data);

  // Always override uid with the Supabase auth UUID so every part of the app
  // uses the same identifier that Supabase session.user.id returns.
  if (uid && isValidUUID(uid)) {
    profile.uid = uid;
  }

  // If we only found this user by email it means firebase_uid in the row does
  // NOT equal the Supabase auth UUID yet.  Update it now (fire-and-forget) so
  // subsequent sign-ins are resolved by step 2 and the uid stays consistent.
  if (foundByEmail && uid && isValidUUID(uid) && data.firebase_uid !== uid) {
    console.log('[SUPABASE-USERS] Linking Supabase auth UUID to user row found by email…');
    // Wrap in Promise.resolve so we can use .catch — Supabase returns PromiseLike, not Promise.
    Promise.resolve(
      supabase
        .from('users')
        .update({ firebase_uid: uid })
        .eq('id', data.id)
    ).then(({ error }: { error: any }) => {
      if (error) {
        console.warn('[SUPABASE-USERS] Could not link firebase_uid (non-blocking):', error.message || error);
      } else {
        console.log('[SUPABASE-USERS] firebase_uid linked successfully — future logins will be faster');
      }
    }).catch((e: any) => console.warn('[SUPABASE-USERS] firebase_uid link threw (non-blocking):', e));
  }

  return profile;
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

  // Single shared payload used by safeExecuteWithRetry for both UPDATE and INSERT.
  // `id` is intentionally excluded here — it is injected at execution time:
  //   • UPDATE: `id` must never be in the SET clause (can't mutate a primary key)
  //   • INSERT: `id` is added fresh at the moment of insertion so it is not subject
  //             to column-stripping by safeExecuteWithRetry (which works on this payload)
  const sharedPayload: any = {
    firebase_uid: profile.uid,   // links / sets the Supabase auth UUID
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

  // executeOperation receives the progressively-stripped payload from safeExecuteWithRetry.
  // For INSERT, `id` is added at this point so it is never part of the strippable payload
  // and therefore survives all retry iterations.
  const executeOperation = async (pl: any) => {
    if (existing) {
      console.log('[SUPABASE-USERS] Updating existing row in users:', existing.id || existing.firebase_uid);
      // IMPORTANT: Supabase query builder returns a NEW object on each chain call.
      // The .eq() filter MUST be chained directly — never assigned as a side-effect.
      // pl never contains `id`, so the primary key is never mutated.
      let updateQuery;
      if (existing.id) {
        updateQuery = supabase.from('users').update(pl).eq('id', existing.id).select().single();
      } else {
        updateQuery = supabase.from('users').update(pl).eq('firebase_uid', profile.uid).select().single();
      }
      const { data, error } = await updateQuery;
      if (error) throw error;
      return data;
    } else {
      console.log('[SUPABASE-USERS] Inserting new row in users');
      // Add `id` here so it is always present for inserts regardless of which
      // columns were stripped from `pl` by the retry loop.
      const insertData = isValidUUID(profile.uid) ? { ...pl, id: profile.uid } : pl;
      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  };

  try {
    const result = await safeExecuteWithRetry(executeOperation, sharedPayload);
    const savedProfile = mapSupabaseUserToProfile(result);
    // Ensure returned uid always reflects the Supabase auth UUID
    if (profile.uid && isValidUUID(profile.uid)) {
      savedProfile.uid = profile.uid;
    }
    return savedProfile;
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
