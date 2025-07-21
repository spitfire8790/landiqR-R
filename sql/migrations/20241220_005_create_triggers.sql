-- Migration: Create database triggers
-- Date: 2024-12-20
-- Description: Create triggers for audit logging and automatic notifications

-- Create audit triggers for all main tables
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

DROP TRIGGER IF EXISTS audit_task_allocations_trigger ON task_allocations;
CREATE TRIGGER audit_task_allocations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON task_allocations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_responsibilities_trigger ON responsibilities;
CREATE TRIGGER audit_responsibilities_trigger
  AFTER INSERT OR UPDATE OR DELETE ON responsibilities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_user_roles_trigger ON user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to notify on task assignments
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  person_rec RECORD;
  task_rec RECORD;
BEGIN
  -- Get person details
  SELECT * INTO person_rec FROM people WHERE id = NEW.person_id;
  
  -- Get task details  
  SELECT * INTO task_rec FROM tasks WHERE id = NEW.task_id;
  
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
  -- Only proceed if a person is assigned
  IF NEW.assigned_person_id IS NOT NULL THEN
    -- Get person details
    SELECT * INTO person_rec FROM people WHERE id = NEW.assigned_person_id;
    
    -- Get task details  
    SELECT * INTO task_rec FROM tasks WHERE id = NEW.task_id;
    
    -- Send notification if person has email
    IF person_rec.email IS NOT NULL AND task_rec.name IS NOT NULL THEN
      PERFORM send_notification(
        person_rec.email,
        'New Responsibility Assignment',
        'You have new responsibilities for task: ' || task_rec.name || ' - ' || NEW.description,
        'info',
        '/tasks/' || task_rec.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for responsibility assignments
DROP TRIGGER IF EXISTS responsibility_assignment_notification ON responsibilities;
CREATE TRIGGER responsibility_assignment_notification
  AFTER INSERT OR UPDATE ON responsibilities
  FOR EACH ROW EXECUTE FUNCTION notify_responsibility_assignment(); 