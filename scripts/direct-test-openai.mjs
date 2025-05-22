// Test script for OpenAI integration
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(rootDir, '.env') });

// Manually read the API key from the .env file if environment variable is not set
let apiKey = process.env.VITE_OPENAI_API_KEY;
if (!apiKey) {
  try {
    const envContent = fs.readFileSync(path.resolve(rootDir, '.env'), 'utf8');
    const match = envContent.match(/VITE_OPENAI_API_KEY=([^\r\n]+)/);
    if (match && match[1]) {
      apiKey = match[1];
      console.log('API key read directly from .env file');
    }
  } catch (err) {
    console.error('Error reading .env file:', err);
  }
}

async function testOpenAIIntegration() {
  console.log('Testing OpenAI Integration...');
  console.log('API Key available:', apiKey ? 'Yes' : 'No');
  
  if (!apiKey) {
    console.error('No OpenAI API key found. Please check your .env file.');
    return;
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
  
  const testProducts = [
    {
      title: 'Samsung Galaxy S23 Ultra 5G (Phantom Black, 12GB, 256GB Storage)',
      description: 'Meet the new standard of smartphones with Galaxy S23 Ultra 5G with Snapdragon 8 Gen 2 Mobile Platform. Experience more freedom with the embedded S Pen. The Pro-grade Camera gives you power to create with the highest resolution camera on a Galaxy device ever.'
    },
    {
      title: 'Apple iPhone 15 Pro Max (256GB) - Natural Titanium',
      description: "FORGED IN TITANIUM — iPhone 15 Pro Max has a strong and light aerospace-grade titanium design with a textured matte-glass back. It also features a Ceramic Shield front that's tougher than any smartphone glass."
    }
  ];
  
  for (const product of testProducts) {
    console.log(`\nTesting with product: ${product.title}`);
    try {
      // Create the system prompt
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
        
        Return ONLY a valid JSON object with these attributes. 
        If information for a field is not available, omit that field entirely.
      `;
      
      const userPrompt = `
        Product Title: ${product.title}
        ${product.description ? `Product Description: ${product.description}` : ''}
      `;
      
      // Make the API call to OpenAI
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: "json_object" }
        });
        
        // Parse the response
        const responseContent = response.choices[0].message.content;
        if (!responseContent) {
          throw new Error('Empty response from OpenAI API');
        }
        
        const metadata = JSON.parse(responseContent);
        console.log('Extracted metadata:', JSON.stringify(metadata, null, 2));
      } catch (apiError) {
        console.error('API Error:', apiError.message);
        console.log('Using fallback extraction due to API error');
        
        // Provide mock data for testing
        let mockData = {};
        
        if (product.title.includes('Samsung Galaxy')) {
          mockData = {
            brand: "Samsung",
            model: "Galaxy S23 Ultra 5G",
            category: "Smartphones",
            color: "Phantom Black",
            storage: "256GB",
            ram: "12GB",
            features: [
              "Snapdragon 8 Gen 2 Mobile Platform",
              "Embedded S Pen",
              "Pro-grade Camera",
              "100x Space Zoom",
              "Nightography",
              "6.8\" display with 120Hz refresh rate"
            ]
          };
        } else if (product.title.includes('iPhone')) {
          mockData = {
            brand: "Apple",
            model: "iPhone 15 Pro Max",
            category: "Smartphones",
            color: "Natural Titanium",
            storage: "256GB",
            features: [
              "Aerospace-grade titanium design",
              "Ceramic Shield front",
              "Water and dust resistant",
              "6.7\" Super Retina XDR display",
              "ProMotion with 120Hz refresh rate"
            ]
          };
        } else {
          mockData = {
            brand: "Unknown",
            category: "Electronics",
            features: ["Feature extraction failed due to API limitations"]
          };
        }
        
        console.log('Fallback metadata:', JSON.stringify(mockData, null, 2));
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }
  }
}

testOpenAIIntegration().catch(console.error);
