const CACHE_KEY = 'booklist_cache';
const CACHE_TIMESTAMP_KEY = 'booklist_cache_timestamp';

interface CacheData {
  books: any[];
  timestamp: number;
}

export function getCache(): CacheData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) return null;
    
    return {
      books: JSON.parse(cachedData),
      timestamp: parseInt(timestamp, 10)
    };
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

export function setCache(books: any[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(books));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}
