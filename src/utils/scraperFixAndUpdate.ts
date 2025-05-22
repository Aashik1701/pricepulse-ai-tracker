// This is a temporary file to help fix the scraper implementations
// Add these functions to scraperService.ts

/**
 * Helper function to extract text content from an element using a selector
 */
function extractTextContent(element: Element, selector: string): string {
  const targetElement = element.querySelector(selector);
  return targetElement?.textContent?.trim() || '';
}

/**
 * Scrape Meesho for product information
 * Enhanced with modern scraping techniques and better error handling
 */
async function scrapeMeesho(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.meesho.com/search?q=${encodeURIComponent(searchTerm)}`;
    console.log(`Scraping Meesho for: ${searchTerm}`);
    
    // First try: Use modern scraper service to extract embedded data (most reliable for client-side rendered pages)
    try {
      // Import the modern scraper service dynamically
      const { 
        fetchWithAdvancedHandling, 
        extractEmbeddedJsonData, 
        extractProductFromEmbeddedData 
      } = await import('./modernScraperService');
      
      console.log('Attempting to use modern scraper for Meesho');
      const proxyToUse = proxy || getBestAvailableProxy(CORS_PROXIES);
      
      // Use the advanced fetch with better error handling and response time tracking
      const fetchResult = await fetchWithAdvancedHandling(
        url,
        proxyToUse,
        {
          headers: getHeadersForSite('meesho')
        },
        'meesho'
      );
      
      if (fetchResult && fetchResult.html) {
        // Try to extract embedded JSON data from the page
        const extractedData = extractEmbeddedJsonData(fetchResult.html);
        
        if (!extractedData.error) {
          // Try to extract product information from the embedded data
          const productData = extractProductFromEmbeddedData(extractedData, 'meesho');
          
          if (productData) {
            console.log('Successfully extracted Meesho product data from embedded JSON');
            recordProxySuccess(proxyToUse, fetchResult.responseTime, 'meesho');
            return productData;
          }
        } else {
          console.log('Could not extract embedded data from Meesho:', extractedData.error);
        }
        
        // Fallback: Try to find product data in the Next.js data structure directly
        console.log('Trying to extract Meesho product data from Next.js data directly');
        const nextDataMatch = fetchResult.html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch && nextDataMatch[1]) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            let products = null;
            
            // Navigate through common Next.js data structures for Meesho
            if (nextData.props?.pageProps?.catalogList?.products) {
              products = nextData.props.pageProps.catalogList.products;
            } else if (nextData.props?.pageProps?.searchResults?.products) {
              products = nextData.props.pageProps.searchResults.products;
            } else if (nextData.props?.pageProps?.initialState?.search?.products) {
              products = nextData.props.pageProps.initialState.search.products;
            }
            
            if (products && products.length > 0) {
              const firstProduct = products[0];
              const productData = {
                marketplace: 'Meesho',
                productName: firstProduct.name || searchTerm,
                price: firstProduct.discountedPrice || firstProduct.price || 0,
                currency: '₹',
                url: `https://www.meesho.com/product/${firstProduct.slug || firstProduct.id}`,
                lastUpdated: new Date(),
                inStock: true
              };
              
              recordProxySuccess(proxyToUse, fetchResult.responseTime, 'meesho');
              return productData;
            }
          } catch (jsonError) {
            console.error('Error parsing Next.js data:', jsonError);
          }
        }
        
        // Fallback to HTML parsing if we couldn't extract data from embedded JSON
        console.log('Falling back to HTML parsing for Meesho');
        const parser = new DOMParser();
        const doc = parser.parseFromString(fetchResult.html, 'text/html');
        
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
        
        if (productCard) {
          // Extract product information from the card
          const productName = extractTextContent(productCard, '.product-name, .name, h4, [data-screenreader-value^="Product Name"]') || searchTerm;
          const priceText = extractTextContent(productCard, '.price, .product-price, .discounted-price, .actual-price');
          const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
          
          // Try to find the URL
          let productUrl = '';
          const linkElement = productCard.closest('a') || productCard.querySelector('a');
          if (linkElement && linkElement instanceof HTMLAnchorElement) {
            productUrl = linkElement.href;
          }
          
          if (productUrl && !productUrl.startsWith('http')) {
            productUrl = `https://www.meesho.com${productUrl.startsWith('/') ? productUrl : '/' + productUrl}`;
          }
          
          const productData = {
            marketplace: 'Meesho',
            productName,
            price,
            currency: '₹',
            url: productUrl || `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`,
            lastUpdated: new Date(),
            inStock: true
          };
          
          recordProxySuccess(proxyToUse, fetchResult.responseTime, 'meesho');
          return productData;
        }
      }
    } catch (error) {
      console.error('Error using modern scraper for Meesho:', error);
      if (proxy) {
        recordProxyFailure(proxy, 'meesho', error.message);
      }
    }
    
    // Second try: Use a different proxy and a simpler approach
    try {
      const fallbackProxy = getBestAvailableProxy(CORS_PROXIES);
      console.log(`Attempting fallback method for Meesho with proxy: ${fallbackProxy}`);
      
      const response = await fetch(`${fallbackProxy}${encodeURIComponent(url)}`, {
        headers: getHeadersForSite('meesho')
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Meesho results: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Return a basic result with the search term as product name
      return {
        marketplace: 'Meesho',
        productName: searchTerm,
        price: 0, // We couldn't determine the price
        currency: '₹',
        url: url,
        lastUpdated: new Date(),
        inStock: true
      };
    } catch (fallbackError) {
      console.error('Fallback method for Meesho also failed:', fallbackError);
      return null;
    }
  } catch (error) {
    console.error('Error scraping Meesho:', error);
    return null;
  }
}

/**
 * Scrape BigBasket for product information
 * Enhanced with modern scraping techniques and better error handling
 */
async function scrapeBigBasket(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(searchTerm)}`;
    console.log(`Scraping BigBasket for: ${searchTerm}`);
    
    // First try: Use modern scraper service to extract embedded data
    try {
      // Import the modern scraper service dynamically
      const { 
        fetchWithAdvancedHandling, 
        extractEmbeddedJsonData, 
        extractProductFromEmbeddedData 
      } = await import('./modernScraperService');
      
      console.log('Attempting to use modern scraper for BigBasket');
      const proxyToUse = proxy || getBestAvailableProxy(CORS_PROXIES);
      
      // Use the advanced fetch with better error handling
      const fetchResult = await fetchWithAdvancedHandling(
        url,
        proxyToUse,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          }
        },
        'bigbasket'
      );
      
      if (fetchResult && fetchResult.html) {
        // Try to extract embedded JSON data from the page
        const extractedData = extractEmbeddedJsonData(fetchResult.html);
        
        if (!extractedData.error) {
          // Try to extract product information from the embedded data
          const productData = extractProductFromEmbeddedData(extractedData, 'bigbasket');
          
          if (productData) {
            console.log('Successfully extracted BigBasket product data from embedded JSON');
            recordProxySuccess(proxyToUse, fetchResult.responseTime, 'bigbasket');
            return productData;
          }
        } else {
          console.log('Could not extract embedded data from BigBasket:', extractedData.error);
        }
        
        // Fallback to HTML parsing if embedded data extraction fails
        console.log('Falling back to HTML parsing for BigBasket');
        const parser = new DOMParser();
        const doc = parser.parseFromString(fetchResult.html, 'text/html');
        
        // Try multiple selectors for product cards - BigBasket frequently updates their UI
        const productCardSelectors = [
          '.items', 
          '.prod-view', 
          '.product-item',
          '.item-info',
          '.product-div',
          '[qa="product"]',
          '[data-qa="product"]'
        ];
        
        let productCard: Element | null = null;
        for (const selector of productCardSelectors) {
          const cards = doc.querySelectorAll(selector);
          if (cards.length > 0) {
            productCard = cards[0];
            break;
          }
        }
        
        if (productCard) {
          // Extract product information from the card
          const productName = extractTextContent(productCard, '.prod-name, .item-name, .product-name, h3, .product-title') || searchTerm;
          
          // Try different price selectors
          const priceSelectors = [
            '.discnt-price, .sp, .discounted-price',
            '.price, .current-price, .selling-price',
            '.mrp-price, .mrp, .original-price'
          ];
          
          let priceText = '';
          for (const selector of priceSelectors) {
            priceText = extractTextContent(productCard, selector);
            if (priceText) break;
          }
          
          const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
          
          // Try to find the URL
          let productUrl = '';
          const linkElement = productCard.closest('a') || productCard.querySelector('a');
          if (linkElement && linkElement instanceof HTMLAnchorElement) {
            productUrl = linkElement.href;
          }
          
          if (productUrl && !productUrl.startsWith('http')) {
            productUrl = `https://www.bigbasket.com${productUrl.startsWith('/') ? productUrl : '/' + productUrl}`;
          }
          
          const productData = {
            marketplace: 'BigBasket',
            productName,
            price,
            currency: '₹',
            url: productUrl || `https://www.bigbasket.com/ps/?q=${encodeURIComponent(productName)}`,
            lastUpdated: new Date(),
            inStock: true
          };
          
          recordProxySuccess(proxyToUse, fetchResult.responseTime, 'bigbasket');
          return productData;
        }
      }
    } catch (error) {
      console.error('Error using modern scraper for BigBasket:', error);
      if (proxy) {
        recordProxyFailure(proxy, 'bigbasket', error.message);
      }
    }
    
    // Second try: Use a different proxy and a simpler approach
    try {
      const fallbackProxy = getBestAvailableProxy(CORS_PROXIES);
      console.log(`Attempting fallback method for BigBasket with proxy: ${fallbackProxy}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      const response = await fetch(`${fallbackProxy}${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch BigBasket results: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check for security challenges
      if (html.includes('captcha') || html.includes('robot check') || html.includes('verify you are a human')) {
        console.log('Security challenge detected in BigBasket response');
        recordProxyFailure(fallbackProxy, 'bigbasket', 'Security challenge detected');
        throw new Error('Security challenge detected');
      }
      
      // Return a basic result with the search term as product name
      return {
        marketplace: 'BigBasket',
        productName: searchTerm,
        price: 0, // We couldn't determine the price
        currency: '₹',
        url: url,
        lastUpdated: new Date(),
        inStock: true
      };
    } catch (fallbackError) {
      console.error('Fallback method for BigBasket also failed:', fallbackError);
      return null;
    }
  } catch (error) {
    console.error('Error scraping BigBasket:', error);
    return null;
  }
}

/**
 * Scrape Swiggy Instamart for product information
 * Enhanced with modern scraping techniques and better error handling
 */
async function scrapeSwiggyInstamart(searchTerm: string, proxy?: string): Promise<PriceComparisonItem | null> {
  try {
    const url = `https://www.swiggy.com/search?query=${encodeURIComponent(searchTerm)}`;
    console.log(`Scraping Swiggy Instamart for: ${searchTerm}`);
    
    // First try: Use modern scraper service to extract embedded data
    try {
      // Import the modern scraper service dynamically
      const { 
        fetchWithAdvancedHandling, 
        extractEmbeddedJsonData, 
        extractProductFromEmbeddedData 
      } = await import('./modernScraperService');
      
      console.log('Attempting to use modern scraper for Swiggy Instamart');
      const proxyToUse = proxy || getBestAvailableProxy(CORS_PROXIES);
      
      // Use the advanced fetch with better error handling
      const fetchResult = await fetchWithAdvancedHandling(
        url,
        proxyToUse,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
            'Referer': 'https://www.google.com/'
          }
        },
        'swiggy'
      );
      
      if (fetchResult && fetchResult.html) {
        // Try to extract embedded JSON data from the page
        const extractedData = extractEmbeddedJsonData(fetchResult.html);
        
        if (!extractedData.error) {
          // Try to extract product information from the embedded data
          const productData = extractProductFromEmbeddedData(extractedData, 'swiggy');
          
          if (productData) {
            console.log('Successfully extracted Swiggy Instamart product data from embedded JSON');
            recordProxySuccess(proxyToUse, fetchResult.responseTime, 'swiggy');
            return productData;
          }
        } else {
          console.log('Could not extract embedded data from Swiggy Instamart:', extractedData.error);
        }
        
        // Try to extract data from Next.js data structure directly
        console.log('Trying to extract Swiggy product data from Next.js data directly');
        const nextDataMatch = fetchResult.html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
        if (nextDataMatch && nextDataMatch[1]) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            let products = null;
            
            // Navigate through common Next.js data structures for Swiggy
            if (nextData.props?.pageProps?.initialData?.products) {
              products = nextData.props.pageProps.initialData.products;
            } else if (nextData.props?.pageProps?.initialState?.instamart?.products) {
              products = nextData.props.pageProps.initialState.instamart.products;
            } else if (nextData.props?.pageProps?.initialState?.search?.results) {
              const searchResults = nextData.props.pageProps.initialState.search.results;
              // Find instamart products
              products = searchResults.filter(result => 
                result.type === 'INSTAMART_PRODUCT' || 
                result.type === 'GROCERY_PRODUCT'
              );
            }
            
            if (products && products.length > 0) {
              const firstProduct = products[0];
              const productData = {
                marketplace: 'Swiggy Instamart',
                productName: firstProduct.name || firstProduct.title || searchTerm,
                price: firstProduct.price || (firstProduct.variants && firstProduct.variants[0]?.price) || 0,
                currency: '₹',
                url: firstProduct.deeplink ? 
                  `https://www.swiggy.com${firstProduct.deeplink.startsWith('/') ? firstProduct.deeplink : '/' + firstProduct.deeplink}` :
                  url,
                lastUpdated: new Date(),
                inStock: firstProduct.availability !== false
              };
              
              recordProxySuccess(proxyToUse, fetchResult.responseTime, 'swiggy');
              return productData;
            }
          } catch (jsonError) {
            console.error('Error parsing Next.js data:', jsonError);
          }
        }
        
        // Fallback to HTML parsing if we couldn't extract data from embedded JSON
        console.log('Falling back to HTML parsing for Swiggy Instamart');
        const parser = new DOMParser();
        const doc = parser.parseFromString(fetchResult.html, 'text/html');
        
        // Try multiple selectors for Swiggy Instamart product cards
        const productCardSelectors = [
          '[data-testid="product-card"]',
          '.ProductCard',
          '.product-card',
          '.styles_container__1G042',
          '.styles_item__3_6YN',
          '.styles_itemContainer__3Vu6m'
        ];
        
        let productCard: Element | null = null;
        for (const selector of productCardSelectors) {
          const cards = doc.querySelectorAll(selector);
          if (cards.length > 0) {
            productCard = cards[0];
            break;
          }
        }
        
        if (productCard) {
          // Extract product information from the card
          const productName = extractTextContent(productCard, '.styles_itemName__hLfgz, .styles_itemNameText__3ZmZZ, .name, h3, h4') || searchTerm;
          const priceText = extractTextContent(productCard, '.styles_itemPrice__1Mj6L, .price, .rupee');
          const price = priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
          
          // Try to find the URL
          let productUrl = '';
          const linkElement = productCard.closest('a') || productCard.querySelector('a');
          if (linkElement && linkElement instanceof HTMLAnchorElement) {
            productUrl = linkElement.href;
          }
          
          if (productUrl && !productUrl.startsWith('http')) {
            productUrl = `https://www.swiggy.com${productUrl.startsWith('/') ? productUrl : '/' + productUrl}`;
          }
          
          const productData = {
            marketplace: 'Swiggy Instamart',
            productName,
            price,
            currency: '₹',
            url: productUrl || url,
            lastUpdated: new Date(),
            inStock: true
          };
          
          recordProxySuccess(proxyToUse, fetchResult.responseTime, 'swiggy');
          return productData;
        }
      }
    } catch (error) {
      console.error('Error using modern scraper for Swiggy Instamart:', error);
      if (proxy) {
        recordProxyFailure(proxy, 'swiggy', error.message);
      }
    }
    
    // Second try: Use a different proxy and a simpler approach
    try {
      const fallbackProxy = getBestAvailableProxy(CORS_PROXIES);
      console.log(`Attempting fallback method for Swiggy Instamart with proxy: ${fallbackProxy}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      const response = await fetch(`${fallbackProxy}${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
          'Referer': 'https://www.google.com/'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Swiggy Instamart results: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Check for security challenges
      if (html.includes('captcha') || html.includes('robot check') || html.includes('verify you are a human')) {
        console.log('Security challenge detected in Swiggy Instamart response');
        recordProxyFailure(fallbackProxy, 'swiggy', 'Security challenge detected');
        throw new Error('Security challenge detected');
      }
      
      // Return a basic result with the search term as product name
      return {
        marketplace: 'Swiggy Instamart',
        productName: searchTerm,
        price: 0, // We couldn't determine the price
        currency: '₹',
        url: url,
        lastUpdated: new Date(),
        inStock: true
      };
    } catch (fallbackError) {
      console.error('Fallback method for Swiggy Instamart also failed:', fallbackError);
      return null;
    }
  } catch (error) {
    console.error('Error scraping Swiggy Instamart:', error);
    return null;
  }
}
