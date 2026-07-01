import { createClient } from '@supabase/supabase-js';
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://zwpoutanhsujezglbson.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3cG91dGFuaHN1amV6Z2xic29uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTA2MDEsImV4cCI6MjA5NzI2NjYwMX0.Y48u9duD3WohxzDD6czXevPaG1mFRFS0rdRuu4840pQ';
console.log('[DEBUG-SUPABASE] Initializing Supabase client with URL:', supabaseUrl);
console.log('[DEBUG-SUPABASE] Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
