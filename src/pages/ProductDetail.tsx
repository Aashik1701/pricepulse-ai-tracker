
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductDetails from '@/components/product/ProductDetails';
import PriceChart from '@/components/product/PriceChart';
import PriceAlertForm from '@/components/product/PriceAlertForm';
import PriceComparison from '@/components/product/PriceComparison';
import ProductMetadata from '@/components/product/ProductMetadata';
import { mockProduct } from '@/data/mockData';
import { toast } from 'sonner';
import { ScrapedProductData, PriceComparisonItem, scrapeAmazonProduct, searchProductOnPlatforms } from '@/utils/scraperService';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState({
    product: true,
    metadata: false,
    comparison: false
  });
  
  // State for product data
  const [productData, setProductData] = useState<ScrapedProductData | null>(null);
  const [priceComparison, setPriceComparison] = useState<PriceComparisonItem[]>([]);
  
  // Use the mockProduct's priceHistory for now
  const priceHistory = mockProduct.priceHistory;
  
  useEffect(() => {
    // Function to fetch product data
    const fetchProductData = async () => {
      setLoading(prev => ({ ...prev, product: true }));
      
      try {
        // Construct Amazon URL from ID
        const amazonUrl = `https://www.amazon.com/dp/${id}`;
        
        // Attempt to scrape the product
        const scrapedData = await scrapeAmazonProduct(amazonUrl);
        
        if (scrapedData) {
          setProductData(scrapedData);
          document.title = `${scrapedData.name} - Price Tracking | PricePulse`;
          
          // After getting product data, start other operations
          fetchComparisonData(scrapedData);
        } else {
          // Fallback to mock data if scraping fails
          toast.warning("Using mock data as fallback", {
            description: "Could not fetch live data from Amazon"
          });
          setProductData({
            name: mockProduct.name,
            imageUrl: mockProduct.imageUrl,
            currentPrice: mockProduct.currentPrice,
            previousPrice: mockProduct.previousPrice,
            currency: mockProduct.currency,
            asin: mockProduct.asin,
            metadata: {
              brand: "Samsung",
              model: "Galaxy S21",
              category: "Electronics",
              features: ["5G Connectivity", "128GB Storage", "8GB RAM", "12MP Camera"],
              color: "Phantom Gray",
              processor: "Exynos 2100",
              batteryLife: "4000mAh"
            },
            lastUpdated: mockProduct.lastUpdated
          });
          document.title = `${mockProduct.name} - Price Tracking | PricePulse`;
          fetchComparisonData(null);
        }
      } catch (error) {
        console.error("Error fetching product data:", error);
        toast.error("Failed to load product data");
        navigate('/');
      } finally {
        setLoading(prev => ({ ...prev, product: false }));
      }
    };
    
    // Function to fetch comparison data
    const fetchComparisonData = async (product: ScrapedProductData | null) => {
      setLoading(prev => ({ ...prev, comparison: true }));
      
      try {
        if (product) {
          // Real comparison search using product details
          const results = await searchProductOnPlatforms(
            product.name || "",
            product.metadata?.brand,
            product.metadata?.model
          );
          setPriceComparison(results);
          
          toast.success(`Found this item on ${results.length} platforms`, {
            description: "Price comparison updated with latest prices",
          });
        } else {
          // Use mock comparison data
          setPriceComparison(mockProduct.priceComparison || []);
        }
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        toast.error("Failed to load price comparison data");
      } finally {
        setLoading(prev => ({ ...prev, comparison: false }));
      }
    };
    
    fetchProductData();
  }, [id, navigate]);
  
  // If still loading the main product, show a loading state
  if (loading.product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container px-4 flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-lg">Loading product data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // If no product data was loaded, show error state
  if (!productData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-8">
          <div className="container px-4 flex flex-col items-center justify-center h-full">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <p className="text-lg mb-6">We couldn't find the product you're looking for.</p>
            <button 
              onClick={() => navigate('/')} 
              className="px-4 py-2 bg-pulse-blue-600 text-white rounded-md hover:bg-pulse-blue-700"
            >
              Go Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-8">
        <div className="container px-4 space-y-6">
          <ProductDetails
            name={productData.name || 'Unknown Product'}
            imageUrl={productData.imageUrl || 'https://via.placeholder.com/300'}
            currentPrice={productData.currentPrice || 0}
            previousPrice={productData.previousPrice || 0}
            currency={productData.currency || '$'}
            asin={productData.asin || id || ''}
            lastUpdated={productData.lastUpdated}
          />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <PriceChart
                priceHistory={priceHistory}
                currentPrice={productData.currentPrice || 0}
                currency={productData.currency || '$'}
              />
              
              <div className="mt-6">
                <PriceComparison 
                  items={priceComparison} 
                  loading={loading.comparison}
                />
              </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              <PriceAlertForm
                productId={productData.asin || id || ''}
                currentPrice={productData.currentPrice || 0}
                currency={productData.currency || '$'}
              />
              
              <ProductMetadata
                metadata={productData.metadata || {}}
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
