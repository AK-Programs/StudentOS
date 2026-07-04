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
