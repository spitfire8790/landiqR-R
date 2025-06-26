-- Land iQ Responsibility App - Database Schema Update
-- Execute these SQL commands in your Supabase SQL editor to add the Tasks layer

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create responsibilities table (replaces workflow_steps)
CREATE TABLE IF NOT EXISTS public.responsibilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    assigned_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    estimated_weekly_hours DECIMAL(5,2) DEFAULT 0,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create task_allocations table
CREATE TABLE IF NOT EXISTS public.task_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(task_id, person_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_task_id ON public.responsibilities(task_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_assigned_person_id ON public.responsibilities(assigned_person_id);
CREATE INDEX IF NOT EXISTS idx_task_allocations_task_id ON public.task_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_allocations_person_id ON public.task_allocations(person_id);

-- Enable Row Level Security (RLS) - adjust policies as needed for your auth setup
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your authentication setup)
-- These are basic policies - you may want to customize based on your auth requirements

-- Tasks policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.tasks;
CREATE POLICY "Enable read access for all users" ON public.tasks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.tasks;
CREATE POLICY "Enable insert for authenticated users" ON public.tasks
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.tasks;
CREATE POLICY "Enable update for authenticated users" ON public.tasks
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.tasks;
CREATE POLICY "Enable delete for authenticated users" ON public.tasks
    FOR DELETE USING (true);

-- Responsibilities policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.responsibilities;
CREATE POLICY "Enable read access for all users" ON public.responsibilities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.responsibilities;
CREATE POLICY "Enable insert for authenticated users" ON public.responsibilities
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.responsibilities;
CREATE POLICY "Enable update for authenticated users" ON public.responsibilities
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.responsibilities;
CREATE POLICY "Enable delete for authenticated users" ON public.responsibilities
    FOR DELETE USING (true);

-- Task allocations policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.task_allocations;
CREATE POLICY "Enable read access for all users" ON public.task_allocations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.task_allocations;
CREATE POLICY "Enable insert for authenticated users" ON public.task_allocations
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.task_allocations;
CREATE POLICY "Enable update for authenticated users" ON public.task_allocations
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.task_allocations;
CREATE POLICY "Enable delete for authenticated users" ON public.task_allocations
    FOR DELETE USING (true);

-- WORKFLOW SYSTEM TABLES --

-- Create workflow_tools table
CREATE TABLE IF NOT EXISTS public.workflow_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    flow_data TEXT NOT NULL, -- JSON stringified React Flow data
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for workflow tables
CREATE INDEX IF NOT EXISTS idx_workflow_tools_category ON public.workflow_tools(category);
CREATE INDEX IF NOT EXISTS idx_workflows_task_id ON public.workflows(task_id);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);

-- Enable RLS for workflow tables
ALTER TABLE public.workflow_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- Workflow tools policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workflow_tools;
CREATE POLICY "Enable read access for all users" ON public.workflow_tools
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.workflow_tools;
CREATE POLICY "Enable insert for authenticated users" ON public.workflow_tools
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.workflow_tools;
CREATE POLICY "Enable update for authenticated users" ON public.workflow_tools
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.workflow_tools;
CREATE POLICY "Enable delete for authenticated users" ON public.workflow_tools
    FOR DELETE USING (true);

-- Workflows policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.workflows;
CREATE POLICY "Enable read access for all users" ON public.workflows
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.workflows;
CREATE POLICY "Enable insert for authenticated users" ON public.workflows
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.workflows;
CREATE POLICY "Enable update for authenticated users" ON public.workflows
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.workflows;
CREATE POLICY "Enable delete for authenticated users" ON public.workflows
    FOR DELETE USING (true);

-- Insert some default workflow tools
INSERT INTO public.workflow_tools (name, description, icon, category) VALUES 
('Data Analysis', 'Analyze data and generate insights', 'BarChart3', 'analysis'),
('Email Communication', 'Send and manage email communications', 'Mail', 'communication'),
('Document Review', 'Review and approve documents', 'FileText', 'review'),
('Database Query', 'Query and extract data from databases', 'Database', 'data-processing'),
('Report Generation', 'Generate reports and summaries', 'FileOutput', 'reporting'),
('Quality Check', 'Perform quality assurance checks', 'CheckCircle2', 'quality'),
('Approval Process', 'Handle approvals and sign-offs', 'Stamp', 'approval'),
('Data Validation', 'Validate data integrity and accuracy', 'Shield', 'validation'),
('Notification System', 'Send notifications and alerts', 'Bell', 'communication'),
('File Processing', 'Process and transform files', 'FileProcessing', 'data-processing')
ON CONFLICT DO NOTHING;

-- Optional: Add some sample data for testing
-- Uncomment the following if you want to add test data

/*
-- Sample task (replace 'your-category-id' with an actual category ID from your database)
INSERT INTO public.tasks (name, description, category_id) VALUES 
('Sample Task', 'This is a sample task for testing the Tasks layer', 'your-category-id');

-- Sample responsibility (replace 'your-task-id' and 'your-person-id' with actual IDs)
INSERT INTO public.responsibilities (description, assigned_person_id, estimated_weekly_hours, task_id) VALUES 
('Review and analyze requirements', 'your-person-id', 5.0, 'your-task-id');

-- Sample task allocation (replace 'your-task-id' and 'your-person-id' with actual IDs)
INSERT INTO public.task_allocations (task_id, person_id, is_lead) VALUES 
('your-task-id', 'your-person-id', true);
*/

-- COMMENT & NOTIFICATION SYSTEM TABLES --

-- Create comments table for discussion threads on tasks and responsibilities
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_type TEXT CHECK (parent_type IN ('task','responsibility')) NOT NULL,
    parent_id UUID NOT NULL,
    author_id UUID NOT NULL REFERENCES public.people(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for faster look-ups
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author_id);

-- Enable Row Level Security and basic policies (adjust to taste)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Comments read" ON public.comments;
CREATE POLICY "Comments read"   ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Comments insert" ON public.comments;
CREATE POLICY "Comments insert" ON public.comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Comments update" ON public.comments;
CREATE POLICY "Comments update" ON public.comments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Comments delete" ON public.comments;
CREATE POLICY "Comments delete" ON public.comments FOR DELETE USING (true);

-- Create enum for notification types
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE public.notification_type AS ENUM ('mention','assignment');
    END IF;
END $$;

-- Create notifications table for @mentions and allocation changes
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    payload JSONB NOT NULL, -- stores comment ID, task ID, etc.
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications read" ON public.notifications;
CREATE POLICY "Notifications read"   ON public.notifications FOR SELECT USING (recipient_id = auth.uid()::uuid OR true);
DROP POLICY IF EXISTS "Notifications insert" ON public.notifications;
CREATE POLICY "Notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Notifications update" ON public.notifications;
CREATE POLICY "Notifications update" ON public.notifications FOR UPDATE USING (recipient_id = auth.uid()::uuid OR true);
-- No delete policy yet; admins can manage via Supabase UI

