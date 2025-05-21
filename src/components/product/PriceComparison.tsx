
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PriceComparisonItem {
  marketplace: string;
  productName: string;
  price: number;
  currency: string;
  url: string;
  isLowestPrice?: boolean;
}

interface PriceComparisonProps {
  items: PriceComparisonItem[];
}

const PriceComparison = ({ items }: PriceComparisonProps) => {
  // Sort by price (lowest first)
  const sortedItems = [...items].sort((a, b) => a.price - b.price);
  
  if (sortedItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedItems.map((item, index) => (
            <div 
              key={`${item.marketplace}-${index}`} 
              className={`flex items-center justify-between p-3 rounded-md ${index === 0 ? 'bg-pulse-green-50 border border-pulse-green-100' : 'bg-white border'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full border">
                  <span className="font-semibold text-sm">{item.marketplace.substring(0, 1)}</span>
                </div>
                <div>
                  <div className="font-medium">
                    {item.marketplace}
                    {index === 0 && (
                      <Badge variant="outline" className="ml-2 bg-pulse-green-100 text-pulse-green-700 hover:bg-pulse-green-100 border-pulse-green-200">
                        Best Price
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                    {item.productName}
                  </div>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceComparison;
