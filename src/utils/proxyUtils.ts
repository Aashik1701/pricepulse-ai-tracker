// This file adds proxy rotation functionality to the scraperService.ts

/**
 * This function replaces the static CORS_PROXIES[0] with a mechanism to try
 * different proxies in rotation, based on success rates.
 * 
 * Import and use this in scraperService.ts
 */

// Keep track of proxy success/failure
interface ProxyStats {
  success: number;
  failure: number;
  lastUsed: number;
}

// Store stats for each proxy
const proxyStats: Record<string, ProxyStats> = {};

// Initialize stats for proxies
export function initProxyStats(proxies: string[]): void {
  proxies.forEach(proxy => {
    if (!proxyStats[proxy]) {
      proxyStats[proxy] = {
        success: 0,
        failure: 0,
        lastUsed: 0
      };
    }
  });
}

// Get the best proxy to use next
export function getBestProxy(proxies: string[]): string {
  // Initialize if needed
  initProxyStats(proxies);
  
  // Get current time
  const now = Date.now();
  
  // Find the proxy with the best success rate that hasn't been used recently
  let bestProxy = proxies[0];
  let bestScore = -1;
  
  for (const proxy of proxies) {
    const stats = proxyStats[proxy];
    const successRate = stats.success / (stats.success + stats.failure + 1);
    const timeSinceLastUse = now - stats.lastUsed;
    
    // Calculate a score based on success rate and time since last use
    // This helps distribute requests and favor successful proxies
    const score = successRate + (timeSinceLastUse / 60000); // Add 1 point per minute since last use
    
    if (score > bestScore) {
      bestScore = score;
      bestProxy = proxy;
    }
  }
  
  // Mark this proxy as used
  proxyStats[bestProxy].lastUsed = now;
  return bestProxy;
}

// Update stats after a proxy attempt
export function updateProxyStats(proxy: string, success: boolean): void {
  if (proxyStats[proxy]) {
    if (success) {
      proxyStats[proxy].success += 1;
    } else {
      proxyStats[proxy].failure += 1;
    }
  }
}

// Get proxy for a specific platform scraper
export function getProxyForPlatform(proxies: string[], platform: string): string {
  // Use localStorage to remember which proxy worked best for each platform
  try {
    const key = `proxy_${platform.toLowerCase().replace(/\s+/g, '_')}`;
    const storedProxy = localStorage.getItem(key);
    
    if (storedProxy && proxies.includes(storedProxy)) {
      return storedProxy;
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Fall back to best proxy
  return getBestProxy(proxies);
}

// Track rate limited proxies
const rateLimitedProxies: Record<string, number> = {};

// Mark a proxy as rate limited (with expiration time)
export function markProxyRateLimited(proxy: string): void {
  // Rate limit for 2 minutes
  rateLimitedProxies[proxy] = Date.now() + 2 * 60 * 1000;
}

// Check if a proxy is currently rate limited
export function isProxyRateLimited(proxy: string): boolean {
  const expiry = rateLimitedProxies[proxy];
  if (!expiry) return false;
  
  // If the rate limit has expired, clear it and return false
  if (Date.now() > expiry) {
    delete rateLimitedProxies[proxy];
    return false;
  }
  
  return true;
}

// Get a non-rate-limited proxy
export function getNonRateLimitedProxy(proxies: string[]): string | null {
  // Initialize if needed
  initProxyStats(proxies);
  
  // Filter out rate limited proxies
  const availableProxies = proxies.filter(p => !isProxyRateLimited(p));
  
  if (availableProxies.length === 0) {
    // All proxies are rate limited, get the one that will be available soonest
    const soonestAvailable = proxies.reduce((best, current) => {
      if (!best) return current;
      return rateLimitedProxies[current] < rateLimitedProxies[best] ? current : best;
    }, null as string | null);
    
    return soonestAvailable;
  }
  
  // Get the best non-rate-limited proxy
  let bestProxy = availableProxies[0];
  let bestScore = -1;
  
  for (const proxy of availableProxies) {
    const stats = proxyStats[proxy];
    const successRate = stats.success / (stats.success + stats.failure + 1);
    const timeSinceLastUse = Date.now() - stats.lastUsed;
    
    // Calculate a score based on success rate and time since last use
    const score = successRate + (timeSinceLastUse / 60000); // Add 1 point per minute since last use
    
    if (score > bestScore) {
      bestScore = score;
      bestProxy = proxy;
    }
  }
  
  // Mark this proxy as used
  proxyStats[bestProxy].lastUsed = Date.now();
  return bestProxy;
}

// Find alternative proxies that are not the given one
export function getAlternativeProxies(proxies: string[], currentProxy: string): string[] {
  return proxies.filter(p => p !== currentProxy).sort((a, b) => {
    // If we have stats, sort by success rate
    if (proxyStats[a] && proxyStats[b]) {
      const aSuccessRate = proxyStats[a].success / (proxyStats[a].success + proxyStats[a].failure + 1);
      const bSuccessRate = proxyStats[b].success / (proxyStats[b].success + proxyStats[b].failure + 1);
      return bSuccessRate - aSuccessRate; // Higher success rate first
    }
    return 0; // Keep original order if no stats
  });
}

// Save successful proxy for a platform
export function saveProxyForPlatform(proxy: string, platform: string, success: boolean): void {
  try {
    updateProxyStats(proxy, success);
    
    if (success) {
      const key = `proxy_${platform.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.setItem(key, proxy);
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}
