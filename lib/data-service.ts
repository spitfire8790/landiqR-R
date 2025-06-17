import { supabase } from "@/lib/supabase"
import type { Group, Category, Person, Allocation, Task, Responsibility, TaskAllocation } from "@/lib/types"
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
          source_link TEXT,
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
          content TEXT NOT NULL,
          author_email TEXT NOT NULL,
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
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: true })

    if (error) {
      if (error.message.includes("does not exist")) {
        await ensureTablesExist()
        return []
      }
      console.error("Error fetching tasks:", error)
      return []
    }

    return data.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description || "",
      categoryId: task.category_id,
      hoursPerWeek: task.hours_per_week || 0,
      sourceLink: task.source_link || "",
      createdAt: task.created_at,
    }))
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

    return {
      id: data.id,
      name: data.name,
      description: data.description || "",
      categoryId: data.category_id,
      hoursPerWeek: data.hours_per_week || 0,
      sourceLink: data.source_link || "",
      createdAt: data.created_at,
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
      .order("created_at", { ascending: true })
    
    // Only filter by category if a categoryId is provided
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return []
    }

    return data.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description || "",
      categoryId: task.category_id,
      hoursPerWeek: task.hours_per_week || 0,
      sourceLink: task.source_link || "",
      createdAt: task.created_at,
    }))
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
      source_link: task.sourceLink,
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
      sourceLink: data.source_link || "",
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
        source_link: task.sourceLink,
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
      sourceLink: data.source_link || "",
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

export async function deleteTaskAllocation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("task_allocations").delete().eq("id", id)

    if (error) {
      console.error("Error deleting task allocation:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteTaskAllocation:", error)
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
