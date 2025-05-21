
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface ProductDetailsProps {
  name: string;
  imageUrl: string;
  currentPrice: number;
  previousPrice: number;
  currency: string;
  asin: string;
  lastUpdated: Date;
}

const ProductDetails = ({
  name,
  imageUrl,
  currentPrice,
  previousPrice,
  currency,
  asin,
  lastUpdated
}: ProductDetailsProps) => {
  const formatPrice = (price: number) => `${currency}${price.toFixed(2)}`;
  
  const priceDifference = currentPrice - previousPrice;
  const percentageDiff = ((priceDifference / previousPrice) * 100).toFixed(2);
  
  const priceStatus = 
    priceDifference < 0 ? 'down' :
    priceDifference > 0 ? 'up' : 'same';
  
  const priceChangeLabel = 
    priceStatus === 'down' ? `${formatPrice(Math.abs(priceDifference))} (${Math.abs(parseFloat(percentageDiff))}%)` :
    priceStatus === 'up' ? `${formatPrice(priceDifference)} (${percentageDiff}%)` :
    'No change';
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 p-4 flex justify-center items-start bg-white border-b md:border-b-0 md:border-r">
            <img src={imageUrl} alt={name} className="max-w-full max-h-[200px] object-contain" />
          </div>
          
          <div className="w-full md:w-2/3 p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2 py-0">ASIN: {asin}</Badge>
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </span>
              </div>
              <h1 className="text-xl font-bold leading-tight">{name}</h1>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPrice(currentPrice)}</span>
                {previousPrice !== currentPrice && (
                  <span className={`text-sm ${priceStatus === 'down' ? 'price-down' : 'price-up'}`}>
                    {priceStatus === 'down' ? '↓' : '↑'} {priceChangeLabel}
                  </span>
                )}
              </div>
              
              {previousPrice !== currentPrice && (
                <div className="text-sm text-muted-foreground">
                  Previous price: {formatPrice(previousPrice)}
                </div>
              )}
            </div>
            
            <div className="pt-4 space-y-2">
              <a 
                href={`https://www.amazon.com/dp/${asin}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-pulse-blue-600 hover:text-pulse-blue-700 hover:underline"
              >
                <span>View on Amazon</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductDetails;
