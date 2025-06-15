import { createClient } from '@supabase/supabase-js';
import type { Database } from './schema';

// Initialize Supabase client with types
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check .env file.');
}

// Regular client for client-side operations (uses anon key)
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Admin client for server-side operations (uses service role key)
// This bypasses RLS policies and should ONLY be used in server components
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Helper to determine if we're on the server
export const isServer = () => typeof window === 'undefined';