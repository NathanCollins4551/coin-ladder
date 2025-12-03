// src/app/(main)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server' 
import { Sidebar } from '@/components/Sidebar'
// 🔑 FIX 1: Import the Server Component wrapper
import { ProfileBarServer } from '@/components/ProfileBarServer' 
import AuthHandler from '@/components/AuthHandler'
import { Suspense } from 'react'


const LANDING_PAGE = '/landing' 

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient()

    // CRITICAL: Use getUser() for protection, which revalidates the token.
    const { data, error } = await supabase.auth.getUser()

    if (error || !data?.user) {
        // If the user is NOT valid, redirect to the landing page.
        redirect(LANDING_PAGE)
    }

    // You now have the user object available in the scope of this layout, 
    // which confirms the session is valid for ProfileBarServer to fetch data.
    
    return (
        <div className="flex min-h-screen">
            <AuthHandler />
            <Sidebar />
            <div className="flex flex-col flex-grow pl-64">
                {/* 🔑 FIX 2: Render the Server Component wrapper */}
                <Suspense fallback={<div>Loading...</div>}>
                    <ProfileBarServer /> 
                </Suspense>
                <main className="flex-grow p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}