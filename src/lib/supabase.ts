import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

/** True only when real Supabase credentials are present. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials missing. Data-backed sections will use their fallbacks.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
