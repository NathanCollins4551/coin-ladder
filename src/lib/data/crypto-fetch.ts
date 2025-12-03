// src/lib/data/crypto-fetch.ts

const VM_API_URL = process.env.NEXT_PUBLIC_API_URL; 

// --- Interfaces ---

export interface NewsArticle {
    title: string;
    link: string;
    source: string;
    date: number;
    image: string;
}

export interface CryptoPriceData {
  id: string;
  name: string;
  symbol: string;
  price?: number; 
  percent_change_24h?: number; 
  percent_change_7d?: number;
  logo_url: string; 
}

export interface PortfolioAsset {
  id: string;
  name: string;
  symbol: string;
  logo_url: string;
  amount_owned: number;
  price_bought_at: number;
}

// --- Functions ---

export async function getCoinData(): Promise<CryptoPriceData[]> {
  const url = `${VM_API_URL}/api/crypto/prices`; 
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    console.error(`Failed to fetch prices. Status: ${res.status}`);
    return []; 
  }
  return res.json();
}

export async function getTopCryptoPrices(limit: number = 10): Promise<CryptoPriceData[]> {
  const url = `${VM_API_URL}/api/crypto/prices?limit=${limit}`; 
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    console.error(`Failed to fetch prices. Status: ${res.status}`);
    return []; 
  }
  return res.json();
}

export async function searchCryptos(query: string): Promise<CryptoPriceData[]> {
  if (!query) return [];
  const url = `${VM_API_URL}/api/crypto/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`Failed to search. Status: ${res.status}`);
    return [];
  }
  return res.json();
}

export async function getPortfolio(): Promise<PortfolioAsset[]> {
  const url = `${VM_API_URL}/api/crypto/portfolio`;
  const res = await fetch(url, { cache: 'no-store' }); // Portfolio data should not be cached
  if (!res.ok) {
    console.error(`Failed to fetch portfolio. Status: ${res.status}`);
    return [];
  }
  return res.json();
}

export async function getPricesForIds(ids: string[]): Promise<{ [key: string]: number }> {
  if (ids.length === 0) return {};
  const url = `${VM_API_URL}/api/crypto/prices-by-ids?ids=${ids.join(',')}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    console.error(`Failed to fetch prices by IDs. Status: ${res.status}`);
    return {};
  }
  return res.json();
}

export async function getCryptoDetails(coinId: string) { 
  const finalId = coinId.toLowerCase(); 
  const url = `${VM_API_URL}/api/crypto/details/${finalId}`; 
  const res = await fetch(url, { cache: 'default' });
  if (!res.ok) {
    console.error(`Failed to fetch details for ${coinId}. Status: ${res.status}`);
    return null;
  }
  return res.json();
}

export async function getCryptoPriceHistory(coinId: string, duration: string) { 
  const finalId = coinId.toLowerCase();
  const url = `${VM_API_URL}/api/crypto/history/${finalId}?duration=${duration}`; 
  const res = await fetch(url, { cache: 'default' });
  if (!res.ok) {
    throw new Error(`Failed to fetch price history. Status: ${res.status}`);
  }
  return res.json(); 
}

export async function getNewsArticles(page: number): Promise<NewsArticle[]> { 
    const url = `${VM_API_URL}/api/crypto/news?page=${page}`; 
    const res = await fetch(url, { cache: 'no-store' }); 
    if (!res.ok) {
        console.error(`Failed to fetch news. Status: ${res.status}`);
        return [];
    }
    return res.json(); 
}