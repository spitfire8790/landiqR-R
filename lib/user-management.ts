import { supabase } from "./supabase";
import type { UserRole } from "@/contexts/auth-context";

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in?: string;
}

// Timeout utility with proper typing
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]);
};

// Retry utility
const withRetry = async <T>(
  operation: () => Promise<T>, 
  maxAttempts: number = 3, 
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError!;
};

// Create user_roles table if it doesn't exist
export async function ensureUserRolesTable(): Promise<boolean> {
  try {
    // First, check if the table exists by trying to query it with timeout
    const result = await withTimeout(
      supabase.from('user_roles').select('id').limit(1) as any,
      5000
    );
    const { data, error: checkError } = result as any;

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
    const result = await withTimeout(
      supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false }) as any,
      10000
    );
    const { data, error } = result as any;

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    // Enrich with last sign in data with timeout and error handling
    const enrichedUsers = await Promise.allSettled(
      (data || []).map(async (user: any) => {
        try {
          const result = await withTimeout(
            supabase.rpc('get_user_last_sign_in', {
              user_email: user.email
            }) as any,
            5000
          );
          const { data: lastSignIn } = result as any;

          return {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            created_at: user.created_at,
            last_sign_in: lastSignIn || undefined,
          };
        } catch (error) {
          console.warn(`Failed to get last sign in for ${user.email}:`, error);
          return {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            created_at: user.created_at,
            last_sign_in: undefined,
          };
        }
      })
    );

    // Extract successful results
    return enrichedUsers
      .filter((result: any): result is PromiseFulfilledResult<AdminUser> => result.status === 'fulfilled')
      .map((result: any) => result.value);
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Update user role
export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    const result = await withTimeout(
      supabase
        .from('user_roles')
        .update({ 
          role,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId) as any,
      10000
    );
    const { error } = result as any;

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
    const result = await withTimeout(
      supabase
        .from('user_roles')
        .insert({
          email: email.toLowerCase().trim(),
          role,
        })
        .select()
        .single() as any,
      10000
    );
    const { data, error } = result as any;

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
    const result = await withTimeout(
      supabase
        .from('user_roles')
        .delete()
        .eq('id', userId) as any,
      10000
    );
    const { error } = result as any;

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

// Get user role by email with retry mechanism
export async function getUserRole(email: string): Promise<UserRole | null> {
  try {
    return await withRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('user_roles')
          .select('role')
          .eq('email', email.toLowerCase().trim())
          .single() as any,
        8000
      );
      const { data, error } = result as any;

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error || new Error('No data returned');
      }

      return data.role as UserRole;
    }, 2, 2000);
  } catch (error) {
    console.error('Error getting user role after retries:', error);
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

    // Add admin users with timeout and error handling
    const adminResults = await Promise.allSettled(
      ADMIN_EMAILS.map(async (email) => {
        try {
          const result = await withTimeout(
            supabase
              .from('user_roles')
              .upsert({
                email: email.toLowerCase().trim(),
                role: 'admin'
              }, {
                onConflict: 'email'
              }) as any,
            10000
          );
          const { error } = result as any;

          if (error) {
            console.error(`Error migrating admin ${email}:`, error);
            return { success: false, email };
          } else {
            console.log(`✅ Added admin: ${email}`);
            return { success: true, email };
          }
        } catch (err) {
          console.error(`Failed to add admin ${email}:`, err);
          return { success: false, email };
        }
      })
    );

    // Add readonly users with timeout and error handling
    const readonlyResults = await Promise.allSettled(
      READONLY_EMAILS.map(async (email) => {
        try {
          const result = await withTimeout(
            supabase
              .from('user_roles')
              .upsert({
                email: email.toLowerCase().trim(),
                role: 'readonly'
              }, {
                onConflict: 'email'
              }) as any,
            10000
          );
          const { error } = result as any;

          if (error) {
            console.error(`Error migrating readonly user ${email}:`, error);
            return { success: false, email };
          } else {
            console.log(`✅ Added readonly user: ${email}`);
            return { success: true, email };
          }
        } catch (err) {
          console.error(`Failed to add readonly user ${email}:`, err);
          return { success: false, email };
        }
      })
    );

    const totalAttempts = adminResults.length + readonlyResults.length;
    const successfulMigrations = [
      ...adminResults.filter((result) => result.status === 'fulfilled' && (result.value as any).success),
      ...readonlyResults.filter((result) => result.status === 'fulfilled' && (result.value as any).success)
    ];

    console.log(`Admin migration completed: ${successfulMigrations.length}/${totalAttempts} successful`);
    
    // Consider it successful if at least some migrations worked
    return successfulMigrations.length > 0;
  } catch (error) {
    console.error('Error migrating from hardcoded admins:', error);
    return false;
  }
} 