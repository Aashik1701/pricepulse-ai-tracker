// File: /Users/aashik/Documents/pricepulse-ai-tracker/src/config/environment.ts

// Environment variables for various services

// Default environment values
const DEFAULT_ENV = {
  // Scraping Services
  OXYLABS_USERNAME: 'aashik17_P2f9p',
  OXYLABS_PASSWORD: 'AashikAsh=1715',
  
  // API Keys
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  
  // Supabase Configuration
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://cbgrkkpscyxcjkmrfzzg.supabase.co',
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZ3Jra3BzY3l4Y2prbXJmenpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5ODU0ODAsImV4cCI6MjA2MzU2MTQ4MH0.AXKHyDN1INDUzErG7Pw4IWL2zysVgSmVvcKbOr_tsDc',
  
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
  OXYLABS_USERNAME: import.meta.env.VITE_OXYLABS_USERNAME || DEFAULT_ENV.OXYLABS_USERNAME,
  OXYLABS_PASSWORD: import.meta.env.VITE_OXYLABS_PASSWORD || DEFAULT_ENV.OXYLABS_PASSWORD,
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || DEFAULT_ENV.OPENAI_API_KEY,
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || DEFAULT_ENV.SUPABASE_URL,
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_KEY || DEFAULT_ENV.SUPABASE_KEY,
  
  // Parse numeric values
  CACHE_DURATION_MINUTES: import.meta.env.VITE_CACHE_DURATION_MINUTES 
    ? parseInt(import.meta.env.VITE_CACHE_DURATION_MINUTES, 10) 
    : DEFAULT_ENV.CACHE_DURATION_MINUTES,
  
  // Parse boolean values
  PREFER_SERVER_SCRAPING: import.meta.env.VITE_PREFER_SERVER_SCRAPING === 'false' 
    ? false 
    : DEFAULT_ENV.PREFER_SERVER_SCRAPING,
  
  USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA === 'true' 
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
