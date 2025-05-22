/**
 * Cache utility for storing scraped product data to reduce the need for frequent scraping
 * 
 * This helps:
 * 1. Reduce the number of requests to target websites
 * 2. Improve user experience with faster data retrieval
 * 3. Provide fallback data when scraping fails
 */

import { ScrapedProductData, PriceComparisonItem } from './scraperService';

// Cache TTL in milliseconds
const PRODUCT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const COMPARISON_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Cache interfaces
interface CachedProduct {
  data: ScrapedProductData;
  timestamp: number;
}

interface CachedComparison {
  data: PriceComparisonItem[];
  timestamp: number;
  searchTerm: string;
}

// Local storage cache keys
const PRODUCT_CACHE_KEY = 'pricepulse_product_cache';
const COMPARISON_CACHE_KEY = 'pricepulse_comparison_cache';

/**
 * Get the product cache
 */
function getProductCache(): Record<string, CachedProduct> {
  try {
    const cache = localStorage.getItem(PRODUCT_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (error) {
    console.error('Error reading product cache:', error);
    return {};
  }
}

/**
 * Get the comparison cache
 */
function getComparisonCache(): Record<string, CachedComparison> {
  try {
    const cache = localStorage.getItem(COMPARISON_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (error) {
    console.error('Error reading comparison cache:', error);
    return {};
  }
}

/**
 * Save the product cache
 */
function saveProductCache(cache: Record<string, CachedProduct>): void {
  try {
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving product cache:', error);
    
    // If storage is full, clear older entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const currentCache = getProductCache();
      const entries = Object.entries(currentCache);
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove the oldest 50% of entries
      const newCache: Record<string, CachedProduct> = {};
      const entriesToKeep = entries.slice(Math.floor(entries.length / 2));
      
      entriesToKeep.forEach(([key, value]) => {
        newCache[key] = value;
      });
      
      // Try saving again
      try {
        localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(newCache));
      } catch (e) {
        console.error('Failed to save reduced cache:', e);
      }
    }
  }
}

/**
 * Save the comparison cache
 */
function saveComparisonCache(cache: Record<string, CachedComparison>): void {
  try {
    localStorage.setItem(COMPARISON_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving comparison cache:', error);
    
    // If storage is full, clear older entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      const currentCache = getComparisonCache();
      const entries = Object.entries(currentCache);
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove the oldest 50% of entries
      const newCache: Record<string, CachedComparison> = {};
      const entriesToKeep = entries.slice(Math.floor(entries.length / 2));
      
      entriesToKeep.forEach(([key, value]) => {
        newCache[key] = value;
      });
      
      // Try saving again
      try {
        localStorage.setItem(COMPARISON_CACHE_KEY, JSON.stringify(newCache));
      } catch (e) {
        console.error('Failed to save reduced comparison cache:', e);
      }
    }
  }
}

/**
 * Get a cached product by ASIN
 */
export function getCachedProduct(asin: string): ScrapedProductData | null {
  try {
    const cache = getProductCache();
    const cached = cache[asin];
    
    if (cached) {
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
        console.log(`Using cached product data for ${asin}`);
        return cached.data;
      } else {
        console.log(`Cache expired for ${asin}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached product:', error);
    return null;
  }
}

/**
 * Cache a product
 */
export function cacheProduct(asin: string, data: ScrapedProductData): void {
  try {
    const cache = getProductCache();
    
    cache[asin] = {
      data,
      timestamp: Date.now()
    };
    
    saveProductCache(cache);
    console.log(`Cached product data for ${asin}`);
  } catch (error) {
    console.error('Error caching product:', error);
  }
}

/**
 * Get cached price comparison by search term
 */
export function getCachedComparison(searchTerm: string): PriceComparisonItem[] | null {
  try {
    const cache = getComparisonCache();
    // Normalize search term for consistent keys
    const key = searchTerm.toLowerCase().trim();
    const cached = cache[key];
    
    if (cached) {
      // Check if cache is still valid
      if (Date.now() - cached.timestamp < COMPARISON_CACHE_TTL) {
        console.log(`Using cached comparison data for "${searchTerm}"`);
        return cached.data;
      } else {
        console.log(`Comparison cache expired for "${searchTerm}"`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting cached comparison:', error);
    return null;
  }
}

/**
 * Cache price comparison results
 */
export function cacheComparison(searchTerm: string, data: PriceComparisonItem[]): void {
  try {
    const cache = getComparisonCache();
    // Normalize search term for consistent keys
    const key = searchTerm.toLowerCase().trim();
    
    cache[key] = {
      data,
      timestamp: Date.now(),
      searchTerm
    };
    
    saveComparisonCache(cache);
    console.log(`Cached comparison data for "${searchTerm}"`);
  } catch (error) {
    console.error('Error caching comparison:', error);
  }
}

/**
 * Clear expired cache entries to prevent storage issues
 * Call this periodically (e.g., on app startup)
 */
export function clearExpiredCache(): void {
  try {
    // Clear expired product cache
    const productCache = getProductCache();
    let hasProductChanges = false;
    
    Object.entries(productCache).forEach(([key, value]) => {
      if (Date.now() - value.timestamp > PRODUCT_CACHE_TTL) {
        delete productCache[key];
        hasProductChanges = true;
      }
    });
    
    if (hasProductChanges) {
      saveProductCache(productCache);
    }
    
    // Clear expired comparison cache
    const comparisonCache = getComparisonCache();
    let hasComparisonChanges = false;
    
    Object.entries(comparisonCache).forEach(([key, value]) => {
      if (Date.now() - value.timestamp > COMPARISON_CACHE_TTL) {
        delete comparisonCache[key];
        hasComparisonChanges = true;
      }
    });
    
    if (hasComparisonChanges) {
      saveComparisonCache(comparisonCache);
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}
