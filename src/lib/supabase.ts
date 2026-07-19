import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://zwpoutanhsujezglbson.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cG91dGFuaHN1amV6Z2xic29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTA2MDEsImV4cCI6MjA5NzI2NjYwMX0' +
  '.Y48u9duD3WohxzDD6czXevPaG1mFRFS0rdRuu4840pQ';

const getEnvVar = (key: string, defaultValue: string): string => {
  // Key Injects 
  let val = '';
  if (key === 'VITE_SUPABASE_URL') {
    val = import.meta.env.VITE_SUPABASE_URL;
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    val = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  // Fallback
  if (!val) {
    const metaEnv = (import.meta as any).env;
    const processEnv = typeof process !== 'undefined' ? (process as any).env : null;
    val = metaEnv?.[key] || processEnv?.[key] || '';
  }

  if (!val) return defaultValue;

  // Validation
  let clean = String(val).trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1).trim();
  }

  if (key === 'VITE_SUPABASE_ANON_KEY' && clean.split('.').length < 3) {
    console.warn('[SUPABASE] VITE_SUPABASE_ANON_KEY appears truncated (missing JWT signature) — using built-in default key.');
    return defaultValue;
  }

  return clean;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', DEFAULT_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});
