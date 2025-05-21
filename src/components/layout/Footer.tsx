
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="border-t bg-background py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} PricePulse. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
