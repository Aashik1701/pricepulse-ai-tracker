
// OpenAI integration for product metadata extraction
import { toast } from 'sonner';
import OpenAI from 'openai';
import { getOpenAIApiKey, isOpenAIConfigured } from '@/utils/envUtils';

// Initialize the OpenAI client with the API key from environment variables
let openai: OpenAI | null = null;

try {
  // Only initialize if the API key is configured
  if (isOpenAIConfigured()) {
    openai = new OpenAI({
      apiKey: getOpenAIApiKey(),
      dangerouslyAllowBrowser: true // Enable usage in browser environment
    });
  } else {
    console.warn('OpenAI API key is not configured. AI-enhanced metadata extraction will be unavailable.');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

interface ExtractedMetadata {
  brand?: string;
  model?: string;
  category?: string;
  features?: string[];
  color?: string;
  storage?: string;
  ram?: string;
  processor?: string;
  batteryLife?: string;
  dimensions?: string;
  weight?: string;
  resolution?: string;
  connectivity?: string[];
  [key: string]: unknown;
}

export const OpenAIService = {
  /**
   * Extract product metadata from product title and description
   * @param productTitle The title of the product
   * @param productDescription The description of the product (optional)
   * @returns Extracted metadata
   */
  extractProductMetadata: async (
    productTitle: string, 
    productDescription?: string
  ): Promise<ExtractedMetadata> => {
    console.log('Extracting metadata from:', productTitle, productDescription);
    
    // Validate inputs
    if (!productTitle || productTitle.trim() === '') {
      console.warn('Empty product title provided to metadata extraction');
      return {
        brand: "Unknown",
        category: "Unknown",
        features: []
      };
    }
    
    // Check if OpenAI client is properly initialized
    if (!openai || !isOpenAIConfigured()) {
      console.warn('OpenAI client not initialized or API key missing. Using fallback extraction.');
      return extractBasicMetadata(productTitle, productDescription);
    }
    
    try {
      // Show loading toast
      toast.info('Enhancing product data with AI...', {
        duration: 3000
      });
      
      // Build a better, more detailed prompt for the AI
      const systemPrompt = `
        You are a product information extraction specialist.
        Extract detailed structured metadata from the provided product information.
        Focus on these key attributes:
        - brand: The manufacturer or brand name
        - model: The specific model name/number
        - category: Product category (e.g., Electronics, Clothing, Home Appliance)
        - features: An array of key product features and specifications
        - color: Primary color(s) of the product
        - storage: Storage capacity if applicable (e.g., 128GB)
        - ram: RAM capacity if applicable (e.g., 8GB)
        - processor: Processor or CPU information if applicable
        - batteryLife: Battery specifications if applicable
        - dimensions: Physical dimensions if mentioned
        - weight: Product weight if mentioned
        - resolution: Display resolution if applicable
        - connectivity: Array of connectivity options (e.g., WiFi, Bluetooth, 5G)
        
        Return ONLY a valid JSON object with these attributes. 
        If information for a field is not available, omit that field entirely.
        For features, extract a comprehensive list, limit to max 8 most important features.
        Ensure all values are accurate - do not invent or guess details not present in the input.
      `;
      
      const userPrompt = `
        Product Title: ${productTitle}
        ${productDescription ? `Product Description: ${productDescription}` : ''}
      `;
      
      // Make the API call to OpenAI
      try {
        // Set a timeout for the API call
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('OpenAI API request timed out after 15 seconds')), 15000);
        });
        
        // Create the API call promise
        const apiCallPromise = openai.chat.completions.create({
          model: "gpt-4o-mini", // Using a cost-effective model that's still powerful
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1, // Low temperature for more deterministic results
          response_format: { type: "json_object" }
        });
        
        // Race the API call against the timeout
        const response = await Promise.race([apiCallPromise, timeoutPromise]);
        
        // Parse the response
        const responseContent = response.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty response from OpenAI API');
        }
        
        let metadata: ExtractedMetadata;
        try {
          metadata = JSON.parse(responseContent) as ExtractedMetadata;
          
          // Validate the parsed metadata to ensure it's properly structured
          if (typeof metadata !== 'object' || metadata === null) {
            throw new Error('Invalid metadata format: not an object');
          }
          
          // Normalize the metadata object to ensure consistent structure
          // Convert any null values to undefined
          Object.keys(metadata).forEach(key => {
            if (metadata[key] === null) {
              delete metadata[key];
            }
          });
          
          // Ensure features is always an array if present
          if (metadata.features && !Array.isArray(metadata.features)) {
            metadata.features = [String(metadata.features)];
          }
          
          // Success toast
          toast.success('Enhanced product data with AI');
          
          return metadata;
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError);
          console.log('Raw response content:', responseContent);
          throw new Error('Failed to parse metadata from OpenAI response');
        }
      } catch (apiError) {
        // If we hit rate limits or other API errors
        console.error('OpenAI API error:', apiError);
        
        // Handle specific error types
        let errorMessage = 'Unknown API error';
        let shouldRetry = false;
        
        if (apiError instanceof Error) {
          errorMessage = apiError.message;
          
          // Check for specific error conditions
          if (errorMessage.includes('429') || 
              errorMessage.includes('quota') || 
              errorMessage.includes('rate limit') || 
              errorMessage.includes('exceeded your current quota')) {
            toast.error('OpenAI rate limit reached. Using basic extraction instead.');
            shouldRetry = false; // No point retrying rate limit errors immediately
          } else if (errorMessage.includes('401') || 
                    errorMessage.includes('authentication') || 
                    errorMessage.includes('invalid api key')) {
            toast.error('OpenAI authentication failed. Check your API key.');
            shouldRetry = false; // Don't retry auth errors
          } else if (errorMessage.includes('timeout') || 
                    errorMessage.includes('timed out')) {
            toast.error('OpenAI request timed out. Using basic extraction instead.');
            shouldRetry = true; // Might be worth retrying timeouts once
          } else if (errorMessage.includes('502') || 
                    errorMessage.includes('503') || 
                    errorMessage.includes('504') || 
                    errorMessage.includes('internal server error')) {
            toast.error('OpenAI service temporarily unavailable. Using basic extraction instead.');
            shouldRetry = true; // Might be worth retrying server errors once
          } else {
            toast.error('OpenAI API error. Using basic extraction instead.');
            shouldRetry = false;
          }
        } else {
          toast.error('Failed to extract metadata with AI, using basic extraction instead');
        }
        
        // Optional retry logic
        if (shouldRetry) {
          try {
            console.log('Retrying OpenAI API call once after error...');
            // Wait a moment before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const retryResponse = await openai.chat.completions.create({
              model: "gpt-3.5-turbo", // Use a different model for retry (might have different availability)
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.2,
              response_format: { type: "json_object" },
              max_tokens: 500 // Limit token usage for retry attempt
            });
            
            const retryContent = retryResponse.choices[0].message.content;
            if (retryContent) {
              const retryMetadata = JSON.parse(retryContent) as ExtractedMetadata;
              toast.success('Successfully extracted metadata on retry');
              return retryMetadata;
            }
          } catch (retryError) {
            console.error('Retry also failed:', retryError);
            // Fall through to basic extraction
          }
        }
        
        // Fallback to basic extraction
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }
    } catch (error) {
      // Log the specific error
      if (error instanceof Error) {
        console.error(`Error extracting metadata with OpenAI: ${error.message}`);
      } else {
        console.error('Unknown error during OpenAI metadata extraction:', error);
      }
      
      // Show error toast to the user (only show one)
      toast.error('Using basic product data extraction');
      
      // Fallback to basic extraction logic without AI
      return extractBasicMetadata(productTitle, productDescription);
    }
  }
};

/**
 * Basic metadata extraction without AI as a fallback
 */
function extractBasicMetadata(title: string, description?: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {
    features: []
  };
  
  // Extract brand - look for common brand names at the beginning of the title
  const brandMatch = title.match(/^(Samsung|Apple|Sony|LG|Dell|HP|Lenovo|Asus|Acer|Microsoft|Google|Amazon|Xiaomi|Oppo|Vivo|OnePlus|Realme|Redmi|Nokia|Motorola|Huawei)(\s|$)/i);
  if (brandMatch) {
    metadata.brand = brandMatch[1];
  } else {
    // Secondary brand detection - look anywhere in the title
    const secondaryBrandMatch = title.match(/(Samsung|Apple|Sony|LG|Dell|HP|Lenovo|Asus|Acer|Microsoft|Google|Amazon|Xiaomi|Oppo|Vivo|OnePlus|Realme|Redmi|Nokia|Motorola|Huawei)/i);
    if (secondaryBrandMatch) {
      metadata.brand = secondaryBrandMatch[1];
    }
  }
  
  // Try to extract model numbers
  const modelPatterns = [
    // Samsung models
    /Galaxy\s+(S\d+|Note\d+|Z\s+Fold\d+|Z\s+Flip\d+|A\d+|Tab\s+S\d+)/i,
    // Apple models
    /iPhone\s+(\d+\s*(?:Pro|Pro\s+Max|Mini|Plus)?)/i,
    /MacBook\s+(Pro|Air)?\s*(\d+\.?\d+)?/i,
    /iPad\s+(Pro|Air|Mini)?/i,
    // Generic model patterns
    /Model(?:\s|:)+([A-Z0-9-]+)/i,
    /([A-Z]{1,4}[\s-]?\d{2,5}[A-Z]{0,2})/
  ];
  
  for (const pattern of modelPatterns) {
    const modelMatch = title.match(pattern);
    if (modelMatch) {
      // Use the most specific group capture or the full match
      metadata.model = modelMatch[1] ? modelMatch[1].trim() : modelMatch[0].trim();
      break;
    }
  }
  
  // Basic category detection based on keywords
  if (title.match(/phone|iphone|galaxy|pixel|redmi|oneplus/i)) {
    metadata.category = 'Smartphones';
  } else if (title.match(/laptop|notebook|macbook|thinkpad|ideapad|chromebook/i)) {
    metadata.category = 'Laptops';
  } else if (title.match(/tv|television|smart tv|led tv|oled|qled/i)) {
    metadata.category = 'Televisions';
  } else if (title.match(/tablet|ipad|tab|galaxy tab/i)) {
    metadata.category = 'Tablets';
  } else if (title.match(/watch|smartwatch|apple watch|galaxy watch/i)) {
    metadata.category = 'Smartwatches';
  } else if (title.match(/headphone|earphone|earbuds|airpods|headset/i)) {
    metadata.category = 'Audio';
  } else if (title.match(/camera|dslr|mirrorless|canon|nikon|sony alpha/i)) {
    metadata.category = 'Cameras';
  } else {
    metadata.category = 'Electronics';
  }
  
  // Extract storage if present
  const storageMatch = title.match(/(\d+)\s?(GB|TB|MB)/i);
  if (storageMatch) {
    metadata.storage = `${storageMatch[1]}${storageMatch[2]}`;
  }
  
  // Extract RAM if present
  const ramMatch = title.match(/(\d+)\s?(GB)?\s?RAM/i);
  if (ramMatch) {
    metadata.ram = `${ramMatch[1]}GB`;
  }
  
  // Extract color if present
  const colorMatch = title.match(/(Black|White|Gold|Silver|Blue|Red|Green|Yellow|Purple|Pink|Gray|Grey|Brown|Orange|Titanium)/i);
  if (colorMatch) {
    metadata.color = colorMatch[1];
  }
  
  // Extract processor if present
  const processorPatterns = [
    /(?:Intel|AMD)\s+(?:Core\s+)?(?:i[3579]|Ryzen|Athlon|Celeron|Pentium|Xeon)\s+(?:\w+\-)?(?:\d+[A-Z]*)/i,
    /Snapdragon\s+\d+/i,
    /Exynos\s+\d+/i,
    /Bionic\s+[A-Z]\d+/i,
    /MediaTek\s+\w+/i
  ];
  
  for (const pattern of processorPatterns) {
    const processorMatch = (title + ' ' + (description || '')).match(pattern);
    if (processorMatch) {
      metadata.processor = processorMatch[0];
      break;
    }
  }
  
  // Extract some basic features from the description
  if (description) {
    // Feature extraction
    const featurePatterns = [
      /\d+\s?MP\s+camera/i,
      /\d+x\s+(?:digital|optical)\s+zoom/i,
      /(?:USB|Type)-C/i,
      /wireless\s+charging/i,
      /fast\s+charging/i,
      /water(?:\s+and\s+dust)?\s+resistant/i,
      /fingerprint\s+sensor/i,
      /face\s+(?:id|recognition|unlock)/i,
      /\d+Hz\s+refresh\s+rate/i,
      /OLED|AMOLED|LCD|LED|QLED|Mini-LED/i,
      /Bluetooth\s+\d+(?:\.\d+)?/i,
      /Wi-Fi\s+\d+/i,
      /5G/i,
      /\d+\s+mAh\s+battery/i
    ];
    
    const features: string[] = [];
    for (const pattern of featurePatterns) {
      const matches = description.match(new RegExp(pattern, 'gi'));
      if (matches) {
        matches.slice(0, 2).forEach(match => {
          if (!features.includes(match)) {
            features.push(match);
          }
        });
      }
    }
    
    // Add some basic features from the title/description
    const lines = description.split(/\n|\.|,/);
    const potentialFeatures = lines.filter(line => {
      line = line.trim();
      return line.length > 10 && line.length < 100 && 
             !features.some(f => line.includes(f));
    }).slice(0, 5);
    
    if (features.length > 0 || potentialFeatures.length > 0) {
      metadata.features = [...features, ...potentialFeatures].slice(0, 8);
    }
  }
  
  return metadata;
}
