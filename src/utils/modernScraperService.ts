/**
 * Modern scraping service for client-side rendered websites
 * Provides utilities to extract data from JavaScript frameworks like React, Next.js, etc.
 */
//modernScraperService.ts
import { PriceComparisonItem } from './scraperService';
import { 
  getBestAvailableProxy, 
  getAdaptiveTimeout, 
  recordProxySuccess, 
  recordProxyFailure 
} from './proxyRotator';

// Types for API data extraction
interface ExtractedApiData {
  products?: ProductData[];
  items?: ProductData[];
  results?: ProductData[];
  data?: {
    pageDataV4: any;
    SEARCH_RESPONSE: any;
    ta_results: any;
    __STATE__: any;
    searchResult: any;
    productList: unknown;
    props?: {
      pageProps?: {
        initialData: any;
        product?: ProductData;
        catalogList?: { products: ProductData[] };
        searchResults?: { products: ProductData[] };
        initialState?: {
          search?: {
            results: unknown; products: ProductData[] 
};
          instamart?: { products: ProductData[] };
        };
      };
    };
  };
  error?: string;
}

// Types for scraper responses
interface ProductData {
  discountedPrice?: number | string;
  price?: number | string;
  productPrice?: number | string;
  displayedPrice?: number | string;
  name?: string;
  productName?: string;
  title?: string;
  displayName?: string;
  productTitle?: string;
  productUrl?: string;
  shareUrl?: string;
  url?: string;
  link?: string;
  detailUrl?: string;
  inStock?: boolean;
  availability?: string | boolean;
  stock?: number;
  slug?: string;
  id?: string;
}

// List of CORS proxies
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
 * Extract embedded JSON data from client-side rendered pages (Next.js, React, etc.)
 */
export function extractEmbeddedJsonData(html: string): ExtractedApiData {
  try {
    // Try to find Next.js data
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
    if (nextDataMatch?.[1]) {
      return {
        data: JSON.parse(nextDataMatch[1]),
        error: null
      };
    }
    
    // Try to find window.__INITIAL_STATE__
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
    if (stateMatch?.[1]) {
      return {
        data: JSON.parse(stateMatch[1]),
        error: null
      };
    }
    
    // Look for JSON-LD data
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    if (jsonLdMatch?.[1]) {
      return {
        data: JSON.parse(jsonLdMatch[1]),
        error: null
      };
    }
    
    return {
      data: null,
      error: 'No embedded data found'
    };
    
  } catch (error) {
    return {
      data: null,
      error: `Error extracting embedded data: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Extract product information from embedded data for different platforms
 */
export function extractProductFromEmbeddedData(
  data: ExtractedApiData,
  platform: string
): PriceComparisonItem | null {
  try {
    if (data.error) {
      console.error(`Error in embedded data for ${platform}:`, data.error);
      return null;
    }
    
    // Handle different data structures based on platform
    switch (platform.toLowerCase()) {
      case 'flipkart':
        return extractFlipkartProduct(data);
      case 'meesho':
        return extractMeeshoProduct(data);
      case 'bigbasket':
        return extractBigBasketProduct(data);
      case 'swiggy instamart':
      case 'swiggy':
        return extractSwiggyProduct(data);
      default:
        // Generic extraction for unknown platforms
        return extractGenericProduct(data, platform);
    }
  } catch (error) {
    console.error(`Error extracting product from embedded data for ${platform}:`, error);
    return null;
  }
}

/**
 * Extract Flipkart product from embedded data
 */
function extractFlipkartProduct(data: ExtractedApiData): PriceComparisonItem | null {
  try {
    let product = null;
    
    // Check different possible locations for product data
    if (data.products && data.products.length > 0) {
      product = data.products[0];
    } else if (data.results && data.results.length > 0) {
      product = data.results[0];
    } else if (data.items && data.items.length > 0) {
      product = data.items[0];
    } else if (data.data) {
      // Navigate through common Flipkart data structures
      const allData = data.data;
      
      // Check pageDataV4 structure (common in newer Flipkart pages)
      if (allData.pageDataV4) {
        const pageData = allData.pageDataV4;
        if (pageData.page?.data?.["10"]) {
          // This is a common Flipkart structure where products are under numbered keys
          const productsData = pageData.page.data['10'];
          if (productsData.widget?.data?.products) {
            product = productsData.widget.data.products[0];
          }
        }
      }
      
      // Check for SEARCH_RESPONSE structures
      if (!product && allData.SEARCH_RESPONSE) {
        const searchResponse = allData.SEARCH_RESPONSE;
        if (searchResponse.products && searchResponse.products.length > 0) {
          product = searchResponse.products[0];
        }
      }
    }
    
    if (!product) {
      console.error('No product found in Flipkart embedded data');
      return null;
    }
    
    // Extract price information, handling different Flipkart data structures
    let price = 0;
    let productName = '';
    let url = '';
    let inStock = true;
    
    // Try different paths for price data
    if (product.price) {
      // Simple case: direct price property
      price = parseFloat(product.price.toString().replace(/[^\d.]/g, ''));
    } else if (product.pricing) {
      // More structured pricing data
      price = parseFloat(product.pricing.finalPrice?.toString().replace(/[^\d.]/g, '') || 
                        product.pricing.price?.toString().replace(/[^\d.]/g, '') || 
                        '0');
    } else if (product.productInfo) {
      // Nested product info structure
      price = parseFloat(product.productInfo.value?.price?.toString().replace(/[^\d.]/g, '') || 
                        product.productInfo.value?.finalPrice?.toString().replace(/[^\d.]/g, '') || 
                        '0');
    }
    
    // Try different paths for product name
    productName = product.title || product.name || product.productName || '';
    
    // Try different paths for URL
    url = product.url || product.productUrl || product.link || '';
    if (url && !url.startsWith('http')) {
      url = `https://www.flipkart.com${url.startsWith('/') ? url : '/' + url}`;
    }
    
    // Try to determine if product is in stock
    inStock = product.inStock !== false;
    if (product.availability) {
      inStock = product.availability.toLowerCase() !== 'outofstock';
    }
    
    return {
      marketplace: 'Flipkart',
      productName,
      price,
      currency: '₹',
      url: url || `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`,
      lastUpdated: new Date(),
      inStock
    };
  } catch (error) {
    console.error('Error extracting Flipkart product:', error);
    return null;
  }
}

/**
 * Extract Meesho product from embedded data
 */
function extractMeeshoProduct(data: ExtractedApiData): PriceComparisonItem | null {
  try {
    if (!data.data) {
      return null;
    }
    
    let product = null;
    const allData = data.data;
    
    // Find product in various data structures
    if (allData.props?.pageProps?.product) {
      product = allData.props.pageProps.product;
    } else if (allData.props?.pageProps?.catalogList?.products?.[0]) {
      product = allData.props.pageProps.catalogList.products[0];
    } else if (allData.props?.pageProps?.searchResults?.products?.[0]) {
      product = allData.props.pageProps.searchResults.products[0];
    } else if (allData.props?.pageProps?.initialState?.search?.products?.[0]) {
      product = allData.props.pageProps.initialState.search.products[0];
    }
    
    if (!product) {
      console.warn('No product found in Meesho data');
      return null;
    }
    
    // Extract price with fallbacks
    let price = 0;
    if (typeof product.discountedPrice === 'number') {
      price = product.discountedPrice;
    } else if (typeof product.price === 'number') {
      price = product.price;
    } else {
      const priceStr = String(product.discountedPrice || product.price || '').replace(/[^\d.]/g, '');
      price = parseFloat(priceStr) || 0;
    }
    
    // Get product name
    const productName = product.name || product.title || '';
    if (!productName) {
      console.warn('No product name found');
      return null;
    }
    
    // Construct URL
    let url = '';
    if (product.slug) {
      url = `https://www.meesho.com/product/${product.slug}`;
    } else if (product.productUrl) {
      url = product.productUrl.startsWith('http') ? 
        product.productUrl : 
        `https://www.meesho.com${product.productUrl.startsWith('/') ? product.productUrl : '/' + product.productUrl}`;
    }
    
    // Check stock status
    const inStock = product.inStock !== false && product.stock !== 0;
    
    return {
      marketplace: 'Meesho',
      productName,
      price,
      currency: '₹',
      url,
      lastUpdated: new Date(),
      inStock
    };
  } catch (error) {
    console.error('Error extracting Meesho product:', error);
    return null;
  }
}

/**
 * Extract BigBasket product from embedded data
 */
function extractBigBasketProduct(data: ExtractedApiData): PriceComparisonItem | null {
  try {
    let product = null;
    
    // Check different possible locations for product data
    if (data.products && data.products.length > 0) {
      product = data.products[0];
    } else if (data.results && data.results.length > 0) {
      product = data.results[0];
    } else if (data.items && data.items.length > 0) {
      product = data.items[0];
    } else if (data.data) {
      // Navigate through common BigBasket data structures
      const allData = data.data;
      
      // Check common BigBasket data paths
      if (allData.ta_results?.products) {
        product = allData.ta_results.products[0];
      } else if (allData.__STATE__?.search?.results) {
        product = allData.__STATE__.search.results[0];
      } else if (allData.productList) {
        product = allData.productList[0];
      } else if (allData.searchResult?.products) {
        product = allData.searchResult.products[0];
      }
    }
    
    if (!product) {
      console.error('No product found in BigBasket embedded data');
      return null;
    }
    
    // Extract price information, handling different BigBasket data structures
    let price = 0;
    let productName = '';
    let url = '';
    let inStock = true;
    
    // Try different paths for price data
    if (product.sp) {
      price = parseFloat(product.sp.toString().replace(/[^\d.]/g, ''));
    } else if (product.mrp) {
      price = parseFloat(product.mrp.toString().replace(/[^\d.]/g, ''));
    } else if (product.price) {
      price = parseFloat(product.price.toString().replace(/[^\d.]/g, ''));
    } else if (product.actual_price) {
      price = parseFloat(product.actual_price.toString().replace(/[^\d.]/g, ''));
    }
    
    // Try different paths for product name
    productName = product.name || product.brand || product.product_name || product.desc || '';
    
    // Try different paths for URL
    url = product.absolute_url || product.url || product.slug || '';
    if (url && !url.startsWith('http')) {
      url = `https://www.bigbasket.com${url.startsWith('/') ? url : '/' + url}`;
    }
    
    // Try to determine if product is in stock
    inStock = true; // Default to true
    if (product.in_stock !== undefined) {
      inStock = product.in_stock;
    } else if (product.status !== undefined) {
      inStock = product.status !== 'NA';
    } else if (product.availability !== undefined) {
      inStock = product.availability !== 'Unavailable';
    }
    
    return {
      marketplace: 'BigBasket',
      productName,
      price,
      currency: '₹',
      url: url || `https://www.bigbasket.com/ps/?q=${encodeURIComponent(productName)}`,
      lastUpdated: new Date(),
      inStock
    };
  } catch (error) {
    console.error('Error extracting BigBasket product:', error);
    return null;
  }
}

/**
 * Extract Swiggy product from embedded data
 */
function extractSwiggyProduct(data: ExtractedApiData): PriceComparisonItem | null {
  try {
    let product = null;
    
    // Check different possible locations for product data
    if (data.products && data.products.length > 0) {
      product = data.products[0];
    } else if (data.results && data.results.length > 0) {
      product = data.results[0];
    } else if (data.items && data.items.length > 0) {
      product = data.items[0];
    } else if (data.data) {
      // Navigate through common Swiggy data structures
      const allData = data.data;
      
      // Check Next.js specific paths
      if (allData.props?.pageProps?.initialData?.products) {
        product = allData.props.pageProps.initialData.products[0];
      } else if (allData.props?.pageProps?.initialState?.instamart?.products) {
        product = allData.props.pageProps.initialState.instamart.products[0];
      } else if (allData.props?.pageProps?.initialState?.search?.results) {
        const searchResults = allData.props.pageProps.initialState.search.results;
        // Find instamart products
        for (const result of searchResults) {
          if (result.type === 'INSTAMART_PRODUCT' || result.type === 'GROCERY_PRODUCT') {
            product = result;
            break;
          }
        }
      }
    }
    
    if (!product) {
      console.error('No product found in Swiggy embedded data');
      return null;
    }
    
    // Extract price information, handling different Swiggy data structures
    let price = 0;
    let productName = '';
    let url = '';
    let inStock = true;
    
    // Try different paths for price data
    if (product.price) {
      price = parseFloat(product.price.toString().replace(/[^\d.]/g, ''));
    } else if (product.variants && product.variants.length > 0) {
      price = parseFloat(product.variants[0].price?.toString().replace(/[^\d.]/g, '') || '0');
    } else if (product.mrp) {
      price = parseFloat(product.mrp.toString().replace(/[^\d.]/g, ''));
    }
    
    // Try different paths for product name
    productName = product.name || product.title || product.productName || '';
    
    // Try different paths for URL
    url = product.url || product.deeplink || '';
    if (url && !url.startsWith('http')) {
      url = `https://www.swiggy.com${url.startsWith('/') ? url : '/' + url}`;
    }
    
    // Try to determine if product is in stock
    inStock = product.inStock !== false;
    if (product.availability !== undefined) {
      inStock = product.availability;
    }
    
    return {
      marketplace: 'Swiggy Instamart',
      productName,
      price,
      currency: '₹',
      url: url || `https://www.swiggy.com/search?query=${encodeURIComponent(productName)}`,
      lastUpdated: new Date(),
      inStock
    };
  } catch (error) {
    console.error('Error extracting Swiggy product:', error);
    return null;
  }
}

/**
 * Extract generic product from embedded data
 */
function extractGenericProduct(data: ExtractedApiData, platform: string): PriceComparisonItem | null {
  try {
    let product = null;
    
    // Check different possible locations for product data
    if (data.products && data.products.length > 0) {
      product = data.products[0];
    } else if (data.results && data.results.length > 0) {
      product = data.results[0];
    } else if (data.items && data.items.length > 0) {
      product = data.items[0];
    }
    
    if (!product) {
      console.error(`No product found in ${platform} embedded data`);
      return null;
    }
    
    // Try to extract common product properties by checking common field names
    let price = 0;
    for (const field of ['price', 'finalPrice', 'salePrice', 'offerPrice', 'discountedPrice', 'mrp']) {
      if (product[field] !== undefined) {
        const priceStr = product[field].toString().replace(/[^\d.]/g, '');
        price = parseFloat(priceStr);
        if (!isNaN(price)) break;
      }
    }
    
    // Try to extract product name
    let productName = '';
    for (const field of ['name', 'title', 'productName', 'product_name', 'desc', 'description']) {
      if (product[field]) {
        productName = product[field];
        break;
      }
    }
    
    // Try to extract URL
    let url = '';
    for (const field of ['url', 'productUrl', 'link', 'detailUrl', 'product_url']) {
      if (product[field]) {
        url = product[field];
        break;
      }
    }
    
    // If URL is relative, make it absolute
    if (url && !url.startsWith('http')) {
      url = `https://www.${platform.toLowerCase().replace(/\s+/g, '')}.com${url.startsWith('/') ? url : '/' + url}`;
    }
    
    // Try to determine if product is in stock
    let inStock = true; // Default to true
    for (const field of ['inStock', 'in_stock', 'isAvailable', 'availability', 'stock']) {
      if (product[field] !== undefined) {
        // Convert to boolean, handling string values like "Available" or numbers like stock count
        const value = product[field];
        if (typeof value === 'boolean') {
          inStock = value;
        } else if (typeof value === 'number') {
          inStock = value > 0;
        } else if (typeof value === 'string') {
          inStock = !['outofstock', 'unavailable', 'no', 'false', '0'].includes(value.toLowerCase());
        }
        break;
      }
    }
    
    return {
      marketplace: platform,
      productName,
      price,
      currency: '₹',
      url: url || `https://www.${platform.toLowerCase().replace(/\s+/g, '')}.com/search?q=${encodeURIComponent(productName)}`,
      lastUpdated: new Date(),
      inStock
    };
  } catch (error) {
    console.error(`Error extracting ${platform} product:`, error);
    return null;
  }
}

/**
 * Fetch a website with advanced error handling, retry logic, and response time tracking
 */
export async function fetchWithAdvancedHandling(
  url: string,
  proxy: string,
  options: RequestInit = {},
  platform: string,
  maxRetries = 2
): Promise<{ html: string; responseTime: number } | null> {
  let retryCount = 0;
  let lastError: Error | null = null;
  
  while (retryCount <= maxRetries) {
    const startTime = Date.now();
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const timeout = getAdaptiveTimeout(platform);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(proxyUrl, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      const responseTime = Date.now() - startTime;
      
      if (!html || html.length < 1000) {
        throw new Error('Invalid response: too short');
      }
      
      // Check for common error pages
      if (html.toLowerCase().includes('captcha') ||
          html.toLowerCase().includes('robot check') ||
          html.toLowerCase().includes('access denied')) {
        throw new Error('Blocked by website protection');
      }
      
      return { html, responseTime };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${retryCount + 1} failed:`, lastError.message);
      
      retryCount++;
      if (retryCount <= maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }
  
  if (lastError) {
    throw lastError;
  }
  
  return null;
}

/**
 * Modern scraping method for client-side rendered sites
 */
export async function scrapeWithModernMethod(
  url: string, 
  proxy?: string
): Promise<PriceComparisonItem | null> {
  try {
    const proxyToUse = proxy || getBestAvailableProxy(CORS_PROXIES);
    const response = await fetch(`${proxyToUse}${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const extractedData = extractEmbeddedJsonData(html);
    
    if (extractedData && !extractedData.error) {
      // Determine platform from URL
      const platform = url.toLowerCase().includes('flipkart') ? 'flipkart' :
                      url.toLowerCase().includes('meesho') ? 'meesho' :
                      'unknown';

      return extractProductFromEmbeddedData(extractedData, platform);
    }

    return null;
  } catch (error) {
    console.error('Modern scraping method failed:', error);
    return null;
  }
}

function extractPrice(product: ProductData): number {
  if (typeof product.discountedPrice === 'number') return product.discountedPrice;
  if (typeof product.price === 'number') return product.price;
  if (typeof product.productPrice === 'number') return product.productPrice;
  if (typeof product.displayedPrice === 'number') return product.displayedPrice;
  
  const priceStr = String(product.discountedPrice || product.price || product.productPrice || product.displayedPrice || '0')
    .replace(/[^\d.]/g, '');
  return parseFloat(priceStr) || 0;
}

function extractProductName(product: ProductData): string {
  return product.name || product.productName || product.title || product.displayName || product.productTitle || '';
}

function constructProductUrl(product: ProductData): string {
  const url = product.productUrl || 
              product.shareUrl || 
              (product.slug ? `/product/${product.slug}` : '') ||
              (product.id ? `/product/${product.id}` : '');
              
  if (!url) return '';
  
  return url.startsWith('http') ? url : 
         `https://www.meesho.com${url.startsWith('/') ? url : '/' + url}`;
}

function checkInStock(product: ProductData): boolean {
  if (typeof product.inStock === 'boolean') return product.inStock;
  if (typeof product.stock === 'number') return product.stock > 0;
  if (product.availability !== undefined) {
    if (typeof product.availability === 'boolean') return product.availability;
    if (typeof product.availability === 'string') {
      return !['outofstock', 'unavailable', 'no', 'false', '0']
        .includes(product.availability.toLowerCase());
    }
  }
  return true; // Default to true if we can't determine
}
