import { migrateFromHardcodedAdmins } from './user-management';
import { supabase } from './supabase';

export async function initializeAdminUsers(): Promise<boolean> {
  try {
    console.log('🔍 Checking admin user setup...');
    
    // Try to query the user_roles table to see if it exists and if user exists
    const { data, error } = await supabase
      .from('user_roles')
      .select('email, role')
      .eq('email', 'james.strutt@dpie.nsw.gov.au')
      .single();

    // Handle different error scenarios
    if (error) {
      console.log('Query error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // Table doesn't exist
      if (error.message.includes('does not exist') || 
          error.code === 'PGRST116' ||
          error.message.includes('relation')) {
        console.log('⚠️ user_roles table does not exist. Please run the SQL migrations first.');
        console.log('📋 Run this SQL in your Supabase SQL editor:');
        console.log('   File: sql/migrations/20241220_006_create_user_roles.sql');
        return false;
      }

      // Infinite recursion in RLS policy
      if (error.code === '42P17' || error.message.includes('infinite recursion')) {
        console.log('🔄 RLS policy has circular dependency. Please update the migration and rerun:');
        console.log('📋 Run the updated SQL in your Supabase SQL editor:');
        console.log('   File: sql/migrations/20241220_006_create_user_roles.sql');
        return false;
      }
      
      // No rows returned (user doesn't exist) - this is expected if RLS is working
      if (error.code === 'PGRST116' || error.message.includes('No rows')) {
        console.log('✅ user_roles table exists. User not found or RLS is working correctly.');
        console.log('🔧 Admin user should have been created by the migration script.');
        return true; // Consider this success - the table exists and RLS is working
      }

      // Permission/RLS error - table exists but we can't access it (expected behavior)
      if (error.message.includes('permission') || 
          error.message.includes('policy') ||
          error.code === '42501') {
        console.log('✅ user_roles table exists with RLS enabled (this is correct)');
        return true;
      }

      // Unknown error - try migration anyway
      console.log('🔄 Unknown error, attempting migration...');
      return await migrateFromHardcodedAdmins();
    }

    // Success - user found
    if (data) {
      console.log(`✅ Admin user confirmed: ${data.email} (${data.role})`);
      return true;
    }

    // Shouldn't reach here, but fallback
    console.log('🔄 Fallback: attempting migration...');
    return await migrateFromHardcodedAdmins();
    
  } catch (error) {
    console.error('❌ Error initializing admin users:', error);
    // Don't fail the entire app if admin setup fails
    return true; 
  }
} 