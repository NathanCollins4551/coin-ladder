// src/components/ProfileBarServer.tsx

import { createClient } from '@/lib/supabase/server';
import { ProfileBar } from './ProfileBar';

// 1. Fetch the user's balance from the user_profiles table
async function fetchUserBalance(userId: string): Promise<number> {
    const supabase = await createClient(); // Standard client, relies on RLS
    
    // 🔑 FIX: Query the correct table ('user_profiles') and column ('cash_balance')
    const { data, error } = await supabase
        .from('user_profiles') 
        .select('cash_balance') // <-- Select the correct column name
        .eq('user_id', userId) 
        .single();
    
    if (error) {
        // Logging the full error object for complete clarity during debugging
        console.error("Balance fetch error details:", JSON.stringify(error, null, 2));
        // Note: The error here could still be RLS related if the policy is wrong, 
        // but the table/column is now correct.
        return 0; 
    }
    
    // Ensure the result is treated as a number
    // Use data.cash_balance because the query returns an object with that property
    return Number(data?.cash_balance) || 0; 
}

export const ProfileBarServer = async () => {
    // 1. Get the authenticated session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null; 
    }
    
    let balance: number = 0;
    
    // Extract Display Name from Auth Metadata
    const preferredDisplayName = user.user_metadata.preferred_display_name as string;

    // 3. Fetch Real Balance
    try {
        const fetchedBalance = await fetchUserBalance(user.id);
        balance = Number(fetchedBalance) || 0; 
    } catch (e) {
        console.error("Failed to execute fetchUserBalance:", e);
        balance = 0;
    }
    
    const finalUsername = preferredDisplayName || 'User';

    // 4. Render the client component
    return (
        <ProfileBar 
            username={finalUsername} 
            balance={balance}
        />
    );
};