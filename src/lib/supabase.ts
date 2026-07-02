import { createClient } from '@supabase/supabase-js';
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
console.log('[DEBUG-SUPABASE] Initializing Supabase client with URL:', supabaseUrl);
console.log('[DEBUG-SUPABASE] Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
