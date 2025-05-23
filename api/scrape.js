import axios from 'axios';
import * as cheerio from 'cheerio';

// Function to extract ASIN from the URL
const extractASIN = (url) => {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split('/');
    
    // Example path: /dp/B08L5TNJHG/
    const dpIndex = pathParts.indexOf('dp');
    if (dpIndex !== -1 && dpIndex + 1 < pathParts.length) {
      return pathParts[dpIndex + 1];
    }
    
    // Check for product ID in query parameters
    const productId = parsedUrl.searchParams.get('psc');
    if (productId) return productId;
    
    // Fallback - try to find any 10-character alphanumeric string that looks like an ASIN
    const asinMatch = url.match(/[A-Z0-9]{10}/);
    return asinMatch ? asinMatch[0] : null;
  } catch {
    return null;
  }
};

// Function to scrape Amazon product data
const scrapeAmazonProduct = async (url) => {
  try {
    // Extract the ASIN from the URL
    const asin = extractASIN(url);
    if (!asin) {
      return {
        error: 'Could not extract product ID from the URL'
      };
    }
    
    // Make the request to Amazon with appropriate headers to avoid detection
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 30000 // 30 second timeout
    });
    
    // Parse the HTML with cheerio
    const $ = cheerio.load(response.data);
    
    // Extract product details
    const name = $('#productTitle').text().trim();
    
    // Extract image URL
    let imageUrl = '';
    const imageSelectors = [
      '#landingImage',
      '#imgBlkFront',
      '#img-canvas img',
      '.a-dynamic-image',
      '#main-image',
      '.a-stretch-horizontal img'
    ];
    
    for (const selector of imageSelectors) {
      const img = $(selector);
      if (img.length > 0) {
        imageUrl = img.attr('src') || img.attr('data-old-hires') || img.attr('data-a-dynamic-image');
        if (imageUrl && imageUrl.startsWith('{')) {
          // Handle the case where the image URL is stored as a JSON string
          try {
            const imageObj = JSON.parse(imageUrl);
            imageUrl = Object.keys(imageObj)[0];
          } catch (e) {
            console.error('Error parsing image JSON:', e);
          }
        }
        if (imageUrl) break;
      }
    }
    
    // Extract price information
    let currentPrice = 0;
    let previousPrice = 0;
    let currency = '₹';
    
    // Current price selectors
    const priceSelectors = [
      '.a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-price-whole',
      '.a-price',
      '.a-color-price',
      '#price_inside_buybox',
      '#corePrice_feature_div .a-offscreen',
      '.priceToPay .a-offscreen'
    ];
    
    // Previous price selectors
    const previousPriceSelectors = [
      '.a-price.a-text-price .a-offscreen',
      '.a-text-strike',
      '.a-text-price .a-offscreen',
      '.a-price.a-text-price[data-a-strike=true] .a-offscreen',
      '#listPrice',
      '#priceblock_saleprice',
      '.priceBlockStrikePriceString'
    ];
    
    // Extract current price
    for (const selector of priceSelectors) {
      const priceEl = $(selector).first();
      if (priceEl.length > 0) {
        const priceText = priceEl.text().trim();
        // Extract the price and currency
        const priceMatch = priceText.match(/([₹$€£])?(\d+[,\d]*\.?\d*)/);
        if (priceMatch) {
          if (priceMatch[1]) {
            currency = priceMatch[1];
          }
          currentPrice = parseFloat(priceMatch[2].replace(/,/g, ''));
          break;
        }
      }
    }
    
    // Extract previous price
    for (const selector of previousPriceSelectors) {
      const priceEl = $(selector).first();
      if (priceEl.length > 0) {
        const priceText = priceEl.text().trim();
        // Extract the price
        const priceMatch = priceText.match(/(\d+[,\d]*\.?\d*)/);
        if (priceMatch) {
          previousPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
          break;
        }
      }
    }
    
    // Extract metadata
    const brand = $('#bylineInfo').text().trim() || '';
    
    // Extract bullet points
    const features = [];
    $('#feature-bullets li').each((_, el) => {
      const text = $(el).text().trim();
      if (text) features.push(text);
    });
    
    // Extract category
    let category = '';
    $('#wayfinding-breadcrumbs_container li').each((_, el) => {
      category = $(el).text().trim();
    });
    
    // Return the scraped data
    return {
      name: name || `Amazon Product (${asin})`,
      imageUrl,
      currentPrice: currentPrice || 0,
      previousPrice: previousPrice || 0,
      currency,
      asin,
      url,
      metadata: {
        brand: brand.replace(/^(Visit the |Brand: )/i, '').trim() || 'Unknown',
        model: '',
        category,
        features: features.length > 0 ? features : ['Product information could not be retrieved completely']
      },
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error scraping Amazon product:', error);
    return {
      error: 'Failed to scrape product data',
      details: error.message
    };
  }
};

// API endpoint
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
    // Get the Amazon URL from the query or body
    const url = req.query.url || (req.body && req.body.url);
    
    if (!url) {
      return res.status(400).json({ error: 'No URL provided' });
    }
    
    // Check if the URL is from Amazon
    if (!url.includes('amazon')) {
      return res.status(400).json({ error: 'Only Amazon URLs are supported' });
    }
    
    // Scrape the product data
    const productData = await scrapeAmazonProduct(url);
    
    // Return the data
    if (productData.error) {
      return res.status(500).json(productData);
    } else {
      return res.status(200).json(productData);
    }
  } catch (error) {
    console.error('Error in API handler:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
