import { supabase } from './supabase';
import { getSupabaseUserProfile, saveSupabaseUserProfile } from './supabaseUsers';
import type { UserProfile } from '../types';

/**
 * Initialize Supabase auth listener and session handling.
 * Call initSupabaseAuthListener(setProfile) from your app's root (e.g. App component)
 * setProfile should accept a UserProfile | null and update your app state.
 */
export function initSupabaseAuthListener(setProfile: (p: UserProfile | null) => void) {
  // Immediately check current session on load
  (async () => {
    try {
      const sessionRes: any = await supabase.auth.getSession();
      const session = sessionRes?.data?.session;
      const user = session?.user;
      if (user) {
        await handleSession(user, setProfile);
      }
    } catch (e) {
      console.warn('[AUTH-LISTENER] getSession failed:', e);
    }
  })();

  // Subscribe to auth state changes
  try {
    supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const user = session?.user;
      if (user) {
        await handleSession(user, setProfile);
      } else {
        setProfile(null);
      }
    });
  } catch (e) {
    console.warn('[AUTH-LISTENER] onAuthStateChange subscription failed:', e);
  }
}

async function handleSession(user: any, setProfile: (p: UserProfile | null) => void) {
  try {
    const uid = user.id;
    const email = (user.email || user.user_metadata?.email || user.user_metadata?.email_address || '').toLowerCase();

    let profile = await getSupabaseUserProfile(uid, email);
    if (!profile && email) {
      // Create a minimal profile for new signups
      const newProfile: UserProfile = {
        uid,
        email,
        name: (user.user_metadata?.full_name || user.user_metadata?.name || '').trim() || 'Student',
        role: 'student'
      };
      try {
        profile = await saveSupabaseUserProfile(newProfile);
      } catch (e) {
        console.error('[AUTH-HANDLE] Failed to create new Supabase profile:', e);
      }
    }

    setProfile(profile);
  } catch (e) {
    console.error('[AUTH-HANDLE] Error handling session:', e);
    setProfile(null);
  }
}

export async function signInWithGoogle(): Promise<any> {
  try {
    return await supabase.auth.signInWithOAuth({ provider: 'google' });
  } catch (e) {
    console.error('[AUTH] signInWithGoogle failed:', e);
    throw e;
  }
}
