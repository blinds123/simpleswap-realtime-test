// Security Manager - Comprehensive security implementation for production

class SecurityManager {
  constructor() {
    this.rateLimits = new Map();
    this.securityEvents = [];
    this.csrfToken = this.generateCSRFToken();
    this.sessionId = this.generateSessionId();
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // Security configuration
    this.config = {
      maxRateLimit: 10, // requests per minute
      rateLimitWindow: 60000, // 1 minute in ms
      maxSecurityEvents: 1000,
      enableCSP: true,
      enableXSSProtection: true,
      enableClickjacking: true
    };
    
    this.initializeSecurity();
  }

  /**
   * Initialize security features
   */
  initializeSecurity() {
    // Set up CSP headers (meta tag approach for client-side)
    if (this.config.enableCSP) {
      this.setupContentSecurityPolicy();
    }
    
    // Set up XSS protection
    if (this.config.enableXSSProtection) {
      this.setupXSSProtection();
    }
    
    // Set up clickjacking protection
    if (this.config.enableClickjacking) {
      this.setupClickjackingProtection();
    }
    
    // Monitor security events
    this.setupSecurityEventListeners();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[SecurityManager] Security features initialized');
    }
  }

  /**
   * Set up Content Security Policy
   */
  setupContentSecurityPolicy() {
    // Check if CSP meta tag already exists
    if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      const cspMeta = document.createElement('meta');
      cspMeta.httpEquiv = 'Content-Security-Policy';
      cspMeta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://simpleswap.io https://api.simpleswap.io https://ipapi.co",
        "font-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ');
      
      document.head.appendChild(cspMeta);
    }
  }

  /**
   * Set up XSS Protection headers
   */
  setupXSSProtection() {
    // X-XSS-Protection header (meta tag approach)
    if (!document.querySelector('meta[http-equiv="X-XSS-Protection"]')) {
      const xssMeta = document.createElement('meta');
      xssMeta.httpEquiv = 'X-XSS-Protection';
      xssMeta.content = '1; mode=block';
      document.head.appendChild(xssMeta);
    }
    
    // X-Content-Type-Options header
    if (!document.querySelector('meta[http-equiv="X-Content-Type-Options"]')) {
      const contentTypeMeta = document.createElement('meta');
      contentTypeMeta.httpEquiv = 'X-Content-Type-Options';
      contentTypeMeta.content = 'nosniff';
      document.head.appendChild(contentTypeMeta);
    }
  }

  /**
   * Set up clickjacking protection
   */
  setupClickjackingProtection() {
    // X-Frame-Options header
    if (!document.querySelector('meta[http-equiv="X-Frame-Options"]')) {
      const frameMeta = document.createElement('meta');
      frameMeta.httpEquiv = 'X-Frame-Options';
      frameMeta.content = 'DENY';
      document.head.appendChild(frameMeta);
    }
    
    // Frame-busting script
    if (window.self !== window.top) {
      this.logSecurityEvent('clickjacking_attempt', {
        referrer: document.referrer,
        location: window.location.href
      });
      
      // Attempt to break out of frame
      try {
        window.top.location = window.self.location;
      } catch (e) {
        // If we can't break out, hide the content
        document.body.style.display = 'none';
        this.logSecurityEvent('clickjacking_blocked', {
          error: e.message
        });
      }
    }
  }

  /**
   * Validate input based on type
   * @param {string} input - Input to validate
   * @param {string} type - Type of input (wallet, amount, url, etc.)
   * @returns {Object} Validation result
   */
  validateInput(input, type) {
    const validators = {
      wallet: this.validateWalletAddress.bind(this),
      amount: this.validateAmount.bind(this),
      url: this.validateURL.bind(this),
      currency: this.validateCurrency.bind(this),
      general: this.validateGeneral.bind(this)
    };
    
    const validator = validators[type] || validators.general;
    const result = validator(input);
    
    if (!result.valid) {
      this.logSecurityEvent('validation_failed', {
        type,
        reason: result.reason
      });
    }
    
    return result;
  }

  /**
   * Validate wallet address (Ethereum format)
   * @param {string} address - Wallet address
   * @returns {Object} Validation result
   */
  validateWalletAddress(address) {
    // Remove any whitespace
    const cleaned = address.trim();
    
    // Check basic format
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
      return {
        valid: false,
        reason: 'Invalid wallet address format',
        sanitized: null
      };
    }
    
    // Additional security checks
    if (cleaned.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      return {
        valid: false,
        reason: 'Null address not allowed',
        sanitized: null
      };
    }
    
    return {
      valid: true,
      reason: 'Valid wallet address',
      sanitized: cleaned
    };
  }

  /**
   * Validate amount
   * @param {number|string} amount - Amount to validate
   * @returns {Object} Validation result
   */
  validateAmount(amount) {
    const parsed = parseFloat(amount);
    
    if (isNaN(parsed) || parsed <= 0) {
      return {
        valid: false,
        reason: 'Invalid amount',
        sanitized: null
      };
    }
    
    // Check for reasonable limits
    if (parsed > 1000000) {
      return {
        valid: false,
        reason: 'Amount exceeds maximum limit',
        sanitized: null
      };
    }
    
    // Round to 2 decimal places
    const sanitized = Math.round(parsed * 100) / 100;
    
    return {
      valid: true,
      reason: 'Valid amount',
      sanitized: sanitized
    };
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {Object} Validation result
   */
  validateURL(url) {
    try {
      const parsed = new URL(url);
      
      // Only allow HTTPS in production
      if (parsed.protocol !== 'https:' && !DEV_CONFIG.testMode) {
        return {
          valid: false,
          reason: 'Only HTTPS URLs allowed',
          sanitized: null
        };
      }
      
      // Whitelist allowed domains
      const allowedDomains = ['simpleswap.io', 'api.simpleswap.io', 'ipapi.co'];
      if (!allowedDomains.some(domain => parsed.hostname.endsWith(domain))) {
        return {
          valid: false,
          reason: 'Domain not whitelisted',
          sanitized: null
        };
      }
      
      return {
        valid: true,
        reason: 'Valid URL',
        sanitized: parsed.toString()
      };
    } catch (e) {
      return {
        valid: false,
        reason: 'Invalid URL format',
        sanitized: null
      };
    }
  }

  /**
   * Validate currency code
   * @param {string} currency - Currency code
   * @returns {Object} Validation result
   */
  validateCurrency(currency) {
    const allowed = ['eur', 'matic', 'btc', 'eth', 'usdt', 'usdc'];
    const cleaned = currency.toLowerCase().trim();
    
    if (!allowed.includes(cleaned)) {
      return {
        valid: false,
        reason: 'Currency not supported',
        sanitized: null
      };
    }
    
    return {
      valid: true,
      reason: 'Valid currency',
      sanitized: cleaned
    };
  }

  /**
   * General input validation (XSS prevention)
   * @param {string} input - Input to validate
   * @returns {Object} Validation result
   */
  validateGeneral(input) {
    if (typeof input !== 'string') {
      return {
        valid: false,
        reason: 'Input must be a string',
        sanitized: null
      };
    }
    
    // Check for common XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*onerror/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        this.logSecurityEvent('xss_attempt_blocked', {
          pattern: pattern.toString()
        });
        return {
          valid: false,
          reason: 'Potentially malicious content detected',
          sanitized: null
        };
      }
    }
    
    // Sanitize by escaping HTML entities
    const sanitized = this.escapeHtml(input);
    
    return {
      valid: true,
      reason: 'Input sanitized',
      sanitized: sanitized
    };
  }

  /**
   * Escape HTML entities
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Check rate limit for an action
   * @param {string} action - Action identifier
   * @param {string} identifier - User/session identifier
   * @returns {boolean} Whether action is allowed
   */
  checkRateLimit(action, identifier = this.sessionId) {
    const key = `${action}:${identifier}`;
    const now = Date.now();
    
    // Get existing rate limit data
    let rateData = this.rateLimits.get(key);
    
    if (!rateData) {
      rateData = {
        count: 0,
        resetTime: now + this.config.rateLimitWindow
      };
      this.rateLimits.set(key, rateData);
    }
    
    // Reset if window has passed
    if (now > rateData.resetTime) {
      rateData.count = 0;
      rateData.resetTime = now + this.config.rateLimitWindow;
    }
    
    // Check if limit exceeded
    if (rateData.count >= this.config.maxRateLimit) {
      this.logSecurityEvent('rate_limit_exceeded', {
        action,
        identifier,
        count: rateData.count
      });
      return false;
    }
    
    // Increment count
    rateData.count++;
    return true;
  }

  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verify CSRF token
   * @param {string} token - Token to verify
   * @returns {boolean} Valid token
   */
  verifyCSRFToken(token) {
    const isValid = token === this.csrfToken;
    
    if (!isValid) {
      this.logSecurityEvent('csrf_token_mismatch', {
        provided: token ? 'incorrect' : 'missing'
      });
    }
    
    return isValid;
  }

  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {Object} details - Event details
   */
  logSecurityEvent(eventType, details = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      details: details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Add to events array
    this.securityEvents.push(event);
    
    // Limit array size
    if (this.securityEvents.length > this.config.maxSecurityEvents) {
      this.securityEvents.shift();
    }
    
    // Emit security event
    this.eventEmitter.dispatchEvent(new CustomEvent('security:event', {
      detail: event
    }));
    
    // Log to console in dev mode
    if (DEV_CONFIG.enableLogging) {
      console.warn('[SecurityManager] Security Event:', event);
    }
    
    // For critical events, could send to monitoring service
    const criticalEvents = ['xss_attempt_blocked', 'clickjacking_attempt', 'csrf_token_mismatch'];
    if (criticalEvents.includes(eventType)) {
      this.reportCriticalEvent(event);
    }
  }

  /**
   * Report critical security event
   * @param {Object} event - Security event
   */
  reportCriticalEvent(event) {
    // In production, this would send to a monitoring service
    // For now, just log prominently
    console.error('[SECURITY ALERT]', event);
  }

  /**
   * Set up security event listeners
   */
  setupSecurityEventListeners() {
    // Monitor console access attempts
    const consoleWarn = console.warn;
    console.warn = (...args) => {
      if (args[0] && args[0].includes('DevTools')) {
        this.logSecurityEvent('devtools_detection', {
          message: args[0]
        });
      }
      consoleWarn.apply(console, args);
    };
    
    // Monitor suspicious clipboard access
    document.addEventListener('copy', (e) => {
      if (e.target && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        this.logSecurityEvent('clipboard_access', {
          target: e.target.tagName,
          selection: window.getSelection().toString().substring(0, 50)
        });
      }
    });
  }

  /**
   * Get security headers for fetch requests
   * @returns {Object} Security headers
   */
  getSecurityHeaders() {
    return {
      'X-CSRF-Token': this.csrfToken,
      'X-Session-ID': this.sessionId,
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  /**
   * Get security report
   * @returns {Object} Security report
   */
  getSecurityReport() {
    const eventCounts = {};
    this.securityEvents.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });
    
    return {
      sessionId: this.sessionId,
      totalEvents: this.securityEvents.length,
      eventCounts: eventCounts,
      rateLimits: Array.from(this.rateLimits.entries()).map(([key, data]) => ({
        key,
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
      })),
      lastEvents: this.securityEvents.slice(-10)
    };
  }

  /**
   * Clear rate limits (for testing)
   */
  clearRateLimits() {
    this.rateLimits.clear();
  }

  /**
   * Get CSRF token
   * @returns {string} CSRF token
   */
  getCSRFToken() {
    return this.csrfToken;
  }

  /**
   * Get session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.sessionId;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityManager;
}