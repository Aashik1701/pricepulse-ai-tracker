
import { toast } from 'sonner';
import { OpenAIService } from '@/services/OpenAIService';

// Types for scraper responses
export interface ScrapedProductData {
  name?: string;
  imageUrl?: string;
  currentPrice?: number;
  previousPrice?: number;
  currency?: string;
  asin?: string;
  metadata?: {
    brand?: string;
    model?: string;
    category?: string;
    features?: string[];
    [key: string]: any;
  };
  lastUpdated: Date;
}

export interface PriceComparisonItem {
  marketplace: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  isLowestPrice?: boolean;
  lastUpdated?: Date;
  inStock?: boolean;
}

const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Scrapes product data from an Amazon product URL
 * Note: This is a simplified implementation for demonstration purposes.
 * In a real-world scenario, this would be handled by a backend service.
 */
export async function scrapeAmazonProduct(url: string): Promise<ScrapedProductData | null> {
  try {
    // Validate the URL is from Amazon
    if (!isAmazonUrl(url)) {
      toast.error('Please provide a valid Amazon URL');
      return null;
    }

    const asin = extractASIN(url);
    if (!asin) {
      toast.error('Could not extract product ID from the URL');
      return null;
    }

    // Use CORS proxy to fetch the page content
    toast.info('Fetching product data...', {
      description: 'This may take a few moments'
    });
    
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse the HTML to extract product data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract product data using selectors
    // These selectors may need to be updated as Amazon's HTML structure changes
    const name = extractText(doc, '#productTitle');
    const imageUrl = extractAttribute(doc, '#landingImage', 'src') || 
                     extractAttribute(doc, '#imgBlkFront', 'src') ||
                     extractAttribute(doc, '#img-canvas img', 'src');
    
    // Price extraction is complex due to various formats
    const priceText = extractText(doc, '.a-price .a-offscreen') || 
                      extractText(doc, '#priceblock_ourprice') ||
                      extractText(doc, '#priceblock_dealprice');
    
    // Extract previous price if available
    const previousPriceText = extractText(doc, '.a-price.a-text-price .a-offscreen') ||
                              extractText(doc, '.a-text-strike');
    
    // Parse prices and currency
    const { price: currentPrice, currency } = parsePrice(priceText || '');
    const { price: previousPrice } = parsePrice(previousPriceText || '');
    
    // Log what we found to help with debugging
    console.log('Extracted product data:', {
      name,
      imageUrl,
      priceText,
      currentPrice,
      previousPriceText,
      previousPrice,
      currency
    });

    // Extract product description for metadata extraction
    const descriptionText = Array.from(doc.querySelectorAll('#feature-bullets li'))
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join(' ');

    // Extract and enhance metadata using OpenAI
    toast.info('Extracting product metadata...');
    let metadata = await extractMetadata(doc, name || '');
    
    try {
      // Use OpenAI to enhance product metadata
      const enhancedMetadata = await OpenAIService.extractProductMetadata(
        name || '', 
        descriptionText
      );
      
      // Merge the scraped metadata with the AI-enhanced metadata
      metadata = {
        ...metadata,
        ...enhancedMetadata
      };
      
      toast.success('AI metadata extraction complete');
    } catch (error) {
      console.error('Error extracting metadata with AI:', error);
      toast.warning('Using basic metadata extraction');
    }
    
    const productData: ScrapedProductData = {
      name,
      imageUrl,
      currentPrice: currentPrice || 0,
      previousPrice: previousPrice || (currentPrice ? currentPrice * 1.1 : 0), // Fallback if no previous price
      currency: currency || '$',
      asin,
      metadata,
      lastUpdated: new Date()
    };

    return productData;
  } catch (error) {
    console.error('Error scraping product:', error);
    toast.error('Failed to scrape product data. Using mock data instead.');
    return null;
  }
}

/**
 * Search for the product on other platforms
 */
export async function searchProductOnPlatforms(
  productName: string,
  brand?: string,
  model?: string
): Promise<PriceComparisonItem[]> {
  toast.info('Searching for product across platforms...', {
    description: 'This may take a few moments'
  });
  
  try {
    // In a real implementation, this would search across platforms
    // For now, simulate the search with a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simplified search - in reality, we would need platform-specific scraping logic
    // or use their APIs if available
    const searchTerm = `${brand || ''} ${model || ''} ${productName}`.trim();
    console.log(`Searching for: ${searchTerm}`);
    
    // Simulate scraping results from different marketplaces
    // In a real implementation, we would fetch and parse data from each marketplace
    const results: PriceComparisonItem[] = [
      {
        marketplace: 'Amazon',
        productName: productName || '',
        price: Math.random() * 100 + 400, // Random price between 400-500
        currency: '₹',
        url: `https://www.amazon.com/dp/${extractASIN(window.location.href) || 'B08L5TNJHG'}`,
        lastUpdated: new Date(),
        inStock: true
      },
      {
        marketplace: 'Flipkart',
        productName: `${brand || ''} ${model || ''} ${productName?.substring(0, 30)}...`,
        price: Math.random() * 100 + 390, // Random price between 390-490
        currency: '₹',
        url: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`,
        lastUpdated: new Date(),
        inStock: Math.random() > 0.2 // 80% chance of being in stock
      },
      {
        marketplace: 'Meesho',
        productName: `${brand || ''} ${productName?.substring(0, 25)}...`,
        price: Math.random() * 100 + 380, // Random price between 380-480
        currency: '₹',
        url: `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`,
        lastUpdated: new Date(),
        inStock: Math.random() > 0.3 // 70% chance of being in stock
      },
      {
        marketplace: 'BigBasket',
        productName: `${brand || ''} ${model || ''} - Premium`,
        price: Math.random() * 100 + 410, // Random price between 410-510
        currency: '₹',
        url: `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`,
        lastUpdated: new Date(),
        inStock: Math.random() > 0.4 // 60% chance of being in stock
      },
      {
        marketplace: 'Swiggy Instamart',
        productName: `${brand || ''} ${model || ''}`,
        price: Math.random() * 100 + 420, // Random price between 420-520
        currency: '₹',
        url: `https://www.swiggy.com/search?query=${encodeURIComponent(searchTerm)}`,
        lastUpdated: new Date(),
        inStock: Math.random() > 0.5 // 50% chance of being in stock
      }
    ];
    
    return results.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Error searching across platforms:', error);
    toast.error('Failed to search across platforms');
    return [];
  }
}

// Helper functions

function isAmazonUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.includes('amazon');
  } catch {
    return false;
  }
}

function extractASIN(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/');
    
    // Example path: /dp/B08L5TNJHG/
    const dpIndex = pathParts.indexOf('dp');
    if (dpIndex !== -1 && dpIndex + 1 < pathParts.length) {
      return pathParts[dpIndex + 1];
    }
    
    // Check for product ID in query parameters
    const productId = parsedUrl.searchParams.get('psc') || parsedUrl.searchParams.get('asin');
    if (productId) return productId;
    
    // Fallback - try to find any 10-character alphanumeric string that looks like an ASIN
    const asinMatch = url.match(/[A-Z0-9]{10}/);
    return asinMatch ? asinMatch[0] : null;
  } catch {
    return null;
  }
}

function extractText(doc: Document, selector: string): string | undefined {
  const element = doc.querySelector(selector);
  return element?.textContent?.trim();
}

function extractAttribute(doc: Document, selector: string, attribute: string): string | undefined {
  const element = doc.querySelector(selector);
  return element?.getAttribute(attribute) || undefined;
}

function parsePrice(priceString: string): { price: number | null; currency: string | null } {
  if (!priceString) return { price: null, currency: null };
  
  // Extract currency symbol and numeric value
  const match = priceString.match(/([^\d,.]+)?([\d,.]+)/);
  if (!match) return { price: null, currency: null };
  
  const currencySymbol = match[1]?.trim() || null;
  const priceValue = match[2]?.replace(/,/g, '');
  
  return {
    price: priceValue ? parseFloat(priceValue) : null,
    currency: currencySymbol
  };
}

async function extractMetadata(doc: Document, productName: string): Promise<ScrapedProductData['metadata']> {
  // Extract product features from bullet points
  const featureElements = Array.from(doc.querySelectorAll('#feature-bullets li'));
  const features = featureElements
    .map(el => el.textContent?.trim())
    .filter(text => !!text && text.length > 0);
  
  // Try to extract brand
  let brand = extractText(doc, '#bylineInfo') || '';
  // Clean up brand text (e.g., "Brand: Samsung" -> "Samsung")
  brand = brand.replace(/^(Visit the |Brand: )/i, '').trim();
  
  // Try to extract other metadata from product details section
  const detailsRows = Array.from(doc.querySelectorAll('.prodDetTable tr, .a-expander-content table tr'));
  const metadataMap: Record<string, any> = {};
  
  detailsRows.forEach(row => {
    const label = row.querySelector('th, .a-span3')?.textContent?.trim().toLowerCase();
    const value = row.querySelector('td, .a-span9')?.textContent?.trim();
    
    if (label && value) {
      // Map common label variations to standard keys
      if (label.includes('brand') || label.includes('manufacturer')) {
        metadataMap.brand = value;
      } else if (label.includes('model')) {
        metadataMap.model = value;
      } else if (label.includes('color')) {
        metadataMap.color = value;
      } else if (label.includes('weight')) {
        metadataMap.weight = value;
      } else if (label.includes('dimension')) {
        metadataMap.dimensions = value;
      } else {
        // Store other attributes with their original label
        metadataMap[label] = value;
      }
    }
  });
  
  // If we couldn't extract through HTML, use the product name to make educated guesses
  if (!metadataMap.brand && brand) {
    metadataMap.brand = brand;
  }
  
  if (!metadataMap.model) {
    // Try to guess model from product name if it contains numbers
    const modelMatch = productName.match(/([A-Za-z0-9]+-[A-Za-z0-9]+|\d{2,})/);
    if (modelMatch) {
      metadataMap.model = modelMatch[0];
    }
  }
  
  if (!metadataMap.category) {
    // Try to extract category from breadcrumbs
    const breadcrumbs = Array.from(doc.querySelectorAll('#wayfinding-breadcrumbs_container li'));
    if (breadcrumbs.length > 0) {
      metadataMap.category = breadcrumbs[breadcrumbs.length - 1].textContent?.trim() || '';
    }
  }
  
  return {
    ...metadataMap,
    features: features.length > 0 ? features : undefined
  };
}
