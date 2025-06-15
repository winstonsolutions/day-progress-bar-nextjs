# Migrating from PostgreSQL to Supabase

This document outlines the steps taken to migrate the Day Progress Bar application from PostgreSQL to Supabase.

## What is Supabase?

Supabase is an open source Firebase alternative providing all the backend features developers need to build a product:
- PostgreSQL Database
- Authentication
- Auto-generated APIs
- Realtime subscriptions
- Storage
- Functions

Importantly, Supabase is built on top of PostgreSQL, so the migration is essentially a move from self-managed PostgreSQL to a fully managed PostgreSQL service with additional features.

## Changes Made

1. **Added Supabase dependencies**:
   - Added `@supabase/supabase-js` package
   - Removed direct PostgreSQL dependencies (`pg`, `pg-hstore`, `sequelize`)

2. **Created Supabase client configuration**:
   - Created `src/lib/db.ts` file for Supabase client initialization
   - Added TypeScript type support via `schema.ts` file

3. **Environment variables**:
   - Provided template `.env.example` file for required Supabase variables
   - Required environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous API key

4. **Updated API endpoints**:
   - Modified API endpoints to use Supabase client instead of direct PostgreSQL queries
   - Updated Clerk webhook handler to store user data in Supabase

## Database Schema

The following tables were created in Supabase:

1. **users**:
   - `id`: UUID (Primary Key)
   - `clerk_id`: String (unique identifier from Clerk)
   - `email`: String
   - `first_name`: String (nullable)
   - `last_name`: String (nullable)
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

2. **user_preferences**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key to users.id)
   - `theme`: String
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

3. **licenses**:
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key to users.id)
   - `license_key`: String
   - `expires_at`: Timestamp (nullable)
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

## Migration Steps

### 1. Set Up Supabase Project

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. From the Supabase dashboard, get your project URL and anon key
3. Create these environment variables in your deployment environment

### 2. Create Database Schema

Run the following SQL in the Supabase SQL Editor to create your tables:

```sql
-- Users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User preferences table
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Licenses table
CREATE TABLE public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add row-level security policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid()::text = clerk_id);

CREATE POLICY "Users can read their own preferences" ON public.user_preferences
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT clerk_id FROM public.users WHERE id = user_id
    )
  );

CREATE POLICY "Users can read their own licenses" ON public.licenses
  FOR SELECT USING (
    auth.uid()::text IN (
      SELECT clerk_id FROM public.users WHERE id = user_id
    )
  );
```

### 3. Migrate Existing Data

If you have existing data in PostgreSQL, you can export it and import it to Supabase:

1. Export data from PostgreSQL:
   ```bash
   pg_dump -t users -t user_preferences -t licenses --data-only --column-inserts your_db > data.sql
   ```

2. Modify the SQL script as needed to match the new schema

3. Import the data into Supabase using the SQL Editor

### 4. Update Application Dependencies

1. Install Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Update your `.env` file with Supabase credentials

### 5. Deploy Your Application

Deploy your updated application with the Supabase integration.

## Benefits of This Migration

1. **Managed Service**: No need to manage database infrastructure
2. **Built-in API**: Automatic REST and GraphQL APIs
3. **Row-Level Security**: Fine-grained access control
4. **Realtime**: Subscribe to database changes
5. **Additional Features**: Storage, Edge Functions, etc.

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/start)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)