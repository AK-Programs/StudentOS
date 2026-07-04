import { createClient } from '@supabase/supabase-js';
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
console.log('[DEBUG-SUPABASE] Initializing Supabase client with URL:', supabaseUrl);
console.log('[DEBUG-SUPABASE] Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

// Enable session detection from URL fragments and persistent sessions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true
  }
});

// Runtime guard: prevent accidental raw WebSocket connections to the Vercel host (they return HTTP 200 and break the handshake)
if (typeof window !== 'undefined' && (window as any).WebSocket) {
  try {
    const OriginalWebSocket = (window as any).WebSocket;
    (window as any).WebSocket = function (url: any, protocols?: any) {
      try {
        const str = typeof url === 'string' ? url : String(url);
        const blockedHost = window.location.host;
        if (str.includes(blockedHost) || str.includes('studentos-webapp.vercel.app')) {
          console.warn('[WS GUARD] Blocking raw WebSocket to', str, '- use Supabase Realtime or a proper WebSocket server instead.');
          // Return a harmless stub that matches minimal WebSocket shape
          const stub: any = {
            readyState: 3,
            send: () => {},
            close: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null
          };
          return stub;
        }
      } catch (e) {
        console.warn('[WS GUARD] Error while validating WebSocket target:', e);
      }
      return new OriginalWebSocket(url, protocols);
    } as any;
  } catch (e) {
    console.warn('[WS GUARD] Unable to install WebSocket guard:', e);
  }
}

// Immediately attempt to parse OAuth hash *synchronously* on module load so other modules don't race
// This runs very early because many modules import supabase from this file.
if (typeof window !== 'undefined') {
  try {
    const hash = window.location.hash || '';
    const hasOAuthHash = hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('type=oauth');
    if (hasOAuthHash) {
      (async () => {
        try {
          console.log('[SUPABASE OAUTH PARSE] Detected OAuth hash on module load — parsing session now');
          // getSessionFromUrl parses the URL hash and stores the session in browser storage
          if ((supabase.auth as any).getSessionFromUrl) {
            const res: any = await (supabase.auth as any).getSessionFromUrl();
            console.log('[SUPABASE OAUTH PARSE] getSessionFromUrl result:', res?.data?.session ? 'session set' : res);
            // Clean up the URL to avoid duplicate parsing and accidental leaks
            try {
              history.replaceState(null, '', window.location.pathname + window.location.search);
              console.log('[SUPABASE OAUTH PARSE] Cleared URL hash');
            } catch (e) {
              console.warn('[SUPABASE OAUTH PARSE] Failed to clear URL hash:', e);
            }
          } else {
            console.warn('[SUPABASE OAUTH PARSE] getSessionFromUrl not available on this SDK version');
          }
        } catch (e) {
          console.warn('[SUPABASE OAUTH PARSE] Error while parsing session from URL hash:', e);
        }
      })();
    }
  } catch (e) {
    console.warn('[SUPABASE OAUTH PARSE] URL hash check failed:', e);
  }
}
