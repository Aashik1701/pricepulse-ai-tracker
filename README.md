# PricePulse AI Tracker

PricePulse is an advanced e-commerce price tracking and comparison application that helps users find the best deals across multiple platforms.

## Key Features

- Track product prices from Amazon, Flipkart, BigBasket, Myntra, and more
- Compare prices across multiple e-commerce platforms
- Set up price drop alerts and notifications
- Secure user authentication via Supabase
- Server-side scraping to bypass CORS limitations
- Robust error monitoring and reporting system

## System Architecture

The application uses a multi-layered approach to e-commerce data extraction:

1. **Server-side API Endpoints**: The primary method for scraping product data
   - `/api/scrape.js` - Amazon product data extraction
   - `/api/compare.js` - Multi-platform price comparison (Amazon, Flipkart, BigBasket, Myntra)
   - `/api/errors.js` - Error monitoring and reporting

2. **Client-side Fallbacks**: Used when server-side scraping is unavailable
   - Browser-based scraping with proxy rotation
   - CORS proxy integration

3. **Data Processing**: Sophisticated parsing of e-commerce data
   - JSON-LD extraction
   - HTML parsing with cheerio
   - Price and metadata normalization

## Deployment

### Prerequisites

- Node.js 16+
- Vercel CLI (optional for deployment)
- Supabase account
- OXYLABS account (recommended for premium proxy access)

### Environment Variables

Create a `.env` file with the following variables:

```
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key

# OpenAI API (optional)
VITE_OPENAI_API_KEY=your_openai_api_key

# Scraping Configuration
OXYLABS_USERNAME=your_oxylabs_username
OXYLABS_PASSWORD=your_oxylabs_password
PREFER_SERVER_SCRAPING=true

# Admin Access
ADMIN_API_KEY=your_secure_admin_key
```

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment to Vercel

The easiest way to deploy is using our deployment script:

```bash
# Run the deployment helper
npm run deploy
```

This script will:
1. Check for Vercel CLI and install if needed
2. Configure necessary environment variables
3. Build the application
4. Deploy to Vercel

Alternatively, you can deploy manually:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

## Error Monitoring

PricePulse includes a robust error monitoring system:

1. Access the Admin Dashboard at `/admin` (admin users only)
2. View detailed error logs with contextual information
3. Clear error logs when issues are resolved

## Supported E-commerce Platforms

The application currently supports price comparison across the following platforms:

1. **Amazon India** - Comprehensive product data extraction
2. **Flipkart** - India's leading e-commerce platform
3. **BigBasket** - Grocery and household items
4. **Myntra** - Fashion and apparel products

## Troubleshooting

### Common Issues

1. **CORS errors during development**: Ensure the proxy settings are correctly configured
2. **Supabase authentication issues**: Verify your Supabase URL and key
3. **Scraping fails**: Some websites have strong anti-bot protections. Try using premium proxies

### Getting Help

If you encounter issues, check:
1. The error logs in the Admin Dashboard
2. Vercel deployment logs
3. Browser console for client-side errors

## License

This project is proprietary software. All rights reserved.

## Future Enhancements

1. Add support for more e-commerce platforms (Amazon Global, Nykaa, Croma)
2. Implement price history charts and analytics
3. Add email notifications for price drops
4. Develop a mobile app version
5. Integrate with additional payment gateways