/**
 * Shared error monitoring and reporting utilities
 * This module provides centralized error tracking for all API endpoints
 */

export const errorMonitoring = {
  errors: [],
  maxErrorsToKeep: 100,
  
  /**
   * Log an error with contextual information
   * @param {string} source - The source of the error (e.g., function name)
   * @param {Error|string} error - The error object or message
   * @param {Object} context - Additional context for the error
   */
  logError(source, error, context = {}) {
    console.error(`[${source}] Error:`, error);
    
    // Store error for reporting
    this.errors.unshift({
      timestamp: new Date(),
      source,
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : null,
      context
    });
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrorsToKeep) {
      this.errors.pop();
    }
  },
  
  /**
   * Get recent errors for reporting
   * @param {number} limit - Maximum number of errors to return
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(0, limit);
  },
  
  /**
   * Clear all stored errors
   */
  clearErrors() {
    this.errors = [];
  }
};
