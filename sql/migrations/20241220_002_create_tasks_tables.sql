-- Migration: Create tasks and workflow tables
-- Date: 2024-12-20
-- Description: Create tables for tasks, responsibilities, task allocations, and workflow management

-- Tasks table (simplified)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  hours_per_week DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Source Links table
CREATE TABLE IF NOT EXISTS public.task_source_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Responsibilities table (replaces workflow_steps)
CREATE TABLE IF NOT EXISTS public.responsibilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  estimated_weekly_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Allocations table (simplified)
CREATE TABLE IF NOT EXISTS public.task_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  is_lead BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, person_id)
);

-- Workflow Tools table
CREATE TABLE IF NOT EXISTS public.workflow_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  flow_data TEXT NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leave table
CREATE TABLE IF NOT EXISTS public.leave (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'personal', 'other')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_task_source_links_task_id ON public.task_source_links(task_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_task_id ON public.responsibilities(task_id);
CREATE INDEX IF NOT EXISTS idx_responsibilities_assigned_person_id ON public.responsibilities(assigned_person_id);
CREATE INDEX IF NOT EXISTS idx_task_allocations_task_id ON public.task_allocations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_allocations_person_id ON public.task_allocations(person_id);
CREATE INDEX IF NOT EXISTS idx_workflows_task_id ON public.workflows(task_id);
CREATE INDEX IF NOT EXISTS idx_leave_person_id ON public.leave(person_id);
CREATE INDEX IF NOT EXISTS idx_leave_dates ON public.leave(start_date, end_date); 