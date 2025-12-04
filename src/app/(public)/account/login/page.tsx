// src/app/(public)/account/login/page.tsx
import { Suspense } from 'react';
import LoginForm from './LoginForm'; // Import the new client component

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login form...</div>}>
      <LoginForm />
    </Suspense>
  );
}
