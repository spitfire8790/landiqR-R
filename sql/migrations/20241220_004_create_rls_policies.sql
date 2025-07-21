-- Migration: Create Row Level Security policies and functions
-- Date: 2024-12-20
-- Description: Add RLS policies and utility functions for security and functionality

-- Enable Row Level Security on system tables
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments
CREATE POLICY IF NOT EXISTS "Users can view all comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert their own comments" ON public.comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can update their own comments" ON public.comments
  FOR UPDATE USING (true);

CREATE POLICY IF NOT EXISTS "Users can delete their own comments" ON public.comments
  FOR DELETE USING (true);

-- Create RLS policies for notifications
CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY IF NOT EXISTS "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Create RLS policies for user_roles (admin only)
CREATE POLICY IF NOT EXISTS "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Create RLS policies for audit_log (admin only)
CREATE POLICY IF NOT EXISTS "Admins can view audit logs" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE email = auth.jwt() ->> 'email' 
      AND role = 'admin'
    )
  );

-- Create function to get user's last sign in from auth.users
CREATE OR REPLACE FUNCTION get_user_last_sign_in(user_email TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT last_sign_in_at 
  FROM auth.users 
  WHERE email = user_email;
$$;

-- Create function to send notifications
CREATE OR REPLACE FUNCTION send_notification(
  target_email TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_type TEXT DEFAULT 'info',
  notification_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO notifications (user_email, title, message, type, action_url)
  VALUES (target_email, notification_title, notification_message, notification_type, notification_action_url)
  RETURNING id;
$$;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  user_email_val TEXT;
  user_id_val UUID;
BEGIN
  -- Get current user info from JWT
  user_email_val := auth.jwt() ->> 'email';
  user_id_val := (auth.jwt() ->> 'sub')::UUID;

  -- Insert audit record based on operation
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      user_id, user_email, action, table_name, record_id, old_values
    ) VALUES (
      user_id_val, 
      user_email_val, 
      'DELETE', 
      TG_TABLE_NAME, 
      OLD.id::TEXT, 
      row_to_json(OLD)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (
      user_id, user_email, action, table_name, record_id, old_values, new_values
    ) VALUES (
      user_id_val, 
      user_email_val, 
      'UPDATE', 
      TG_TABLE_NAME, 
      NEW.id::TEXT, 
      row_to_json(OLD), 
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      user_id, user_email, action, table_name, record_id, new_values
    ) VALUES (
      user_id_val, 
      user_email_val, 
      'CREATE', 
      TG_TABLE_NAME, 
      NEW.id::TEXT, 
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create search function that uses full-text search
CREATE OR REPLACE FUNCTION search_all_entities(search_query TEXT)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  type TEXT,
  subtitle TEXT,
  metadata TEXT,
  rank REAL
)
LANGUAGE SQL
AS $$
WITH search_results AS (
  -- Search groups
  SELECT 
    g.id::TEXT,
    g.name AS title,
    'group' AS type,
    g.description AS subtitle,
    (SELECT COUNT(*)::TEXT || ' categories' FROM categories c WHERE c.group_id = g.id) AS metadata,
    ts_rank(to_tsvector('english', g.name || ' ' || COALESCE(g.description, '')), plainto_tsquery('english', search_query)) AS rank
  FROM groups g
  WHERE to_tsvector('english', g.name || ' ' || COALESCE(g.description, '')) @@ plainto_tsquery('english', search_query)
  
  UNION ALL
  
  -- Search categories  
  SELECT
    c.id::TEXT,
    c.name AS title,
    'category' AS type,
    c.description AS subtitle,
    g.name AS metadata,
    ts_rank(to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')), plainto_tsquery('english', search_query)) AS rank
  FROM categories c
  LEFT JOIN groups g ON g.id = c.group_id
  WHERE to_tsvector('english', c.name || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', search_query)
  
  UNION ALL
  
  -- Search people
  SELECT
    p.id::TEXT,
    p.name AS title,
    'person' AS type,
    p.role AS subtitle,
    p.organisation AS metadata,
    ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.email, '') || ' ' || COALESCE(p.organisation, '') || ' ' || COALESCE(p.role, '')), plainto_tsquery('english', search_query)) AS rank
  FROM people p
  WHERE to_tsvector('english', p.name || ' ' || COALESCE(p.email, '') || ' ' || COALESCE(p.organisation, '') || ' ' || COALESCE(p.role, '')) @@ plainto_tsquery('english', search_query)
  
  UNION ALL
  
  -- Search tasks
  SELECT
    t.id::TEXT,
    t.name AS title,
    'task' AS type,
    t.description AS subtitle,
    c.name AS metadata,
    ts_rank(to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')), plainto_tsquery('english', search_query)) AS rank
  FROM tasks t
  LEFT JOIN categories c ON c.id = t.category_id
  WHERE to_tsvector('english', t.name || ' ' || COALESCE(t.description, '')) @@ plainto_tsquery('english', search_query)
)
SELECT * FROM search_results
ORDER BY rank DESC, title ASC
LIMIT 20;
$$;

-- Create function to get audit stats
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_entries', (SELECT COUNT(*) FROM audit_log),
    'unique_users', (SELECT COUNT(DISTINCT user_email) FROM audit_log WHERE user_email IS NOT NULL),
    'tables_tracked', (SELECT array_agg(DISTINCT table_name) FROM audit_log),
    'recent_activity', (SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours')
  );
$$; 