import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(configuredUrl && configuredAnonKey);

const supabaseUrl = configuredUrl || 'http://127.0.0.1:55321';
const supabaseAnonKey = configuredAnonKey || 'local-preview-not-configured';

if (!isSupabaseConfigured) {
  console.warn('Supabase credentials are missing. Database-backed features are disabled.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
