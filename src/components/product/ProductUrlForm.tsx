
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { scrapeAmazonProduct } from '@/utils/scraperService';

interface ProductUrlFormProps {
  className?: string;
}

const ProductUrlForm = ({ className }: ProductUrlFormProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isAmazonUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('amazon');
    } catch {
      return false;
    }
  };

  const extractASIN = (url: string) => {
    // This is a simplified ASIN extraction logic
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast('Please enter an Amazon product URL');
      return;
    }
    
    if (!isAmazonUrl(url)) {
      toast.error('Please enter a valid Amazon URL');
      return;
    }
    
    setLoading(true);
    
    try {
      // First try to extract the ASIN
      const asin = extractASIN(url);
      
      if (!asin) {
        toast.error('Could not extract product ID from URL');
        setLoading(false);
        return;
      }

      // Show a progress toast
      toast.info('Extracting product information...', {
        description: 'This may take a moment as we analyze the product details',
        duration: 5000
      });

      // Attempt to scrape product data
      const productData = await scrapeAmazonProduct(url);
      
      if (productData) {
        toast.success('Product found!', {
          description: `Successfully retrieved data for ${productData.name}`,
          duration: 3000
        });
      }
      
      // Navigate to the product detail page
      navigate(`/product/${asin}`);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to fetch product data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteExample = () => {
    // Example Amazon URL
    setUrl('https://www.amazon.com/dp/B08L5TNJHG');
    toast.info('Example URL pasted', {
      description: 'Click "Track Price" to see it in action!'
    });
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className={`flex w-full flex-col sm:flex-row gap-2 ${className}`}>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Amazon product URL"
          className="flex-1"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading...</span>
            </>
          ) : (
            "Track Price"
          )}
        </Button>
      </form>
      
      <div className="mt-2 text-center">
        <button 
          type="button" 
          onClick={handlePasteExample}
          className="text-sm text-pulse-blue-600 hover:underline"
        >
          Try with an example URL
        </button>
        <p className="text-xs text-muted-foreground mt-1">
          Works with Amazon product URLs (e.g., amazon.com/dp/B08L5TNJHG)
        </p>
      </div>
    </div>
  );
};

export default ProductUrlForm;
