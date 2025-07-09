// API Manager - Enhanced API integration with circuit breaker pattern

class APIManager {
  constructor() {
    this.endpoints = new Map();
    this.circuitBreakers = new Map();
    this.requestQueue = [];
    this.cache = null; // Will be initialized with CacheManager
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // API configuration
    this.config = {
      baseTimeout: 10000, // 10 seconds
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        halfOpenRequests: 3
      },
      rateLimiting: {
        maxRequests: 10,
        timeWindow: 60000 // 1 minute
      },
      caching: {
        enabled: true,
        defaultTTL: 300000 // 5 minutes
      }
    };
    
    this.initializeAPIManager();
  }

  /**
   * Initialize API Manager
   */
  initializeAPIManager() {
    // Register API endpoints
    this.registerEndpoints();
    
    // Initialize cache if available
    if (typeof CacheManager !== 'undefined') {
      this.cache = new CacheManager();
    }
    
    // Set up request interceptors
    this.setupInterceptors();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[APIManager] API Manager initialized');
    }
  }

  /**
   * Register API endpoints
   */
  registerEndpoints() {
    // SimpleSwap endpoints
    this.registerEndpoint('simpleswap', {
      baseURL: SIMPLESWAP_CONFIG.baseUrl || 'https://api.simpleswap.io',
      endpoints: {
        getCurrencies: '/get_all_currencies',
        getEstimated: '/get_estimated',
        createExchange: '/create_exchange',
        getExchange: '/get_exchange'
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Geolocation endpoint
    this.registerEndpoint('geolocation', {
      baseURL: 'https://ipapi.co',
      endpoints: {
        getLocation: '/json/'
      }
    });
  }

  /**
   * Register an endpoint configuration
   * @param {string} name - Endpoint name
   * @param {Object} config - Endpoint configuration
   */
  registerEndpoint(name, config) {
    this.endpoints.set(name, config);
    
    // Initialize circuit breaker for this endpoint
    this.circuitBreakers.set(name, {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      successCount: 0
    });
  }

  /**
   * Make API request with retry and circuit breaker
   * @param {string} endpointName - Endpoint name
   * @param {string} path - API path
   * @param {Object} options - Request options
   * @returns {Promise<*>} Response data
   */
  async makeRequest(endpointName, path, options = {}) {
    const {
      method = 'GET',
      params = {},
      data = null,
      headers = {},
      timeout = this.config.baseTimeout,
      cache = this.config.caching.enabled,
      cacheTTL = this.config.caching.defaultTTL,
      skipCircuitBreaker = false
    } = options;
    
    // Check circuit breaker
    if (!skipCircuitBreaker && !this.canMakeRequest(endpointName)) {
      throw new Error(`Circuit breaker OPEN for ${endpointName}`);
    }
    
    // Check cache for GET requests
    if (method === 'GET' && cache && this.cache) {
      const cacheKey = this.getCacheKey(endpointName, path, params);
      const cached = this.cache.get(cacheKey);
      if (cached !== null) {
        if (DEV_CONFIG.enableLogging) {
          console.log(`[APIManager] Cache hit for ${cacheKey}`);
        }
        return cached;
      }
    }
    
    // Build request
    const endpoint = this.endpoints.get(endpointName);
    if (!endpoint) {
      throw new Error(`Unknown endpoint: ${endpointName}`);
    }
    
    const url = this.buildURL(endpoint.baseURL, path, params);
    const requestConfig = {
      method,
      headers: { ...endpoint.headers, ...headers },
      timeout,
      signal: this.createAbortSignal(timeout)
    };
    
    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data);
    }
    
    // Execute request with retry
    try {
      const response = await this.executeWithRetry(
        () => this.executeFetch(url, requestConfig),
        {
          maxRetries: options.maxRetries || this.config.maxRetries,
          retryDelay: options.retryDelay || this.config.retryDelay,
          onRetry: (attempt, error) => {
            console.warn(`[APIManager] Retry ${attempt} for ${url}:`, error.message);
          }
        }
      );
      
      // Update circuit breaker on success
      this.recordSuccess(endpointName);
      
      // Cache successful GET responses
      if (method === 'GET' && cache && this.cache) {
        const cacheKey = this.getCacheKey(endpointName, path, params);
        this.cache.set(cacheKey, response, { ttl: cacheTTL });
      }
      
      return response;
      
    } catch (error) {
      // Update circuit breaker on failure
      this.recordFailure(endpointName);
      
      // Enhance error with context
      error.endpoint = endpointName;
      error.path = path;
      error.method = method;
      
      throw error;
    }
  }

  /**
   * Execute fetch request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<*>} Response data
   */
  async executeFetch(url, config) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, config);
      
      // Log request metrics
      const duration = Date.now() - startTime;
      this.logRequestMetrics(url, config.method, response.status, duration);
      
      // Check response status
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;
        
        // Try to parse error body
        try {
          error.data = await response.json();
        } catch (e) {
          error.data = await response.text();
        }
        
        throw error;
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
      
    } catch (error) {
      // Handle network errors
      if (error.name === 'AbortError') {
        error.message = 'Request timeout';
        error.timeout = true;
      }
      
      throw error;
    }
  }

  /**
   * Execute with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Retry options
   * @returns {Promise<*>} Function result
   */
  async executeWithRetry(fn, options = {}) {
    const {
      maxRetries = this.config.maxRetries,
      retryDelay = this.config.retryDelay,
      onRetry = () => {},
      shouldRetry = (error) => this.isRetryableError(error)
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && shouldRetry(error)) {
          onRetry(attempt + 1, error);
          
          // Calculate delay with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await this.delay(delay);
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Is retryable
   */
  isRetryableError(error) {
    // Network errors
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return true;
    }
    
    // Timeout errors
    if (error.timeout) {
      return true;
    }
    
    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }
    
    // Rate limiting (429)
    if (error.status === 429) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if request can be made (circuit breaker)
   * @param {string} endpointName - Endpoint name
   * @returns {boolean} Can make request
   */
  canMakeRequest(endpointName) {
    const breaker = this.circuitBreakers.get(endpointName);
    if (!breaker) return true;
    
    switch (breaker.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        // Check if reset timeout has passed
        const resetTime = breaker.lastFailureTime + this.config.circuitBreaker.resetTimeout;
        if (Date.now() > resetTime) {
          // Transition to half-open
          breaker.state = 'HALF_OPEN';
          breaker.successCount = 0;
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        // Allow limited requests
        return breaker.successCount < this.config.circuitBreaker.halfOpenRequests;
        
      default:
        return true;
    }
  }

  /**
   * Record successful request
   * @param {string} endpointName - Endpoint name
   */
  recordSuccess(endpointName) {
    const breaker = this.circuitBreakers.get(endpointName);
    if (!breaker) return;
    
    switch (breaker.state) {
      case 'HALF_OPEN':
        breaker.successCount++;
        if (breaker.successCount >= this.config.circuitBreaker.halfOpenRequests) {
          // Transition to closed
          breaker.state = 'CLOSED';
          breaker.failures = 0;
          breaker.successCount = 0;
          console.log(`[APIManager] Circuit breaker CLOSED for ${endpointName}`);
        }
        break;
        
      case 'CLOSED':
        // Reset failure count on success
        breaker.failures = 0;
        break;
    }
  }

  /**
   * Record failed request
   * @param {string} endpointName - Endpoint name
   */
  recordFailure(endpointName) {
    const breaker = this.circuitBreakers.get(endpointName);
    if (!breaker) return;
    
    breaker.failures++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failures >= this.config.circuitBreaker.failureThreshold) {
      if (breaker.state !== 'OPEN') {
        // Transition to open
        breaker.state = 'OPEN';
        console.error(`[APIManager] Circuit breaker OPEN for ${endpointName}`);
        
        // Emit circuit breaker event
        this.eventEmitter.dispatchEvent(new CustomEvent('api:circuitBreakerOpen', {
          detail: { endpoint: endpointName }
        }));
      }
    }
  }

  /**
   * Build URL with parameters
   * @param {string} baseURL - Base URL
   * @param {string} path - Path
   * @param {Object} params - Query parameters
   * @returns {string} Complete URL
   */
  buildURL(baseURL, path, params = {}) {
    const url = new URL(path, baseURL);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    return url.toString();
  }

  /**
   * Get cache key
   * @param {string} endpoint - Endpoint name
   * @param {string} path - Path
   * @param {Object} params - Parameters
   * @returns {string} Cache key
   */
  getCacheKey(endpoint, path, params = {}) {
    const sortedParams = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return `api:${endpoint}:${path}:${sortedParams}`;
  }

  /**
   * Create abort signal for timeout
   * @param {number} timeout - Timeout in ms
   * @returns {AbortSignal} Abort signal
   */
  createAbortSignal(timeout) {
    if (typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), timeout);
      return controller.signal;
    }
    return undefined;
  }

  /**
   * Log request metrics
   * @param {string} url - Request URL
   * @param {string} method - HTTP method
   * @param {number} status - Response status
   * @param {number} duration - Request duration
   */
  logRequestMetrics(url, method, status, duration) {
    this.eventEmitter.dispatchEvent(new CustomEvent('api:request', {
      detail: { url, method, status, duration }
    }));
    
    if (DEV_CONFIG.enableLogging) {
      console.log(`[APIManager] ${method} ${url} - ${status} (${duration}ms)`);
    }
  }

  /**
   * Setup request interceptors
   */
  setupInterceptors() {
    // Add security headers if SecurityManager is available
    if (window.securityManager) {
      this.addInterceptor('request', (config) => {
        const securityHeaders = window.securityManager.getSecurityHeaders();
        config.headers = { ...config.headers, ...securityHeaders };
        return config;
      });
    }
  }

  /**
   * Add request interceptor
   * @param {string} type - Interceptor type (request/response)
   * @param {Function} interceptor - Interceptor function
   */
  addInterceptor(type, interceptor) {
    // Store interceptors for future use
    this.interceptors = this.interceptors || { request: [], response: [] };
    this.interceptors[type].push(interceptor);
  }

  /**
   * Batch multiple requests
   * @param {Array} requests - Array of request configurations
   * @returns {Promise<Array>} Results
   */
  async batchRequests(requests) {
    return Promise.all(requests.map(req => 
      this.makeRequest(req.endpoint, req.path, req.options)
        .catch(error => ({ error, request: req }))
    ));
  }

  /**
   * Get circuit breaker status
   * @returns {Object} Circuit breaker status
   */
  getCircuitBreakerStatus() {
    const status = {};
    
    this.circuitBreakers.forEach((breaker, endpoint) => {
      status[endpoint] = {
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailureTime ? new Date(breaker.lastFailureTime).toISOString() : null
      };
    });
    
    return status;
  }

  /**
   * Reset circuit breaker
   * @param {string} endpointName - Endpoint name
   */
  resetCircuitBreaker(endpointName) {
    const breaker = this.circuitBreakers.get(endpointName);
    if (breaker) {
      breaker.state = 'CLOSED';
      breaker.failures = 0;
      breaker.successCount = 0;
      breaker.lastFailureTime = null;
      
      console.log(`[APIManager] Circuit breaker reset for ${endpointName}`);
    }
  }

  /**
   * Check API health
   * @param {string} endpointName - Endpoint name
   * @returns {Promise<boolean>} Health status
   */
  async checkAPIHealth(endpointName) {
    try {
      const endpoint = this.endpoints.get(endpointName);
      if (!endpoint) return false;
      
      const response = await fetch(endpoint.baseURL, {
        method: 'HEAD',
        timeout: 5000
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   * @param {string} endpointName - Optional endpoint name
   */
  clearCache(endpointName) {
    if (!this.cache) return;
    
    if (endpointName) {
      // Clear specific endpoint cache
      const pattern = `api:${endpointName}:`;
      // Implementation would depend on cache manager
      console.log(`[APIManager] Clearing cache for ${endpointName}`);
    } else {
      // Clear all API cache
      this.cache.clear();
      console.log('[APIManager] API cache cleared');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIManager;
}