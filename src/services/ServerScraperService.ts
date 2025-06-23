/**
 * ServerScraperService
 * 
 * This service provides server-side scraping functionality as a fallback
 * when client-side scraping fails due to CORS or anti-bot measures.
 * 
 * It uses the server-side API endpoints to fetch product data and price comparisons.
 */

import { ScrapedProductData, PriceComparisonItem } from '@/utils/scraperService';

// API endpoints based on Vercel deployment - will work both in development and production
const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000'; // For server-side rendering (if used)
  }
  
  // For client-side rendering
  const protocol = window.location.protocol;
  const host = window.location.host;
  return `${protocol}//${host}`;
};

/**
 * Use server-side scraping as a fallback
 * This bypasses CORS and browser fingerprinting issues
 */
export async function scrapeProductServer(url: string): Promise<ScrapedProductData | null> {
  try {
    console.log('Attempting server-side scraping via API endpoint');
    
    // For development testing to see all API calls
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
      // Simulate an API response delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Extract ASIN for the mock data
      const asin = extractASINFromURL(url);
      
      // Return mock data with the ASIN
      return {
        name: 'Server-scraped Product',
        imageUrl: 'https://via.placeholder.com/300x300?text=Server+Scraped+Image',
        currentPrice: Math.floor(Math.random() * 10000) / 100 + 10,
        previousPrice: Math.floor(Math.random() * 15000) / 100 + 15,
        currency: '₹',
        asin: asin || 'UNKNOWN',
        url,
        metadata: {
          brand: 'Server Scraper Brand',
          model: 'SSM-2000',
          features: ['Server-side scraping avoids CORS issues', 'Better success rate for blocked sites']
        },
        lastUpdated: new Date()
      };
    }
    
    // Make a request to the server-side API endpoint
    const apiUrl = `${getApiBaseUrl()}/api/scrape?url=${encodeURIComponent(url)}`;
    console.log('API endpoint:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`Server scraping failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Ensure the lastUpdated field is a Date object
    if (data.lastUpdated && typeof data.lastUpdated === 'string') {
      data.lastUpdated = new Date(data.lastUpdated);
    } else {
      data.lastUpdated = new Date();
    }
    
    return data;
  } catch (error) {
    console.error('Server-side scraping failed:', error);
    return null;
  }
}

/**
 * Search for product across platforms using server-side scraping
 */
export async function searchProductAcrossPlatformsServer(
  searchTerm: string
): Promise<PriceComparisonItem[]> {
  try {
    console.log('Attempting server-side comparison search');
    
    // For development testing
    if (process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true') {
      // Simulate an API response delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return mock comparison data
      const basePrice = Math.floor(Math.random() * 5000) + 1000;
      return [
        {
          marketplace: 'Amazon (Server)',
          productName: `${searchTerm} - Amazon Result`,
          price: basePrice,
          currency: '₹',
          url: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true,
          isLowestPrice: false
        },
        {
          marketplace: 'Flipkart (Server)',
          productName: `${searchTerm} - Flipkart Result`,
          price: basePrice * 0.9, // 10% cheaper
          currency: '₹',
          url: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true,
          isLowestPrice: true
        },
        {
          marketplace: 'BigBasket (Server)',
          productName: `${searchTerm} - BigBasket Result`,
          price: basePrice * 1.05, // 5% more expensive
          currency: '₹',
          url: `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true,
          isLowestPrice: false
        },
        {
          marketplace: 'Myntra (Server)',
          productName: `${searchTerm} - Myntra Fashion`,
          price: basePrice * 0.95, // 5% cheaper
          currency: '₹',
          url: `https://www.myntra.com/${encodeURIComponent(searchTerm.replace(/\s+/g, '-'))}`,
          lastUpdated: new Date(),
          inStock: true,
          isLowestPrice: false
        }
      ];
    }
    
    // Make a request to the server-side API endpoint
    const apiUrl = `${getApiBaseUrl()}/api/compare?productName=${encodeURIComponent(searchTerm)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Server comparison failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Ensure the lastUpdated field is a Date object for each item
    return data.map((item: PriceComparisonItem) => ({
      ...item,
      lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date()
    }));
  } catch (error) {
    console.error('Server-side comparison failed:', error);
    return [];
  }
}

/**
 * Extract ASIN from an Amazon URL
 */
function extractASINFromURL(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Check for ASIN in the pathname
    const pathMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    
    // Check for ASIN in the query parameters
    const asinParam = urlObj.searchParams.get('asin');
    if (asinParam && asinParam.match(/^[A-Z0-9]{10}$/)) {
      return asinParam;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
