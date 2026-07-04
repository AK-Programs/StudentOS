import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  // Try static import first (for Vite build optimization)
  let val = '';
  if (key === 'VITE_SUPABASE_URL') {
    val = import.meta.env.VITE_SUPABASE_URL;
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    val = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  
  // Fallback to dynamic lookup safely without triggering ReferenceError on 'process'
  if (!val) {
    const metaEnv = (import.meta as any).env;
    const processEnv = typeof process !== 'undefined' ? (process as any).env : null;
    val = metaEnv?.[key] || processEnv?.[key] || '';
  }
  
  if (!val) return '';
  
  // Clean up any potential surrounding quotes (single/double) and whitespace/newlines
  let clean = String(val).trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1).trim();
  }
  return clean;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

console.log('[DEBUG-SUPABASE] Sanitized Supabase URL:', supabaseUrl);
console.log('[DEBUG-SUPABASE] Sanitized Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

// Attach to window so the Diagnostic UI can safely inspect the active values
(window as any).__SUPABASE_CONFIG__ = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  rawUrl: import.meta.env.VITE_SUPABASE_URL || '',
  rawKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});
