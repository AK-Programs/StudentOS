import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper that attaches the current user's Supabase JWT
 * to outgoing API requests as a Bearer token in the Authorization header.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
