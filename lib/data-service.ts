import { supabase } from "@/lib/supabase"
import type { Group, Category, Person, Allocation } from "@/lib/types"
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
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_categories_group_id ON public.categories(group_id);
        CREATE INDEX IF NOT EXISTS idx_allocations_category_id ON public.allocations(category_id);
        CREATE INDEX IF NOT EXISTS idx_allocations_person_id ON public.allocations(person_id);
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
