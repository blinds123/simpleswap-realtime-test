// Error Handler - Comprehensive error handling with retry mechanisms

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.retryQueue = new Map();
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // Error handling configuration
    this.config = {
      maxErrors: 100,
      retryAttempts: 3,
      retryDelay: 1000, // Base delay in ms
      retryBackoff: 'exponential', // 'linear' or 'exponential'
      enableGlobalErrorHandling: true,
      enableUnhandledRejection: true,
      enableConsoleCapture: true,
      reportingThreshold: 5 // Errors per minute before alerting
    };
    
    // Error patterns for classification
    this.errorPatterns = {
      network: /network|fetch|xhr|cors|ERR_INTERNET_DISCONNECTED/i,
      timeout: /timeout|timed out|deadline/i,
      rateLimit: /rate limit|too many requests|429/i,
      auth: /unauthorized|401|403|forbidden/i,
      validation: /validation|invalid|required/i,
      browser: /not supported|incompatible/i
    };
    
    this.initializeErrorHandling();
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // Set up global error handlers
    if (this.config.enableGlobalErrorHandling) {
      this.setupGlobalErrorHandler();
    }
    
    // Set up unhandled promise rejection handler
    if (this.config.enableUnhandledRejection) {
      this.setupUnhandledRejectionHandler();
    }
    
    // Capture console errors
    if (this.config.enableConsoleCapture) {
      this.setupConsoleCapture();
    }
    
    // Set up error reporting interval
    this.setupErrorReporting();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[ErrorHandler] Error handling initialized');
    }
  }

  /**
   * Set up global error handler
   */
  setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'global',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
      });
      
      // Prevent default error handling in production
      if (!DEV_CONFIG.testMode) {
        event.preventDefault();
      }
    });
  }

  /**
   * Set up unhandled promise rejection handler
   */
  setupUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandledRejection',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        reason: event.reason,
        promise: event.promise,
        stack: event.reason?.stack
      });
      
      // Prevent default handling in production
      if (!DEV_CONFIG.testMode) {
        event.preventDefault();
      }
    });
  }

  /**
   * Set up console error capture
   */
  setupConsoleCapture() {
    const originalError = console.error;
    console.error = (...args) => {
      this.handleError({
        type: 'console',
        message: args.join(' '),
        args: args,
        stack: new Error().stack
      });
      
      // Call original console.error
      originalError.apply(console, args);
    };
  }

  /**
   * Handle error with classification and retry logic
   * @param {Object} errorInfo - Error information
   * @param {Object} context - Additional context
   */
  handleError(errorInfo, context = {}) {
    // Create error record
    const errorRecord = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      ...errorInfo,
      context: context,
      category: this.classifyError(errorInfo),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Store error
    this.storeError(errorRecord);
    
    // Emit error event
    this.eventEmitter.dispatchEvent(new CustomEvent('error:occurred', {
      detail: errorRecord
    }));
    
    // Log in development
    if (DEV_CONFIG.enableLogging) {
      console.warn('[ErrorHandler] Error captured:', errorRecord);
    }
    
    // Handle based on category
    this.handleErrorByCategory(errorRecord);
    
    // Show user-friendly message
    this.showUserMessage(errorRecord);
    
    return errorRecord;
  }

  /**
   * Classify error based on patterns
   * @param {Object} errorInfo - Error information
   * @returns {string} Error category
   */
  classifyError(errorInfo) {
    const message = errorInfo.message || '';
    
    for (const [category, pattern] of Object.entries(this.errorPatterns)) {
      if (pattern.test(message)) {
        return category;
      }
    }
    
    // Check error type
    if (errorInfo.type === 'unhandledRejection') {
      return 'async';
    }
    
    if (errorInfo.filename && errorInfo.filename.includes('extension://')) {
      return 'extension';
    }
    
    return 'unknown';
  }

  /**
   * Handle error based on category
   * @param {Object} errorRecord - Error record
   */
  handleErrorByCategory(errorRecord) {
    switch (errorRecord.category) {
      case 'network':
        this.handleNetworkError(errorRecord);
        break;
      case 'timeout':
        this.handleTimeoutError(errorRecord);
        break;
      case 'rateLimit':
        this.handleRateLimitError(errorRecord);
        break;
      case 'auth':
        this.handleAuthError(errorRecord);
        break;
      case 'validation':
        this.handleValidationError(errorRecord);
        break;
      case 'browser':
        this.handleBrowserError(errorRecord);
        break;
      default:
        this.handleGenericError(errorRecord);
    }
  }

  /**
   * Handle network errors with retry
   * @param {Object} errorRecord - Error record
   */
  handleNetworkError(errorRecord) {
    if (errorRecord.context.retryable !== false) {
      this.scheduleRetry(errorRecord);
    }
  }

  /**
   * Handle timeout errors
   * @param {Object} errorRecord - Error record
   */
  handleTimeoutError(errorRecord) {
    if (errorRecord.context.retryable !== false) {
      this.scheduleRetry(errorRecord);
    }
  }

  /**
   * Handle rate limit errors
   * @param {Object} errorRecord - Error record
   */
  handleRateLimitError(errorRecord) {
    // Extract retry-after header if available
    const retryAfter = errorRecord.context.retryAfter || 60000; // Default 1 minute
    this.scheduleRetry(errorRecord, { delay: retryAfter });
  }

  /**
   * Handle auth errors
   * @param {Object} errorRecord - Error record
   */
  handleAuthError(errorRecord) {
    // Emit auth failure event
    this.eventEmitter.dispatchEvent(new CustomEvent('error:auth', {
      detail: errorRecord
    }));
  }

  /**
   * Handle validation errors
   * @param {Object} errorRecord - Error record
   */
  handleValidationError(errorRecord) {
    // Validation errors typically don't need retry
    console.warn('[ErrorHandler] Validation error:', errorRecord.message);
  }

  /**
   * Handle browser compatibility errors
   * @param {Object} errorRecord - Error record
   */
  handleBrowserError(errorRecord) {
    // Show browser compatibility message
    this.showUserMessage({
      ...errorRecord,
      userMessage: 'Your browser may not support all features. Please update to the latest version.'
    });
  }

  /**
   * Handle generic errors
   * @param {Object} errorRecord - Error record
   */
  handleGenericError(errorRecord) {
    // Log for monitoring
    console.error('[ErrorHandler] Unclassified error:', errorRecord);
  }

  /**
   * Schedule retry for failed operation
   * @param {Object} errorRecord - Error record
   * @param {Object} options - Retry options
   */
  scheduleRetry(errorRecord, options = {}) {
    const {
      maxAttempts = this.config.retryAttempts,
      delay = this.config.retryDelay,
      backoff = this.config.retryBackoff
    } = options;
    
    const retryKey = errorRecord.context.retryKey || errorRecord.id;
    let retryInfo = this.retryQueue.get(retryKey) || {
      attempts: 0,
      originalError: errorRecord
    };
    
    retryInfo.attempts++;
    
    if (retryInfo.attempts > maxAttempts) {
      console.error('[ErrorHandler] Max retry attempts reached for:', retryKey);
      this.retryQueue.delete(retryKey);
      
      // Emit max retries event
      this.eventEmitter.dispatchEvent(new CustomEvent('error:maxRetries', {
        detail: errorRecord
      }));
      return;
    }
    
    // Calculate delay based on backoff strategy
    const retryDelay = backoff === 'exponential' ? 
      delay * Math.pow(2, retryInfo.attempts - 1) : 
      delay * retryInfo.attempts;
    
    this.retryQueue.set(retryKey, retryInfo);
    
    console.log(`[ErrorHandler] Scheduling retry ${retryInfo.attempts}/${maxAttempts} in ${retryDelay}ms`);
    
    setTimeout(() => {
      this.executeRetry(retryKey, retryInfo);
    }, retryDelay);
  }

  /**
   * Execute retry
   * @param {string} retryKey - Retry key
   * @param {Object} retryInfo - Retry information
   */
  async executeRetry(retryKey, retryInfo) {
    const { originalError } = retryInfo;
    const retryFunction = originalError.context.retryFunction;
    
    if (!retryFunction || typeof retryFunction !== 'function') {
      console.error('[ErrorHandler] No retry function provided for:', retryKey);
      this.retryQueue.delete(retryKey);
      return;
    }
    
    try {
      console.log(`[ErrorHandler] Executing retry for: ${retryKey}`);
      const result = await retryFunction();
      
      // Success - remove from retry queue
      this.retryQueue.delete(retryKey);
      
      // Emit retry success event
      this.eventEmitter.dispatchEvent(new CustomEvent('error:retrySuccess', {
        detail: { retryKey, attempts: retryInfo.attempts, result }
      }));
      
    } catch (error) {
      // Retry failed - handle the new error
      this.handleError({
        ...originalError,
        message: `Retry failed: ${error.message}`,
        retryAttempt: retryInfo.attempts
      }, originalError.context);
    }
  }

  /**
   * Show user-friendly error message
   * @param {Object} errorRecord - Error record
   */
  showUserMessage(errorRecord) {
    let message = errorRecord.userMessage;
    
    if (!message) {
      // Generate user-friendly message based on category
      switch (errorRecord.category) {
        case 'network':
          message = 'Connection error. Please check your internet connection.';
          break;
        case 'timeout':
          message = 'The request took too long. Please try again.';
          break;
        case 'rateLimit':
          message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 'auth':
          message = 'Authentication required. Please log in.';
          break;
        case 'validation':
          message = 'Please check your input and try again.';
          break;
        default:
          message = UI_CONFIG.messages.generalError;
      }
    }
    
    // Emit event for UI to handle
    this.eventEmitter.dispatchEvent(new CustomEvent('error:showMessage', {
      detail: { message, category: errorRecord.category }
    }));
  }

  /**
   * Store error record
   * @param {Object} errorRecord - Error record
   */
  storeError(errorRecord) {
    this.errors.push(errorRecord);
    
    // Limit array size
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }
  }

  /**
   * Generate unique error ID
   * @returns {string} Error ID
   */
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set up error reporting
   */
  setupErrorReporting() {
    // Report errors periodically
    setInterval(() => {
      this.reportErrors();
    }, 60000); // Every minute
  }

  /**
   * Report errors to monitoring service
   */
  reportErrors() {
    const recentErrors = this.getRecentErrors(60000); // Last minute
    
    if (recentErrors.length >= this.config.reportingThreshold) {
      console.warn(`[ErrorHandler] High error rate: ${recentErrors.length} errors in the last minute`);
      
      // In production, send to monitoring service
      this.eventEmitter.dispatchEvent(new CustomEvent('error:highRate', {
        detail: {
          count: recentErrors.length,
          errors: recentErrors
        }
      }));
    }
  }

  /**
   * Get recent errors
   * @param {number} timeWindow - Time window in ms
   * @returns {Array} Recent errors
   */
  getRecentErrors(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errors.length,
      byCategory: {},
      byType: {},
      recentErrors: this.getRecentErrors(300000), // Last 5 minutes
      retryQueue: this.retryQueue.size
    };
    
    // Count by category
    this.errors.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Create error boundary wrapper
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped function
   */
  createErrorBoundary(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError({
          type: 'boundary',
          message: error.message,
          error: error,
          stack: error.stack
        }, {
          ...context,
          functionName: fn.name,
          arguments: args
        });
        
        // Re-throw if specified
        if (context.rethrow) {
          throw error;
        }
      }
    };
  }

  /**
   * Wrap function with retry logic
   * @param {Function} fn - Function to wrap
   * @param {Object} options - Retry options
   * @returns {Function} Wrapped function
   */
  withRetry(fn, options = {}) {
    return async (...args) => {
      const retryKey = options.retryKey || `retry_${Date.now()}`;
      
      try {
        return await fn(...args);
      } catch (error) {
        const errorRecord = this.handleError({
          type: 'retry',
          message: error.message,
          error: error,
          stack: error.stack
        }, {
          retryable: true,
          retryKey: retryKey,
          retryFunction: () => fn(...args),
          ...options
        });
        
        throw error;
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}