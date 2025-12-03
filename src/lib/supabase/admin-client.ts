import { createClient } from '@supabase/supabase-js';
// We use process.env directly here because this file will ONLY run on the server.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client has admin privileges and bypasses RLS.
export const createAdminClient = () => {
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase admin environment variables are not set.');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false, // Prevents trying to save session in browser context
    },
  });
};
