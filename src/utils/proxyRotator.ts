/**
 * Advanced proxy rotation system for managing and optimizing proxy usage
 * Implements intelligent proxy selection, health monitoring, and adaptive timeout management
 */

// Store proxy performance data
interface ProxyStats {
  successCount: number;
  failureCount: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  averageResponseTime: number;
  responseTimeData: number[];
  rateLimitedUntil: Date | null;
  blockedPatterns: {
    platform: string;
    reason: string;
    timestamp: Date;
  }[];
  successRate: number; // Calculated field
}

// Track proxy usage across platforms
interface PlatformProxyMap {
  [platform: string]: {
    bestProxy: string;
    lastUsed: Date;
    successRate: number;
  };
}

// Store proxy performance statistics
const proxyStats: Record<string, ProxyStats> = {};

// Store platform-specific proxy preferences
const platformProxyMap: PlatformProxyMap = {};

// Initialize proxy stats for a list of proxies
export function initializeProxies(proxies: string[]): void {
  proxies.forEach(proxy => {
    if (!proxyStats[proxy]) {
      proxyStats[proxy] = {
        successCount: 0,
        failureCount: 0,
        lastSuccess: null,
        lastFailure: null,
        averageResponseTime: 0,
        responseTimeData: [],
        rateLimitedUntil: null,
        blockedPatterns: [],
        successRate: 0
      };
    }
  });
}

/**
 * Record a successful proxy use with response time
 */
export function recordProxySuccess(proxy: string, responseTime: number, platform?: string): void {
  if (!proxyStats[proxy]) {
    initializeProxies([proxy]);
  }
  
  const stats = proxyStats[proxy];
  stats.successCount++;
  stats.lastSuccess = new Date();
  
  // Update response time data (keep last 10 response times)
  stats.responseTimeData.push(responseTime);
  if (stats.responseTimeData.length > 10) {
    stats.responseTimeData.shift();
  }
  
  // Calculate average response time
  stats.averageResponseTime = 
    stats.responseTimeData.reduce((sum, time) => sum + time, 0) / stats.responseTimeData.length;
  
  // Calculate success rate
  const totalRequests = stats.successCount + stats.failureCount;
  stats.successRate = totalRequests > 0 ? (stats.successCount / totalRequests) : 0;
  
  // If this was for a specific platform, update the platform-proxy map
  if (platform) {
    platformProxyMap[platform] = platformProxyMap[platform] || {
      bestProxy: proxy,
      lastUsed: new Date(),
      successRate: 0
    };
    
    const platformData = platformProxyMap[platform];
    if (stats.successRate > platformData.successRate) {
      platformData.bestProxy = proxy;
      platformData.successRate = stats.successRate;
    }
    platformData.lastUsed = new Date();
  }
}

/**
 * Record a proxy failure with detailed failure reason
 */
export function recordProxyFailure(
  proxy: string, 
  platform?: string, 
  reason?: string, 
  statusCode?: number
): void {
  if (!proxyStats[proxy]) {
    initializeProxies([proxy]);
  }
  
  const stats = proxyStats[proxy];
  stats.failureCount++;
  stats.lastFailure = new Date();
  
  // Calculate success rate
  const totalRequests = stats.successCount + stats.failureCount;
  stats.successRate = totalRequests > 0 ? (stats.successCount / totalRequests) : 0;
  
  // Record specific failure patterns for analysis
  if (platform && reason) {
    stats.blockedPatterns.push({
      platform,
      reason: statusCode ? `${reason} (${statusCode})` : reason,
      timestamp: new Date()
    });
    
    // Limit the size of the blockedPatterns array to avoid memory issues
    if (stats.blockedPatterns.length > 20) {
      stats.blockedPatterns.shift();
    }
    
    // Detect common rate limiting patterns
    const isRateLimited = 
      (statusCode === 429 || statusCode === 403) || 
      (reason.includes('rate limit') || 
       reason.includes('captcha') || 
       reason.includes('blocked') || 
       reason.includes('forbidden'));
    
    if (isRateLimited) {
      markProxyRateLimited(proxy, platform);
    }
  }
}

/**
 * Mark a proxy as rate limited for a certain period
 * The duration increases with repeated rate limits to implement exponential backoff
 */
export function markProxyRateLimited(proxy: string, platform?: string): void {
  if (!proxyStats[proxy]) {
    initializeProxies([proxy]);
  }
  
  const stats = proxyStats[proxy];
  const now = new Date();
  
  // Count recent rate limits (in last 30 minutes) to implement exponential backoff
  const recentRateLimits = stats.blockedPatterns.filter(bp => 
    bp.reason.includes('rate limit') || 
    bp.reason.includes('captcha') || 
    bp.reason.includes('blocked') &&
    (now.getTime() - bp.timestamp.getTime() < 30 * 60 * 1000)
  ).length;
  
  // Calculate backoff time: 2^n minutes (1 min, 2 min, 4 min, 8 min, etc.)
  // With a max of 2 hours
  const backoffMinutes = Math.min(Math.pow(2, recentRateLimits), 120);
  const backoffMs = backoffMinutes * 60 * 1000;
  
  // Set rate limited until timestamp
  const rateLimitedUntil = new Date(now.getTime() + backoffMs);
  stats.rateLimitedUntil = rateLimitedUntil;
  
  console.log(`Proxy ${proxy} rate limited for ${backoffMinutes} minutes until ${rateLimitedUntil}`);
  
  // If this was for a specific platform, update the platform-proxy map to avoid this proxy
  if (platform && platformProxyMap[platform] && platformProxyMap[platform].bestProxy === proxy) {
    // Find alternative proxy for this platform
    const alternatives = Object.keys(proxyStats).filter(p => 
      p !== proxy && 
      (!proxyStats[p].rateLimitedUntil || proxyStats[p].rateLimitedUntil < now)
    );
    
    if (alternatives.length > 0) {
      // Sort by success rate (descending)
      alternatives.sort((a, b) => proxyStats[b].successRate - proxyStats[a].successRate);
      platformProxyMap[platform].bestProxy = alternatives[0];
    }
  }
}

/**
 * Check if a proxy is currently rate limited
 */
export function isProxyRateLimited(proxy: string): boolean {
  if (!proxyStats[proxy]) {
    return false;
  }
  
  const stats = proxyStats[proxy];
  if (!stats.rateLimitedUntil) {
    return false;
  }
  
  return stats.rateLimitedUntil > new Date();
}

/**
 * Get the best proxy for a specific platform
 */
export function getBestProxyForPlatform(proxies: string[], platform: string): string {
  // First, check if we have a good proxy for this platform that isn't rate limited
  if (platformProxyMap[platform]) {
    const bestProxy = platformProxyMap[platform].bestProxy;
    if (!isProxyRateLimited(bestProxy)) {
      return bestProxy;
    }
  }
  
  // Otherwise, find the best available proxy
  return getBestAvailableProxy(proxies);
}

/**
 * Get the best available proxy that isn't rate limited
 */
export function getBestAvailableProxy(proxies: string[]): string {
  // Initialize proxies if needed
  initializeProxies(proxies);
  
  const now = new Date();
  
  // Filter out rate-limited proxies
  const availableProxies = proxies.filter(proxy => 
    !proxyStats[proxy].rateLimitedUntil || proxyStats[proxy].rateLimitedUntil < now
  );
  
  if (availableProxies.length === 0) {
    // If all are rate limited, return the one that will be available soonest
    return proxies.sort((a, b) => {
      const timeA = proxyStats[a].rateLimitedUntil?.getTime() || 0;
      const timeB = proxyStats[b].rateLimitedUntil?.getTime() || 0;
      return timeA - timeB;
    })[0];
  }
  
  // Score each proxy based on success rate and response time
  const scoredProxies = availableProxies.map(proxy => {
    const stats = proxyStats[proxy];
    
    // Calculate a score (0-100) for this proxy
    // 70% weight to success rate, 30% weight to response time
    const successScore = stats.successRate * 70;
    
    // Response time score (lower is better)
    // Map response times to a 0-30 scale
    // If no response data, use a default score of 15
    let responseTimeScore = 15;
    if (stats.responseTimeData.length > 0) {
      // Assume response times from 500ms (best) to 5000ms (worst)
      const avgTime = stats.averageResponseTime || 2000;
      const normalizedTime = Math.max(0, Math.min(30, 30 - (avgTime - 500) / 150));
      responseTimeScore = normalizedTime;
    }
    
    // Add bonus points for recent successes
    let recencyBonus = 0;
    if (stats.lastSuccess) {
      const minutesSinceLastSuccess = (now.getTime() - stats.lastSuccess.getTime()) / (60 * 1000);
      if (minutesSinceLastSuccess < 30) {
        recencyBonus = 10 * (1 - (minutesSinceLastSuccess / 30));
      }
    }
    
    return {
      proxy,
      score: successScore + responseTimeScore + recencyBonus
    };
  });
  
  // Sort by score (highest first)
  scoredProxies.sort((a, b) => b.score - a.score);
  
  // Return the highest-scoring proxy
  return scoredProxies[0].proxy;
}

/**
 * Calculate adaptive timeout for a proxy based on its performance history
 */
export function getAdaptiveTimeout(proxy: string, baseTimeout: number = 20000): number {
  if (!proxyStats[proxy]) {
    return baseTimeout;
  }
  
  const stats = proxyStats[proxy];
  
  // If no response time data, use base timeout
  if (stats.responseTimeData.length === 0) {
    return baseTimeout;
  }
  
  // Calculate average response time plus a buffer
  // Buffer is larger if the response times are more variable
  const avgTime = stats.averageResponseTime;
  
  // Calculate standard deviation to measure variability
  const mean = avgTime;
  const variance = stats.responseTimeData.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / 
                  stats.responseTimeData.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate timeout: average + 2 standard deviations, with minimum and maximum bounds
  const calculatedTimeout = avgTime + (stdDev * 2);
  
  // Ensure timeout is between 10 seconds and 40 seconds
  return Math.max(10000, Math.min(40000, calculatedTimeout));
}

/**
 * Get all available proxies for a platform that aren't rate limited
 */
export function getAvailableProxiesForPlatform(proxies: string[], platform: string): string[] {
  initializeProxies(proxies);
  
  const now = new Date();
  
  // Filter out rate-limited proxies
  return proxies.filter(proxy => 
    !proxyStats[proxy].rateLimitedUntil || proxyStats[proxy].rateLimitedUntil < now
  );
}

/**
 * Get proxy statistics for diagnostics and debugging
 */
export function getProxyStatistics(): Record<string, Omit<ProxyStats, 'responseTimeData' | 'blockedPatterns'>> {
  const result: Record<string, any> = {};
  
  for (const [proxy, stats] of Object.entries(proxyStats)) {
    result[proxy] = {
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      lastSuccess: stats.lastSuccess,
      lastFailure: stats.lastFailure,
      averageResponseTime: stats.averageResponseTime,
      rateLimitedUntil: stats.rateLimitedUntil,
      successRate: stats.successRate,
      blockedPlatforms: stats.blockedPatterns.map(bp => bp.platform)
        .filter((value, index, self) => self.indexOf(value) === index) // unique values
    };
  }
  
  return result;
}
