'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Standard client for authenticated operations (login, session management)
import { createClient } from '@/lib/supabase/server' 
// Admin client for privileged operations (availability check and user cleanup)
import { createAdminClient } from '@/lib/supabase/admin-client' 

const HOMEPAGE = '/';
const LOGIN_PAGE = '/account/login';
const SIGNUP_PAGE = '/account/signup';

// --- Display Name Availability Check ---
/**
 * Checks if a display name already exists in the user_profiles table.
 * Returns true if available, false if taken.
 * * FIX: Uses the Admin Client to bypass RLS and checks the normalized (lowercase) column.
 */
export async function checkDisplayNameAvailability(displayName: string): Promise<boolean> {
    if (!displayName || displayName.length < 3) {
        return false; 
    }

    // Use the Admin Client to guarantee visibility of all records
    const supabaseAdmin = createAdminClient(); 
    
    // Normalization Strategy: Always check against the lowercase name
    const normalizedName = displayName.toLowerCase(); 

    // Query the 'display_name' column (which holds the stored lowercase name)
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('display_name')
        .eq('display_name', normalizedName) 
        .limit(1);

    if (error) {
        console.error('Supabase ADMIN error during display name check:', error);
        return false; 
    }

    // If data is an empty array, the name is available.
    return data.length === 0;
}


// --- User Login ---
/**
 * Handles user sign-in.
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(LOGIN_PAGE + '?error=' + encodeURIComponent(error.message))
  }

  revalidatePath(HOMEPAGE, 'layout')
  redirect(HOMEPAGE)
}

// --- User Signup ---
/**
 * UPDATED SIGNUP ACTION: 
 * 1. Creates Auth user.
 * 2. Inserts two names (normalized for unique check, preferred for display).
 * 3. Cleans up Auth user if the profile insert fails.
 * 4. Updates Auth metadata for session access.
 */
export async function signup(formData: FormData) {
  const supabase = await createClient() 
  const supabaseAdmin = createAdminClient(); 

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('display_name') as string;

  // 1. Prepare the two name formats
  const normalizedDisplayName = displayName.toLowerCase(); // For uniqueness check (stored in display_name)
  const preferredDisplayName = displayName; // For display on site (stored in preferred_name and metadata)

  // 2. Attempt to sign up the user
  const { data: userData, error: signUpError } = await supabase.auth.signUp({ 
    email, 
    password 
  })

  if (signUpError) {
    const errorMessage = signUpError.message.includes('Database error') 
        ? `${signUpError.message}. Code: ${signUpError.status}. Please check for an old database trigger (handle_new_user) that is failing to insert the required 'display_name'.` 
        : signUpError.message;

    return redirect(LOGIN_PAGE + '?error=' + encodeURIComponent(errorMessage));
  }
  
  if (!userData.user) {
    return redirect(SIGNUP_PAGE + '?error=' + encodeURIComponent('User creation failed unexpectedly. Please try again.'));
  }

  // 3. Insert both names into the user_profiles table
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({ 
      user_id: userData.user.id, 
      display_name: normalizedDisplayName, // Lowercase for unique constraint
      preferred_name: preferredDisplayName, // Original case for display
    });

  if (profileError) {
      console.error('Supabase Profile Insert Error:', profileError);
      
      // CRITICAL CLEANUP: Delete the orphaned user created in step 2
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      
      if (deleteError) {
          console.error('CRITICAL: Failed to clean up user after profile error:', deleteError);
      }
      
      // Handle unique constraint error (23505)
      if (profileError.code === '23505') {
            return redirect(SIGNUP_PAGE + '?error=' + encodeURIComponent('Display name is already taken. Please try another one.'));
      }
      
      const genericErrorMessage = `Profile creation failed: ${profileError.message} (Code: ${profileError.code}). Account not created.`;
      return redirect(SIGNUP_PAGE + '?error=' + encodeURIComponent(genericErrorMessage));
  }

  // 4. Update Auth Metadata: Store preferred name in the user's session data
  const { error: metadataError } = await supabase.auth.updateUser({
      data: { 
          // Use a custom key that mirrors the preferred name
          preferred_display_name: preferredDisplayName,
      }
  });

  if (metadataError) {
      console.error("Warning: Failed to update user metadata:", metadataError);
  }

  // 5. IMMEDIATE SIGN-IN: Establish the session cookie.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return redirect(LOGIN_PAGE + '?error=' + encodeURIComponent('Account created, but sign-in failed. Please try logging in.'));
  }
  
  // 6. Success
  revalidatePath(HOMEPAGE, 'layout')
  return redirect(HOMEPAGE)
}

// --- User Logout ---
/**
 * Handles user sign-out by destroying the session cookie.
 */
export async function logout() {
  const supabase = await createClient()

  // Destroy the session
  await supabase.auth.signOut()

  // Invalidate the cache for the root layout and redirect to the login page
  revalidatePath(HOMEPAGE, 'layout')
  redirect(LOGIN_PAGE)
}