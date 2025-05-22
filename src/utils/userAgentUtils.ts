/**
 * User agent rotation utilities to help bypass anti-scraping protections
 * Using different user agents can help avoid being detected as a bot
 */

// List of realistic user agents for different browsers and platforms
const USER_AGENTS = [
  // Chrome on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36',
  
  // Chrome on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
  
  // Firefox on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0',
  
  // Firefox on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:95.0) Gecko/20100101 Firefox/95.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:94.0) Gecko/20100101 Firefox/94.0',
  
  // Safari on macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
  
  // Edge on Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36 Edg/96.0.1054.62',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36 Edg/95.0.1020.53',
  
  // Mobile user agents
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36'
];

// Keep track of recently used user agents to avoid repeating too soon
const recentlyUsedAgents: string[] = [];
const MAX_RECENT_AGENTS = 5; // Don't reuse the 5 most recently used agents

/**
 * Get a random user agent that hasn't been used recently
 */
export function getRandomUserAgent(): string {
  // Filter out recently used agents
  const availableAgents = USER_AGENTS.filter(agent => !recentlyUsedAgents.includes(agent));
  
  // If all agents have been recently used, use any random one
  const agentPool = availableAgents.length > 0 ? availableAgents : USER_AGENTS;
  
  // Get random agent
  const randomIndex = Math.floor(Math.random() * agentPool.length);
  const selectedAgent = agentPool[randomIndex];
  
  // Add to recently used
  recentlyUsedAgents.push(selectedAgent);
  
  // Keep only the most recent ones
  if (recentlyUsedAgents.length > MAX_RECENT_AGENTS) {
    recentlyUsedAgents.shift(); // Remove the oldest
  }
  
  return selectedAgent;
}

/**
 * Get a user agent for a specific browser type
 */
export function getUserAgentByType(type: 'chrome' | 'firefox' | 'safari' | 'edge' | 'mobile'): string {
  let filteredAgents: string[] = [];
  
  switch (type) {
    case 'chrome':
      filteredAgents = USER_AGENTS.filter(agent => 
        agent.includes('Chrome') && !agent.includes('Edg') && !agent.includes('Mobile'));
      break;
    case 'firefox':
      filteredAgents = USER_AGENTS.filter(agent => agent.includes('Firefox'));
      break;
    case 'safari':
      filteredAgents = USER_AGENTS.filter(agent => 
        agent.includes('Safari') && !agent.includes('Chrome') && !agent.includes('Mobile'));
      break;
    case 'edge':
      filteredAgents = USER_AGENTS.filter(agent => agent.includes('Edg'));
      break;
    case 'mobile':
      filteredAgents = USER_AGENTS.filter(agent => agent.includes('Mobile'));
      break;
  }
  
  // If no matching agents found, return a random one
  if (filteredAgents.length === 0) {
    return getRandomUserAgent();
  }
  
  // Get random agent from filtered list
  const randomIndex = Math.floor(Math.random() * filteredAgents.length);
  return filteredAgents[randomIndex];
}

/**
 * Get headers that mimic a real browser
 * These headers can help avoid detection as a bot
 */
export function getRealisticHeaders(options: {
  userAgent?: string;
  referrer?: string;
  includeAcceptEncoding?: boolean;
} = {}): Record<string, string> {
  const userAgent = options.userAgent || getRandomUserAgent();
  const referrer = options.referrer || 'https://www.google.com/';
  
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': referrer,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };
  
  // Sometimes include accept-encoding (but not always, as it can trigger compression that fetch might not handle)
  if (options.includeAcceptEncoding) {
    headers['Accept-Encoding'] = 'gzip, deflate, br';
  }
  
  return headers;
}

/**
 * Get a complete set of headers specific for a particular website
 * Different sites may check for different headers
 */
export function getHeadersForSite(site: 'amazon' | 'flipkart' | 'meesho' | 'default'): Record<string, string> {
  switch (site) {
    case 'amazon':
      return {
        ...getRealisticHeaders({
          userAgent: getUserAgentByType(Math.random() > 0.7 ? 'mobile' : 'chrome'),
          referrer: 'https://www.google.com/search?q=amazon+products',
          includeAcceptEncoding: true
        }),
        'Cache-Control': 'max-age=0',
        'DNT': '1',
        'Connection': 'keep-alive'
      };
      
    case 'flipkart':
      return {
        ...getRealisticHeaders({
          userAgent: getUserAgentByType('chrome'),
          referrer: 'https://www.google.com/search?q=flipkart+products'
        })
      };
      
    case 'meesho':
      return {
        ...getRealisticHeaders({
          userAgent: getUserAgentByType(Math.random() > 0.5 ? 'mobile' : 'chrome'),
          referrer: 'https://www.google.com/search?q=meesho+products'
        })
      };
      
    default:
      return getRealisticHeaders();
  }
}
