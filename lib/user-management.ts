import { supabase } from "./supabase";
import type { UserRole } from "@/contexts/auth-context";

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in?: string;
}

// Create user_roles table if it doesn't exist
export async function ensureUserRolesTable(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'readonly')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add RLS policies
        ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

        -- Only admins can view/modify user roles
        CREATE POLICY IF NOT EXISTS "Admins can manage user roles" ON user_roles
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM user_roles 
              WHERE email = auth.jwt() ->> 'email' 
              AND role = 'admin'
            )
          );

        -- Create function to get user's last sign in from auth.users
        CREATE OR REPLACE FUNCTION get_user_last_sign_in(user_email TEXT)
        RETURNS TIMESTAMP WITH TIME ZONE
        LANGUAGE SQL
        SECURITY DEFINER
        AS $$
          SELECT last_sign_in_at 
          FROM auth.users 
          WHERE email = user_email;
        $$;
      `
    });

    if (error) {
      console.error('Error creating user_roles table:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error ensuring user_roles table:', error);
    return false;
  }
}

// Fetch all users with their roles
export async function fetchUsers(): Promise<AdminUser[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    // Enrich with last sign in data
    const enrichedUsers = await Promise.all(
      data.map(async (user) => {
        const { data: lastSignIn } = await supabase.rpc('get_user_last_sign_in', {
          user_email: user.email
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          created_at: user.created_at,
          last_sign_in: lastSignIn || undefined,
        };
      })
    );

    return enrichedUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Update user role
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .update({ 
        role,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

// Add new user
export async function addUser(email: string, role: UserRole): Promise<AdminUser | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        email: email.toLowerCase().trim(),
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding user:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      role: data.role as UserRole,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error('Error adding user:', error);
    return null;
  }
}

// Remove user
export async function removeUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error removing user:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
}

// Get user role by email
export async function getUserRole(email: string): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as UserRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Check if user is admin
export async function isUserAdmin(email: string): Promise<boolean> {
  const role = await getUserRole(email);
  return role === 'admin';
}

// Initialize admin users from the hardcoded list (migration helper)
export async function migrateFromHardcodedAdmins(): Promise<boolean> {
  try {
    // Import the existing admin emails
    const { ADMIN_EMAILS, READONLY_EMAILS } = await import('./auth-config');
    
    // Ensure table exists first
    await ensureUserRolesTable();

    // Add admin users
    for (const email of ADMIN_EMAILS) {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          email: email.toLowerCase().trim(),
          role: 'admin'
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error(`Error migrating admin ${email}:`, error);
      }
    }

    // Add readonly users
    for (const email of READONLY_EMAILS) {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          email: email.toLowerCase().trim(),
          role: 'readonly'
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error(`Error migrating readonly user ${email}:`, error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error migrating from hardcoded admins:', error);
    return false;
  }
} 