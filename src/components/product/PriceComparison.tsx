
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ExternalLink } from 'lucide-react';

interface PriceComparisonItem {
  marketplace: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  isLowestPrice?: boolean;
  lastUpdated?: Date;
  inStock?: boolean;
}

interface PriceComparisonProps {
  items: PriceComparisonItem[];
  loading?: boolean;
}

const PriceComparison = ({ items, loading = false }: PriceComparisonProps) => {
  // Sort by price (lowest first)
  const sortedItems = [...items].sort((a, b) => a.price - b.price);
  
  if (sortedItems.length === 0 && !loading) {
    return null;
  }

  const getMarketplaceColor = (marketplace: string) => {
    const colors: {[key: string]: string} = {
      'Amazon': 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20',
      'Flipkart': 'bg-[#2874F0]/10 text-[#2874F0] border-[#2874F0]/20',
      'Meesho': 'bg-[#F43397]/10 text-[#F43397] border-[#F43397]/20',
      'BigBasket': 'bg-[#84C225]/10 text-[#84C225] border-[#84C225]/20',
      'Swiggy Instamart': 'bg-[#FC8019]/10 text-[#FC8019] border-[#FC8019]/20',
    };
    
    return colors[marketplace] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price Comparison</CardTitle>
        {sortedItems.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Save up to {sortedItems[sortedItems.length - 1].price - sortedItems[0].price > 0 
              ? `${sortedItems[sortedItems.length - 1].currency}${(sortedItems[sortedItems.length - 1].price - sortedItems[0].price).toFixed(2)}`
              : 'N/A'
            }
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedItems.map((item, index) => (
              <div 
                key={`${item.marketplace}-${index}`} 
                className={`flex items-center justify-between p-3 rounded-md ${index === 0 ? 'bg-pulse-green-50 border border-pulse-green-100' : 'bg-white border'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full border ${getMarketplaceColor(item.marketplace)}`}>
                    <span className="font-semibold text-sm">{item.marketplace.substring(0, 1)}</span>
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {item.marketplace}
                      {index === 0 && (
                        <Badge variant="outline" className="ml-2 bg-pulse-green-100 text-pulse-green-700 hover:bg-pulse-green-100 border-pulse-green-200">
                          Best Price
                        </Badge>
                      )}
                      {!item.inStock && (
                        <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 hover:bg-gray-100 border-gray-200">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                      {item.productName}
                    </div>
                    {item.lastUpdated && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date(item.lastUpdated).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold ${index === 0 ? 'text-pulse-green-700' : ''}`}>
                    {item.currency}{item.price.toFixed(2)}
                  </div>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-pulse-blue-600 hover:text-pulse-blue-700"
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceComparison;
