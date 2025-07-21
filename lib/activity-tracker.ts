import { supabase } from "./supabase";

export interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  metadata?: any;
  created_at: string;
}

// Log an activity when user performs an action
export async function logActivity(
  action: string,
  entityType: string, 
  entityId: string,
  entityName: string,
  userEmail?: string,
  userName?: string,
  metadata?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const activityData = {
      user_id: user.id,
      user_email: userEmail || user.email || '',
      user_name: userName || user.email || 'Unknown User',
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      metadata: metadata || {}
    };

    const { error } = await supabase
      .from('activity_logs')
      .insert([activityData]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}

// Fetch recent activities
export async function fetchRecentActivities(limit = 50): Promise<ActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchRecentActivities:', error);
    return [];
  }
}

// Create the activity_logs table (run this in Supabase SQL editor)
export const createActivityLogsTable = `
-- Create activity_logs table
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all activity logs" ON public.activity_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
`;

// Helper functions to log common activities
export const ActivityLogger = {
  // Group activities
  groupCreated: (groupId: string, groupName: string, userEmail?: string, userName?: string) =>
    logActivity('created', 'group', groupId, groupName, userEmail, userName),
  
  groupUpdated: (groupId: string, groupName: string, userEmail?: string, userName?: string) =>
    logActivity('updated', 'group', groupId, groupName, userEmail, userName),
  
  groupDeleted: (groupId: string, groupName: string, userEmail?: string, userName?: string) =>
    logActivity('deleted', 'group', groupId, groupName, userEmail, userName),

  // Task activities  
  taskCreated: (taskId: string, taskName: string, userEmail?: string, userName?: string) =>
    logActivity('created', 'task', taskId, taskName, userEmail, userName),
  
  taskUpdated: (taskId: string, taskName: string, userEmail?: string, userName?: string) =>
    logActivity('updated', 'task', taskId, taskName, userEmail, userName),
  
  taskDeleted: (taskId: string, taskName: string, userEmail?: string, userName?: string) =>
    logActivity('deleted', 'task', taskId, taskName, userEmail, userName),

  // Person activities
  personCreated: (personId: string, personName: string, userEmail?: string, userName?: string) =>
    logActivity('created', 'person', personId, personName, userEmail, userName),
  
  personUpdated: (personId: string, personName: string, userEmail?: string, userName?: string) =>
    logActivity('updated', 'person', personId, personName, userEmail, userName),

  // Category activities  
  categoryCreated: (categoryId: string, categoryName: string, userEmail?: string, userName?: string) =>
    logActivity('created', 'category', categoryId, categoryName, userEmail, userName),
  
  categoryUpdated: (categoryId: string, categoryName: string, userEmail?: string, userName?: string) =>
    logActivity('updated', 'category', categoryId, categoryName, userEmail, userName),

  // Allocation activities
  allocationCreated: (allocationId: string, description: string, userEmail?: string, userName?: string) =>
    logActivity('created', 'allocation', allocationId, description, userEmail, userName),
  
  allocationDeleted: (allocationId: string, description: string, userEmail?: string, userName?: string) =>
    logActivity('deleted', 'allocation', allocationId, description, userEmail, userName),
}; 