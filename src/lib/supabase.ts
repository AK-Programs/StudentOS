import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string => {
  // Try static import first (for Vite build optimization)
  let val = '';
  if (key === 'VITE_SUPABASE_URL') {
    val = import.meta.env.VITE_SUPABASE_URL;
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    val = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
  
  // Fallback to dynamic lookup
  if (!val) {
    val = (import.meta as any).env?.[key] || (process as any).env?.[key] || '';
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});
