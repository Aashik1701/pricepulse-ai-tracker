// Test script for OpenAI integration
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import the OpenAI service
async function runTest() {
  // Dynamically import the OpenAI service
  try {
    // First, try to import from the built files (if already built)
    let OpenAIService;
    try {
      const { OpenAIService: builtService } = await import('../dist/services/OpenAIService.js');
      OpenAIService = builtService;
    } catch (e) {
      // If that fails, try to import from source directly
      console.log('Could not load from dist, trying source directory...');
      const { OpenAIService: srcService } = await import('../src/services/OpenAIService.js');
      OpenAIService = srcService;
    }
    
    console.log('Testing OpenAI Integration...');
    console.log('API Key available:', process.env.VITE_OPENAI_API_KEY ? 'Yes' : 'No');
    
    const testProducts = [
      {
        title: 'Samsung Galaxy S23 Ultra 5G (Phantom Black, 12GB, 256GB Storage)',
        description: 'Meet the new standard of smartphones with Galaxy S23 Ultra 5G with Snapdragon 8 Gen 2 Mobile Platform. Experience more freedom with the embedded S Pen. The Pro-grade Camera gives you power to create with the highest resolution camera on a Galaxy device ever. Get crisp shots in any light with 100x Space Zoom and Nightography. Watch everything on the expansive 6.8" display with smooth scrolling and adaptive 120Hz refresh rate.'
      },
      {
        title: 'Apple iPhone 15 Pro Max (256GB) - Natural Titanium',
        description: "FORGED IN TITANIUM — iPhone 15 Pro Max has a strong and light aerospace-grade titanium design with a textured matte-glass back. It also features a Ceramic Shield front that's tougher than any smartphone glass. And it's splash, water, and dust resistant. ADVANCED DISPLAY — The 6.7\" Super Retina XDR display with ProMotion ramps up refresh rates to 120Hz when you need exceptional graphics performance."
      },
      {
        title: 'OnePlus 12 (Flowy Emerald, 12GB RAM, 256GB Storage)',
        description: 'Snapdragon 8 Gen 3 Mobile Platform delivers increased CPU and GPU performance with greater power efficiency. Experience exceptional gaming and seamless multitasking with 12GB of LPDDR5X RAM and 256GB of UFS 4.0 storage.'
      }
    ];
    
    for (const product of testProducts) {
      console.log(`\nTesting with product: ${product.title}`);
      try {
        const metadata = await OpenAIService.extractProductMetadata(
          product.title,
          product.description
        );
        console.log('Extracted metadata:', JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.error('Error extracting metadata:', error);
      }
    }
  } catch (error) {
    console.error('Failed to import OpenAIService:', error);
  }
}

runTest().catch(console.error);
