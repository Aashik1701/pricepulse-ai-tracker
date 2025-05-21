
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <h1 className="text-3xl font-bold tracking-tighter md:text-4xl">About PricePulse</h1>
              
              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">
                  PricePulse is a powerful price tracking application designed to help shoppers make informed decisions and save money on their Amazon purchases.
                </p>
                
                <h2 className="text-2xl font-bold mt-8">How It Works</h2>
                <p className="text-gray-600 leading-relaxed">
                  PricePulse allows you to monitor Amazon product prices over time, view price history charts, and receive alerts when prices drop to your desired level. Here's how it works:
                </p>
                
                <ol className="list-decimal pl-6 space-y-2 text-gray-600">
                  <li>
                    <span className="font-medium">Enter an Amazon Product URL</span> - Simply paste the URL of any Amazon product you want to track.
                  </li>
                  <li>
                    <span className="font-medium">View Price History</span> - See how the price has changed over time with our interactive charts.
                  </li>
                  <li>
                    <span className="font-medium">Set Price Alerts</span> - Specify your target price and email to receive notifications when the price drops.
                  </li>
                  <li>
                    <span className="font-medium">Compare Prices</span> - We show you the same product on different marketplaces to find the best deal.
                  </li>
                </ol>
                
                <h2 className="text-2xl font-bold mt-8">Our Technology</h2>
                <p className="text-gray-600 leading-relaxed">
                  PricePulse uses advanced web scraping technologies combined with data analytics to track prices accurately. We update prices regularly throughout the day to provide you with up-to-date information.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Our system leverages AI to identify similar products across different marketplaces, ensuring you always get the best deals available online.
                </p>
                
                <h2 className="text-2xl font-bold mt-8">Privacy & Security</h2>
                <p className="text-gray-600 leading-relaxed">
                  We take your privacy seriously. Your email address is only used to send price drop alerts that you've explicitly requested. We never share your information with third parties.
                </p>
              </div>
              
              <div className="pt-6 flex justify-center">
                <Link to="/">
                  <Button>Start Tracking Prices</Button>
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

export default About;
