
// Mock data for development purposes

// Helper function to create price history data
const generatePriceHistory = (
  startPrice: number, 
  endPrice: number, 
  days: number, 
  volatility: number
): { date: Date; price: number }[] => {
  const priceHistory = [];
  const now = new Date();
  const priceRange = endPrice - startPrice;
  const dailyChange = priceRange / days;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    
    // Add some randomness to the price
    const randomVariation = (Math.random() - 0.5) * 2 * volatility;
    let price = startPrice + (dailyChange * (days - i)) + randomVariation;
    
    // Ensure the price is positive
    price = Math.max(0.01, price);
    
    priceHistory.push({ date, price });
  }
  
  return priceHistory;
};

// Mock product data
export const mockProduct = {
  id: 'B08L5TNJHG',
  asin: 'B08L5TNJHG',
  name: 'Samsung Galaxy S21 5G | Factory Unlocked Android Cell Phone | 128GB | Phantom Gray',
  imageUrl: 'https://m.media-amazon.com/images/I/61jYjeuNUnL._AC_SL1500_.jpg',
  currentPrice: 599.99,
  previousPrice: 699.99,
  lowestPrice: 549.99,
  highestPrice: 799.99,
  currency: '$',
  lastUpdated: new Date(),
  priceHistory: generatePriceHistory(799.99, 599.99, 90, 20)
};

// Mock price comparison data
export const mockPriceComparison = [
  {
    marketplace: 'Amazon',
    productName: 'Samsung Galaxy S21 5G | Factory Unlocked Android Cell Phone | 128GB | Phantom Gray',
    price: 599.99,
    currency: '$',
    url: 'https://www.amazon.com/dp/B08L5TNJHG',
  },
  {
    marketplace: 'Walmart',
    productName: 'Samsung Galaxy S21 5G, 128GB, Phantom Gray - Unlocked (Renewed)',
    price: 579.99,
    currency: '$',
    url: '#',
  },
  {
    marketplace: 'Best Buy',
    productName: 'Samsung - Galaxy S21 5G 128GB - Phantom Gray (Unlocked)',
    price: 629.99,
    currency: '$',
    url: '#',
  },
  {
    marketplace: 'eBay',
    productName: 'Samsung Galaxy S21 5G 128GB Unlocked Smartphone - Phantom Gray',
    price: 549.99,
    currency: '$',
    url: '#',
  }
];
