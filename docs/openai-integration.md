# OpenAI Integration for PricePulse

## Setup Instructions

The PricePulse application uses OpenAI's API to enhance product metadata extraction. To enable this feature, you need to provide your own OpenAI API key.

### Step 1: Get an OpenAI API Key

1. Visit [OpenAI's platform](https://platform.openai.com/signup) and create an account if you don't already have one.
2. Navigate to the [API Keys section](https://platform.openai.com/api-keys) in your account.
3. Create a new API key and copy it.

### Step 2: Configure the Application

1. In the root directory of the PricePulse application, create a file named `.env` if it doesn't already exist.
2. Add your OpenAI API key to the file in the following format:
   ```
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
3. Replace `your_openai_api_key_here` with your actual API key.
4. Save the file.

### Step 3: Restart the Application

After adding your API key, restart the application for the changes to take effect:

```bash
npm run dev
```

## Feature Details

The OpenAI integration provides the following features:

- **Enhanced Metadata Extraction**: Extracts detailed product metadata from titles and descriptions
- **Smart Category Detection**: Intelligently determines product categories
- **Feature Identification**: Identifies key product features from descriptions
- **Spec Extraction**: Pulls out technical specifications like storage, RAM, processor, etc.

## Fallback Mechanism

If the OpenAI API call fails for any reason, the application will automatically fall back to a basic metadata extraction method that uses pattern matching to extract information. The fallback system handles:

- **API Key Issues**: Missing or invalid API keys
- **Rate Limiting**: When you've exceeded your OpenAI quota
- **Network Problems**: Connection issues to the OpenAI API
- **Service Outages**: When OpenAI's service is unavailable

The fallback extraction uses sophisticated regex patterns to identify:
- Brand names
- Model numbers
- Storage capacity
- RAM specifications
- Colors
- Product categories
- Key features from product descriptions

This ensures that the application continues to function even when AI-enhanced extraction is unavailable.

## Usage Costs

Be aware that using the OpenAI API incurs costs based on the number of tokens processed. The application uses the cost-effective `gpt-4o-mini` model to minimize expenses while maintaining good extraction quality.

## Privacy Considerations

The application sends product information (titles and descriptions) to OpenAI's API for processing. No user data or browsing history is shared. Please refer to OpenAI's privacy policy for more information on how they handle data.
