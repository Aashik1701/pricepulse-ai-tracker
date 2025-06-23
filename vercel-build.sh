#!/bin/bash

# This script runs during Vercel build to ensure proper installation
# and build process for the PricePulse application

# Print Node and npm versions for debugging
echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

# Clean install dependencies
echo "Installing dependencies..."
npm ci || npm install

# Build the application
echo "Building the application..."
npm run build

exit 0
