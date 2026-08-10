/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (keys: string[]): string => {
  for (const key of keys) {
    const val = (import.meta.env as any)[key];
    if (val && typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  return '';
};

const supabaseUrl = getEnvVar([
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
]) || 'https://tojiucixrcnpmxlshbll.supabase.co';

const supabaseAnonKey = getEnvVar([
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
]) || 'sb_publishable_TUQ8gQHIV3f7bSajBth51Q_m7fxgdZv';

let client: SupabaseClient | null = null;
let isConfigured = false;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co') {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    isConfigured = true;
  } catch (err) {
    console.warn('Gagal menginisialisasi Supabase client:', err);
    client = null;
    isConfigured = false;
  }
}

export const isSupabaseConfigured = isConfigured;
export const supabase = client;



