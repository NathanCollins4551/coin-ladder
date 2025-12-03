// src/app/(main)/news/page.tsx (PAGINATION IMPLEMENTED)
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getNewsArticles, NewsArticle } from '@/lib/data/crypto-fetch';

// Define articles per page for client-side load more logic
const ARTICLES_PER_PAGE = 12;

// Helper function for date formatting
const formatTimestamp = (timestamp: number) => {
    // This function assumes the timestamp is now in milliseconds (MSEC) from the server.js fix.
    try {
        const date = new Date(timestamp);
        
        // Safety check against invalid/epoch-zero dates
        if (date.getTime() < Date.UTC(2000, 0, 1)) {
             return 'Date Unavailable';
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (e) {
        return 'Date Unavailable';
    }
};

export default function MyNewsPage() {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [page, setPage] = useState(1); // Tracks current page
    const [hasMore, setHasMore] = useState(true); // Tracks if more pages exist
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNews = useCallback(async (pageNumber: number, initialLoad: boolean) => {
        if (!initialLoad) setIsLoadMoreLoading(true);
        
        try {
            const articles = await getNewsArticles(pageNumber);
            
            if (articles.length === 0 && pageNumber === 1) {
                setError("No news articles were returned.");
                setHasMore(false);
            } else if (articles.length === 0) {
                setHasMore(false);
            } else {
                setNews(prevNews => {
                    const newArticles = initialLoad ? articles : [...prevNews, ...articles];
                    // Sort the new combined array by date descending (most recent first)
                    return newArticles.sort((a, b) => b.date - a.date);
                });
                // If we get fewer articles than the expected page size, assume it's the last page
                if (articles.length < ARTICLES_PER_PAGE) {
                    setHasMore(false);
                }
            }
        } catch (err: any) {
            setError(`Failed to fetch news: ${err.message}`);
            setHasMore(false);
        } finally {
            if (initialLoad) setIsLoading(false);
            setIsLoadMoreLoading(false);
        }
    }, []);

    // Effect to run on initial load or when page state changes
    useEffect(() => {
        fetchNews(page, page === 1);
    }, [page, fetchNews]);

    const handleLoadMore = () => {
        if (!isLoadMoreLoading && hasMore) {
            setPage(prevPage => prevPage + 1);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center p-8">
                    <p className="text-gray-500 text-lg">Loading the latest crypto headlines...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                    <h2 className="font-bold text-xl mb-2">Error Loading News</h2>
                    <p>Could not retrieve news articles. Check your backend proxy and CoinGecko connection.</p>
                    <p className="text-sm mt-2">Details: {error}</p>
                </div>
            );
        }

        if (news.length === 0 && !hasMore) {
            return (
                <div className="p-6 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
                    <p>No news articles available at this time.</p>
                </div>
            );
        }

        return (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {news.map((article, index) => (
                        <Link 
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            key={index}
                            className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100"
                        >
                            <div className="relative h-48 bg-gray-100">
                                {/* Image/Placeholder Logic */}
                                {article.image && article.image.includes('http') ? (
                                    <img 
                                        src={article.image} 
                                        alt={article.title} 
                                        className="w-full h-full object-cover"
                                        // Fallback to placeholder if image fails to load
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = `https://placehold.co/400x200/4F46E5/ffffff?text=Crypto+News`;
                                            e.currentTarget.className = "w-full h-full object-contain p-4"; 
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center w-full h-full text-blue-600 font-bold text-lg bg-blue-50 p-4 text-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
                                        </svg>
                                        {article.source || 'Image Unavailable'}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 space-y-2">
                                <h3 className="font-bold text-lg text-gray-900 leading-snug hover:text-blue-600 transition-colors">
                                    {article.title}
                                </h3>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span className="truncate">Source: {article.source}</span>
                                    <span>{formatTimestamp(article.date)}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center mt-8">
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoadMoreLoading}
                            className={`px-6 py-3 rounded-xl text-white font-semibold transition ${
                                isLoadMoreLoading 
                                    ? 'bg-blue-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                            }`}
                        >
                            {isLoadMoreLoading ? 'Loading...' : `Load More Articles`}
                        </button>
                    </div>
                )}
                
                {!hasMore && news.length > 0 && (
                    <p className="text-center text-gray-500 mt-8">End of news feed.</p>
                )}
            </>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <h1 className="text-5xl font-extrabold text-gray-900 border-b pb-4">
                Global Crypto News
            </h1>
            
            {renderContent()}

        </div>
    );
}