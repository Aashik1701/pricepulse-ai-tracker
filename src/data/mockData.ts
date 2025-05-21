
// This file contains mock data for development and testing purposes

import { PriceComparisonItem, ProductSchema } from '@/utils/scraperService';

export const mockProduct: ProductSchema = {
  id: "123456",
  asin: "B08L5TNJHG",
  name: "Samsung Galaxy S21 5G Factory Unlocked Android Cell Phone 128GB",
  imageUrl: "https://m.media-amazon.com/images/I/61jYjeuNUnL._AC_SL1000_.jpg",
  currentPrice: 799.99,
  previousPrice: 849.99,
  lowestPrice: 749.99,
  highestPrice: 899.99,
  currency: "₹",
  lastUpdated: new Date(),
  priceHistory: [
    { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), price: 849.99 },
    { date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), price: 849.99 },
    { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), price: 829.99 },
    { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), price: 799.99 },
    { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), price: 819.99 },
    { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), price: 799.99 },
    { date: new Date(), price: 799.99 }
  ],
  metadata: {
    brand: "Samsung",
    model: "Galaxy S21",
    category: "Electronics",
    features: [
      "5G Capable",
      "8GB RAM / 128GB Storage",
      "6.2-inch Dynamic AMOLED 2X Display",
      "Triple Camera System",
      "4000mAh Battery"
    ]
  },
  priceComparison: [
    {
      marketplace: 'Amazon',
      productName: 'Samsung Galaxy S21 5G Factory Unlocked Android Cell Phone 128GB',
      price: 799.99,
      currency: '₹',
      url: 'https://www.amazon.com/dp/B08L5TNJHG',
      lastUpdated: new Date(),
      inStock: true
    },
    {
      marketplace: 'Flipkart',
      productName: 'Samsung Galaxy S21 5G (Phantom Gray, 128GB)',
      price: 789.99,
      currency: '₹',
      url: 'https://www.flipkart.com/samsung-galaxy-s21-phantom-gray-128-gb/p/itm54400d2425487',
      lastUpdated: new Date(),
      inStock: true
    },
    {
      marketplace: 'Meesho',
      productName: 'Samsung Galaxy S21 128GB Unlocked',
      price: 809.99,
      currency: '₹',
      url: 'https://www.meesho.com/samsung-galaxy-s21/p/3jd8c',
      lastUpdated: new Date(),
      inStock: false
    }
  ]
};

export const mockRecentSearches = [
  {
    id: '1',
    name: 'iPhone 13 Pro Max',
    asin: 'B09G9HD6PD',
    imageUrl: 'https://m.media-amazon.com/images/I/61i8Vjb17SL._AC_SL1500_.jpg',
    currentPrice: 1099.99,
    currency: '$'
  },
  {
    id: '2',
    name: 'Samsung TV Crystal UHD 65"',
    asin: 'B094WSJJ79',
    imageUrl: 'https://m.media-amazon.com/images/I/91RfzivKmwL._AC_SL1500_.jpg',
    currentPrice: 599.99,
    currency: '$'
  },
  {
    id: '3',
    name: 'Sony WH-1000XM4 Wireless Noise Cancelling Headphones',
    asin: 'B0863TXGM3',
    imageUrl: 'https://m.media-amazon.com/images/I/71+OQeZFZ+L._AC_SL1500_.jpg',
    currentPrice: 299.99,
    currency: '$'
  }
];

export const mockCategories = [
  { id: '1', name: 'Electronics', count: 156 },
  { id: '2', name: 'Home & Kitchen', count: 89 },
  { id: '3', name: 'Fashion', count: 214 },
  { id: '4', name: 'Books', count: 75 },
  { id: '5', name: 'Toys & Games', count: 42 }
];

// Sample database function implementations - for future integration with actual database
export const mockDatabaseFunctions = {
  // Product operations
  addProduct: (product: Omit<ProductSchema, 'id'>) => {
    console.log('Adding product to database:', product);
    return { ...product, id: Math.random().toString(36).substring(2, 9) };
  },
  
  updateProduct: (id: string, product: Partial<ProductSchema>) => {
    console.log('Updating product in database:', id, product);
    return { ...mockProduct, ...product, id };
  },
  
  getProduct: (id: string) => {
    console.log('Getting product from database:', id);
    return mockProduct;
  },
  
  // Price history operations
  addPriceHistoryEntry: (productId: string, price: number) => {
    console.log('Adding price history entry:', productId, price);
    return { id: Math.random().toString(36).substring(2, 9), productId, price, date: new Date() };
  },
  
  getPriceHistory: (productId: string) => {
    console.log('Getting price history for product:', productId);
    return mockProduct.priceHistory;
  },
  
  // Price alert operations
  createPriceAlert: (alert: { productId: string, email: string, targetPrice: number }) => {
    console.log('Creating price alert:', alert);
    return { 
      id: Math.random().toString(36).substring(2, 9),
      ...alert,
      userId: 'user-' + Math.random().toString(36).substring(2, 9),
      isActive: true,
      createdAt: new Date()
    };
  },
  
  updatePriceAlert: (id: string, isActive: boolean) => {
    console.log('Updating price alert:', id, isActive);
    return { id, isActive };
  }
};
