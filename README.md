# PricePulse AI Tracker

## Description

PricePulse AI Tracker is a sophisticated price tracking and product information tool for Amazon products. It uses advanced web scraping techniques with multiple fallback mechanisms to reliably extract product data, even when faced with common web scraping challenges.

## Features

- Extract product data from Amazon URLs
- Monitor price changes over time
- Compare prices across multiple e-commerce platforms (Amazon, Flipkart, BigBasket, etc.)
- AI-enhanced product metadata extraction
- Resilient web scraping with proxy rotation and rate limit handling
- Caching system to reduce unnecessary scraping requests
- Server-side scraping API to handle CORS and anti-bot measures
- Platform-specific scraping strategies for better success rates
- OpenAI integration for intelligent product data extraction

## Technical Architecture

### Scraping Service Architecture

The scraping service uses a multi-layered approach for maximum reliability:

1. **Primary Method**: Server-side scraping API endpoints (bypasses CORS and fingerprinting)
2. **Fallback Method 1**: Oxylabs API for real-time scraping (professional service)
3. **Fallback Method 2**: Platform-specific scraping strategies with specialized techniques
4. **Fallback Method 3**: Standard proxy rotation with comprehensive error handling
5. **Last Resort**: Mock data when all scraping methods fail

### AI Integration

The application uses OpenAI's API to enhance product data:

1. **Metadata Extraction**: Extracts detailed product information like brand, model, specifications
2. **Feature Identification**: Intelligently identifies key product features from descriptions
3. **Smart Categorization**: Categorizes products accurately based on titles and descriptions
4. **Robust Error Handling**: Provides specific error messages for API issues (rate limits, authentication)
5. **Advanced Fallback System**: Falls back to sophisticated pattern matching if the API is unavailable

The AI integration uses:
- Specialized system prompts to guide the extraction process
- The cost-effective `gpt-4o-mini` model for production use
- Environment variables for secure API key management
- Response validation to ensure data quality

### Key Components

- **Proxy Management System**
  - Proxy rotation based on success rates and platform-specific performance
  - Rate limit detection and temporary avoidance
  - Success/failure tracking to optimize proxy selection

- **Caching System**
  - Local storage caching with TTL (time-to-live)
  - Separate caches for product data and price comparisons
  - Automatic cache cleanup to prevent storage issues

- **User Agent Rotation**
  - Realistic browser user-agents
  - Platform-specific headers to mimic legitimate browsers
  - Randomization to avoid detection

- **Specialized Scraping Strategies**
  - Amazon-specific techniques for dealing with sophisticated bot protection
  - Customized strategies for JavaScript-heavy sites
  - Flexible approach based on site characteristics

### Error Handling

The system implements comprehensive error handling:
- Captcha detection and avoidance
- Rate limit detection with exponential backoff
- Detection of various types of blocks (IP, country, bot detection)
- Graceful degradation through multiple fallback layers

## Setup and Usage

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pricepulse-ai-tracker.git
   cd pricepulse-ai-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   OXYLABS_USERNAME=your_oxylabs_username
   OXYLABS_PASSWORD=your_oxylabs_password
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

PricePulse AI Tracker is designed to be deployed on Vercel, which supports serverless functions (API routes) for server-side scraping.

### Deploy to Vercel

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Run the deployment script:
   ```bash
   npm run deploy
   ```

   This script will:
   - Build the application
   - Ask for necessary environment variables
   - Deploy to Vercel with the proper configuration

3. Alternative manual deployment:
   ```bash
   vercel --prod
   ```

### Environment Variables

Make sure to set these environment variables in your Vercel project:

- `OXYLABS_USERNAME`: Your Oxylabs API username
- `OXYLABS_PASSWORD`: Your Oxylabs API password  
- `OPENAI_API_KEY`: (Optional) Your OpenAI API key for metadata enhancement

## Troubleshooting

### Common Issues

1. **Scraping fails in production but works in development**
   - This is usually due to CORS or anti-bot measures. The application uses server-side API endpoints to bypass these issues.
   - Make sure your Vercel deployment has the required environment variables.

2. **"No results found" error when searching for products**
   - Try using more specific search terms
   - Check if the server-side API endpoints are working properly
   - Verify your Oxylabs credentials if you're using the Oxylabs API

3. **Slow performance when scraping**
   - The application uses caching to improve performance
   - First requests may be slow as they need to scrape data
   - Subsequent requests for the same product will be faster

4. **Error: "Failed to load resource: net::ERR_BLOCKED_BY_CLIENT"**
   - Some ad blockers may block proxy requests
   - Temporarily disable ad blockers or add exceptions for the application
   
5. **Price comparison not working**
   - The price comparison uses different scraping techniques for different platforms
   - Try searching with both the product name and brand for better results

### Debugging Tips

- Check the browser console for detailed error messages
- Look for error responses from the server-side API endpoints
- Verify network requests to ensure they're not being blocked
- Use the built-in debugging tools in the code (verbose logging)

## Technical Requirements

- Node.js 16+
- Modern browser with ES2020+ support
- [Add additional requirements]

## Development

[TODO: Add development setup instructions]

## License

[TODO: Add license information]
