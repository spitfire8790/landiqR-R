-- Migration: Create user roles table and functions
-- Date: 2024-12-20
-- Description: Create user_roles table for admin/readonly access control

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'readonly')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON public.user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
  DROP POLICY IF EXISTS "Service role can manage all" ON public.user_roles;
EXCEPTION 
  WHEN undefined_object THEN NULL;
END $$;

-- Create policy that allows users to view their own role (breaks recursion)
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Create policy for service role to manage all (for server-side operations)
CREATE POLICY "Service role can manage all" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Create policy for authenticated users to read (needed for admin checks)
CREATE POLICY "Authenticated users can read" ON public.user_roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to get user's last sign in from auth.users
CREATE OR REPLACE FUNCTION public.get_user_last_sign_in(user_email TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT last_sign_in_at 
  FROM auth.users 
  WHERE email = user_email;
$$;

-- Insert initial admin users
INSERT INTO public.user_roles (email, role) VALUES
  ('james.strutt@dpie.nsw.gov.au', 'admin'),
  ('grace.zhuang@dpie.nsw.gov.au', 'admin'),
  ('bernie.no@dpie.nsw.gov.au', 'admin'),
  ('sarah.kaehne@wsp.com', 'admin'),
  ('robert.baker-turley@dpie.nsw.gov.au', 'admin'),
  ('mark.elakawi@dpie.nsw.gov.au', 'admin'),
  ('jacy.macnee@planning.nsw.gov.au', 'admin'),
  ('andrew.bobrige@dpie.nsw.gov.au', 'admin'),
  ('christina.sun@dpie.nsw.gov.au', 'admin')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- Insert initial readonly users
INSERT INTO public.user_roles (email, role) VALUES
  ('jonathan.thorpe@dpie.nsw.gov.au', 'readonly'),
  ('lucy@giraffe.build', 'readonly'),
  ('adam@giraffe.build', 'readonly'),
  ('loretta.ponting@customerservice.nsw.gov.au', 'readonly')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW(); 