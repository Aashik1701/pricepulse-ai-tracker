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
}

// Local storage cache keys
const PRODUCT_CACHE_KEY = 'pricepulse_product_cache';
const COMPARISON_CACHE_KEY = 'pricepulse_comparison_cache';

/**
 * Get the product cache
 */
function getProductCache(): Record<string, CachedProduct> {
  const cache = localStorage.getItem(PRODUCT_CACHE_KEY);
  return cache ? JSON.parse(cache) : {};
}

/**
 * Get the comparison cache
 */
function getComparisonCache(): Record<string, CachedComparison> {
  const cache = localStorage.getItem(COMPARISON_CACHE_KEY);
  return cache ? JSON.parse(cache) : {};
}

/**
 * Save the product cache
 */
function saveProductCache(cache: Record<string, CachedProduct>): void {
  localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Save the comparison cache
 */
function saveComparisonCache(cache: Record<string, CachedComparison>): void {
  localStorage.setItem(COMPARISON_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Get a cached product by query/id
 */
export function getCachedProduct(query: string): ScrapedProductData | null {
  const cache = getProductCache();
  const cachedItem = cache[query];

  if (!cachedItem) {
    return null;
  }

  // Check if cache is still valid
  if (Date.now() - cachedItem.timestamp > PRODUCT_CACHE_TTL) {
    // Clean up expired cache
    delete cache[query];
    saveProductCache(cache);
    return null;
  }

  // Convert timestamp strings back to Date objects
  return {
    ...cachedItem.data,
    lastUpdated: new Date(cachedItem.data.lastUpdated)
  };
}

/**
 * Cache product data
 */
export function cacheProduct(query: string, data: ScrapedProductData): void {
  const cache = getProductCache();
  
  cache[query] = {
    data,
    timestamp: Date.now()
  };

  saveProductCache(cache);
}

/**
 * Get cached price comparison results
 */
export function getCachedComparison(query: string): PriceComparisonItem[] | null {
  const cache = getComparisonCache();
  const cachedItem = cache[query];

  if (!cachedItem) {
    return null;
  }

  // Check if cache is still valid
  if (Date.now() - cachedItem.timestamp > COMPARISON_CACHE_TTL) {
    // Clean up expired cache
    delete cache[query];
    saveComparisonCache(cache);
    return null;
  }

  // Convert timestamp strings back to Date objects
  return cachedItem.data.map(item => ({
    ...item,
    lastUpdated: new Date(item.lastUpdated)
  }));
}

/**
 * Cache comparison results
 */
export function cacheComparison(query: string, data: PriceComparisonItem[]): void {
  const cache = getComparisonCache();

  cache[query] = {
    data,
    timestamp: Date.now()
  };

  saveComparisonCache(cache);
}
