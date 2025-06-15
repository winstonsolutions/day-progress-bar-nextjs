import { createClient } from '@supabase/supabase-js';
import type { Database } from './schema';

// Initialize Supabase client with types
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);