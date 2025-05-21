
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EmailAlertPreviewProps {
  productName: string;
  productImage: string;
  currentPrice: number;
  targetPrice: number;
  currency: string;
  productUrl: string;
}

const EmailAlertPreview = ({
  productName,
  productImage,
  currentPrice,
  targetPrice,
  currency,
  productUrl
}: EmailAlertPreviewProps) => {
  const formatPrice = (price: number) => `${currency}${price.toFixed(2)}`;
  
  return (
    <Card className="shadow-md">
      <CardContent className="p-4 space-y-4">
        <div className="border-b pb-2 text-center">
          <div className="bg-pulse-blue-600 text-white py-2 -mt-4 -mx-4 mb-4 rounded-t-lg">
            <h2 className="text-lg font-bold">Price Drop Alert</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Here's a preview of the email you'll receive
          </p>
        </div>
        
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded">
            <img src={productImage} alt={productName} className="w-full h-full object-contain" />
          </div>
          
          <div>
            <h3 className="font-medium line-clamp-2">{productName}</h3>
            <div className="mt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-pulse-green-600">{formatPrice(targetPrice)}</span>
                <span className="text-sm text-muted-foreground line-through">{formatPrice(currentPrice)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <a 
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 px-3 text-center bg-pulse-blue-600 hover:bg-pulse-blue-700 text-white rounded transition"
          >
            View on Amazon
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailAlertPreview;
