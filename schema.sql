-- Enable the uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create an enum for application roles safely
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('owner', 'pastor', 'manager', 'leader');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create a table for departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create a table for profiles linked to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  role app_role DEFAULT 'leader',
  department_id UUID REFERENCES departments(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles." ON profiles;
DROP POLICY IF EXISTS "Departments are viewable by authenticated users." ON departments;

-- Re-create Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profiles." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Re-create Policies for Departments
CREATE POLICY "Departments are viewable by authenticated users." ON departments
  FOR SELECT USING (auth.role() = 'authenticated');

-- Example Insert for Initial Testing (Optional)
-- INSERT INTO departments (name, description) VALUES ('Media', 'Photography, Video and Sound');
-- INSERT INTO departments (name, description) VALUES ('Music', 'Worship and Praise Team');
