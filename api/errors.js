/**
 * API endpoint for error monitoring and reporting
 * This provides a way to view and manage error logs from the server-side scrapers
 */

// Import the error monitoring utility from scrape.js (shared instance)
import { errorMonitoring } from './shared/errorMonitoring.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Check for admin authorization
  const authHeader = req.headers.authorization;
  const isAdmin = authHeader && authHeader.startsWith('Bearer ') && 
                  authHeader.split(' ')[1] === process.env.ADMIN_API_KEY;
  
  // Only allow admins to access error logs
  if (!isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    if (req.method === 'GET') {
      // Get error logs
      const limit = parseInt(req.query.limit) || 50;
      const errors = errorMonitoring.getRecentErrors(limit);
      return res.status(200).json({ errors, count: errors.length });
    } 
    else if (req.method === 'DELETE') {
      // Clear error logs
      errorMonitoring.clearErrors();
      return res.status(200).json({ message: 'Error logs cleared' });
    }
    else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in errors API handler:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
