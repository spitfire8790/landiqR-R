import { supabase } from "./supabase";
import { createToastHelpers } from "./toast";

export interface Notification {
  id: string;
  user_email: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  action_url?: string;
  read: boolean;
  created_at: string;
}

// Setup notifications table and realtime
export async function setupNotificationSystem(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create notifications table
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_email TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
          action_url TEXT,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        -- Users can only see their own notifications
        CREATE POLICY IF NOT EXISTS "Users can view own notifications" ON notifications
          FOR SELECT USING (user_email = auth.jwt() ->> 'email');

        -- Users can mark their own notifications as read
        CREATE POLICY IF NOT EXISTS "Users can update own notifications" ON notifications
          FOR UPDATE USING (user_email = auth.jwt() ->> 'email');

        -- System can insert notifications for any user
        CREATE POLICY IF NOT EXISTS "System can insert notifications" ON notifications
          FOR INSERT WITH CHECK (true);

        -- Enable realtime for notifications table
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

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

        -- Create function to notify on task assignments
        CREATE OR REPLACE FUNCTION notify_task_assignment()
        RETURNS TRIGGER AS $$
        DECLARE
          person_rec RECORD;
          task_rec RECORD;
        BEGIN
          -- Get person details
          SELECT * INTO person_rec FROM people WHERE id = NEW."personId";
          
          -- Get task details  
          SELECT * INTO task_rec FROM tasks WHERE id = NEW."taskId";
          
          -- Send notification if person has email
          IF person_rec.email IS NOT NULL AND task_rec.name IS NOT NULL THEN
            PERFORM send_notification(
              person_rec.email,
              'New Task Assignment',
              'You have been assigned to task: ' || task_rec.name,
              'info',
              '/tasks/' || task_rec.id
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create trigger for task assignments
        DROP TRIGGER IF EXISTS task_assignment_notification ON task_allocations;
        CREATE TRIGGER task_assignment_notification
          AFTER INSERT ON task_allocations
          FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();

        -- Create function to notify on responsibility assignments
        CREATE OR REPLACE FUNCTION notify_responsibility_assignment()
        RETURNS TRIGGER AS $$
        DECLARE
          person_rec RECORD;
          task_rec RECORD;
        BEGIN
          -- Get person details
          SELECT * INTO person_rec FROM people WHERE id = NEW."personId";
          
          -- Get task details  
          SELECT * INTO task_rec FROM tasks WHERE id = NEW."taskId";
          
          -- Send notification if person has email
          IF person_rec.email IS NOT NULL AND task_rec.name IS NOT NULL THEN
            PERFORM send_notification(
              person_rec.email,
              'New Responsibility Assignment',
              'You have new responsibilities for task: ' || task_rec.name,
              'info',
              '/tasks/' || task_rec.id
            );
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Create trigger for responsibility assignments (assuming responsibilities table exists)
        -- DROP TRIGGER IF EXISTS responsibility_assignment_notification ON responsibilities;
        -- CREATE TRIGGER responsibility_assignment_notification
        --   AFTER INSERT ON responsibilities
        --   FOR EACH ROW EXECUTE FUNCTION notify_responsibility_assignment();
      `
    });

    if (error) {
      console.error('Error setting up notification system:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting up notification system:', error);
    return false;
  }
}

// Fetch notifications for current user
export async function fetchNotifications(limit: number = 50): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    return !error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    return !error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

// Get unread notification count
export async function getUnreadCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Send custom notification
export async function sendNotification(
  userEmail: string,
  title: string,
  message: string,
  type: "info" | "success" | "warning" | "error" = "info",
  actionUrl?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('send_notification', {
      target_email: userEmail,
      notification_title: title,
      notification_message: message,
      notification_type: type,
      notification_action_url: actionUrl,
    });

    return !error;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

// Subscribe to realtime notifications
export function subscribeToNotifications(
  userEmail: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_email=eq.${userEmail}`,
      },
      (payload) => {
        const notification = payload.new as Notification;
        onNotification(notification);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// React hook for notifications
export function useNotifications(userEmail?: string) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const toast = createToastHelpers();

  React.useEffect(() => {
    if (!userEmail) return;

    // Initial load
    loadNotifications();
    loadUnreadCount();

    // Setup realtime subscription
    const unsubscribe = subscribeToNotifications(userEmail, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast for new notifications
      toast.success(notification.title, notification.message);
    });

    return unsubscribe;
  }, [userEmail]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const success = await markNotificationAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: loadNotifications,
  };
}

// Export for React import
import React from 'react'; 