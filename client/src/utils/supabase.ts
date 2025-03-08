import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Frontend Supabase URL:', supabaseUrl);
console.log('Frontend Supabase Anon Key (partial):', supabaseAnonKey.slice(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 