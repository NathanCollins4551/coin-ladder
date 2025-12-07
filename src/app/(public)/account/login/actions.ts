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
 * If the user's email is not confirmed, it resends the verification code
 * and redirects them to the OTP verification page.
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
      // Resend the verification email
      await supabase.auth.resend({
        type: 'signup',
        email: data.email,
      });
      
      const message = "Your email is not confirmed. We've sent a new verification code to your inbox.";
      // Redirect to the OTP page
      return redirect(`${SIGNUP_PAGE}?step=2&email=${encodeURIComponent(data.email)}&message=${encodeURIComponent(message)}`);
    }
    return redirect(LOGIN_PAGE + '?error=' + encodeURIComponent(error.message));
  }

  revalidatePath(HOMEPAGE, 'layout')
  redirect(HOMEPAGE)
}

// --- User Signup ---
/**
 * UPDATED SIGNUP ACTION: 
 * 1. Checks if email already exists via RPC.
 * 2. Creates Auth user and stores display_name in metadata.
 * 3. Redirects to the OTP verification step.
 */
export async function signup(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const displayName = formData.get('display_name') as string;

  // First, check if a user with this email already exists via RPC
  const { data: userExists, error: rpcError } = await supabaseAdmin
    .rpc('check_user_exists', { user_email: email });

  if (rpcError) {
    console.error('Error checking if user exists:', rpcError);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }

  if (userExists) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // If email is not taken, proceed with signup
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
        data: {
            'preferred_display_name': displayName,
        }
    }
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// --- OTP Verification ---
/**
 * Verifies the OTP and creates the user profile upon success.
 * Retrieves the display name from the user's metadata.
 */
export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  if (!email || !token) {
    return redirect(`${SIGNUP_PAGE}?step=2&email=${encodeURIComponent(email)}&error=Email and token are required.`);
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
    const preferredDisplayName = user.user_metadata.preferred_display_name;

    if (!preferredDisplayName) {
        console.error("Critical: 'preferred_display_name' not found in user metadata after OTP verification for user:", user.id);
        const errorMessage = "Could not find your display name. Please try signing up again.";
        return redirect(`${SIGNUP_PAGE}?error=${encodeURIComponent(errorMessage)}`);
    }

    const normalizedDisplayName = preferredDisplayName.toLowerCase();

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({ 
        user_id: user.id, 
        display_name: normalizedDisplayName,
        preferred_name: preferredDisplayName,
      });
    
    // If profile creation fails, redirect with error and clean up the orphaned auth user
    if (profileError) {
        console.error("Critical: Profile creation failed after OTP verification:", profileError);

        // Cleanup: Attempt to delete the newly created user to prevent orphaned auth accounts
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
            console.error("Critical: Failed to clean up orphaned user:", deleteError);
        }

        const errorMessage = "Could not create your user profile. Please try signing up again.";
        return redirect(`${SIGNUP_PAGE}?error=${encodeURIComponent(errorMessage)}`);
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