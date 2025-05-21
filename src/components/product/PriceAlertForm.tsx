
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PriceAlertFormProps {
  productId: string;
  currentPrice: number;
  currency: string;
}

const PriceAlertForm = ({ productId, currentPrice, currency }: PriceAlertFormProps) => {
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  
  const formatPrice = (price: number) => `${currency}${price.toFixed(2)}`;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast('Please enter your email address');
      return;
    }
    
    const parsedTargetPrice = parseFloat(targetPrice);
    
    if (isNaN(parsedTargetPrice) || parsedTargetPrice <= 0) {
      toast('Please enter a valid target price');
      return;
    }
    
    if (parsedTargetPrice >= currentPrice) {
      toast('Target price must be lower than the current price');
      return;
    }
    
    setLoading(true);
    
    try {
      // In a real implementation, this would make an API call
      // For now, we'll simulate an API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`We'll email you at ${email} when the price drops below ${formatPrice(parsedTargetPrice)}`);
      
      // Reset the form
      setEmail('');
      setTargetPrice('');
    } catch (error) {
      console.error('Error setting price alert:', error);
      toast.error('Failed to set price alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Price Alert</CardTitle>
        <CardDescription>
          Get notified when this product drops below your target price
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="targetPrice" className="text-sm font-medium">
              Target Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency}
              </span>
              <Input
                id="targetPrice"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="pl-8"
                step="0.01"
                min="0.01"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Current price: {formatPrice(currentPrice)}
            </p>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Setting Alert...</span>
              </>
            ) : (
              "Create Alert"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PriceAlertForm;
