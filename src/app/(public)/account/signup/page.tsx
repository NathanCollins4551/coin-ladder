// src/app/(public)/account/signup/page.tsx
import { Suspense } from 'react';
import SignUpForm from './SignUpForm'; // Import the new client component

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading sign-up form...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
