import { createClient } from '@supabase/supabase-js';

// The Supabase anon/public key is intentionally public — Supabase designed it to
// be embedded in client-side code (it enforces Row Level Security, not secrecy).
// These hardcoded values are the canonical defaults for this project; they are
// overridden by VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars when set.
const DEFAULT_SUPABASE_URL = 'https://zwpoutanhsujezglbson.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cG91dGFuaHN1amV6Z2xic29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTA2MDEsImV4cCI6MjA5NzI2NjYwMX0' +
  '.Y48u9duD3WohxzDD6czXevPaG1mFRFS0rdRuu4840pQ';

const getEnvVar = (key: string, defaultValue: string): string => {
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

  if (!val) return defaultValue;

  // Clean up any potential surrounding quotes (single/double) and whitespace/newlines
  let clean = String(val).trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.substring(1, clean.length - 1).trim();
  }

  // Validate: a Supabase anon key is a 3-part JWT (header.payload.signature).
  // If the value is truncated (missing signature), fall back to the built-in default.
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
