
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductDetails from '@/components/product/ProductDetails';
import PriceChart from '@/components/product/PriceChart';
import PriceAlertForm from '@/components/product/PriceAlertForm';
import PriceComparison from '@/components/product/PriceComparison';
import ProductMetadata from '@/components/product/ProductMetadata';
import { mockProduct, mockPriceComparison } from '@/data/mockData';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState({
    metadata: false,
    comparison: false
  });
  
  // In a real implementation, we would fetch the product data using the ID
  const product = mockProduct; // Simulate fetching product by id
  const priceComparison = mockPriceComparison.sort((a, b) => a.price - b.price);
  
  // Extracted product metadata
  const [productMetadata, setProductMetadata] = useState({
    brand: "Samsung",
    model: "Galaxy S21",
    category: "Electronics",
    features: ["5G Connectivity", "128GB Storage", "8GB RAM", "12MP Camera"],
    color: "Phantom Gray",
    processor: "Exynos 2100",
    batteryLife: "4000mAh"
  });

  // Enhanced comparison data with multiple platforms
  const [enhancedComparison, setEnhancedComparison] = useState([
    ...priceComparison,
    {
      marketplace: "Flipkart",
      productName: "Samsung Galaxy S21 5G (Phantom Gray, 128 GB) (8 GB RAM)",
      price: 54499,
      currency: "₹",
      url: "https://www.flipkart.com/samsung-galaxy-s21",
      inStock: true,
      lastUpdated: new Date()
    },
    {
      marketplace: "Meesho",
      productName: "Samsung Galaxy S21 5G Smartphone",
      price: 55999,
      currency: "₹",
      url: "https://www.meesho.com/samsung-galaxy-s21",
      inStock: true,
      lastUpdated: new Date()
    },
    {
      marketplace: "BigBasket",
      productName: "Samsung Galaxy S21 5G (128GB)",
      price: 56999,
      currency: "₹",
      url: "https://www.bigbasket.com/pd/samsung-galaxy-s21",
      inStock: false,
      lastUpdated: new Date()
    },
    {
      marketplace: "Swiggy Instamart",
      productName: "Samsung Galaxy S21 Smartphone",
      price: 57999,
      currency: "₹",
      url: "https://www.swiggy.com/instamart/samsung-galaxy-s21",
      inStock: true,
      lastUpdated: new Date()
    }
  ]);
  
  useEffect(() => {
    document.title = `${product.name} - Price Tracking | PricePulse`;
    
    // Simulate loading metadata and price comparison
    setLoading({ metadata: true, comparison: true });
    
    // Simulate API calls to extract metadata and fetch price comparison
    setTimeout(() => {
      setLoading(prev => ({ ...prev, metadata: false }));
      toast.success("AI extracted product metadata successfully", {
        description: "Identified key product specifications and features",
      });
    }, 1500);
    
    setTimeout(() => {
      setLoading(prev => ({ ...prev, comparison: false }));
      toast.success("Found this item on 5 platforms", {
        description: "Price comparison updated with latest prices",
      });
    }, 2500);
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
                <PriceComparison 
                  items={enhancedComparison} 
                  loading={loading.comparison}
                />
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <PriceAlertForm
                productId={product.id}
                currentPrice={product.currentPrice}
                currency={product.currency}
              />
              
              <ProductMetadata
                metadata={productMetadata}
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
