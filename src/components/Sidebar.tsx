// src/components/Sidebar.tsx
import Link from 'next/link';

const navItems = [
  { name: 'Homepage', href: '/' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'My Trades', href: '/my-trades' },
  { name: 'Cryptocurrencies', href: '/cryptocurrencies' },
  { name: 'Leaderboard', href: '/leaderboard' },
  { name: 'News', href: '/news' },
];

export const Sidebar = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white h-full fixed top-0 left-0">
      {/* Logo Section */}
      <Link href="/" className="p-4 flex items-center text-2xl font-bold border-b border-gray-700 hover:text-green-400 transition">
        <svg className="h-8 w-8 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16M20 4v16M4 10h16M4 16h16"/>
        </svg>
        Coin Ladder
      </Link>

      {/* Navigation Menu */}
      <nav className="flex-grow p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition duration-150"
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 text-xs text-center border-t border-gray-700 text-gray-400">
        <p>Coin Ladder</p>
        <p>&copy; {currentYear}</p>
      </div>
    </div>
  );
};