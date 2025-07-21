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
    // First, check if the table exists by trying to query it
    const { data, error: checkError } = await supabase
      .from('user_roles')
      .select('id')
      .limit(1);

    // If the table doesn't exist, we'll get a specific error
    if (checkError) {
      console.log('Check error details:', {
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        code: checkError.code
      });

      if (checkError.message.includes('does not exist') || 
          checkError.code === 'PGRST116' || 
          checkError.message.includes('relation') ||
          checkError.message.includes('table')) {
        console.log('user_roles table does not exist, will create manually');
        return false; // Changed to false to indicate table doesn't exist
      }

      // If it's an RLS error, the table exists but we can't access it yet
      if (checkError.message.includes('permission') || 
          checkError.message.includes('policy') ||
          checkError.code === '42501') {
        console.log('user_roles table exists but RLS is blocking access (this is expected)');
        return true;
      }

      console.error('Unexpected error checking user_roles table:', checkError);
      return false;
    }

    console.log('user_roles table already exists and accessible');
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
    
    // Check if table exists first
    const tableExists = await ensureUserRolesTable();
    if (!tableExists) {
      console.log('user_roles table does not exist yet, skipping migration');
      return false;
    }

    console.log('Starting admin migration...');

    // Add admin users
    for (const email of ADMIN_EMAILS) {
      try {
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
        } else {
          console.log(`✅ Added admin: ${email}`);
        }
      } catch (err) {
        console.error(`Failed to add admin ${email}:`, err);
      }
    }

    // Add readonly users
    for (const email of READONLY_EMAILS) {
      try {
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
        } else {
          console.log(`✅ Added readonly user: ${email}`);
        }
      } catch (err) {
        console.error(`Failed to add readonly user ${email}:`, err);
      }
    }

    console.log('Admin migration completed');
    return true;
  } catch (error) {
    console.error('Error migrating from hardcoded admins:', error);
    return false;
  }
} 