// Test script for OpenAI integration
import { OpenAIService } from './src/services/OpenAIService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOpenAIIntegration() {
  console.log('Testing OpenAI Integration...');
  
  const testProducts = [
    {
      title: 'Samsung Galaxy S23 Ultra 5G (Phantom Black, 12GB, 256GB Storage)',
      description: 'Meet the new standard of smartphones with Galaxy S23 Ultra 5G with Snapdragon 8 Gen 2 Mobile Platform. Experience more freedom with the embedded S Pen. The Pro-grade Camera gives you power to create with the highest resolution camera on a Galaxy device ever. Get crisp shots in any light with 100x Space Zoom and Nightography. Watch everything on the expansive 6.8" display with smooth scrolling and adaptive 120Hz refresh rate.'
    },
    {
      title: 'Apple iPhone 15 Pro Max (256GB) - Natural Titanium',
      description: "FORGED IN TITANIUM — iPhone 15 Pro Max has a strong and light aerospace-grade titanium design with a textured matte-glass back. It also features a Ceramic Shield front that's tougher than any smartphone glass. And it's splash, water, and dust resistant. ADVANCED DISPLAY — The 6.7\" Super Retina XDR display with ProMotion ramps up refresh rates to 120Hz when you need exceptional graphics performance. Dynamic Island bubbles up alerts and Live Notifications. Plus, with Always-On display, your Lock Screen stays glanceable, so you don't have to tap it to stay in the know."
    },
    {
      title: 'OnePlus 12 (Flowy Emerald, 12GB RAM, 256GB Storage)',
      description: null
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
}

testOpenAIIntegration().catch(console.error);
