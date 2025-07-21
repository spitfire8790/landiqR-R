-- Create activity_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view all activity logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "Users can insert their own activity logs" ON public.activity_logs;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- RLS Policies
CREATE POLICY "Users can view all activity logs" ON public.activity_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id); 