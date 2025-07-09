// Request Handler - Simplified request handling utilities

class RequestHandler {
  constructor() {
    this.pendingRequests = new Map();
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      averageTime: 0
    };
  }

  /**
   * Make a simple GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * Make a simple POST request
   * @param {string} url - Request URL
   * @param {*} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * Make a generic request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async request(url, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    // Track pending request
    this.pendingRequests.set(requestId, { url, startTime });
    
    try {
      // Apply default options
      const requestOptions = {
        mode: 'cors',
        credentials: 'same-origin',
        ...options
      };
      
      // Add timeout if specified
      if (options.timeout) {
        requestOptions.signal = this.createTimeout(options.timeout);
      }
      
      // Make request
      const response = await fetch(url, requestOptions);
      
      // Handle response
      const result = await this.handleResponse(response);
      
      // Update stats
      this.updateStats(true, Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // Update stats
      this.updateStats(false, Date.now() - startTime);
      
      // Enhance error
      error.requestId = requestId;
      error.url = url;
      throw error;
      
    } finally {
      // Remove from pending
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Handle response
   * @param {Response} response - Fetch response
   * @returns {Promise<*>} Parsed response
   */
  async handleResponse(response) {
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      
      // Try to parse error body
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          error.data = await response.json();
        } else {
          error.data = await response.text();
        }
      } catch (e) {
        // Ignore parsing errors
      }
      
      throw error;
    }
    
    // Parse successful response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else if (contentType && contentType.includes('text')) {
      return response.text();
    } else {
      return response.blob();
    }
  }

  /**
   * Create timeout signal
   * @param {number} timeout - Timeout in ms
   * @returns {AbortSignal} Abort signal
   */
  createTimeout(timeout) {
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeout);
      return controller.signal;
    }
    return undefined;
  }

  /**
   * Generate request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update request statistics
   * @param {boolean} success - Success status
   * @param {number} duration - Request duration
   */
  updateStats(success, duration) {
    this.requestStats.total++;
    
    if (success) {
      this.requestStats.successful++;
    } else {
      this.requestStats.failed++;
    }
    
    // Update average time
    const currentAvg = this.requestStats.averageTime;
    const totalRequests = this.requestStats.total;
    this.requestStats.averageTime = ((currentAvg * (totalRequests - 1)) + duration) / totalRequests;
  }

  /**
   * Cancel pending request
   * @param {string} requestId - Request ID
   */
  cancelRequest(requestId) {
    const request = this.pendingRequests.get(requestId);
    if (request && request.controller) {
      request.controller.abort();
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    this.pendingRequests.forEach((request, id) => {
      if (request.controller) {
        request.controller.abort();
      }
    });
    this.pendingRequests.clear();
  }

  /**
   * Get request statistics
   * @returns {Object} Request statistics
   */
  getStats() {
    return {
      ...this.requestStats,
      pending: this.pendingRequests.size,
      successRate: this.requestStats.total > 0 
        ? (this.requestStats.successful / this.requestStats.total) * 100 
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      averageTime: 0
    };
  }

  /**
   * Build URL with query parameters
   * @param {string} url - Base URL
   * @param {Object} params - Query parameters
   * @returns {string} Complete URL
   */
  buildURL(url, params = {}) {
    const urlObj = new URL(url);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, value);
      }
    });
    
    return urlObj.toString();
  }

  /**
   * Create form data from object
   * @param {Object} data - Data object
   * @returns {FormData} Form data
   */
  createFormData(data) {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File || value instanceof Blob) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    
    return formData;
  }

  /**
   * Simple retry wrapper
   * @param {Function} fn - Function to retry
   * @param {number} retries - Number of retries
   * @param {number} delay - Delay between retries
   * @returns {Promise<*>} Function result
   */
  async retry(fn, retries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RequestHandler;
}