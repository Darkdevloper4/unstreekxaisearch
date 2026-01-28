-- =============================================================================
-- STREEKX FINAL DATABASE SCHEMA
-- Compatible with Custom Auth & Realtime Workspace (Frontend Aligned)
-- =============================================================================

-- 1. Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean up existing tables to ensure a clean slate
DROP PUBLICATION IF EXISTS supabase_realtime;
DROP TABLE IF EXISTS public.messages;
DROP TABLE IF EXISTS public.search_history; -- Legacy cleanup
DROP TABLE IF EXISTS public.workspaces;
DROP TABLE IF EXISTS public.projects; -- Legacy cleanup
DROP TABLE IF EXISTS public.users;

-- =============================================================================
-- 3. Create USERS Table
-- Stores custom identity data (StreekX ID, Password Hash, Profile)
-- =============================================================================
CREATE TABLE public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  streekx_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT 'New StreekX Explorer',
  phone TEXT,
  gender TEXT,
  dob DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 4. Create MESSAGES Table (Replaces Search History)
-- Stores chat logs, queries, and roles (Perplexity Style)
-- =============================================================================
CREATE TABLE public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user' or 'model'
  session_id TEXT, -- To group chat threads
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 5. Create WORKSPACES Table (Replaces Projects)
-- Stores Research Collections
-- =============================================================================
CREATE TABLE public.workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  last_modified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 6. Security Policies (Row Level Security)
-- =============================================================================
-- Since your app uses Custom Auth, we enable RLS but set policies to 'true' 
-- so the App can manage logic.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access for Custom Auth" ON public.users 
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access for Custom Auth" ON public.messages 
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow Public Access for Custom Auth" ON public.workspaces 
FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- 7. Enable Real-time
-- CRITICAL: This allows the frontend to update instantly when data changes
-- =============================================================================
CREATE PUBLICATION supabase_realtime FOR TABLE public.workspaces, public.messages, public.users;