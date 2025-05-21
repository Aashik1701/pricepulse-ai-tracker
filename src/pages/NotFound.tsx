
import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="container px-4 py-16 text-center">
          <h1 className="text-6xl font-bold text-pulse-blue-600 mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFound;
