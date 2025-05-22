# PricePulse AI Tracker

## Description

PricePulse AI Tracker is a sophisticated price tracking and product information tool for Amazon products. It uses advanced web scraping techniques with multiple fallback mechanisms to reliably extract product data, even when faced with common web scraping challenges.

## Features

- Extract product data from Amazon URLs
- Monitor price changes over time
- Compare prices across multiple e-commerce platforms
- AI-enhanced product metadata extraction
- Resilient web scraping with proxy rotation and rate limit handling
- Caching system to reduce unnecessary scraping requests
- Server-side scraping fallback for handling CORS and anti-bot measures
- Platform-specific scraping strategies for better success rates
- OpenAI integration for intelligent product data extraction

## Technical Architecture

### Scraping Service Architecture

The scraping service uses a multi-layered approach for maximum reliability:

1. **Primary Method**: Oxylabs API for real-time scraping (professional service)
2. **Fallback Method 1**: Platform-specific scraping strategies with specialized techniques
3. **Fallback Method 2**: Standard proxy rotation with comprehensive error handling
4. **Fallback Method 3**: Server-side scraping to bypass CORS and browser fingerprinting
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
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Testing the OpenAI Integration

To test the OpenAI integration specifically:
```bash
npm run test:openai:direct
```

This will run a script that tests the OpenAI API with sample product information.

## Technical Requirements

- Node.js 16+
- Modern browser with ES2020+ support
- [Add additional requirements]

## Development

[TODO: Add development setup instructions]

## License

[TODO: Add license information]
