'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Import client-side supabase
import { ProfileBar } from './ProfileBar';

// Helper to fetch balance, updated to use client-side supabase
async function fetchUserBalance(supabase: any, userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('cash_balance')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error("Balance fetch error details:", JSON.stringify(error, null, 2));
        return 0;
    }
    return Number(data?.cash_balance) || 0;
}

export const ProfileBarServer = () => {
    const [username, setUsername] = useState('User');
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();

                if (userError || !user) {
                    setError(userError?.message || 'User not found.');
                    setUsername('Guest');
                    setBalance(0);
                    return;
                }

                const preferredDisplayName = user.user_metadata.preferred_display_name as string;
                setUsername(preferredDisplayName || 'User');

                const fetchedBalance = await fetchUserBalance(supabase, user.id);
                setBalance(Number(fetchedBalance) || 0);

            } catch (e: any) {
                console.error("Failed to fetch profile data:", e);
                setError(e.message || 'Failed to load profile.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [supabase]); // Re-run if supabase client changes (unlikely)

    if (isLoading) {
        return <div>Loading profile...</div>; // Simple loading state
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>; // Simple error state
    }

    return (
        <ProfileBar
            username={username}
            balance={balance}
        />
    );
};