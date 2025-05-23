/**
 * Specialized scraping strategies for different marketplaces
 * 
 * This file contains different scraping approaches for handling
 * various protection mechanisms used by e-commerce sites.
 */
//scrapingStrategies.ts
import { fetchWithRetry } from './fetchUtils';
import { markProxyRateLimited, updateProxyStats } from './proxyUtils';

// Types
interface ScrapingResult {
  success: boolean;
  html?: string;
  error?: string;
  warning?: string;  // Added for cases where we got data but with potential issues
}

// List of user agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
];

// Get a random user agent
function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Standard scraping strategy - used for most sites
 */
export async function standardScraping(
  url: string,
  proxy: string,
  platform: string
): Promise<ScrapingResult> {
  try {
    const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
    
    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
    
    try {
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.google.com/'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          // Check if the response contains rate limiting or blocking indicators
          const responseText = await response.text();
          
          if (responseText.includes('captcha') || 
              responseText.includes('robot') || 
              responseText.includes('automated') ||
              responseText.includes('blocked')) {
            markProxyRateLimited(proxy);
            updateProxyStats(proxy, false);
            return {
              success: false,
              error: `Security challenge detected (${response.status})`
            };
          }
          
          markProxyRateLimited(proxy);
          updateProxyStats(proxy, false);
          return {
            success: false,
            error: `HTTP error: ${response.status}`
          };
        }
        
        return {
          success: false,
          error: `HTTP error: ${response.status}`
        };
      }
      
      const html = await response.text();
      
      // Check for captcha or security challenges
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access') ||
          html.includes('unusual traffic') ||
          html.includes('security challenge')) {
        markProxyRateLimited(proxy);
        updateProxyStats(proxy, false);
        return {
          success: false,
          error: 'Security challenge detected in response'
        };
      }
      
      // Check if the content is too short to be valid
      if (!html || html.length < 1000) {
        return {
          success: false,
          error: 'Response too short to be valid'
        };
      }
      
      // Record success
      updateProxyStats(proxy, true);
      
      return {
        success: true,
        html
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Amazon-specific scraping strategy with enhanced evasion techniques
 * Handles Amazon's sophisticated bot detection with a multi-layered approach
 */
export async function amazonScraping(
  url: string,
  proxy: string
): Promise<ScrapingResult> {
  try {
    // Add a slight delay to mimic human browsing behavior (random between 1-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
    
    // Set up timeout with a longer duration for Amazon
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for Amazon
    
    try {
      // Create a more browser-like session with detailed headers
      // Rotating different browser fingerprints helps avoid detection
      const userAgent = getRandomUserAgent();
      const isMobileUA = userAgent.includes('Mobile') || userAgent.includes('Android');
      
      // Enhanced Amazon-specific headers that closely mimic real browsers
      const headers = {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/search?q=amazon+products',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile': isMobileUA ? '?1' : '?0',
        'Sec-Ch-Ua-Platform': isMobileUA ? '"Android"' : '"Windows"',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'DNT': '1',
        'Priority': 'u=0, i'
      };
      
      // First try: Regular fetch
      let response = await fetch(proxyUrl, {
        headers,
        signal: controller.signal
      });
      
      // If we hit a 403/429, try again with a slightly modified approach
      if (response.status === 403 || response.status === 429) {
        console.log('Initial request blocked, trying with modified headers');
        
        // Wait a bit before the second attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Modify headers slightly to look like a different client
        const modifiedHeaders = {
          ...headers,
          'User-Agent': getRandomUserAgent(), // Use a different user agent
          'Accept-Language': 'en-GB,en;q=0.9,en-US;q=0.8',
          'Referer': 'https://www.bing.com/search?q=amazon+products',
        };
        
        // Second attempt with modified headers
        response = await fetch(proxyUrl, {
          headers: modifiedHeaders,
          signal: controller.signal
        });
      }
      
      clearTimeout(timeoutId);
      
      // Even if the response is not OK, we might be able to extract some data
      // Amazon sometimes returns partial page content with 403 status
      let html = '';
      try {
        html = await response.text();
      } catch (textError) {
        console.error('Failed to get response text:', textError);
        return {
          success: false,
          error: `Failed to read response: ${textError}`
        };
      }
      
      // Check for error patterns in the HTML
      const hasErrorPatterns = html.includes('To discuss automated access to Amazon data please contact api-services-support@amazon.com') ||
          html.includes('Sorry, we just need to make sure you\'re not a robot') ||
          html.includes('Why was I sent to this page?') ||
          html.includes('Enter the characters you see below') ||
          html.includes('Type the characters you see in this image');
      
      if (hasErrorPatterns) {
        markProxyRateLimited(proxy);
        updateProxyStats(proxy, false);
        console.log('Amazon bot protection detected, but continuing to try parsing the content');
        // We'll still try to extract data even if there are error patterns
      }
      
      // Check for correct content
      if (!html || html.length < 500) {
        return {
          success: false,
          error: 'Response too short to be valid'
        };
      }
      
      // We'll be more lenient about product data detection
      // Sometimes Amazon returns partial data even with bot protection
      const hasAnyProductData = html.includes('productTitle') || 
                                html.includes('priceblock') || 
                                html.includes('a-price') ||
                                html.includes('price_inside_buybox') ||
                                html.includes('corePriceDisplay') ||
                                html.includes('previous-price');
      
      if (!hasAnyProductData) {
        console.log('No product data detected in the response');
        return {
          success: false,
          error: 'Response does not contain product data'
        };
      }
      
      // Even if there are error patterns, we'll still try to extract data
      // Record success with a warning flag for partial data
      updateProxyStats(proxy, true);
      
      return {
        success: true,
        html,
        warning: hasErrorPatterns ? 'Potential security challenges, data might be partial' : undefined
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Specialized strategy for handling JavaScript-heavy sites
 * This is a placeholder for a more advanced scraping method
 * that could potentially use a headless browser
 */
export async function jsRenderingScraping(
  url: string,
  proxy: string
): Promise<ScrapingResult> {
  // In a real implementation, this would use a headless browser like Puppeteer
  // For now, it uses the standard method with longer timeouts
  
  try {
    const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
    
    // Set up timeout - longer for JS-heavy sites
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout
    
    try {
      // More browser-like headers
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          markProxyRateLimited(proxy);
          updateProxyStats(proxy, false);
        }
        
        return {
          success: false,
          error: `HTTP error: ${response.status}`
        };
      }
      
      const html = await response.text();
      
      // Check for common protection patterns
      if (html.includes('captcha') || 
          html.includes('robot check') ||
          html.includes('verify you are a human') ||
          html.includes('automated access')) {
        markProxyRateLimited(proxy);
        updateProxyStats(proxy, false);
        return {
          success: false,
          error: 'Security challenge detected'
        };
      }
      
      // Record success
      updateProxyStats(proxy, true);
      
      return {
        success: true,
        html
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get the appropriate scraping strategy for a platform
 */
export function getScrapingStrategy(platform: string) {
  // Convert platform to lowercase for easier matching
  const platformLower = platform.toLowerCase();
  
  if (platformLower.includes('amazon')) {
    // Special wrapper to handle the different function signature
    return (url: string, proxy: string, _platform: string) => amazonScraping(url, proxy);
  }
  
  // For JS-heavy sites
  if (platformLower.includes('swiggy') || 
      platformLower.includes('zomato') ||
      platformLower.includes('meesho')) {
    return jsRenderingScraping;
  }
  
  // Default to standard strategy
  return standardScraping;
}
