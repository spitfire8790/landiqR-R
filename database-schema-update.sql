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
CREATE POLICY "Enable read access for all users" ON public.tasks
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.tasks
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.tasks
    FOR DELETE USING (true);

-- Responsibilities policies
CREATE POLICY "Enable read access for all users" ON public.responsibilities
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.responsibilities
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.responsibilities
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.responsibilities
    FOR DELETE USING (true);

-- Task allocations policies
CREATE POLICY "Enable read access for all users" ON public.task_allocations
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.task_allocations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.task_allocations
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.task_allocations
    FOR DELETE USING (true);

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
