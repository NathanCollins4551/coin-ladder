// src/app/layout.tsx
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* The <body> tag will be here, and it wraps all other pages */}
      <body>{children}</body>
    </html>
  );
}