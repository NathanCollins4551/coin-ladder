'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { searchCryptos, CryptoPriceData } from '@/lib/data/crypto-fetch';

export default function CryptoSearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CryptoPriceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length >= 3) {
      setIsLoading(true);
      setIsDropdownVisible(true);
      try {
        const data = await searchCryptos(query);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setResults([]);
      setIsDropdownVisible(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300); // 300ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto" ref={searchRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        onFocus={() => results.length > 0 && setIsDropdownVisible(true)}
        placeholder="Search for a cryptocurrency..."
        className="w-full px-4 py-2 text-gray-900 bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      />
      {isDropdownVisible && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((crypto) => (
                <li key={crypto.id}>
                  <Link
                    href={`/cryptocurrencies/${crypto.id}`}
                    className="flex items-center px-4 py-3 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setSearchTerm('');
                      setIsDropdownVisible(false);
                    }}
                  >
                    <img src={crypto.logo_url} alt={crypto.name} className="w-6 h-6 mr-3 rounded-full" />
                    <span className="font-medium text-gray-800">{crypto.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{crypto.symbol.toUpperCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">No results found.</div>
          )}
        </div>
      )}
    </div>
  );
}
