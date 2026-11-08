import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.warn('[AuraDental] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', publishableKey || 'missing-publishable-key', {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});
