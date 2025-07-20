import { supabase } from "./supabase";

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  created_at: string;
}

// Create audit log table and triggers
export async function setupAuditSystem(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create audit_log table
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          user_email TEXT,
          action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          old_values JSONB,
          new_values JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_email);
        CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

        -- Enable RLS
        ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

        -- Only admins can view audit logs
        CREATE POLICY IF NOT EXISTS "Admins can view audit logs" ON audit_log
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM user_roles 
              WHERE email = auth.jwt() ->> 'email' 
              AND role = 'admin'
            )
          );

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

        -- Create triggers for all main tables
        DROP TRIGGER IF EXISTS audit_groups_trigger ON groups;
        CREATE TRIGGER audit_groups_trigger
          AFTER INSERT OR UPDATE OR DELETE ON groups
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        DROP TRIGGER IF EXISTS audit_categories_trigger ON categories;
        CREATE TRIGGER audit_categories_trigger
          AFTER INSERT OR UPDATE OR DELETE ON categories
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        DROP TRIGGER IF EXISTS audit_people_trigger ON people;
        CREATE TRIGGER audit_people_trigger
          AFTER INSERT OR UPDATE OR DELETE ON people
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        DROP TRIGGER IF EXISTS audit_tasks_trigger ON tasks;
        CREATE TRIGGER audit_tasks_trigger
          AFTER INSERT OR UPDATE OR DELETE ON tasks
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        DROP TRIGGER IF EXISTS audit_allocations_trigger ON allocations;
        CREATE TRIGGER audit_allocations_trigger
          AFTER INSERT OR UPDATE OR DELETE ON allocations
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

        DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
        CREATE TRIGGER audit_user_roles_trigger
          AFTER INSERT OR UPDATE OR DELETE ON user_roles
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      `
    });

    if (error) {
      console.error('Error setting up audit system:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting up audit system:', error);
    return false;
  }
}

// Fetch audit logs with filtering
export async function fetchAuditLogs(options?: {
  table_name?: string;
  user_email?: string;
  action?: string;
  record_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  try {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (options?.table_name) {
      query = query.eq('table_name', options.table_name);
    }
    if (options?.user_email) {
      query = query.eq('user_email', options.user_email);
    }
    if (options?.action) {
      query = query.eq('action', options.action);
    }
    if (options?.record_id) {
      query = query.eq('record_id', options.record_id);
    }
    if (options?.from_date) {
      query = query.gte('created_at', options.from_date);
    }
    if (options?.to_date) {
      query = query.lte('created_at', options.to_date);
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

// Get audit summary stats
export async function getAuditStats(): Promise<{
  total_entries: number;
  unique_users: number;
  tables_tracked: string[];
  recent_activity: number; // last 24 hours
}> {
  try {
    const { data, error } = await supabase.rpc('get_audit_stats');

    if (error) {
      console.error('Error getting audit stats:', error);
      return {
        total_entries: 0,
        unique_users: 0,
        tables_tracked: [],
        recent_activity: 0
      };
    }

    return data || {
      total_entries: 0,
      unique_users: 0,
      tables_tracked: [],
      recent_activity: 0
    };
  } catch (error) {
    console.error('Error getting audit stats:', error);
    return {
      total_entries: 0,
      unique_users: 0,
      tables_tracked: [],
      recent_activity: 0
    };
  }
}

// Create the stats function
export async function createAuditStatsFunction(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    return !error;
  } catch (error) {
    console.error('Error creating audit stats function:', error);
    return false;
  }
}

// Export audit logs to CSV
export function exportAuditLogsToCsv(logs: AuditLogEntry[]): void {
  const headers = [
    'Timestamp',
    'User Email', 
    'Action',
    'Table',
    'Record ID',
    'Old Values',
    'New Values'
  ];

  const csvContent = [
    headers.join(','),
    ...logs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.user_email || '',
      log.action,
      log.table_name,
      log.record_id,
      log.old_values ? JSON.stringify(log.old_values).replace(/,/g, ';') : '',
      log.new_values ? JSON.stringify(log.new_values).replace(/,/g, ';') : ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Manual audit log entry (for actions not covered by triggers)
export async function logManualAction(
  action: string,
  table_name: string,
  record_id: string,
  details?: Record<string, any>
): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('audit_log')
      .insert({
        user_id: user.user?.id,
        user_email: user.user?.email,
        action: action as any,
        table_name,
        record_id,
        new_values: details,
      });

    return !error;
  } catch (error) {
    console.error('Error logging manual action:', error);
    return false;
  }
} 