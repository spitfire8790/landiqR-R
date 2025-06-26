import { supabase } from "@/lib/supabase"
import type { Group, Category, Person, Allocation, Task, Responsibility, TaskAllocation, TaskSourceLink, WorkflowTool, Workflow, Leave, Comment, Notification } from "@/lib/types"
import { v4 as uuidv4 } from "uuid"

// Check if tables exist and create them if they don't
export async function ensureTablesExist() {
  try {
    // Check if the groups table exists
    const { error: groupsError } = await supabase.from("groups").select("id").limit(1)

    if (groupsError && groupsError.message.includes("does not exist")) {
      console.log("Tables don't exist. Creating tables...")

      // Execute the SQL script to create tables
      const createTablesSQL = `
        -- Create extension for UUID generation if it doesn't exist
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Groups table
        CREATE TABLE IF NOT EXISTS public.groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Categories table
        CREATE TABLE IF NOT EXISTS public.categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
          source_link TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- People table
        CREATE TABLE IF NOT EXISTS public.people (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          organisation TEXT NOT NULL,
          role TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Allocations table
        CREATE TABLE IF NOT EXISTS public.allocations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
          person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
          is_lead BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
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
        
        -- Chat messages table
        CREATE TABLE IF NOT EXISTS public.messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          author_email TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Comments table for task and responsibility discussions
        CREATE TABLE IF NOT EXISTS public.comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          parent_type TEXT NOT NULL CHECK (parent_type IN ('task', 'responsibility')),
          parent_id UUID NOT NULL,
          author_id TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Notifications table for mentions and assignments
        CREATE TABLE IF NOT EXISTS public.notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          recipient_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('mention', 'assignment')),
          payload JSONB NOT NULL DEFAULT '{}',
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Ensure the messages table is part of the realtime publication
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = 'messages'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
          END IF;
        END;
        $$;
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_categories_group_id ON public.categories(group_id);
        CREATE INDEX IF NOT EXISTS idx_allocations_category_id ON public.allocations(category_id);
        CREATE INDEX IF NOT EXISTS idx_allocations_person_id ON public.allocations(person_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
        CREATE INDEX IF NOT EXISTS idx_responsibilities_task_id ON public.responsibilities(task_id);
        CREATE INDEX IF NOT EXISTS idx_responsibilities_assigned_person_id ON public.responsibilities(assigned_person_id);
        CREATE INDEX IF NOT EXISTS idx_task_allocations_task_id ON public.task_allocations(task_id);
        CREATE INDEX IF NOT EXISTS idx_task_allocations_person_id ON public.task_allocations(person_id);
        CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_type, parent_id);
        CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_id, read);
        
        -- Enable Row Level Security
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for comments
        CREATE POLICY IF NOT EXISTS "Users can view all comments" ON public.comments
          FOR SELECT USING (true);
        
        CREATE POLICY IF NOT EXISTS "Users can insert their own comments" ON public.comments
          FOR INSERT WITH CHECK (auth.uid()::text = author_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update their own comments" ON public.comments
          FOR UPDATE USING (auth.uid()::text = author_id);
        
        CREATE POLICY IF NOT EXISTS "Users can delete their own comments" ON public.comments
          FOR DELETE USING (auth.uid()::text = author_id);
        
        -- Create RLS policies for notifications
        CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON public.notifications
          FOR SELECT USING (auth.uid()::text = recipient_id);
        
        CREATE POLICY IF NOT EXISTS "Users can insert notifications" ON public.notifications
          FOR INSERT WITH CHECK (true);
        
        CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON public.notifications
          FOR UPDATE USING (auth.uid()::text = recipient_id);
      `

      // Execute the SQL script using Supabase's rpc function
      const { error } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

      if (error) {
        console.error("Error creating tables:", error)
        return false
      }

      console.log("Tables created successfully")
      return true
    }

    return true
  } catch (error) {
    console.error("Error checking/creating tables:", error)
    return false
  }
}

// Groups
export async function fetchGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase.from("groups").select("*").order("created_at", { ascending: true })

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return []
      }
      console.error("Error fetching groups:", error)
      return []
    }

    return data.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description || "",
      icon: group.icon || "Folder",
    }))
  } catch (error) {
    console.error("Error in fetchGroups:", error)
    return []
  }
}

export async function createGroup(group: Omit<Group, "id">): Promise<Group | null> {
  try {
    const newGroup = {
      id: uuidv4(),
      name: group.name,
      description: group.description,
      icon: group.icon,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("groups").insert([newGroup]).select().single()

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        // Try again after creating tables
        return createGroup(group)
      }
      console.error("Error creating group:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      icon: data.icon || "Folder",
    }
  } catch (error) {
    console.error("Error in createGroup:", error)
    return null
  }
}

export async function updateGroup(group: Group): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .update({
        name: group.name,
        description: group.description,
        icon: group.icon,
      })
      .eq("id", group.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating group:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      icon: data.icon || "Folder",
    }
  } catch (error) {
    console.error("Error in updateGroup:", error)
    return null
  }
}

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("groups").delete().eq("id", id)

    if (error) {
      console.error("Error deleting group:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteGroup:", error)
    return false
  }
}

// Categories
export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: true })

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return []
      }
      console.error("Error fetching categories:", error)
      return []
    }

    return data.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description || "",
      groupId: category.group_id,
      sourceLink: category.source_link || "",
    }))
  } catch (error) {
    console.error("Error in fetchCategories:", error)
    return []
  }
}

export async function createCategory(category: Omit<Category, "id">): Promise<Category | null> {
  try {
    const newCategory = {
      id: uuidv4(),
      name: category.name,
      description: category.description,
      group_id: category.groupId,
      source_link: category.sourceLink,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("categories").insert([newCategory]).select().single()

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        // Try again after creating tables
        return createCategory(category)
      }
      console.error("Error creating category:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      groupId: data.group_id,
      sourceLink: data.source_link || "",
    }
  } catch (error) {
    console.error("Error in createCategory:", error)
    return null
  }
}

export async function updateCategory(category: Category): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: category.name,
        description: category.description,
        group_id: category.groupId,
        source_link: category.sourceLink,
      })
      .eq("id", category.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating category:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      groupId: data.group_id,
      sourceLink: data.source_link || "",
    }
  } catch (error) {
    console.error("Error in updateCategory:", error)
    return null
  }
}

export async function deleteCategory(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("categories").delete().eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteCategory:", error)
    return false
  }
}

// People
export async function fetchPeople(): Promise<Person[]> {
  try {
    const { data, error } = await supabase.from("people").select("*").order("created_at", { ascending: true })

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return []
      }
      console.error("Error fetching people:", error)
      return []
    }

    return data.map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      organisation: person.organisation,
      role: person.role || "",
    }))
  } catch (error) {
    console.error("Error in fetchPeople:", error)
    return []
  }
}

export async function createPerson(person: Omit<Person, "id">): Promise<Person | null> {
  try {
    const newPerson = {
      id: uuidv4(),
      name: person.name,
      email: person.email,
      organisation: person.organisation,
      role: person.role,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("people").insert([newPerson]).select().single()

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        // Try again after creating tables
        return createPerson(person)
      }
      console.error("Error creating person:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      organisation: data.organisation,
      role: data.role || "",
    }
  } catch (error) {
    console.error("Error in createPerson:", error)
    return null
  }
}

export async function updatePerson(person: Person): Promise<Person | null> {
  try {
    const { data, error } = await supabase
      .from("people")
      .update({
        name: person.name,
        email: person.email,
        organisation: person.organisation,
        role: person.role,
      })
      .eq("id", person.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating person:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      organisation: data.organisation,
      role: data.role || "",
    }
  } catch (error) {
    console.error("Error in updatePerson:", error)
    return null
  }
}

export async function deletePerson(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("people").delete().eq("id", id)

    if (error) {
      console.error("Error deleting person:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deletePerson:", error)
    return false
  }
}

// Allocations
export async function fetchAllocations(): Promise<Allocation[]> {
  try {
    const { data, error } = await supabase.from("allocations").select("*").order("created_at", { ascending: true })

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return []
      }
      console.error("Error fetching allocations:", error)
      return []
    }

    return data.map((allocation) => ({
      id: allocation.id,
      categoryId: allocation.category_id,
      personId: allocation.person_id,
      isLead: allocation.is_lead || false,
    }))
  } catch (error) {
    console.error("Error in fetchAllocations:", error)
    return []
  }
}

export async function createAllocation(allocation: Omit<Allocation, "id">): Promise<Allocation | null> {
  try {
    const newAllocation = {
      id: uuidv4(),
      category_id: allocation.categoryId,
      person_id: allocation.personId,
      is_lead: allocation.isLead || false,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("allocations").insert([newAllocation]).select().single()

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        // Try again after creating tables
        return createAllocation(allocation)
      }
      console.error("Error creating allocation:", error)
      return null
    }

    return {
      id: data.id,
      categoryId: data.category_id,
      personId: data.person_id,
      isLead: data.is_lead || false,
    }
  } catch (error) {
    console.error("Error in createAllocation:", error)
    return null
  }
}

export async function deleteAllocation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("allocations").delete().eq("id", id)

    if (error) {
      console.error("Error deleting allocation:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteAllocation:", error)
    return false
  }
}

// Tasks
export async function fetchTasks(): Promise<Task[]> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching tasks:", error)
      return []
    }

    // Fetch source links for all tasks
    const tasks = data.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description || "",
      categoryId: task.category_id,
      hoursPerWeek: task.hours_per_week || 0,
      createdAt: task.created_at,
      sourceLinks: [] as TaskSourceLink[], // Will be populated below
    }))

    // Fetch all source links for these tasks
    const taskIds = tasks.map(task => task.id)
    if (taskIds.length > 0) {
      const { data: linksData, error: linksError } = await supabase
        .from("task_source_links")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })

      if (!linksError && linksData) {
        // Group source links by task ID
        const linksByTaskId: Record<string, TaskSourceLink[]> = {}
        linksData.forEach(link => {
          if (!linksByTaskId[link.task_id]) {
            linksByTaskId[link.task_id] = []
          }
          linksByTaskId[link.task_id].push({
            id: link.id,
            taskId: link.task_id,
            url: link.url,
            description: link.description || "",
            createdAt: link.created_at,
          })
        })

        // Assign source links to their respective tasks
        tasks.forEach(task => {
          task.sourceLinks = linksByTaskId[task.id] || []
        })
      }
    }

    return tasks
  } catch (error) {
    console.error("Error in fetchTasks:", error)
    return []
  }
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching task by id:", error)
      return null
    }

    // Fetch source links for this task
    const { data: linksData, error: linksError } = await supabase
      .from("task_source_links")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: true })

    const sourceLinks: TaskSourceLink[] = []
    if (!linksError && linksData) {
      sourceLinks.push(...linksData.map(link => ({
        id: link.id,
        taskId: link.task_id,
        url: link.url,
        description: link.description || "",
        createdAt: link.created_at,
      })))
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      categoryId: data.category_id,
      hoursPerWeek: data.hours_per_week || 0,
      createdAt: data.created_at,
      sourceLinks,
    }
  } catch (error) {
    console.error("Error in fetchTaskById:", error)
    return null
  }
}

export async function fetchTasksByCategory(categoryId?: string): Promise<Task[]> {
  try {
    let query = supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
    
    // Only filter by category if a categoryId is provided
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tasks by category:", error)
      return []
    }

    // Fetch source links for all tasks
    const tasks = data.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description || "",
      categoryId: task.category_id,
      hoursPerWeek: task.hours_per_week || 0,
      createdAt: task.created_at,
      sourceLinks: [] as TaskSourceLink[], // Will be populated below
    }))

    // Fetch all source links for these tasks
    const taskIds = tasks.map(task => task.id)
    if (taskIds.length > 0) {
      const { data: linksData, error: linksError } = await supabase
        .from("task_source_links")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true })

      if (!linksError && linksData) {
        // Group source links by task ID
        const linksByTaskId: Record<string, TaskSourceLink[]> = {}
        linksData.forEach(link => {
          if (!linksByTaskId[link.task_id]) {
            linksByTaskId[link.task_id] = []
          }
          linksByTaskId[link.task_id].push({
            id: link.id,
            taskId: link.task_id,
            url: link.url,
            description: link.description || "",
            createdAt: link.created_at,
          })
        })

        // Assign source links to their respective tasks
        tasks.forEach(task => {
          task.sourceLinks = linksByTaskId[task.id] || []
        })
      }
    }

    return tasks
  } catch (error) {
    console.error("Error in fetchTasksByCategory:", error)
    return []
  }
}

export async function createTask(task: Omit<Task, "id" | "createdAt">): Promise<Task | null> {
  try {
    const newTask = {
      id: uuidv4(),
      name: task.name,
      description: task.description,
      category_id: task.categoryId,
      hours_per_week: task.hoursPerWeek,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("tasks").insert([newTask]).select().single()

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return createTask(task)
      }
      console.error("Error creating task:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      categoryId: data.category_id,
      hoursPerWeek: data.hours_per_week || 0,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in createTask:", error)
    return null
  }
}

export async function updateTask(task: Task): Promise<Task | null> {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .update({
        name: task.name,
        description: task.description,
        hours_per_week: task.hoursPerWeek,
      })
      .eq("id", task.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating task:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      categoryId: data.category_id,
      hoursPerWeek: data.hours_per_week || 0,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in updateTask:", error)
    return null
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteTask:", error)
    return false
  }
}

// Task Source Links
export async function fetchTaskSourceLinks(taskId?: string): Promise<TaskSourceLink[]> {
  try {
    let query = supabase
      .from("task_source_links")
      .select("*")
      .order("created_at", { ascending: true })
    
    // Only filter by task if a taskId is provided
    if (taskId) {
      query = query.eq("task_id", taskId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching task source links:", error)
      return []
    }

    return data.map((link) => ({
      id: link.id,
      taskId: link.task_id,
      url: link.url,
      description: link.description || "",
      createdAt: link.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchTaskSourceLinks:", error)
    return []
  }
}

export async function createTaskSourceLink(link: Omit<TaskSourceLink, "id" | "createdAt">): Promise<TaskSourceLink | null> {
  try {
    const newLink = {
      id: uuidv4(),
      task_id: link.taskId,
      url: link.url,
      description: link.description,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("task_source_links").insert([newLink]).select().single()

    if (error) {
      console.error("Error creating task source link:", error)
      return null
    }

    return {
      id: data.id,
      taskId: data.task_id,
      url: data.url,
      description: data.description || "",
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in createTaskSourceLink:", error)
    return null
  }
}

export async function updateTaskSourceLink(link: TaskSourceLink): Promise<TaskSourceLink | null> {
  try {
    const { data, error } = await supabase
      .from("task_source_links")
      .update({
        url: link.url,
        description: link.description,
      })
      .eq("id", link.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating task source link:", error)
      return null
    }

    return {
      id: data.id,
      taskId: data.task_id,
      url: data.url,
      description: data.description || "",
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in updateTaskSourceLink:", error)
    return null
  }
}

export async function deleteTaskSourceLink(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("task_source_links").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task source link:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting task source link:", error)
    return false
  }
}

// Responsibilities
export async function fetchResponsibilities(taskId: string): Promise<Responsibility[]> {
  try {
    const { data, error } = await supabase
      .from("responsibilities")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching responsibilities:", error)
      return []
    }

    return data.map((responsibility) => ({
      id: responsibility.id,
      description: responsibility.description,
      taskId: responsibility.task_id,
      assignedPersonId: responsibility.assigned_person_id,
      estimatedWeeklyHours: responsibility.estimated_weekly_hours,
      createdAt: responsibility.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchResponsibilities:", error)
    return []
  }
}

export async function createResponsibility(responsibility: Omit<Responsibility, "id" | "createdAt">): Promise<Responsibility | null> {
  try {
    const newResponsibility = {
      id: uuidv4(),
      description: responsibility.description,
      task_id: responsibility.taskId,
      assigned_person_id: responsibility.assignedPersonId,
      estimated_weekly_hours: responsibility.estimatedWeeklyHours,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("responsibilities").insert([newResponsibility]).select().single()

    if (error) {
      console.error("Error creating responsibility:", error)
      return null
    }

    return {
      id: data.id,
      description: data.description,
      taskId: data.task_id,
      assignedPersonId: data.assigned_person_id,
      estimatedWeeklyHours: data.estimated_weekly_hours,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in createResponsibility:", error)
    return null
  }
}

export async function updateResponsibility(responsibility: Responsibility): Promise<Responsibility | null> {
  try {
    const { data, error } = await supabase
      .from("responsibilities")
      .update({
        description: responsibility.description,
        assigned_person_id: responsibility.assignedPersonId,
        estimated_weekly_hours: responsibility.estimatedWeeklyHours,
      })
      .eq("id", responsibility.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating responsibility:", error)
      return null
    }

    return {
      id: data.id,
      description: data.description,
      taskId: data.task_id,
      assignedPersonId: data.assigned_person_id,
      estimatedWeeklyHours: data.estimated_weekly_hours,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in updateResponsibility:", error)
    return null
  }
}

export async function deleteResponsibility(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("responsibilities").delete().eq("id", id)

    if (error) {
      console.error("Error deleting responsibility:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteResponsibility:", error)
    return false
  }
}

// Task Allocations
export async function fetchTaskAllocations(taskId?: string): Promise<TaskAllocation[]> {
  try {
    let query = supabase.from("task_allocations").select("*")
    
    if (taskId) {
      query = query.eq("task_id", taskId)
    }
    
    const { data, error } = await query.order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching task allocations:", error)
      return []
    }

    return data.map((allocation) => ({
      id: allocation.id,
      taskId: allocation.task_id,
      personId: allocation.person_id,
      isLead: allocation.is_lead || false,
      estimatedWeeklyHours: 0, // Default value as it's not stored in the database
      createdAt: allocation.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchTaskAllocations:", error)
    return []
  }
}

export async function createTaskAllocation(allocation: Omit<TaskAllocation, "id" | "createdAt">): Promise<TaskAllocation | null> {
  try {
    // First, get the task to find its category
    const task = await fetchTaskById(allocation.taskId)
    if (!task) {
      console.error("Task not found when creating allocation")
      return null
    }

    // Check if the person is allocated to the task's category
    // This is now a warning log instead of an error, allowing the allocation to proceed
    const categoryAllocations = await fetchAllocations()
    const isPersonAllocatedToCategory = categoryAllocations.some(
      alloc => alloc.categoryId === task.categoryId && alloc.personId === allocation.personId
    )

    if (!isPersonAllocatedToCategory) {
      console.warn(`Person ${allocation.personId} is not allocated to category ${task.categoryId} but will be allocated to task anyway`)
      
      // Consider automatically creating the category allocation here if needed in the future
      // For now, we'll just allow the task allocation to proceed
    }

    const newAllocation = {
      id: uuidv4(),
      task_id: allocation.taskId,
      person_id: allocation.personId,
      is_lead: allocation.isLead || false,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("task_allocations").insert([newAllocation]).select().single()

    if (error) {
      // Check for unique constraint violation (person already allocated to this task)
      if (error.code === '23505') { // PostgreSQL unique constraint violation code
        console.warn("Person is already allocated to this task")
        
        // Return the existing allocation instead of null
        const { data: existingData } = await supabase
          .from("task_allocations")
          .select("*")
          .eq("task_id", allocation.taskId)
          .eq("person_id", allocation.personId)
          .single()
          
        if (existingData) {
          return {
            id: existingData.id,
            taskId: existingData.task_id,
            personId: existingData.person_id,
            isLead: existingData.is_lead || false,
            estimatedWeeklyHours: 0, // Default value as it's not stored in the database
            createdAt: existingData.created_at,
          }
        }
      }
      
      console.error("Error creating task allocation:", error)
      return null
    }

    return {
      id: data.id,
      taskId: data.task_id,
      personId: data.person_id,
      isLead: data.is_lead || false,
      estimatedWeeklyHours: 0, // Default value as it's not stored in the database
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error creating task allocation:", error)
    return null
  }
}

export async function deleteTaskAllocation(allocationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("task_allocations").delete().eq("id", allocationId)

    if (error) {
      console.error("Error deleting task allocation:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting task allocation:", error)
    return false
  }
}

// Helper function to get people allocated to a category (for task allocation restrictions)
export async function getPeopleAllocatedToCategory(categoryId: string): Promise<Person[]> {
  try {
    const { data, error } = await supabase
      .from("allocations")
      .select(`
        person_id,
        people (
          id,
          name,
          email,
          organisation,
          role
        )
      `)
      .eq("category_id", categoryId)

    if (error) {
      console.error("Error fetching people allocated to category:", error)
      return []
    }

    return data.map((allocation: any) => ({
      id: allocation.people.id,
      name: allocation.people.name,
      email: allocation.people.email,
      organisation: allocation.people.organisation,
      role: allocation.people.role || "",
    }))
  } catch (error) {
    console.error("Error in getPeopleAllocatedToCategory:", error)
    return []
  }
}

// Workflow Tools
export async function fetchWorkflowTools(): Promise<WorkflowTool[]> {
  try {
    const { data, error } = await supabase
      .from("workflow_tools")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching workflow tools:", error)
      return []
    }

    return data.map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description || "",
      icon: tool.icon || "",
      category: tool.category,
      createdAt: tool.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchWorkflowTools:", error)
    return []
  }
}

export async function createWorkflowTool(tool: Omit<WorkflowTool, "id" | "createdAt">): Promise<WorkflowTool | null> {
  try {
    const newTool = {
      id: uuidv4(),
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      category: tool.category,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("workflow_tools").insert([newTool]).select().single()

    if (error) {
      console.error("Error creating workflow tool:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      icon: data.icon || "",
      category: data.category,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in createWorkflowTool:", error)
    return null
  }
}

export async function updateWorkflowTool(tool: WorkflowTool): Promise<WorkflowTool | null> {
  try {
    const { data, error } = await supabase
      .from("workflow_tools")
      .update({
        name: tool.name,
        description: tool.description,
        icon: tool.icon,
        category: tool.category,
      })
      .eq("id", tool.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating workflow tool:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      icon: data.icon || "",
      category: data.category,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in updateWorkflowTool:", error)
    return null
  }
}

export async function deleteWorkflowTool(toolId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("workflow_tools").delete().eq("id", toolId)

    if (error) {
      console.error("Error deleting workflow tool:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting workflow tool:", error)
    return false
  }
}

// Workflows
export async function fetchWorkflows(taskId?: string): Promise<Workflow[]> {
  try {
    let query = supabase
      .from("workflows")
      .select("*")
      .order("created_at", { ascending: false })
    
    if (taskId) {
      query = query.eq("task_id", taskId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching workflows:", error)
      return []
    }

    return data.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || "",
      taskId: workflow.task_id,
      flowData: workflow.flow_data,
      isActive: workflow.is_active,
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at,
    }))
  } catch (error) {
    console.error("Error in fetchWorkflows:", error)
    return []
  }
}

export async function fetchWorkflowById(id: string): Promise<Workflow | null> {
  try {
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching workflow by id:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      taskId: data.task_id,
      flowData: data.flow_data,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("Error in fetchWorkflowById:", error)
    return null
  }
}

export async function createWorkflow(workflow: Omit<Workflow, "id" | "createdAt" | "updatedAt">): Promise<Workflow | null> {
  try {
    const newWorkflow = {
      id: uuidv4(),
      name: workflow.name,
      description: workflow.description,
      task_id: workflow.taskId,
      flow_data: workflow.flowData,
      is_active: workflow.isActive,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("workflows").insert([newWorkflow]).select().single()

    if (error) {
      console.error("Error creating workflow:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      taskId: data.task_id,
      flowData: data.flow_data,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("Error in createWorkflow:", error)
    return null
  }
}

export async function updateWorkflow(workflow: Workflow): Promise<Workflow | null> {
  try {
    const { data, error } = await supabase
      .from("workflows")
      .update({
        name: workflow.name,
        description: workflow.description,
        flow_data: workflow.flowData,
        is_active: workflow.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workflow.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating workflow:", error)
      return null
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      taskId: data.task_id,
      flowData: data.flow_data,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch (error) {
    console.error("Error in updateWorkflow:", error)
    return null
  }
}

export async function deleteWorkflow(workflowId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("workflows").delete().eq("id", workflowId)

    if (error) {
      console.error("Error deleting workflow:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error deleting workflow:", error)
    return false
  }
}

// Leave CRUD operations
export async function fetchLeave(): Promise<Leave[]> {
  try {
    const { data, error } = await supabase
      .from("leave")
      .select("*")
      .order("start_date", { ascending: true })

    if (error) {
      console.error("Error fetching leave:", error)
      return []
    }

    return data.map((leave) => ({
      id: leave.id,
      personId: leave.person_id,
      startDate: leave.start_date,
      endDate: leave.end_date,
      description: leave.description,
      createdAt: leave.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchLeave:", error)
    return []
  }
}

export async function fetchLeaveByPerson(personId: string): Promise<Leave[]> {
  try {
    const { data, error } = await supabase
      .from("leave")
      .select("*")
      .eq("person_id", personId)
      .order("start_date", { ascending: true })

    if (error) {
      console.error("Error fetching leave by person:", error)
      return []
    }

    return data.map((leave) => ({
      id: leave.id,
      personId: leave.person_id,
      startDate: leave.start_date,
      endDate: leave.end_date,
      description: leave.description,
      createdAt: leave.created_at,
    }))
  } catch (error) {
    console.error("Error in fetchLeaveByPerson:", error)
    return []
  }
}

export async function createLeave(leave: Omit<Leave, "id" | "createdAt">): Promise<Leave | null> {
  try {
    const newLeave = {
      person_id: leave.personId,
      start_date: leave.startDate,
      end_date: leave.endDate,
      description: leave.description,
    }

    const { data, error } = await supabase.from("leave").insert([newLeave]).select().single()

    if (error) {
      console.error("Error creating leave:", error)
      return null
    }

    return {
      id: data.id,
      personId: data.person_id,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in createLeave:", error)
    return null
  }
}

export async function updateLeave(leave: Leave): Promise<Leave | null> {
  try {
    const updatedLeave = {
      person_id: leave.personId,
      start_date: leave.startDate,
      end_date: leave.endDate,
      description: leave.description,
    }

    const { data, error } = await supabase
      .from("leave")
      .update(updatedLeave)
      .eq("id", leave.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating leave:", error)
      return null
    }

    return {
      id: data.id,
      personId: data.person_id,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error("Error in updateLeave:", error)
    return null
  }
}

export async function deleteLeave(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("leave").delete().eq("id", id)

    if (error) {
      console.error("Error deleting leave:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteLeave:", error)
    return false
  }
}

// Fetch notifications for a user
export async function fetchNotifications(recipientId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }

    return data.map((notification) => ({
      id: notification.id,
      recipientId: notification.recipient_id,
      type: notification.type,
      payload: notification.payload,
      read: notification.read,
      createdAt: notification.created_at,
    }))
  } catch (e) {
    console.error('Error in fetchNotifications:', e)
    return []
  }
}

// Mark notification as read
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)

    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }

    return true
  } catch (e) {
    console.error('Error in markNotificationAsRead:', e)
    return false
  }
}

// Create a notification
export async function createNotification(notification: Omit<Notification, 'id' | 'read' | 'createdAt'> & { read?: boolean }): Promise<Notification | null> {
  try {
    const insert = {
      recipient_id: notification.recipientId,
      type: notification.type,
      payload: notification.payload,
      read: notification.read ?? false,
    }

    const { data, error } = await supabase.from('notifications').insert([insert]).select().single()

    if (error) {
      console.error('Error creating notification:', error)
      return null
    }

    return {
      id: data.id,
      recipientId: data.recipient_id,
      type: data.type,
      payload: data.payload,
      read: data.read,
      createdAt: data.created_at,
    }
  } catch (e) {
    console.error('Error in createNotification:', e)
    return null
  }
}

// Fetch comments for a task or responsibility
export async function fetchComments(parentType: 'task' | 'responsibility', parentId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return []
    }

    return data.map((comment) => ({
      id: comment.id,
      parentType: comment.parent_type,
      parentId: comment.parent_id,
      authorId: comment.author_id,
      body: comment.body,
      createdAt: comment.created_at,
    }))
  } catch (e) {
    console.error('Error in fetchComments:', e)
    return []
  }
}

// Create a comment
export async function createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment | null> {
  try {
    const insert = {
      parent_type: comment.parentType,
      parent_id: comment.parentId,
      author_id: comment.authorId,
      body: comment.body,
    }

    const { data, error } = await supabase.from('comments').insert([insert]).select().single()

    if (error) {
      console.error('Error creating comment:', error)
      return null
    }

    return {
      id: data.id,
      parentType: data.parent_type,
      parentId: data.parent_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    }
  } catch (e) {
    console.error('Error in createComment:', e)
    return null
  }
}
