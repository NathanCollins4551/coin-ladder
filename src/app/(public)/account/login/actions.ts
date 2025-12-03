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
    if (error.message === 'Email not confirmed') {
      return redirect(LOGIN_PAGE + '?error=' + encodeURIComponent('Email not confirmed. Please check your inbox for the confirmation link.'));
    }
    return redirect(LOGIN_PAGE + '?error=' + encodeURIComponent(error.message));
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
export async function signup(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient() 

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('display_name') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// --- OTP Verification ---
export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const email = formData.get('email') as string;
  const token = formData.get('token') as string;
  const displayName = formData.get('displayName') as string;

  if (!email || !token || !displayName) {
    return redirect(`${SIGNUP_PAGE}?step=2&email=${encodeURIComponent(email)}&error=Email, token, and display name are required.`);
  }

  const { data: { user }, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });

  if (error) {
    return redirect(`${SIGNUP_PAGE}?step=2&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`);
  }

  if (user) {
    const normalizedDisplayName = displayName.toLowerCase();
    const preferredDisplayName = displayName;

    // Update user metadata
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { user_metadata: { preferred_display_name: preferredDisplayName } }
    );
    if (metadataError) {
        console.error("Profile metadata update error after OTP verification:", metadataError);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ 
        user_id: user.id, 
        display_name: normalizedDisplayName,
        preferred_name: preferredDisplayName,
      });
    
    if (profileError) {
        console.error("Profile creation error after OTP verification:", profileError);
    }
  }

  revalidatePath(HOMEPAGE, 'layout');
  redirect(HOMEPAGE);
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