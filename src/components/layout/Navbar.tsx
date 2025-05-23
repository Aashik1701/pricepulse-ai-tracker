
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { UserNav } from './UserNav';

const Navbar = () => {
  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-8">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6 text-pulse-blue-600"
            >
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="text-xl font-bold text-pulse-blue-600">PricePulse</span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-sm font-medium hover:text-pulse-blue-600 transition-colors">
              Home
            </Link>
            <Link to="/about" className="text-sm font-medium hover:text-pulse-blue-600 transition-colors">
              About
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <UserNav />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
