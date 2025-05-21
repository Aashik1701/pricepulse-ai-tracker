
import React from 'react';
import { Link } from 'react-router-dom';
import ProductUrlForm from '@/components/product/ProductUrlForm';
import { Button } from '@/components/ui/button';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <section className="bg-gradient-to-b from-pulse-blue-50 to-white py-16 md:py-24 border-b">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Track Amazon Product Prices
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Get alerts when prices drop and view historical price trends
                </p>
              </div>
              
              <div className="w-full max-w-2xl animate-fade-in">
                <ProductUrlForm className="mt-4" />
              </div>

              <p className="text-sm text-muted-foreground mt-2">
                Simply paste any Amazon product URL to start tracking
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-3">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pulse-blue-500 mb-3">
                  <path d="M12 4V20M12 4L6 8M12 4L18 8M6 8V16L12 20M6 8L12 12L18 16M18 8V16L12 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 className="text-lg font-bold">Track Prices</h3>
                <p className="text-muted-foreground">Enter any Amazon product URL to instantly track its price.</p>
              </div>
            
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pulse-blue-500 mb-3">
                  <path d="M3 12h4v8H3v-8zm7-8h4v16h-4V4zm7 4h4v12h-4V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 className="text-lg font-bold">View Price History</h3>
                <p className="text-muted-foreground">See interactive charts showing how prices have changed over time.</p>
              </div>
              
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-pulse-blue-500 mb-3">
                  <path d="M12 19V5m0 14l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3 className="text-lg font-bold">Get Price Alerts</h3>
                <p className="text-muted-foreground">Set your target price and receive email alerts when prices drop.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section className="bg-gray-50 py-12 border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Ready to start tracking?
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-lg">
                  Enter an Amazon product URL now and start saving money
                </p>
              </div>
              <div className="space-x-4">
                <Link to="/">
                  <Button>Get Started</Button>
                </Link>
                <Link to="/about">
                  <Button variant="outline">Learn More</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
