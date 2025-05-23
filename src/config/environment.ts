// File: /Users/aashik/Documents/pricepulse-ai-tracker/src/config/environment.ts

// Environment variables for various services

// Default environment values
const DEFAULT_ENV = {
  // Scraping Services
  OXYLABS_USERNAME: 'aashik17_P2f9p',
  OXYLABS_PASSWORD: 'AashikAsh=1715',
  
  // API Keys
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Proxies
  DEFAULT_PROXY: 'https://corsproxy.io/?',
  
  // Cache settings
  CACHE_DURATION_MINUTES: 60, // 1 hour
  
  // Scraping behavior
  PREFER_SERVER_SCRAPING: true,
  
  // Server API endpoints
  SERVER_SCRAPE_ENDPOINT: '/api/scrape',
  SERVER_COMPARE_ENDPOINT: '/api/compare',
  
  // Development flags
  USE_MOCK_DATA: false
};

// Export environment with proper fallbacks
export const ENV = {
  ...DEFAULT_ENV,
  
  // Override with actual environment variables when available
  OXYLABS_USERNAME: process.env.OXYLABS_USERNAME || DEFAULT_ENV.OXYLABS_USERNAME,
  OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD || DEFAULT_ENV.OXYLABS_PASSWORD,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || DEFAULT_ENV.OPENAI_API_KEY,
  
  // Parse numeric values
  CACHE_DURATION_MINUTES: process.env.CACHE_DURATION_MINUTES 
    ? parseInt(process.env.CACHE_DURATION_MINUTES, 10) 
    : DEFAULT_ENV.CACHE_DURATION_MINUTES,
  
  // Parse boolean values
  PREFER_SERVER_SCRAPING: process.env.PREFER_SERVER_SCRAPING === 'false' 
    ? false 
    : DEFAULT_ENV.PREFER_SERVER_SCRAPING,
  
  USE_MOCK_DATA: process.env.USE_MOCK_DATA === 'true' 
    ? true 
    : DEFAULT_ENV.USE_MOCK_DATA
};

// Helper function to get the correct API base URL
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'; // For server-side rendering (if used)
  }
  
  // For client-side rendering
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
}

// Helper function to get full API endpoint URLs
export function getApiUrl(endpoint: string): string {
  return `${getApiBaseUrl()}${endpoint}`;
}
