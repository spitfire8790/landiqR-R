import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || ""
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 })
    }

    // Use service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // SQL to create tables
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

    // Execute the SQL directly
    const { error } = await supabase.rpc("exec_sql", { sql: createTablesSQL })

    if (error) {
      console.error("Error initializing database:", error)
      return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Database initialized successfully" })
  } catch (error) {
    console.error("Error in init-db route:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
