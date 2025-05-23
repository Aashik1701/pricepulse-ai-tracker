// filepath: /Users/aashik/Documents/pricepulse-ai-tracker/src/services/OxylabsService.ts
// Oxylabs API integration for real-time data scraping
import { toast } from 'sonner';
import { PriceComparisonItem } from '@/utils/scraperService';
import { ENV } from '@/config/environment';

const OXYLABS_API_URL = 'https://realtime.oxylabs.io/v1/queries';
// Using environment variables from centralized config
const OXYLABS_USERNAME = ENV.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = ENV.OXYLABS_PASSWORD;

// Base64 encode credentials for Basic Auth
const getAuthHeader = (): string => {
  // Use a more reliable Base64 encoding method
  const encoder = new TextEncoder();
  const data = encoder.encode(`${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}`);
  const base64Encoded = btoa(String.fromCharCode.apply(null, Array.from(data)));
  return `Basic ${base64Encoded}`;
};

interface OxylabsResponse {
  results: Array<{
    content: any;
    created_at: string;
    updated_at: string;
    page: number;
    url: string;
    job_id: string;
    status_code: number;
  }>;
}

interface AmazonProductResponse {
  seller?: {
    name: string;
    url: string;
  };
  pricing?: {
    price: number;
    currency: string;
    availability?: string;
  };
  price?: number;
  currency?: string;
  title: string;
  url: string;
  images: Array<{
    url: string;
  }>;
  asin: string;
  available?: boolean;
  bullet_points?: string[];
  brand?: string;
  category?: string[];
  pricing_str?: string;
}

interface GoogleShoppingResponse {
  results: {
    organic: Array<{
      title: string;
      price: number;
      currency: string;
      merchant: {
        name: string;
        url: string;
      };
      url: string;
      price_str: string;
    }>;
  };
}

export const OxylabsService = {
  /**
   * Scrape product details from Amazon using Oxylabs API
   */
  scrapeAmazonProduct: async (asin: string): Promise<any> => {
    try {
      toast.info('Fetching product data from Oxylabs...', {
        description: 'This may take a few moments'
      });

      // Log authentication attempt
      console.log('Using Oxylabs with username:', OXYLABS_USERNAME);
      
      // Implement exponential backoff for API requests
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const response = await fetch(OXYLABS_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': getAuthHeader()
            },
            body: JSON.stringify({
              source: 'amazon_product',
              query: asin,
              geo_location: '110001', // Using a Delhi ZIP code for Indian results
              parse: true
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Oxylabs API error response for Amazon product:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
            
            // Check specifically for auth errors
            if (response.status === 401 || response.status === 403) {
              console.error('Authentication error with Oxylabs API. Check credentials.');
              toast.error('Authentication error with Oxylabs API');
              throw new Error(`Oxylabs API authentication error: ${response.status} ${response.statusText}`);
            }
            
            // Check for rate limiting (429) and retry with backoff
            if (response.status === 429) {
              retries++;
              const backoffTime = Math.pow(2, retries) * 1000;
              console.log(`Rate limited by Oxylabs API, retrying in ${backoffTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              continue;
            }
            
            throw new Error(`Oxylabs API error: ${response.status} ${response.statusText}`);
          }

          const data: OxylabsResponse = await response.json();
          
          if (!data.results || data.results.length === 0) {
            throw new Error('No results from Oxylabs API for Amazon product');
          }

          // Log the response for debugging
          console.log('Oxylabs Amazon API response:', JSON.stringify(data.results[0].content, null, 2));

          // Extract product data from the response
          const productData = data.results[0].content as AmazonProductResponse;
          
          // Extract price from the appropriate field - handle different response structures
          const price = productData.pricing?.price || productData.price || 0;
          const currency = productData.pricing?.currency || productData.currency || '₹'; // Default to rupees
          
          // Extract features from bullet points if available
          const features = productData.bullet_points || [];
          
          // Extract brand information
          const brand = productData.brand || '';
          
          // Extract category
          const category = productData.category && productData.category.length > 0 
            ? productData.category[0] 
            : '';
          
          // Parse the pricing_str field to potentially extract previous price
          let previousPrice = null;
          if (productData.pricing_str) {
            // Look for patterns like "₹16,010 ₹18,900" where the second number is the previous price
            const priceMatch = productData.pricing_str.match(/₹\s*([0-9,]+(?:\.[0-9]+)?)\s+₹\s*([0-9,]+(?:\.[0-9]+)?)/);
            if (priceMatch && priceMatch[2]) {
              previousPrice = parseFloat(priceMatch[2].replace(/,/g, ''));
              console.log('Found previous price in pricing_str:', previousPrice);
            }
          }
          
          return {
            name: productData.title,
            imageUrl: productData.images && productData.images.length > 0 ? productData.images[0]?.url : undefined,
            currentPrice: price,
            previousPrice: previousPrice, // Extract from pricing_str if available
            currency: currency,
            asin: productData.asin,
            metadata: {
              brand: brand,
              model: '', // Need to extract from title if not available directly
              category: category,
              features: features
            },
            lastUpdated: new Date(),
            inStock: productData.available !== false
          };
        } catch (error) {
          if (retries >= maxRetries - 1) {
            throw error;
          }
          retries++;
          const backoffTime = Math.pow(2, retries) * 1000;
          console.log(`Oxylabs API request failed, retrying in ${backoffTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
      
      throw new Error('Max retries exceeded for Oxylabs API');
    } catch (error) {
      console.error('Error scraping Amazon product via Oxylabs:', error);
      throw error;
    }
  },
  
  /**
   * Search for the product on Google Shopping using Oxylabs API
   */
  searchGoogleShopping: async (searchTerm: string): Promise<PriceComparisonItem[]> => {
    try {
      toast.info('Searching for product prices across platforms...', {
        description: 'This may take a few moments'
      });

      const response = await fetch(OXYLABS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({
          source: 'google_shopping_search',
          query: searchTerm,
          parse: true,
          geo_location: '90210' // Using Beverly Hills ZIP code as provided in your example
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Oxylabs API error response for Google Shopping:', errorText);
        throw new Error(`Oxylabs API error: ${response.status} ${response.statusText}`);
      }

      const data: OxylabsResponse = await response.json();
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No results from Oxylabs API for Google Shopping');
      }

      // Log the response for debugging
      console.log('Oxylabs Google Shopping API response:', JSON.stringify(data.results[0].content, null, 2));

      // Extract product data from the response
      const searchResults = data.results[0].content as GoogleShoppingResponse;
      
      if (!searchResults.results || !searchResults.results.organic || searchResults.results.organic.length === 0) {
        throw new Error('No organic results found in Google Shopping data');
      }
      
      // Map Google Shopping results to PriceComparisonItem format
      const priceComparisons: PriceComparisonItem[] = searchResults.results.organic
        .slice(0, 8) // Limit to a reasonable number of results
        .map(item => ({
          marketplace: item.merchant.name.replace(/\.aULzUe.*$/, ''), // Clean up marketplace name if needed
          productName: item.title,
          price: item.price,
          currency: item.currency,
          url: item.merchant.url || item.url,
          lastUpdated: new Date(),
          inStock: true // Assume in stock unless specified otherwise
        }));

      return priceComparisons;
    } catch (error) {
      console.error('Error searching Google Shopping via Oxylabs:', error);
      throw error;
    }
  }
};
