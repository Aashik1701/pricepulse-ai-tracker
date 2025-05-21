
import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PricePoint {
  date: Date;
  price: number;
}

interface PriceChartProps {
  priceHistory: PricePoint[];
  currentPrice: number;
  currency: string;
}

const timeRanges = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: 'All', days: 0 },
];

const PriceChart = ({ priceHistory, currentPrice, currency }: PriceChartProps) => {
  const [activeRange, setActiveRange] = useState('All');
  
  const formatPrice = (price: number) => {
    return `${currency}${price.toFixed(2)}`;
  };
  
  const minPrice = Math.min(...priceHistory.map(point => point.price));
  
  const filteredData = () => {
    const selectedRange = timeRanges.find(range => range.label === activeRange);
    
    if (!selectedRange || selectedRange.days === 0) {
      return priceHistory;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedRange.days);
    
    return priceHistory.filter(point => new Date(point.date) >= cutoffDate);
  };
  
  // Format for chart display
  const chartData = filteredData().map(point => ({
    date: format(new Date(point.date), 'MMM d'),
    price: point.price,
    formattedPrice: formatPrice(point.price),
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 rounded border shadow-sm">
          <p className="font-medium">{label}</p>
          <p className="text-pulse-blue-600 font-semibold">{payload[0].payload.formattedPrice}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Price History</CardTitle>
        <div className="flex gap-2">
          {timeRanges.map(range => (
            <Button
              key={range.label}
              size="sm"
              variant={activeRange === range.label ? "default" : "outline"}
              onClick={() => setActiveRange(range.label)}
              className="h-7 px-3"
            >
              {range.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatPrice(value)}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#0c89e9"
                strokeWidth={2}
                dot={{ stroke: '#0c89e9', strokeWidth: 2, r: 4 }}
                activeDot={{ stroke: '#0057a2', strokeWidth: 3, r: 6 }}
              />
              <ReferenceLine
                y={currentPrice}
                stroke="#22c55e"
                strokeDasharray="3 3"
                label={{ 
                  value: "Current", 
                  position: "insideBottomRight",
                  fill: "#22c55e",
                  fontSize: 12
                }}
              />
              <ReferenceLine
                y={minPrice}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{ 
                  value: "Lowest", 
                  position: "insideTopRight",
                  fill: "#f59e0b", 
                  fontSize: 12
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;
