
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

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
    // In real implementation, this would be more robust
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
      
      return null;
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
      toast('Please enter a valid Amazon URL');
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate an API call with a timeout
      const asin = extractASIN(url);
      
      if (!asin) {
        toast('Could not extract product ID from URL');
        setLoading(false);
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, we'd navigate to the actual product page
      // with the data returned from the API
      navigate(`/product/B08L5TNJHG`);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast('Failed to fetch product data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex w-full max-w-2xl flex-col sm:flex-row gap-2 ${className}`}>
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
  );
};

export default ProductUrlForm;
