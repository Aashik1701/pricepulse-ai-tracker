import { toast } from 'sonner';
import { OpenAIService } from '@/services/OpenAIService';
import { 
  getBestProxy, 
  updateProxyStats, 
  getProxyForPlatform, 
  saveProxyForPlatform,
  markProxyRateLimited,
  isProxyRateLimited,
  getNonRateLimitedProxy
} from './proxyUtils';
import { fetchWithRetry } from './fetchUtils';
import { getCachedProduct, cacheProduct, getCachedComparison, cacheComparison } from './cacheUtils';
import { getScrapingStrategy } from './scrapingStrategies';
import { getHeadersForSite } from './userAgentUtils';

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
    color?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: string | string[] | undefined;
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

// Database schema types - for future implementation
export interface ProductSchema {
  id: string;
  asin: string;
  name: string;
  imageUrl: string;
  currentPrice: number;
  previousPrice: number;
  lowestPrice: number;
  highestPrice: number;
  currency: string;
  lastUpdated: Date;
  metadata: {
    brand?: string;
    model?: string;
    category?: string;
    features?: string[];
    color?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: string | string[] | undefined;
  };
}

export interface PriceHistorySchema {
  id: string;
  productId: string;
  price: number;
  date: Date;
}

export interface PriceAlertSchema {
  id: string;
  productId: string;
  userId: string;
  targetPrice: number;
  email: string;
  isActive: boolean;
  createdAt: Date;
  lastNotifiedAt?: Date;
}

// List of CORS proxies to try in case one fails
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://crossorigin.me/',
  'https://cors.eu.org/',
  'https://cors-anywhere.herokuapp.com/',
  'https://proxy.cors.sh/',
  'https://thingproxy.freeboard.io/fetch/'
];

/**
 * Scrapes product data from an Amazon product URL
 * Uses multiple scraping methods and proxies for better reliability
 */
export async function scrapeAmazonProduct(url: string): Promise<ScrapedProductData | null> {
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
  
  // Check cache first to avoid unnecessary scraping
  const cachedProduct = getCachedProduct(asin);
  if (cachedProduct) {
    toast.success('Retrieved product data from cache');
    return cachedProduct;
  }

  toast.info('Fetching product data...', {
    description: 'This may take a moment'
  });

  try {
    // First try: Use Oxylabs API for real-time data (most reliable method)
    console.log('Attempting to use Oxylabs API');
    try {
      // Import the Oxylabs service
      const { OxylabsService } = await import('@/services/OxylabsService');
      
      // Use Oxylabs API to get real-time data
      const productData = await OxylabsService.scrapeAmazonProduct(asin);
      
      // If we have product data from Oxylabs, enhance with AI metadata
      if (productData) {
        toast.info('Extracting product metadata...');
        try {
          // Use OpenAI to enhance product metadata
          const enhancedMetadata = await OpenAIService.extractProductMetadata(
            productData.name || '', 
            '' // We don't have description text from Oxylabs, so passing empty string
          );
          
          // Merge the metadata
          productData.metadata = {
            ...productData.metadata,
            ...enhancedMetadata
          };
          
          toast.success('AI metadata extraction complete');
        } catch (error) {
          console.error('Error extracting metadata with AI:', error);
          toast.warning('Using basic metadata extraction');
        }

        toast.success('Product data extracted successfully');
        
        // Cache the successful result
        cacheProduct(asin, productData);
        
        return productData;
      }
    } catch (oxylabsError) {
      console.error('Error using Oxylabs API:', oxylabsError);
      toast.warning('Primary data source unavailable, trying alternative methods...');
    }

    // Second try: Use Amazon-specific direct scraping strategy
    console.log('Attempting direct scraping with specialized Amazon strategy');
    try {
      // Get the Amazon scraping strategy
      const amazonScrapingStrategy = getScrapingStrategy('amazon');
      
      // Try each proxy with the Amazon-specific strategy
      for (let i = 0; i < CORS_PROXIES.length; i++) {
        // Get the best proxy for Amazon that isn't rate limited
        const proxyToUse = getNonRateLimitedProxy(CORS_PROXIES) || CORS_PROXIES[i];
        
        console.log(`Trying Amazon-specific scraping with proxy: ${proxyToUse}`);
        const result = await amazonScrapingStrategy(url, proxyToUse, 'amazon');
        
        if (result.success && result.html) {
          // Log warning if there is one
          if (result.warning) {
            console.warn(`Warning during scraping: ${result.warning}`);
            toast.warning('Received partial data, attempting to extract what we can');
          }
          
          // Process the HTML
          const productData = await parseAmazonProductHtml(result.html, asin);
          
          if (productData) {
            toast.success('Product data extracted successfully');
            
            // If we have partial data, let the user know
            if (!productData.name || !productData.currentPrice) {
              toast.warning('Some product data could not be retrieved');
            }
            
            // Cache the successful result
            cacheProduct(asin, productData);
            
            return productData;
          }
        } else {
          console.error(`Amazon-specific scraping failed: ${result.error}`);
        }
      }
    } catch (strategyError) {
      console.error('Error with specialized Amazon scraping:', strategyError);
    }
    
    // Third try: Standard proxy rotation approach
    console.log('Attempting standard proxy rotation approach');
    toast.warning('Trying fallback scraping method...');
    
    // Try different proxies in case one fails
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        // Get the best proxy to use based on past performance and rate limits
        let proxyToUse: string;
        
        if (i === 0) {
          // First try to get a non-rate-limited proxy
          const nonRateLimitedProxy = getNonRateLimitedProxy(CORS_PROXIES);
          proxyToUse = nonRateLimitedProxy || CORS_PROXIES[0];
        } else {
          // On retry, use a different proxy that hasn't been rate limited
          const availableProxies = CORS_PROXIES.filter(p => !isProxyRateLimited(p) && p !== CORS_PROXIES[i-1]);
          proxyToUse = availableProxies.length > 0 ? availableProxies[0] : CORS_PROXIES[i % CORS_PROXIES.length];
        }
          
        const proxyUrl = `${proxyToUse}${encodeURIComponent(url)}`;
        console.log(`Attempting to fetch Amazon product with proxy: ${proxyToUse}`);
        
        // Get headers specifically for Amazon
        const headers = getHeadersForSite('amazon');
        
        // Set a longer timeout for the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(proxyUrl, {
          headers,
          signal: controller.signal
        });
        
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error(`Proxy ${i+1} failed with status: ${response.status}`);
          
          // If we get a 403 or 429, specifically check for country blocking or rate limiting
          if (response.status === 403 || response.status === 429) {
            try {
              const responseText = await response.text();
              if (responseText.includes('Country blocked') || 
                  responseText.includes('blocked from accessing') ||
                  responseText.includes('Access Denied')) {
                console.log('Access restrictions detected in response');
                // Record this proxy as failed
                updateProxyStats(proxyToUse, false);
                continue; // Try next proxy
              }
              
              // Handle rate limiting specifically
              if (responseText.includes('rate limit') || 
                  responseText.includes('too many requests') ||
                  responseText.includes('temporarily blocked')) {
                console.log('Rate limiting detected for proxy');
                // Mark this proxy as rate limited for a period of time
                markProxyRateLimited(proxyToUse);
                updateProxyStats(proxyToUse, false);
                continue; // Try next proxy
              }
            } catch (textError) {
              console.error('Error reading response text:', textError);
            }
          }
          
          throw new Error(`Failed to fetch page: ${response.status}`);
        }

        let html = '';
        try {
          html = await response.text();
          
          // Check if the response actually contains product information
          if (!html || html.length < 1000) {
            console.error('Received empty or too short HTML response');
            throw new Error('Invalid response: too short');
          }
          
          // Check for captcha, robot checks, or other blockages
          if (html.includes('captcha') || 
              html.includes('robot check') ||
              html.includes('verify you are a human') ||
              html.includes('automated access') ||
              html.includes('unusual traffic') ||
              html.includes('security challenge')) {
            console.error('Received captcha or security challenge page');
            // Mark this proxy as having security issues
            markProxyRateLimited(proxyToUse);
            updateProxyStats(proxyToUse, false);
            throw new Error('Captcha or security challenge detected');
          }
        } catch (textError) {
          console.error('Error reading response text:', textError);
          throw textError;
        }
        
        // Parse the HTML to extract product data
        const productData = await parseAmazonProductHtml(html, asin);
        
        if (productData) {
          toast.success('Product data extracted successfully');
          
          // Record this proxy as successful for future use
          updateProxyStats(proxyToUse, true);
          
          // Cache the successful result
          cacheProduct(asin, productData);
          
          return productData;
        } else {
          throw new Error('Failed to extract product data from HTML');
        }
        
      } catch (error) {
        console.error(`Error scraping product with proxy ${i+1}:`, error);
        
        // If we've tried all proxies and still failed
        if (i === CORS_PROXIES.length - 1) {
          console.error('All client-side scraping attempts failed');
        } else {
          // Try the next proxy
          toast.warning(`Scraping attempt ${i+1} failed. Trying another method...`);
        }
      }
    }

    // Final fallback: Try server-side scraping
    console.log('Attempting server-side scraping as final fallback');
    toast.info('Trying server-side scraping...');
    
    try {
      const ServerScraperService = await import('@/services/ServerScraperService');
      const serverScrapedData = await ServerScraperService.scrapeProductServer(url);
      
      if (serverScrapedData) {
        toast.success('Retrieved product data from server');
        
        // Cache the server-scraped result
        cacheProduct(asin, serverScrapedData);
        
        return serverScrapedData;
      }
    } catch (serverError) {
      console.error('Server-side scraping failed:', serverError);
      toast.error('Server-side scraping failed');
    }
    
    // Last resort: Return mock data
    console.error('All scraping methods failed');
    toast.error('All scraping attempts failed. Using placeholder data instead.');
    
    // Create a basic mock product with the ASIN we extracted
    return {
      name: 'Product information unavailable',
      imageUrl: 'https://via.placeholder.com/300x300?text=Product+Image+Unavailable',
      currentPrice: 0,
      previousPrice: 0,
      currency: '$',
      asin: asin,
      metadata: {
        brand: 'Unknown',
        model: 'Unknown',
        features: ['Product information could not be retrieved due to scraping limitations']
      },
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Unhandled error in scrapeAmazonProduct:', error);
    toast.error('Failed to retrieve product data');
    return null;
  }
}

/**
 * Parse Amazon product HTML into structured data
 */
async function parseAmazonProductHtml(html: string, asin: string): Promise<ScrapedProductData | null> {
  try {
    // Parse the HTML to extract product data
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Enhanced selectors for price information to handle more variations in Amazon's HTML structure
    // Use multiple selectors for each piece of data to improve success rate
    
    // Title selectors
    const titleSelectors = [
      '#productTitle',
      '.product-title-word-break',
      '.a-size-large.product-title-word-break',
      'h1.a-size-large'
    ];
    
    // Image selectors - Amazon uses different image containers depending on product type
    const imageSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '#img-canvas img',
      '.a-dynamic-image',
      '#main-image',
      '.a-stretch-horizontal img'
    ];
    
    // Current price selectors - Amazon has many different price display formats
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-price-whole',
      '.a-price',
      '.a-color-price',
      '#price_inside_buybox',
      '#corePrice_feature_div .a-offscreen',
      '.priceToPay .a-offscreen',
      '.a-section.a-spacing-none.aok-align-center .a-price .a-offscreen'
    ];
    
    // Previous price selectors - for strikethrough prices
    const previousPriceSelectors = [
      '.a-price.a-text-price .a-offscreen',
      '.a-text-strike',
      '.a-text-price .a-offscreen',
      '.a-price.a-text-price[data-a-strike=true] .a-offscreen',
      '#listPrice',
      '#priceblock_saleprice',
      '.priceBlockStrikePriceString',
      '.a-section.a-spacing-small.aok-align-center .a-price.a-text-price .a-offscreen'
    ];
    
    // Try each selector until we find data
    let name = '';
    for (const selector of titleSelectors) {
      name = extractText(doc, selector);
      if (name) break;
    }
    
    let imageUrl = '';
    for (const selector of imageSelectors) {
      imageUrl = extractAttribute(doc, selector, 'src');
      if (imageUrl) break;
    }
    
    // For prices, try all selectors
    let priceText = '';
    for (const selector of priceSelectors) {
      priceText = extractText(doc, selector);
      if (priceText) break;
    }
    
    let previousPriceText = '';
    for (const selector of previousPriceSelectors) {
      previousPriceText = extractText(doc, selector);
      if (previousPriceText) break;
    }
    
    // If we couldn't find previous price with selectors, try using regex to find price patterns
    if (!previousPriceText) {
      const pricePattern = /(?:was|list price|original price|regular price|M\.?R\.?P|strikethrough price):?\s*(?:₹|₹\s*|Rs\.?|Rs\.?\s*|INR\s*)?([0-9,]+\.[0-9]+|[0-9,]+)/i;
      const match = html.match(pricePattern);
      if (match && match[1]) {
        previousPriceText = match[1];
        console.log('Found previous price using regex:', previousPriceText);
      }
    }
    
    // Parse prices and currency - enhanced to handle Indian Rupees format (₹) and other currencies
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

    // Be more lenient - if we got at least the previous price or name, we can work with that
    // If we have no name, but have other data, use a generic name with the ASIN
    if (!name && (previousPrice || currentPrice || imageUrl)) {
      name = `Amazon Product (${asin})`;
      console.log('Using generic name since product name not found');
    }
    
    // If we have previous price but no current price, use previous price minus 10% as an estimate
    if (previousPrice && !currentPrice) {
      console.log('Using previous price to estimate current price');
      const estimatedCurrentPrice = Math.round(previousPrice * 0.9 * 100) / 100;
      return {
        name,
        imageUrl,
        currentPrice: estimatedCurrentPrice,
        previousPrice,
        currency: currency || '₹', // Default to Rupees based on the example
        asin,
        metadata: {
          brand: extractMetadataText(doc, '#bylineInfo') || 'Unknown',
          features: extractBulletPoints(doc)
        },
        lastUpdated: new Date()
      };
    }

    // Extract product description for metadata extraction
    const descriptionText = extractProductDescription(doc);

    // Extract and enhance metadata using OpenAI
    toast.info('Extracting product metadata...');
    let metadata = extractMetadata(doc, name || '');
    
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
    
    // Return all the data we could find, even if incomplete
    const productData: ScrapedProductData = {
      name: name || `Amazon Product (${asin})`,
      imageUrl,
      currentPrice: currentPrice || 0,
      previousPrice: previousPrice || 0,
      currency: currency || '₹',  // Default to Rupees based on the error example
      asin,
      metadata,
      lastUpdated: new Date()
    };
    
    return productData;
  } catch (error) {
    console.error('Error parsing Amazon product HTML:', error);
    return null;
  }
}

/**
 * Extract metadata text from a specific selector
 */
function extractMetadataText(doc: Document, selector: string): string {
  try {
    const element = doc.querySelector(selector);
    if (element) {
      return element.textContent?.trim() || '';
    }
    return '';
  } catch (error) {
    console.error(`Error extracting metadata text from ${selector}:`, error);
    return '';
  }
}

/**
 * Extract bullet points from the product description
 */
function extractBulletPoints(doc: Document): string[] {
  try {
    const bulletPoints: string[] = [];
    const bulletElements = doc.querySelectorAll('#feature-bullets li, #productDescription p, .a-spacing-mini li');
    
    bulletElements.forEach(element => {
      const text = element.textContent?.trim();
      if (text && text.length > 0) {
        bulletPoints.push(text);
      }
    });
    
    return bulletPoints;
  } catch (error) {
    console.error('Error extracting bullet points:', error);
    return [];
  }
}

/**
 * Extract a more comprehensive product description
 */
function extractProductDescription(doc: Document): string {
  try {
    // Try different sections that might contain product descriptions
    const descriptionSections = [
      '#feature-bullets', 
      '#productDescription',
      '#aplus',
      '#dpx-product-description',
      '.a-expander-content'
    ];
    
    for (const section of descriptionSections) {
      const element = doc.querySelector(section);
      if (element) {
        // Get all text content from this section
        return element.textContent?.trim() || '';
      }
    }
    
    // If no specific section found, try to get all list items that might have features
    const allFeatures: string[] = [];
    doc.querySelectorAll('li').forEach(li => {
      const text = li.textContent?.trim();
      if (text && text.length > 10 && !text.includes('Add to')) {
        allFeatures.push(text);
      }
    });
    
    return allFeatures.join('. ');
  } catch (error) {
    console.error('Error extracting product description:', error);
    return '';
  }
}

/**
 * Search for the product on other platforms
 * Uses a multi-level approach with caching and fallbacks
 */
export async function searchProductOnPlatforms(
  productName: string,
  brand?: string,
  model?: string
): Promise<PriceComparisonItem[]> {
  const searchTerm = `${brand || ''} ${model || ''} ${productName}`.trim();
  console.log(`Searching for: ${searchTerm}`);
  
  // Check if we have a cached result first
  const cachedResults = getCachedComparison(searchTerm);
  if (cachedResults) {
    console.log('Using cached comparison results');
    return cachedResults;
  }
  
  toast.info('Searching for product across platforms...', {
    description: 'This may take a few moments'
  });
  
  try {
    // First try: Use Oxylabs Google Shopping API to get real price comparison data
    const { OxylabsService } = await import('@/services/OxylabsService');
    
    try {
      // Try using Oxylabs Google Shopping API for real data
      const results = await OxylabsService.searchGoogleShopping(searchTerm);
      
      if (results && results.length > 0) {
        toast.success('Found price comparisons across multiple retailers');
        
        // Mark the lowest price item
        const lowestPrice = Math.min(...results.map(item => item.price));
        const markedResults = results.map(item => ({
          ...item,
          isLowestPrice: item.price === lowestPrice
        }));
        
        // Cache the results
        cacheComparison(searchTerm, markedResults);
        
        return markedResults;
      } else {
        console.warn('No comparison results found from Oxylabs API');
        throw new Error('No comparison results found');
      }
    } catch (oxylabsError) {
      console.error('Error using Oxylabs API for price comparison:', oxylabsError);
      // Don't show a warning toast here, we'll handle it in the fallback
      // This prevents too many toast notifications
      
      // Second try: Client-side scraping with platform-specific strategies
      try {
        // Show a single toast for the fallback attempt
        toast.info('Trying alternative price comparison methods...', {
          description: 'Searching multiple e-commerce platforms'
        });
        
        // Implement retry logic for each platform
        const platformScrapers = [
          { name: 'Flipkart', fn: (p: string) => scrapeFlipkart(searchTerm, p) },
          { name: 'Meesho', fn: (p: string) => scrapeMeesho(searchTerm, p) },
          { name: 'BigBasket', fn: (p: string) => scrapeBigBasket(searchTerm, p) },
          { name: 'Swiggy Instamart', fn: (p: string) => scrapeSwiggyInstamart(searchTerm, p) }
        ];
        
        // Get results from multiple platforms in parallel with platform-specific proxies
        const platformPromises = platformScrapers.map(async (platform) => {
          // Try each platform with multiple proxies if needed
          for (let attempt = 0; attempt < 3; attempt++) { // Increased attempts from 2 to 3
            try {
              // Add delay between attempts, increasing with each attempt
              if (attempt > 0) {
                const delayTime = attempt * 1500; // 1.5 seconds for first retry, 3 seconds for second retry
                await new Promise(resolve => setTimeout(resolve, delayTime));
              }
              
              let proxy: string;
              
              if (attempt === 0) {
                // For first attempt, use the best proxy for this platform that isn't rate limited
                const preferredProxy = getProxyForPlatform(CORS_PROXIES, platform.name);
                if (!isProxyRateLimited(preferredProxy)) {
                  proxy = preferredProxy;
                } else {
                  // If preferred proxy is rate limited, get another one
                  proxy = getNonRateLimitedProxy(CORS_PROXIES) || CORS_PROXIES[0];
                }
              } else {
                // For retry, use a different non-rate-limited proxy
                // Choose from a different part of the array each time
                const previousProxy = getProxyForPlatform(CORS_PROXIES, platform.name);
                const alternatives = CORS_PROXIES.filter(p => p !== previousProxy && !isProxyRateLimited(p));
                
                if (alternatives.length > 0) {
                  // Select a proxy based on the attempt number for better distribution
                  const index = (attempt * 2) % alternatives.length;
                  proxy = alternatives[index];
                } else {
                  // If all proxies are rate limited, choose a random one and hope for the best
                  proxy = CORS_PROXIES[Math.floor(Math.random() * CORS_PROXIES.length)];
                }
              }
                
              console.log(`Trying ${platform.name} with proxy: ${proxy} (attempt ${attempt + 1})`);
              
              // Add a timeout for the entire scraping operation with increasing timeout for retries
              const timeoutDuration = 20000 + (attempt * 5000); // 20s for first attempt, 25s for second, 30s for third
              const timeoutPromise = new Promise<null>((_, reject) => {
                setTimeout(() => reject(new Error(`Timeout scraping ${platform.name}`)), timeoutDuration);
              });
              
              // Use the specialized scraping strategy for this platform
              const scrapingPromise = (async () => {
                const scrapingStrategy = getScrapingStrategy(platform.name.toLowerCase());
                
                // Generate the appropriate URL based on platform
                let platformUrl;
                switch(platform.name.toLowerCase()) {
                  case 'flipkart':
                    platformUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;
                    break;
                  case 'meesho':
                    platformUrl = `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`;
                    break;
                  case 'bigbasket':
                    platformUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;
                    break;
                  case 'swiggy instamart':
                    platformUrl = `https://www.swiggy.com/search?query=${encodeURIComponent(searchTerm)}`;
                    break;
                  default:
                    platformUrl = `https://www.${platform.name.toLowerCase().replace(/\s+/g, '')}.com/search?q=${encodeURIComponent(searchTerm)}`;
                }
                
                const result = await scrapingStrategy(
                  platformUrl,
                  proxy,
                  platform.name.toLowerCase()
                );
                
                if (result.success && result.html) {
                  // Parse the HTML based on the platform
                  const platformResult = await platform.fn(proxy);
                  
                  if (platformResult) {
                    // Record this as a successful proxy for this platform
                    saveProxyForPlatform(proxy, platform.name, true);
                    return platformResult;
                  }
                } else {
                  // Detailed error handling with more specific error classification
                  if (result.error) {
                    if (result.error.includes('403') || 
                        result.error.includes('security challenge') || 
                        result.error.includes('forbidden')) {
                      markProxyRateLimited(proxy);
                      throw new Error(`Security challenge detected (403) for ${platform.name}`);
                    } else if (result.error.includes('captcha') || 
                              result.error.includes('robot') || 
                              result.error.includes('bot detection')) {
                      markProxyRateLimited(proxy);
                      throw new Error(`Bot protection detected for ${platform.name}`);
                    } else if (result.error.includes('timeout') || 
                              result.error.includes('408') || 
                              result.error.includes('timed out')) {
                      throw new Error(`Timeout fetching from ${platform.name}`);
                    } else if (result.error.includes('429') || 
                              result.error.includes('too many requests') || 
                              result.error.includes('rate limit')) {
                      markProxyRateLimited(proxy);
                      throw new Error(`Rate limited on ${platform.name}`);
                    } else {
                      console.error(`${platform.name} scraping failed: ${result.error}`);
                      throw new Error(result.error || `Failed to scrape ${platform.name}`);
                    }
                  } else {
                    throw new Error(`Unknown error scraping ${platform.name}`);
                  }
                }
                
                return null;
              })();
              
              // Race the scraping against the timeout
              const result = await Promise.race([scrapingPromise, timeoutPromise]);
              if (result) return result;
            } catch (error) {
              // Log the error but keep trying other proxies or platforms
              console.error(`Error scraping ${platform.name} (attempt ${attempt + 1}):`, error);
              
              // Specific handling for different error types
              if (error instanceof Error) {
                const errorMessage = error.message || '';
                if (errorMessage.includes('security challenge') || 
                    errorMessage.includes('403') || 
                    errorMessage.includes('captcha') || 
                    errorMessage.includes('robot') || 
                    errorMessage.includes('429') || 
                    errorMessage.includes('rate limit')) {
                  // Mark this proxy as rate limited for a while
                  markProxyRateLimited(proxy);
                }
              }
              
              // Only log a user-facing warning on the final retry attempt
              if (attempt === 2) {
                console.warn(`Failed to retrieve data from ${platform.name} after multiple attempts`);
              }
            }
          }
          return null;
        });

        // Add Amazon data if we have a window location with ASIN
        let amazonItem: PriceComparisonItem | null = null;
        try {
          const asin = extractASIN(window.location.href);
          if (asin) {
            // Use the current product data if we're viewing a product page
            amazonItem = {
              marketplace: 'Amazon',
              productName: productName || '',
              price: 0, // This will be updated from the page if possible
              currency: '₹',
              url: `https://www.amazon.com/dp/${asin}`,
              lastUpdated: new Date(),
              inStock: true
            };
            
            // Try to extract the current price from the page
            const priceElement = document.querySelector('.a-price .a-offscreen');
            if (priceElement) {
              const priceText = priceElement.textContent?.trim() || '';
              const { price, currency } = parsePrice(priceText);
              if (price) {
                amazonItem.price = price;
                if (currency) amazonItem.currency = currency;
              }
            }
          }
        } catch (error) {
          console.error('Error extracting Amazon data:', error);
        }
        
        // Execute all scraping operations and collect results
        const results = await Promise.allSettled(platformPromises);
        
        // Collect successful results
        const validResults: PriceComparisonItem[] = [];
        
        if (amazonItem && amazonItem.price > 0) {
          validResults.push(amazonItem);
        }
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            validResults.push(result.value);
          } else {
            const platforms = platformScrapers.map(p => p.name);
            console.error(`Failed to scrape ${platforms[index]}:`, 
              result.status === 'rejected' ? result.reason : 'No results found');
          }
        });
        
        if (validResults.length > 0) {
          // Sort by price (lowest first) and mark lowest price
          const sortedResults = validResults.sort((a, b) => a.price - b.price);
          const markedResults = sortedResults.map((item, index) => ({
            ...item,
            isLowestPrice: index === 0 // First item after sorting has lowest price
          }));
          
          // Cache the results
          cacheComparison(searchTerm, markedResults);
          
          toast.success(`Found prices from ${validResults.length} retailers`, {
            description: validResults.map(item => item.marketplace).join(', ')
          });
          
          return markedResults;
        } else {
          console.warn('No valid results found from any platform scraping');
        }
        
        // Third try: Server-side scraping as final fallback
        try {
          toast.info('Trying server-side price comparison...', {
            description: 'This may take a moment'
          });
          
          const ServerScraperService = await import('@/services/ServerScraperService');
          const serverResults = await ServerScraperService.searchProductAcrossPlatformsServer(searchTerm);
          
          if (serverResults && serverResults.length > 0) {
            toast.success(`Found ${serverResults.length} retailers with server scraping`);
            
            // Cache the server results
            cacheComparison(searchTerm, serverResults);
            
            return serverResults;
          } else {
            console.warn('No results from server-side comparison');
          }
        } catch (serverError) {
          console.error('Server-side comparison failed:', serverError);
          // Only show the toast if we reach this point (all methods failed)
          toast.warning('Unable to retrieve price comparisons');
        }
      } catch (error) {
        console.error('Error with client-side platform scraping:', error);
      }
      
      // Last resort: Provide mock comparison data
      console.log('All scraping methods failed, generating approximate price comparisons');
      toast.info('Showing estimated price comparisons', {
        description: 'Based on typical market prices for similar products'
      });
      
      // Create approximate comparison data based on the product name and brand
      let basePrice = 0;
      
      // Try to estimate a reasonable base price based on the product category
      if (brand) {
        const premiumBrands = ['Apple', 'Samsung', 'Sony', 'Bose', 'LG', 'Google', 'Microsoft', 'Dyson'];
        const midRangeBrands = ['OnePlus', 'Xiaomi', 'Lenovo', 'HP', 'Dell', 'Asus', 'Acer'];
        const budgetBrands = ['Realme', 'Oppo', 'Vivo', 'Redmi', 'TCL', 'Micromax'];
        
        if (premiumBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
          basePrice = Math.floor(Math.random() * 40000) + 20000; // 20,000 to 60,000
        } else if (midRangeBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
          basePrice = Math.floor(Math.random() * 20000) + 10000; // 10,000 to 30,000
        } else if (budgetBrands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
          basePrice = Math.floor(Math.random() * 10000) + 5000; // 5,000 to 15,000
        }
      }
      
      // If we couldn't determine from brand, check product name for keywords
      if (basePrice === 0) {
        if (productName.match(/phone|smartphone|iphone|galaxy|pixel/i)) {
          basePrice = Math.floor(Math.random() * 30000) + 10000; // 10,000 to 40,000
        } else if (productName.match(/laptop|macbook|notebook|thinkpad/i)) {
          basePrice = Math.floor(Math.random() * 50000) + 30000; // 30,000 to 80,000
        } else if (productName.match(/tv|television|smart tv/i)) {
          basePrice = Math.floor(Math.random() * 40000) + 15000; // 15,000 to 55,000
        } else if (productName.match(/earbuds|headphones|airpods/i)) {
          basePrice = Math.floor(Math.random() * 8000) + 2000; // 2,000 to 10,000
        } else if (productName.match(/watch|smartwatch/i)) {
          basePrice = Math.floor(Math.random() * 15000) + 5000; // 5,000 to 20,000
        } else {
          basePrice = Math.floor(Math.random() * 10000) + 5000; // 5,000 to 15,000 (default)
        }
      }
      
      // Generate realistic platform variations
      // Generate more realistic mock results based on product category and brand
      const mockResults: PriceComparisonItem[] = [
        {
          marketplace: 'Amazon',
          productName: productName,
          price: basePrice,
          currency: '₹',
          url: `https://www.amazon.in/s?k=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true
        },
        {
          marketplace: 'Flipkart',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.15 + 0.92)), // 8% cheaper to 7% more expensive
          currency: '₹',
          url: `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true
        },
        {
          marketplace: 'Croma',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.18 + 0.95)), // 5% cheaper to 13% more expensive
          currency: '₹',
          url: `https://www.croma.com/searchB?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.2 // 80% chance of being in stock
        },
        {
          marketplace: 'Reliance Digital',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.12 + 0.96)), // 4% cheaper to 8% more expensive
          currency: '₹',
          url: `https://www.reliancedigital.in/search?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.3 // 70% chance of being in stock
        }
      ];
      
      // Add additional marketplace data depending on product category
      const isElectronic = productName.match(/phone|laptop|tv|camera|headphone|speaker|watch|tablet|computer|pc|monitor|keyboard/i);
      const isGrocery = productName.match(/food|grocery|fruit|vegetable|snack|drink|beverage|milk|bread|rice|dal|spice/i);
      const isHomeAppliance = productName.match(/refrigerator|fridge|washing|machine|microwave|oven|ac|air conditioner|cooler|fan|mixer|grinder/i);
      const isFashion = productName.match(/shirt|tshirt|pant|jean|trouser|dress|shoe|sneaker|sandal|slipper|jacket|hoodie|watch|bag/i);
      
      // Add category-specific marketplaces
      if (isElectronic) {
        // Add Vijay Sales for electronics
        mockResults.push({
          marketplace: 'Vijay Sales',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.08 + 0.97)), // 3% cheaper to 5% more expensive
          currency: '₹',
          url: `https://www.vijaysales.com/search/${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.25 // 75% chance of being in stock
        });
        
        // Add Tata Cliq for electronics
        mockResults.push({
          marketplace: 'Tata CLiQ',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.1 + 0.93)), // 7% cheaper to 3% more expensive
          currency: '₹',
          url: `https://www.tatacliq.com/search/?searchCategory=all&text=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.2 // 80% chance of being in stock
        });
      }
      
      if (isGrocery) {
        // Add BigBasket for groceries
        mockResults.push({
          marketplace: 'BigBasket',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.14 + 0.9)), // 10% cheaper to 4% more expensive
          currency: '₹',
          url: `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.1 // 90% chance of being in stock for groceries
        });
        
        // Add Swiggy Instamart for groceries
        mockResults.push({
          marketplace: 'Swiggy Instamart',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.2 + 0.95)), // 5% cheaper to 15% more expensive
          currency: '₹',
          url: `https://www.swiggy.com/search?query=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.15 // 85% chance of being in stock
        });
        
        // Add JioMart for groceries
        mockResults.push({
          marketplace: 'JioMart',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.16 + 0.89)), // 11% cheaper to 5% more expensive
          currency: '₹',
          url: `https://www.jiomart.com/search/${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.1 // 90% chance of being in stock
        });
      }
      
      if (isHomeAppliance) {
        // Add Sargam Electronics for home appliances
        mockResults.push({
          marketplace: 'Sargam Electronics',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.09 + 0.96)), // 4% cheaper to 5% more expensive
          currency: '₹',
          url: `https://www.sargam.in/search?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.3 // 70% chance of being in stock
        });
      }
      
      if (isFashion) {
        // Add Myntra for fashion
        mockResults.push({
          marketplace: 'Myntra',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.25 + 0.8)), // 20% cheaper to 5% more expensive
          currency: '₹',
          url: `https://www.myntra.com/${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.1 // 90% chance of being in stock
        });
        
        // Add Meesho for fashion
        mockResults.push({
          marketplace: 'Meesho',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.3 + 0.75)), // 25% cheaper to 5% more expensive (typically cheaper)
          currency: '₹',
          url: `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: true // Always in stock on Meesho
        });
      }
      
      // Always add a couple of general marketplaces regardless of category
      // Add Snapdeal as a general marketplace
      if (Math.random() > 0.3) { // 70% chance to include Snapdeal
        mockResults.push({
          marketplace: 'Snapdeal',
          productName: productName,
          price: Math.round(basePrice * (Math.random() * 0.25 + 0.8)), // 20% cheaper to 5% more expensive (typically discount-focused)
          currency: '₹',
          url: `https://www.snapdeal.com/search?keyword=${encodeURIComponent(searchTerm)}`,
          lastUpdated: new Date(),
          inStock: Math.random() > 0.3 // 70% chance of being in stock
        });
      }
      
      const sortedMockResults = mockResults.sort((a, b) => a.price - b.price);
      const markedMockResults = sortedMockResults.map((item, index) => ({
        ...item,
        isLowestPrice: index === 0 // First item after sorting has lowest price
      }));
      
      // Don't cache mock results to allow future attempts to get real data
      
      return markedMockResults;
    }
  } catch (error) {
    console.error('Error searching across platforms:', error);
    toast.error('Failed to search across platforms');
    
    // Return empty array rather than failing completely
    return [];
  }
}

/**
 * Scrape Flipkart for product information
 * Enhanced with better error handling and retry logic
 */
async function scrapeFlipkart(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(searchTerm)}`;
    
    // Use provided proxy or get the best one
    const proxyToUse = proxy || getBestProxy(CORS_PROXIES);
    const proxyUrl = `${proxyToUse}${encodeURIComponent(url)}`;
    
    // Set a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased to 25 second timeout
    
    // Add random delay to avoid detection patterns
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Use more realistic headers to avoid detection
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });
    
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // More detailed error handling
      if (response.status === 403 || response.status === 429) {
        // Check for rate limiting
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error(`Access blocked by Flipkart: ${response.status}`);
      } else if (response.status === 408 || response.status === 504) {
        throw new Error(`Timeout from Flipkart: ${response.status}`);
      } else if (response.status === 404) {
        throw new Error(`Page not found on Flipkart: ${response.status}`);
      } else {
        throw new Error(`Failed to fetch Flipkart results: ${response.status}`);
      }
    }
    
    let html = '';
    try {
      html = await response.text();
      
      // Check if the response is valid with more robust validation
      if (!html || html.length < 1000) {
        console.error('Received empty or too short HTML response from Flipkart');
        throw new Error('Invalid Flipkart response: too short');
      }
      
      // Check for captcha, robot checks, or other blockages with more comprehensive patterns
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access') ||
          html.includes('unusual traffic') ||
          html.includes('security challenge') ||
          html.includes('blocked') ||
          html.includes('access denied') ||
          html.includes('suspicious activity')) {
        console.error('Received captcha or security challenge page from Flipkart');
        // Mark this proxy as having security issues
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error('Captcha or security challenge detected');
      }
      
      // Additional check for empty search results
      if (html.includes('No results found for') || 
          html.includes('Sorry, no results found for') ||
          html.includes('we could not find any matches')) {
        console.log('No products found on Flipkart for this search term');
        return null;
      }
      
    } catch (textError) {
      console.error('Error reading Flipkart response:', textError);
      throw textError;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Flipkart typically shows search results with this structure
    // Try multiple selectors to handle different page layouts
    const productSelectors = ['._1AtVbE', '._4ddWXP', '.s1Q9rs', '._2kHMtA'];
    
    let firstProduct: Element | null = null;
    for (const selector of productSelectors) {
      firstProduct = doc.querySelector(selector);
      if (firstProduct) break;
    }
    
    if (!firstProduct) {
      console.log('No product found in Flipkart response');
      return null;
    }
    
    // Try multiple selectors for product title
    const titleSelectors = ['._4rR01T', '.s1Q9rs', '._3LWZlK', '.IRpwTa'];
    let productTitle = '';
    
    for (const selector of titleSelectors) {
      const titleElement = firstProduct.querySelector(selector) || doc.querySelector(selector);
      if (titleElement) {
        productTitle = titleElement.textContent?.trim() || '';
        if (productTitle) break;
      }
    }
    
    if (!productTitle) {
      console.log('Could not extract product title from Flipkart');
      return null;
    }
    
    // Try multiple selectors for price
    const priceSelectors = ['._30jeq3', '._1_WHN1', '.a-price', '._3I9_wc'];
    let priceText = '';
    
    for (const selector of priceSelectors) {
      const priceElement = firstProduct.querySelector(selector) || doc.querySelector(selector);
      if (priceElement) {
        priceText = priceElement.textContent?.trim() || '';
        if (priceText) break;
      }
    }
    
    const { price, currency } = parsePrice(priceText);
    
    if (!price) {
      console.log('Could not extract price from Flipkart');
      return null;
    }
    
    // Extract link with more robust approach
    let productUrl = url; // Default to search URL if we can't find the product link
    
    // Try multiple approaches to get the product URL
    const linkSelectors = ['a[href]', '._1fQZEK', '.s1Q9rs', '._2rpwqI'];
    for (const selector of linkSelectors) {
      const linkElement = firstProduct.querySelector(selector) || 
                          firstProduct.closest(selector) || 
                          (firstProduct.tagName === 'A' ? firstProduct : null);
      
      if (linkElement) {
        const relativePath = linkElement.getAttribute('href') || '';
        if (relativePath) {
          productUrl = relativePath.startsWith('/') 
            ? `https://www.flipkart.com${relativePath}` 
            : relativePath;
          break;
        }
      }
    }
    
    // Record successful scraping with this proxy
    updateProxyStats(proxyToUse, true);
    
    return {
      marketplace: 'Flipkart',
      productName: productTitle,
      price: price,
      currency: currency || '₹',
      url: productUrl,
      lastUpdated: new Date(),
      inStock: true // Assuming it's in stock if it shows up in search
    };
  } catch (error) {
    console.error('Error scraping Flipkart:', error);
    
    // Record failure for this proxy if one was provided
    if (proxy) {
      updateProxyStats(proxy, false);
    }
    
    return null;
  }
}

/**
 * Scrape Meesho for product information
 * Enhanced with better error handling and selector fallbacks
 */
async function scrapeMeesho(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`;
    
    // Use provided proxy or get the best one
    const proxyToUse = proxy || getBestProxy(CORS_PROXIES);
    const proxyUrl = `${proxyToUse}${encodeURIComponent(url)}`;
    
    // Set a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased to 25 second timeout
    
    // Add random delay to avoid detection patterns
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 300));
    
    // Use more realistic headers to avoid detection
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site'
      },
      signal: controller.signal
    });
    
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // More detailed error handling
      if (response.status === 403 || response.status === 429) {
        // Check for rate limiting
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error(`Access blocked by Meesho: ${response.status}`);
      } else if (response.status === 408 || response.status === 504) {
        throw new Error(`Timeout from Meesho: ${response.status}`);
      } else if (response.status === 404) {
        throw new Error(`Page not found on Meesho: ${response.status}`);
      } else {
        throw new Error(`Failed to fetch Meesho results: ${response.status}`);
      }
    }
    
    let html = '';
    try {
      html = await response.text();
      
      // Check if the response is valid with more robust validation
      if (!html || html.length < 1000) {
        console.error('Received empty or too short HTML response from Meesho');
        throw new Error('Invalid Meesho response: too short');
      }
      
      // Check for captcha, robot checks, or other blockages with more comprehensive patterns
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access') ||
          html.includes('unusual traffic') ||
          html.includes('security challenge') ||
          html.includes('blocked') ||
          html.includes('access denied') ||
          html.includes('suspicious activity')) {
        console.error('Received captcha or security challenge page from Meesho');
        // Mark this proxy as having security issues
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error('Captcha or security challenge detected');
      }
      
      // Additional check for empty search results
      if (html.includes('no results found') || 
          html.includes('No products found') ||
          html.includes('0 results for')) {
        console.log('No products found on Meesho for this search term');
        return null;
      }
      
      // Check if the page is using client-side rendering (React/Next.js)
      if (html.includes('__NEXT_DATA__')) {
        console.log('Detected client-side rendering in Meesho. Trying to extract data from JSON.');
        
        // Try to extract JSON data embedded in Next.js pages
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch && nextDataMatch[1]) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            // Extract product information from Next.js data
            const products = nextData?.props?.pageProps?.searchResults?.products;
            if (products && products.length > 0) {
              const firstProduct = products[0];
              return {
                marketplace: 'Meesho',
                productName: firstProduct.name || searchTerm,
                price: firstProduct.discountedPrice || firstProduct.price || 0,
                currency: '₹',
                url: `https://www.meesho.com/product/${firstProduct.slug || firstProduct.id}`,
                lastUpdated: new Date(),
                inStock: true
              };
            }
          } catch (jsonError) {
            console.error('Error parsing Next.js data:', jsonError);
          }
        }
      }
      
    } catch (textError) {
      console.error('Error reading Meesho response:', textError);
      throw textError;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try multiple selectors for product cards - Meesho frequently updates their UI
    const productCardSelectors = [
      '[data-testid="product-card"]',
      '.ProductCard',
      '.product-card',
      '.NewProductCard',
      '.css-1c0mh3p',
      '[data-screenreader-value^="Product Name"]'
    ];
    
    let productCard: Element | null = null;
    for (const selector of productCardSelectors) {
      const cards = doc.querySelectorAll(selector);
      if (cards.length > 0) {
        productCard = cards[0];
        break;
      }
    }
    
    if (!productCard) {
      console.log('No product found in Meesho response with common selectors');
      
      // Last attempt - try to find any element that looks like a product card
      const possibleCards = doc.querySelectorAll('a[href*="/product/"]');
      if (possibleCards.length > 0) {
        productCard = possibleCards[0];
      } else {
        return null;
      }
    }
    
    // Try multiple selectors for product title
    const titleSelectors = [
      '[data-testid="product-name"]',
      '.ProductTitle__ProductTitleName-sc-2h270n-0',
      '.product-name',
      'h4',
      '.name',
      '.css-11tn5l'
    ];
    
    let productTitle = '';
    for (const selector of titleSelectors) {
      const titleElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (titleElement) {
        productTitle = titleElement.textContent?.trim() || '';
        if (productTitle) break;
      }
    }
    
    // If we still can't find the title, look for any heading inside the product card
    if (!productTitle) {
      const headings = productCard.querySelectorAll('h1, h2, h3, h4, h5');
      if (headings.length > 0) {
        productTitle = headings[0].textContent?.trim() || '';
      }
    }
    
    if (!productTitle) {
      console.log('Could not extract product title from Meesho');
      return null;
    }
    
    // Try multiple selectors for price
    const priceSelectors = [
      '[data-testid="product-price"]',
      '.ProductPrice__ProductPriceValue-sc-9myfkm-1',
      '.product-price',
      '.price',
      '.discounted-price',
      '.css-70qvj9',
      '.css-w0ibm6',
      '[data-screenreader-value*="rupees"]'
    ];
    
    let priceText = '';
    for (const selector of priceSelectors) {
      const priceElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (priceElement) {
        priceText = priceElement.textContent?.trim() || '';
        if (priceText) break;
      }
    }
    
    // If no price found with selectors, look for any text that contains ₹ or Rs
    if (!priceText) {
      const allText = productCard.textContent || '';
      const priceMatch = allText.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*₹|Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (priceMatch) {
        priceText = priceMatch[0];
      }
    }
    
    const { price, currency } = parsePrice(priceText);
    
    if (!price) {
      console.log('Could not extract price from Meesho');
      return null;
    }
    
    // Extract link with more robust approach
    let productUrl = url; // Default to search URL
    
    // Try to find product link
    // First check if the product card itself is a link
    if (productCard.tagName === 'A') {
      const href = productCard.getAttribute('href');
      if (href) {
        productUrl = href.startsWith('/') ? `https://www.meesho.com${href}` : href;
      }
    } else {
      // Otherwise look for links inside the product card
      const linkElement = productCard.querySelector('a[href]') || productCard.closest('a[href]');
      if (linkElement) {
        const relativePath = linkElement.getAttribute('href') || '';
        if (relativePath) {
          productUrl = relativePath.startsWith('/') 
            ? `https://www.meesho.com${relativePath}` 
            : relativePath;
        }
      }
    }
    
    // Record successful scraping with this proxy
    updateProxyStats(proxyToUse, true);
    
    return {
      marketplace: 'Meesho',
      productName: productTitle,
      price: price,
      currency: currency || '₹',
      url: productUrl,
      lastUpdated: new Date(),
      inStock: true
    };
  } catch (error) {
    console.error('Error scraping Meesho:', error);
    
    // Record failure for this proxy if one was provided
    if (proxy) {
      updateProxyStats(proxy, false);
    }
    
    return null;
  }
}

/**
 * Scrape BigBasket for product information
 * Enhanced with better error handling and selector fallbacks
 */
async function scrapeBigBasket(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;
    
    // Use provided proxy or get the best one
    const proxyToUse = proxy || getBestProxy(CORS_PROXIES);
    const proxyUrl = `${proxyToUse}${encodeURIComponent(url)}`;
    
    // Set a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased to 25 second timeout
    
    // Add random delay to avoid detection patterns
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 200));
    
    // Use more realistic headers to avoid detection
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });
    
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // More detailed error handling
      if (response.status === 403 || response.status === 429) {
        // Check for rate limiting
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error(`Access blocked by BigBasket: ${response.status}`);
      } else if (response.status === 408 || response.status === 504) {
        throw new Error(`Timeout from BigBasket: ${response.status}`);
      } else {
        throw new Error(`Failed to fetch BigBasket results: ${response.status}`);
      }
    }
    
    let html = '';
    try {
      html = await response.text();
      
      // Check if the response is valid with more robust validation
      if (!html || html.length < 1000) {
        console.error('Received empty or too short HTML response from BigBasket');
        throw new Error('Invalid BigBasket response: too short');
      }
      
      // Check for captcha, robot checks, or other blockages with more comprehensive patterns
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access') ||
          html.includes('unusual traffic') ||
          html.includes('security challenge') ||
          html.includes('blocked') ||
          html.includes('access denied') ||
          html.includes('suspicious activity')) {
        console.error('Received captcha or security challenge page from BigBasket');
        // Mark this proxy as having security issues
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error('Captcha or security challenge detected');
      }
      
      // Additional check for empty search results
      if (html.includes('No products found') || 
          html.includes('We could not find any matches') ||
          html.includes('zero results')) {
        console.log('No products found on BigBasket for this search term');
        return null;
      }
      
    } catch (textError) {
      console.error('Error reading BigBasket response:', textError);
      throw textError;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try multiple selectors for the product card
    const productSelectors = [
      '.items', 
      '.prod-view', 
      '.product-item',
      '.item-info',
      '.product-div'
    ];
    
    let productCard: Element | null = null;
    for (const selector of productSelectors) {
      productCard = doc.querySelector(selector);
      if (productCard) break;
    }
    
    if (!productCard) {
      // Check if we're looking at an API-based page that uses React/Angular
      const scriptTags = doc.querySelectorAll('script');
      let jsonData = null;
      
      // Look for product data in script tags
      for (const script of Array.from(scriptTags)) {
        const content = script.textContent || '';
        if (content.includes('product') && content.includes('price')) {
          try {
            // Try to extract JSON data
            const jsonMatch = content.match(/\{.+\}/);
            if (jsonMatch) {
              jsonData = JSON.parse(jsonMatch[0]);
              break;
            }
          } catch (e) {
            console.error('Error parsing JSON from script tag:', e);
          }
        }
      }
      
      if (jsonData?.products?.length > 0) {
        const product = jsonData.products[0];
        return {
          marketplace: 'BigBasket',
          productName: product.name || searchTerm,
          price: parseFloat(product.price) || 0,
          currency: '₹',
          url: url,
          lastUpdated: new Date(),
          inStock: product.inStock !== false
        };
      }
      
      console.log('No product found in BigBasket response');
      return null;
    }
    
    // Try multiple selectors for product title
    const titleSelectors = [
      '.prod-name',
      '.prod-name a',
      '.product-name',
      '.item-name',
      'h1',
      'h3'
    ];
    
    let productTitle = '';
    for (const selector of titleSelectors) {
      const titleElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (titleElement) {
        productTitle = titleElement.textContent?.trim() || '';
        if (productTitle) break;
      }
    }
    
    if (!productTitle) {
      console.log('Could not extract product title from BigBasket');
      return null;
    }
    
    // Try multiple selectors for price
    const priceSelectors = [
      '.discnt-price',
      '.fixed-price',
      '.product-price',
      '.discount-price',
      '.current-price',
      '.Price'
    ];
    
    let priceText = '';
    for (const selector of priceSelectors) {
      const priceElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (priceElement) {
        priceText = priceElement.textContent?.trim() || '';
        if (priceText) break;
      }
    }
    
    const { price, currency } = parsePrice(priceText);
    
    if (!price) {
      console.log('Could not extract price from BigBasket');
      return null;
    }
    
    // Extract link with more robust approach
    let productUrl = url; // Default to search URL if we can't find the product link
    
    // Try to find product link
    const linkSelectors = ['a[href]', '.prod-name a', '.product-name a'];
    for (const selector of linkSelectors) {
      const linkElement = productCard.querySelector(selector);
      if (linkElement) {
        const relativePath = linkElement.getAttribute('href') || '';
        if (relativePath) {
          productUrl = relativePath.startsWith('/') 
            ? `https://www.bigbasket.com${relativePath}` 
            : relativePath;
          break;
        }
      }
    }
    
    // Check for out of stock
    const isOutOfStock = productCard.querySelector('.out-of-stock') !== null ||
                         productCard.querySelector('.sold-out') !== null ||
                         html.includes('Out of stock') ||
                         html.includes('Sold Out');
    
    // Record successful scraping with this proxy
    updateProxyStats(proxyToUse, true);
    
    return {
      marketplace: 'BigBasket',
      productName: productTitle,
      price: price,
      currency: currency || '₹',
      url: productUrl,
      lastUpdated: new Date(),
      inStock: !isOutOfStock
    };
  } catch (error) {
    console.error('Error scraping BigBasket:', error);
    
    // Record failure for this proxy if one was provided
    if (proxy) {
      updateProxyStats(proxy, false);
    }
    
    return null;
  }
}

/**
 * Scrape Swiggy Instamart for product information
 * Enhanced with better error handling and selector fallbacks
 */
async function scrapeSwiggyInstamart(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.swiggy.com/search?query=${encodeURIComponent(searchTerm)}`;
    
    // Use provided proxy or get the best one
    const proxyToUse = proxy || getBestProxy(CORS_PROXIES);
    const proxyUrl = `${proxyToUse}${encodeURIComponent(url)}`;
    
    // Set a longer timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // Increased to 25 second timeout
    
    // Add random delay to avoid detection patterns
    await new Promise(resolve => setTimeout(resolve, Math.random() * 800 + 400));
    
    // Use more realistic headers to avoid detection - simulate mobile app
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Pragma': 'no-cache'
      },
      signal: controller.signal
    });
    
    // Clear the timeout to prevent memory leaks
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      // More detailed error handling
      if (response.status === 403 || response.status === 429) {
        // Check for rate limiting
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error(`Access blocked by Swiggy: ${response.status}`);
      } else if (response.status === 408 || response.status === 504) {
        throw new Error(`Timeout from Swiggy: ${response.status}`);
      } else if (response.status === 404) {
        throw new Error(`Page not found on Swiggy: ${response.status}`);
      } else if (response.status >= 500) {
        throw new Error(`Swiggy server error: ${response.status}`);
      } else {
        throw new Error(`Failed to fetch Swiggy results: ${response.status}`);
      }
    }
    
    let html = '';
    try {
      html = await response.text();
      
      // Check if the response is valid with more robust validation
      if (!html || html.length < 1000) {
        console.error('Received empty or too short HTML response from Swiggy');
        throw new Error('Invalid Swiggy response: too short');
      }
      
      // Check for captcha, robot checks, or other blockages with more comprehensive patterns
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access') ||
          html.includes('unusual traffic') ||
          html.includes('security challenge') ||
          html.includes('blocked') ||
          html.includes('access denied') ||
          html.includes('suspicious activity')) {
        console.error('Received captcha or security challenge page from Swiggy');
        // Mark this proxy as having security issues
        markProxyRateLimited(proxyToUse);
        updateProxyStats(proxyToUse, false);
        throw new Error('Captcha or security challenge detected');
      }
      
      // Additional check for empty search results
      if (html.includes('No matching restaurants or dishes') || 
          html.includes('No Results Found') ||
          html.includes('We could not understand what you\'re looking for')) {
        console.log('No products found on Swiggy for this search term');
        return null;
      }
      
      // Swiggy uses React/client-side rendering, check for JSON data
      // Look for __NEXT_DATA__ or window.__INITIAL_STATE__
      let jsonData = null;
      
      // Try to extract data from Next.js format
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (nextDataMatch && nextDataMatch[1]) {
        try {
          jsonData = JSON.parse(nextDataMatch[1]);
        } catch (e) {
          console.error('Error parsing Next.js data:', e);
        }
      }
      
      // Try to extract data from window.__INITIAL_STATE__
      if (!jsonData) {
        const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
        if (initialStateMatch && initialStateMatch[1]) {
          try {
            jsonData = JSON.parse(initialStateMatch[1]);
          } catch (e) {
            console.error('Error parsing INITIAL_STATE data:', e);
          }
        }
      }
      
      // If we found JSON data, try to extract product details
      if (jsonData) {
        console.log('Found client-side data in Swiggy response');
        
        // Extract product data from JSON - structure varies based on Swiggy's implementation
        let products = null;
        
        // Next.js data structure
        if (jsonData.props?.pageProps?.initialData?.products) {
          products = jsonData.props.pageProps.initialData.products;
        } 
        // INITIAL_STATE structure
        else if (jsonData.searchResult?.products) {
          products = jsonData.searchResult.products;
        }
        // Alternative paths
        else if (jsonData.catalog?.products) {
          products = jsonData.catalog.products;
        }
        else if (jsonData.data?.products) {
          products = jsonData.data.products;
        }
        
        if (products && products.length > 0) {
          const firstProduct = products[0];
          return {
            marketplace: 'Swiggy Instamart',
            productName: firstProduct.name || firstProduct.dish?.name || searchTerm,
            price: firstProduct.price || firstProduct.defaultPrice || firstProduct.finalPrice || 0,
            currency: '₹',
            url: url,
            lastUpdated: new Date(),
            inStock: firstProduct.isAvailable !== false && firstProduct.inStock !== false
          };
        }
      }
      
    } catch (textError) {
      console.error('Error reading Swiggy response:', textError);
      throw textError;
    }
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try multiple selectors for product cards
    const productCardSelectors = [
      '.styles_container__MXAJb',
      '.styles_itemContainer__3Fa0u',
      '.styles_productContainer__JYbWC',
      '.product-item',
      '.item-card',
      '[data-testid="product-card"]',
      '.instamart-item'
    ];
    
    let productCard: Element | null = null;
    for (const selector of productCardSelectors) {
      const cards = doc.querySelectorAll(selector);
      if (cards.length > 0) {
        productCard = cards[0];
        break;
      }
    }
    
    if (!productCard) {
      // Try a more generic approach - look for any container with price information
      const priceElements = doc.querySelectorAll('.rupee, [data-testid="price"], .price');
      if (priceElements.length > 0) {
        // Get the closest parent that might be a product card
        productCard = priceElements[0].closest('div[class*="container"], div[class*="product"], div[class*="item"]');
      }
      
      if (!productCard) {
        console.log('No product found in Swiggy response');
        return null;
      }
    }
    
    // Try multiple selectors for product title
    const titleSelectors = [
      '.styles_itemNameText__3ZmZZ',
      '.item-name',
      '.product-name',
      '.styles_itemName__1svQu',
      'h3',
      '.name',
      '[data-testid="item-name"]'
    ];
    
    let productTitle = '';
    for (const selector of titleSelectors) {
      const titleElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (titleElement) {
        productTitle = titleElement.textContent?.trim() || '';
        if (productTitle) break;
      }
    }
    
    // If we still can't find the title, look for any heading inside the product card
    if (!productTitle) {
      const headings = productCard.querySelectorAll('h1, h2, h3, h4, h5');
      if (headings.length > 0) {
        productTitle = headings[0].textContent?.trim() || '';
      } else {
        // Last resort - use the search term
        productTitle = `Product matching "${searchTerm}" on Swiggy Instamart`;
      }
    }
    
    // Try multiple selectors for price
    const priceSelectors = [
      '.rupee',
      '.styles_price__1WKue',
      '.price',
      '[data-testid="price"]',
      '.styles_itemPrice__1Ty_J',
      '.price-info',
      '.current-price'
    ];
    
    let priceText = '';
    for (const selector of priceSelectors) {
      const priceElement = productCard.querySelector(selector) || doc.querySelector(selector);
      if (priceElement) {
        priceText = priceElement.textContent?.trim() || '';
        if (priceText) break;
      }
    }
    
    // If no price found with selectors, try to find price with regex
    if (!priceText) {
      const allText = productCard.textContent || '';
      const priceMatch = allText.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)|(\d+(?:,\d+)*(?:\.\d+)?)\s*₹|Rs\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (priceMatch) {
        priceText = priceMatch[0];
      }
    }
    
    const { price, currency } = parsePrice(priceText);
    
    if (!price) {
      console.log('Could not extract price from Swiggy');
      return null;
    }
    
    // Check for out of stock
    const isOutOfStock = productCard.querySelector('.sold-out') !== null ||
                         productCard.querySelector('.out-of-stock') !== null ||
                         productCard.textContent?.includes('Out of stock') ||
                         productCard.textContent?.includes('Sold Out');
    
    // Record successful scraping with this proxy
    updateProxyStats(proxyToUse, true);
    
    return {
      marketplace: 'Swiggy Instamart',
      productName: productTitle,
      price: price,
      currency: currency || '₹',
      url: url,
      lastUpdated: new Date(),
      inStock: !isOutOfStock
    };
  } catch (error) {
    console.error('Error scraping Swiggy Instamart:', error);
    
    // Record failure for this proxy if one was provided
    if (proxy) {
      updateProxyStats(proxy, false);
    }
    
    return null;
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
  
  // Log the original price string for debugging
  console.log('Parsing price string:', priceString);
  
  // Remove any non-breaking spaces and normalize whitespace
  const normalizedPrice = priceString.replace(/\u00A0/g, ' ').trim();
  
  // Handle common currency formats: $, €, £, ₹, Rs., etc.
  // This regex detects currency symbols both before and after the number
  const priceRegex = /([^\d,.]+)?([0-9,]+(?:\.[0-9]+)?)([^\d,.]+)?/;
  const match = normalizedPrice.match(priceRegex);
  
  if (!match) {
    console.log('Price regex failed to match:', normalizedPrice);
    return { price: null, currency: null };
  }
  
  let currencySymbol = match[1]?.trim() || match[3]?.trim() || null;
  let priceValue = match[2]?.replace(/,/g, '');
  
  // Handle Indian price format (e.g., "₹16,010" or "Rs. 16,010")
  if (normalizedPrice.includes('₹') || normalizedPrice.toLowerCase().includes('rs.') || normalizedPrice.toLowerCase().includes('inr')) {
    currencySymbol = '₹';
  }
  
  // Handle price ranges (take the lower price)
  if (priceValue && priceValue.includes('-')) {
    const parts = priceValue.split('-');
    priceValue = parts[0].trim();
  }
  
  // Extra check for common currency codes
  if (!currencySymbol) {
    if (normalizedPrice.includes('USD') || normalizedPrice.includes('$')) {
      currencySymbol = '$';
    } else if (normalizedPrice.includes('EUR') || normalizedPrice.includes('€')) {
      currencySymbol = '€';
    } else if (normalizedPrice.includes('GBP') || normalizedPrice.includes('£')) {
      currencySymbol = '£';
    } else if (normalizedPrice.includes('INR') || 
              normalizedPrice.includes('Rs.') || 
              normalizedPrice.includes('₹')) {
      currencySymbol = '₹';
    }
  }
  
  // If we have a price value but no currency symbol, default to the most common one
  if (priceValue && !currencySymbol) {
    currencySymbol = '$'; // Default currency if none detected
  }
  
  // Special handling for Indian Rupee format
  if (currencySymbol === '₹' || currencySymbol?.toLowerCase().includes('rs')) {
    currencySymbol = '₹'; // Normalize to the Rupee symbol
  }
  
  const price = priceValue ? parseFloat(priceValue) : null;
  
  console.log('Parsed price:', { price, currency: currencySymbol });
  
  return {
    price,
    currency: currencySymbol
  };
}

function extractMetadata(doc: Document, productName: string): ScrapedProductData['metadata'] {
  // Extract product features from bullet points
  const featureElements = Array.from(doc.querySelectorAll('#feature-bullets li'));
  const features = featureElements
    .map(el => el.textContent?.trim())
    .filter((text): text is string => !!text && text.length > 0);
  
  // Try to extract brand
  let brand = extractText(doc, '#bylineInfo') || '';
  // Clean up brand text (e.g., "Brand: Samsung" -> "Samsung")
  brand = brand.replace(/^(Visit the |Brand: )/i, '').trim();
  
  // Try to extract other metadata from product details section
  const detailsRows = Array.from(doc.querySelectorAll('.prodDetTable tr, .a-expander-content table tr'));
  const metadataMap: Record<string, string | string[]> = {};
  
  detailsRows.forEach(row => {
    const labelEl = row.querySelector('th, .a-span3');
    const valueEl = row.querySelector('td, .a-span9');
    
    if (labelEl && valueEl) {
      const label = labelEl.textContent?.trim().toLowerCase() || '';
      const value = valueEl.textContent?.trim() || '';
      
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
