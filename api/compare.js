import axios from 'axios';
import * as cheerio from 'cheerio';

// Function to compare prices across different platforms
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the product name from the query or body
    const productName = req.query.productName || (req.body && req.body.productName);
    const asin = req.query.asin || (req.body && req.body.asin);
    
    if (!productName && !asin) {
      return res.status(400).json({ error: 'No product name or ASIN provided' });
    }
    
    // Build an array of promises for different platforms
    const platformPromises = [];
    
    // Amazon search
    if (productName) {
      platformPromises.push(searchAmazon(productName));
    }
    
    // Flipkart search
    if (productName) {
      platformPromises.push(searchFlipkart(productName));
    }
    
    // BigBasket search
    if (productName) {
      platformPromises.push(searchBigBasket(productName));
    }
    
    // Execute all promises in parallel
    const results = await Promise.allSettled(platformPromises);
    
    // Process results
    const comparisonItems = [];
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        if (Array.isArray(result.value)) {
          comparisonItems.push(...result.value);
        } else {
          comparisonItems.push(result.value);
        }
      }
    });
    
    // Sort by price
    comparisonItems.sort((a, b) => a.price - b.price);
    
    // Mark the lowest price
    if (comparisonItems.length > 0) {
      comparisonItems[0].isLowestPrice = true;
    }
    
    return res.status(200).json(comparisonItems);
  } catch (error) {
    console.error('Error in price comparison API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Function to search for products on Amazon
async function searchAmazon(productName) {
  try {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Extract search results
    $('.s-result-item[data-asin]:not([data-asin=""])').each((i, el) => {
      if (i >= 3) return false; // Only take the first 3 results
      
      const asin = $(el).attr('data-asin');
      const name = $(el).find('h2 .a-link-normal').text().trim();
      const priceEl = $(el).find('.a-price .a-offscreen').first();
      let price = 0;
      let currency = '₹';
      
      if (priceEl.length > 0) {
        const priceText = priceEl.text().trim();
        const priceMatch = priceText.match(/([₹$€£])?(\d+[,\d]*\.?\d*)/);
        if (priceMatch) {
          if (priceMatch[1]) {
            currency = priceMatch[1];
          }
          price = parseFloat(priceMatch[2].replace(/,/g, ''));
        }
      }
      
      const url = 'https://www.amazon.in/dp/' + asin;
      
      if (name && price > 0) {
        results.push({
          marketplace: 'Amazon',
          productName: name,
          price,
          currency,
          url,
          lastUpdated: new Date(),
          inStock: true
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching Amazon:', error);
    return [];
  }
}

// Function to search for products on Flipkart
async function searchFlipkart(productName) {
  try {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Extract search results
    $('._1AtVbE').each((i, el) => {
      if (i >= 3) return false; // Only take the first 3 results
      
      const name = $(el).find('._4rR01T').text().trim() || $(el).find('.s1Q9rs').text().trim();
      const priceEl = $(el).find('._30jeq3');
      let price = 0;
      let currency = '₹';
      
      if (priceEl.length > 0) {
        const priceText = priceEl.text().trim();
        const priceMatch = priceText.match(/([₹$€£])?(\d+[,\d]*\.?\d*)/);
        if (priceMatch) {
          if (priceMatch[1]) {
            currency = priceMatch[1];
          }
          price = parseFloat(priceMatch[2].replace(/,/g, ''));
        }
      }
      
      const relativeUrl = $(el).find('a').attr('href');
      const url = relativeUrl ? `https://www.flipkart.com${relativeUrl}` : '';
      
      if (name && price > 0 && url) {
        results.push({
          marketplace: 'Flipkart',
          productName: name,
          price,
          currency,
          url,
          lastUpdated: new Date(),
          inStock: true
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching Flipkart:', error);
    return [];
  }
}

// Function to search for products on BigBasket
async function searchBigBasket(productName) {
  try {
    const searchUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(productName)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 30000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Extract search results
    $('.uiv2-list-box-img-block').each((i, el) => {
      if (i >= 3) return false; // Only take the first 3 results
      
      const name = $(el).find('.uiv2-list-box-img-title').text().trim();
      const priceEl = $(el).find('.discnt-price');
      let price = 0;
      let currency = '₹';
      
      if (priceEl.length > 0) {
        const priceText = priceEl.text().trim();
        const priceMatch = priceText.match(/([₹$€£])?(\d+[,\d]*\.?\d*)/);
        if (priceMatch) {
          if (priceMatch[1]) {
            currency = priceMatch[1];
          }
          price = parseFloat(priceMatch[2].replace(/,/g, ''));
        }
      }
      
      const relativeUrl = $(el).find('a').attr('href');
      const url = relativeUrl ? `https://www.bigbasket.com${relativeUrl}` : '';
      
      if (name && price > 0 && url) {
        results.push({
          marketplace: 'BigBasket',
          productName: name,
          price,
          currency,
          url,
          lastUpdated: new Date(),
          inStock: true
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching BigBasket:', error);
    return [];
  }
}
