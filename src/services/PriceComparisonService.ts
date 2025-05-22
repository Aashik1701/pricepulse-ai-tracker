import { 
  scrapeAmazonProduct, 
  scrapeFlipkart, 
  scrapeMeesho,
  PriceComparisonItem 
} from '../utils/scraperService';
import { extractEmbeddedJsonData } from '../utils/modernScraperService';
import { 
  getCachedProduct, 
  cacheProduct, 
  getCachedComparison, 
  cacheComparison 
} from '../utils/cacheUtils';
import { toast } from 'sonner';

interface PlatformPrice {
  marketplace: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  inStock?: boolean;
  lastUpdated: Date;
  metadata?: ProductMetadata;
}

interface ProductMetadata {
  brand?: string;
  model?: string;
  storage?: string;
  url?: string;
}

async function scrapeAllPlatforms(searchQuery: string, url?: string): Promise<PlatformPrice[]> {
  // First check cache
  const cachedResults = getCachedComparison(searchQuery);
  if (cachedResults) {
    return cachedResults.map(result => ({
      ...result,
      lastUpdated: new Date(result.lastUpdated) // Ensure Date object
    }));
  }

  const results: PlatformPrice[] = [];
  const errors: string[] = [];

  // Handle direct URL if provided
  if (url) {
    try {
      let platformData: PriceComparisonItem | null = null;
      
      if (url.toLowerCase().includes('amazon')) {
        const amazonData = await scrapeAmazonProduct(url);
        if (amazonData) {
          platformData = {
            marketplace: 'Amazon',
            productName: amazonData.name,
            price: amazonData.currentPrice || 0,
            currency: amazonData.currency || '₹',
            url: amazonData.url,
            inStock: amazonData.inStock,
            lastUpdated: new Date(),
            brand: amazonData.metadata?.brand,
            model: amazonData.metadata?.model
          };
        }
      } else if (url.toLowerCase().includes('flipkart')) {
        platformData = await scrapeFlipkart(url);
      } else if (url.toLowerCase().includes('meesho')) {
        platformData = await scrapeMeesho(url);
      }

      if (platformData) {
        results.push({
          marketplace: platformData.marketplace,
          productName: platformData.productName,
          price: platformData.price,
          currency: platformData.currency,
          url: platformData.url,
          inStock: platformData.inStock,
          lastUpdated: platformData.lastUpdated || new Date(),
          metadata: {
            brand: platformData.brand,
            model: platformData.model
          }
        });
      }
    } catch (error) {
      console.error('Error fetching data from URL:', error);
      errors.push(`Failed to fetch data from ${url}`);
    }
  }

  // Parallel scraping for other platforms
  const platformScrapers = [
    { name: 'Flipkart', fn: scrapeFlipkart },
    { name: 'Meesho', fn: scrapeMeesho }
  ];

  const scrapingPromises = platformScrapers.map(scraper =>
    scraper.fn(searchQuery)
      .then(data => {
        if (data) {
          results.push({
            marketplace: data.marketplace,
            productName: data.productName,
            price: data.price,
            currency: data.currency,
            url: data.url,
            inStock: data.inStock,
            lastUpdated: data.lastUpdated || new Date(),
            metadata: {
              brand: data.brand,
              model: data.model
            }
          });
        }
      })
      .catch(error => {
        console.error(`Error scraping ${scraper.name}:`, error);
        errors.push(`Failed to fetch data from ${scraper.name}`);
      })
  );

  await Promise.allSettled(scrapingPromises);

  // Show error toast if all scrapers failed
  if (results.length === 0 && errors.length > 0) {
    toast.error('Failed to fetch prices from any platform');
    return [];
  }

  // Sort results by price
  results.sort((a, b) => a.price - b.price);

  // Cache successful results
  if (results.length > 0) {
    cacheComparison(searchQuery, results);
  }

  return results;
}

export const PriceComparisonService = {
  scrapeAllPlatforms
};
