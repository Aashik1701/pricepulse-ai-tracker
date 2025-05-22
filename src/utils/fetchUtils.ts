import { markProxyRateLimited, updateProxyStats, getNonRateLimitedProxy } from './proxyUtils';
import { getHeadersForSite, getRealisticHeaders } from './userAgentUtils';

/**
 * Fetch with retry logic and proxy rotation
 * This function handles various failure scenarios and retries with different proxies
 */
export async function fetchWithRetry(
  url: string,
  proxies: string[],
  options: RequestInit = {},
  maxRetries: number = 3,
  timeoutMs: number = 20000
): Promise<Response> {
  let lastError: Error | null = null;
  
  // Track proxies we've already tried in this session to avoid repeating
  const triedProxies: Set<string> = new Set();
  
  // Determine site type from URL for specialized headers
  let siteType: 'amazon' | 'flipkart' | 'meesho' | 'default' = 'default';
  if (url.includes('amazon')) {
    siteType = 'amazon';
  } else if (url.includes('flipkart')) {
    siteType = 'flipkart';
  } else if (url.includes('meesho')) {
    siteType = 'meesho';
  }
  
  // Use multiple proxies in sequence if needed
  for (let retry = 0; retry < maxRetries; retry++) {
    try {
      // Get a non-rate-limited proxy we haven't tried yet
      let proxy: string | null = null;
      
      // First try to get a proxy we haven't used yet in this request
      const availableProxies = proxies.filter(p => 
        !triedProxies.has(p) && !isProxyRateLimited(p));
      
      if (availableProxies.length > 0) {
        // Use a new proxy
        proxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
      } else {
        // If we've tried all non-rate-limited proxies, get any non-rate-limited one
        proxy = getNonRateLimitedProxy(proxies);
      }
      
      if (!proxy) {
        console.warn('All proxies are rate limited, waiting 2 seconds before retry');
        // Wait 2 seconds before trying again
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Try again after waiting
        proxy = proxies[Math.floor(Math.random() * proxies.length)];
        if (!proxy) {
          throw new Error('No proxies available');
        }
      }
      
      // Mark this proxy as tried for this request
      triedProxies.add(proxy);
      
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      console.log(`Fetch attempt ${retry + 1} with proxy: ${proxy}`);
      
      // Exponential backoff for retries
      if (retry > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, retry - 1), 8000);
        console.log(`Waiting ${backoffMs}ms before retry ${retry + 1}`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      // Set up timeout - increase timeout for later retries
      const adjustedTimeout = timeoutMs * (1 + (retry * 0.5)); // Increase timeout by 50% each retry
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), adjustedTimeout);
      
      try {
        // Get specialized headers for this site
        const headers = options.headers || getHeadersForSite(siteType);
        
        const response = await fetch(proxyUrl, {
          ...options,
          headers,
          signal: controller.signal
        });
        
        // Handle various error status codes
        if (!response.ok) {
          // Handle rate limiting and blocking
          if (response.status === 403 || response.status === 429 || response.status === 503) {
            markProxyRateLimited(proxy);
            updateProxyStats(proxy, false);
            
            console.warn(`Proxy ${proxy} blocked with status ${response.status}`);
            
            // Check response body for captcha or other blocks
            try {
              const bodyText = await response.text();
              if (bodyText.includes('captcha') || 
                  bodyText.includes('robot') || 
                  bodyText.includes('automated')) {
                console.warn('Detected security challenge in response');
              }
            } catch (bodyError) {
              // Ignore errors reading body
            }
            
            // Don't throw, just continue to next proxy
            continue;
          }
          
          // Other non-success status codes
          console.warn(`HTTP error: ${response.status} from proxy ${proxy}`);
          updateProxyStats(proxy, false);
          
          // For 5xx errors, retry with a different proxy
          if (response.status >= 500) {
            continue;
          }
        }
        
        // Record success if we got here
        updateProxyStats(proxy, response.ok);
        
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Fetch attempt ${retry + 1} failed:`, lastError.message);
      
      // If it's an abort error (timeout), just continue to next proxy
      if (lastError.name === 'AbortError') {
        console.warn('Request timed out, trying next proxy');
        continue;
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Function to check if a response contains signs of blocking or captcha
 */
export async function isBlockedResponse(response: Response): Promise<boolean> {
  if (!response.ok) {
    // Common blocking status codes
    if (response.status === 403 || response.status === 429 || response.status === 503) {
      return true;
    }
  }
  
  try {
    // Clone the response to be able to read the body without consuming it
    const clonedResponse = response.clone();
    const bodyText = await clonedResponse.text();
    
    // Check for common blocking patterns in the response
    const blockingPatterns = [
      'captcha',
      'robot check',
      'security check',
      'verify you are a human',
      'automated access',
      'unusual traffic',
      'suspicious activity',
      'access denied',
      'temporarily blocked'
    ];
    
    for (const pattern of blockingPatterns) {
      if (bodyText.toLowerCase().includes(pattern)) {
        return true;
      }
    }
    
    // Check if the response is too short to be valid
    if (bodyText.length < 500) {
      return true;
    }
  } catch (error) {
    console.error('Error checking if response is blocked:', error);
  }
  
  return false;
}
