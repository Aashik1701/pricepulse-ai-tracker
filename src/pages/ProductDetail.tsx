
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductDetails from '@/components/product/ProductDetails';
import PriceChart from '@/components/product/PriceChart';
import PriceAlertForm from '@/components/product/PriceAlertForm';
import PriceComparison from '@/components/product/PriceComparison';
import { mockProduct, mockPriceComparison } from '@/data/mockData';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // In a real implementation, we would fetch the product data using the ID
  const product = mockProduct; // Simulate fetching product by id
  const priceComparison = mockPriceComparison.sort((a, b) => a.price - b.price);
  
  useEffect(() => {
    document.title = `${product.name} - Price Tracking | PricePulse`;
    
    // Show a welcome toast
    toast.success("Product price tracking activated!", {
      description: "We'll update this price regularly and show the history",
    });
  }, [product.name]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8">
        <div className="container px-4 space-y-6">
          <ProductDetails
            name={product.name}
            imageUrl={product.imageUrl}
            currentPrice={product.currentPrice}
            previousPrice={product.previousPrice}
            currency={product.currency}
            asin={product.asin}
            lastUpdated={product.lastUpdated}
          />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PriceChart
                priceHistory={product.priceHistory}
                currentPrice={product.currentPrice}
                currency={product.currency}
              />
              
              <div className="mt-6">
                <PriceComparison items={priceComparison} />
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <PriceAlertForm
                productId={product.id}
                currentPrice={product.currentPrice}
                currency={product.currency}
              />
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;
