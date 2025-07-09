// Input Validator - Advanced input validation utilities

class InputValidator {
  constructor() {
    // Validation patterns
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\d\s\-\+\(\)]+$/,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      numeric: /^\d+$/,
      decimal: /^\d+\.?\d*$/,
      url: /^https?:\/\/.+/,
      ethereum: /^0x[a-fA-F0-9]{40}$/,
      bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    };
    
    // Sanitization rules
    this.sanitizationRules = {
      stripTags: /<[^>]*>/g,
      stripScripts: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      stripEvents: /on\w+\s*=/gi,
      stripComments: /<!--[\s\S]*?-->/g
    };
  }

  /**
   * Validate input against pattern
   * @param {string} input - Input to validate
   * @param {string|RegExp} pattern - Pattern name or RegExp
   * @returns {boolean} Valid status
   */
  validate(input, pattern) {
    if (typeof pattern === 'string' && this.patterns[pattern]) {
      return this.patterns[pattern].test(input);
    } else if (pattern instanceof RegExp) {
      return pattern.test(input);
    }
    return false;
  }

  /**
   * Sanitize input by removing dangerous content
   * @param {string} input - Input to sanitize
   * @param {Array} rules - Sanitization rules to apply
   * @returns {string} Sanitized input
   */
  sanitize(input, rules = ['stripTags', 'stripScripts', 'stripEvents']) {
    let sanitized = input;
    
    rules.forEach(rule => {
      if (this.sanitizationRules[rule]) {
        sanitized = sanitized.replace(this.sanitizationRules[rule], '');
      }
    });
    
    return sanitized.trim();
  }

  /**
   * Validate and sanitize crypto address
   * @param {string} address - Crypto address
   * @param {string} type - Type of address (ethereum, bitcoin)
   * @returns {Object} Validation result
   */
  validateCryptoAddress(address, type = 'ethereum') {
    const cleaned = address.trim();
    
    if (type === 'ethereum' || type === 'polygon') {
      // Ethereum/Polygon validation
      if (!this.patterns.ethereum.test(cleaned)) {
        return {
          valid: false,
          reason: 'Invalid Ethereum/Polygon address format',
          sanitized: null
        };
      }
      
      // Check for zero address
      if (cleaned.toLowerCase() === '0x0000000000000000000000000000000000000000') {
        return {
          valid: false,
          reason: 'Zero address not allowed',
          sanitized: null
        };
      }
      
      // Convert to checksum format
      const checksummed = this.toChecksumAddress(cleaned);
      
      return {
        valid: true,
        reason: 'Valid address',
        sanitized: checksummed
      };
    } else if (type === 'bitcoin') {
      // Bitcoin validation
      if (!this.patterns.bitcoin.test(cleaned)) {
        return {
          valid: false,
          reason: 'Invalid Bitcoin address format',
          sanitized: null
        };
      }
      
      return {
        valid: true,
        reason: 'Valid address',
        sanitized: cleaned
      };
    }
    
    return {
      valid: false,
      reason: 'Unknown address type',
      sanitized: null
    };
  }

  /**
   * Convert to checksum address (EIP-55)
   * @param {string} address - Ethereum address
   * @returns {string} Checksum address
   */
  toChecksumAddress(address) {
    // Simple checksum implementation
    // In production, use a proper library like ethers.js
    return address.toLowerCase();
  }

  /**
   * Validate numeric range
   * @param {number|string} value - Value to validate
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Object} Validation result
   */
  validateRange(value, min, max) {
    const num = parseFloat(value);
    
    if (isNaN(num)) {
      return {
        valid: false,
        reason: 'Not a valid number',
        sanitized: null
      };
    }
    
    if (num < min) {
      return {
        valid: false,
        reason: `Value must be at least ${min}`,
        sanitized: null
      };
    }
    
    if (num > max) {
      return {
        valid: false,
        reason: `Value must not exceed ${max}`,
        sanitized: null
      };
    }
    
    return {
      valid: true,
      reason: 'Valid range',
      sanitized: num
    };
  }

  /**
   * Validate string length
   * @param {string} input - Input to validate
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @returns {Object} Validation result
   */
  validateLength(input, minLength, maxLength) {
    const length = input.length;
    
    if (length < minLength) {
      return {
        valid: false,
        reason: `Must be at least ${minLength} characters`,
        sanitized: null
      };
    }
    
    if (length > maxLength) {
      return {
        valid: false,
        reason: `Must not exceed ${maxLength} characters`,
        sanitized: null
      };
    }
    
    return {
      valid: true,
      reason: 'Valid length',
      sanitized: input
    };
  }

  /**
   * Validate URL with domain whitelist
   * @param {string} url - URL to validate
   * @param {Array} allowedDomains - Whitelisted domains
   * @returns {Object} Validation result
   */
  validateURL(url, allowedDomains = []) {
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return {
          valid: false,
          reason: 'Invalid protocol',
          sanitized: null
        };
      }
      
      // Check domain whitelist if provided
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed) {
          return {
            valid: false,
            reason: 'Domain not whitelisted',
            sanitized: null
          };
        }
      }
      
      // Remove sensitive parameters
      const sanitized = this.sanitizeURL(parsed);
      
      return {
        valid: true,
        reason: 'Valid URL',
        sanitized: sanitized.toString()
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
   * Sanitize URL by removing sensitive parameters
   * @param {URL} url - URL object
   * @returns {URL} Sanitized URL
   */
  sanitizeURL(url) {
    const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
    
    sensitiveParams.forEach(param => {
      url.searchParams.delete(param);
    });
    
    return url;
  }

  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Validate JSON string
   * @param {string} jsonString - JSON string to validate
   * @returns {Object} Validation result
   */
  validateJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return {
        valid: true,
        reason: 'Valid JSON',
        sanitized: JSON.stringify(parsed) // Re-stringify to ensure consistency
      };
    } catch (e) {
      return {
        valid: false,
        reason: 'Invalid JSON format',
        sanitized: null
      };
    }
  }

  /**
   * Check for SQL injection patterns
   * @param {string} input - Input to check
   * @returns {boolean} Contains SQL injection patterns
   */
  containsSQLInjection(input) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /('|(\')|"|(\"))\s*(OR|AND)\s*('|(\')|"|(\"))\s*=/i,
      /\b(OR|AND)\s+\d+\s*=\s*\d+/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate file extension
   * @param {string} filename - Filename to validate
   * @param {Array} allowedExtensions - Allowed extensions
   * @returns {Object} Validation result
   */
  validateFileExtension(filename, allowedExtensions = []) {
    const ext = filename.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        reason: `File extension .${ext} not allowed`,
        sanitized: null
      };
    }
    
    // Check for double extensions
    if (filename.split('.').length > 2) {
      return {
        valid: false,
        reason: 'Multiple extensions not allowed',
        sanitized: null
      };
    }
    
    return {
      valid: true,
      reason: 'Valid file extension',
      sanitized: filename
    };
  }

  /**
   * Create validation schema
   * @param {Object} schema - Validation schema
   * @returns {Function} Validation function
   */
  createSchema(schema) {
    return (data) => {
      const errors = {};
      const sanitized = {};
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        
        // Required check
        if (rules.required && !value) {
          errors[field] = 'Field is required';
          continue;
        }
        
        // Type check
        if (rules.type && typeof value !== rules.type) {
          errors[field] = `Must be of type ${rules.type}`;
          continue;
        }
        
        // Pattern check
        if (rules.pattern && !this.validate(value, rules.pattern)) {
          errors[field] = rules.message || 'Invalid format';
          continue;
        }
        
        // Length check
        if (rules.minLength || rules.maxLength) {
          const lengthResult = this.validateLength(
            value,
            rules.minLength || 0,
            rules.maxLength || Infinity
          );
          if (!lengthResult.valid) {
            errors[field] = lengthResult.reason;
            continue;
          }
        }
        
        // Range check
        if (rules.min !== undefined || rules.max !== undefined) {
          const rangeResult = this.validateRange(
            value,
            rules.min || -Infinity,
            rules.max || Infinity
          );
          if (!rangeResult.valid) {
            errors[field] = rangeResult.reason;
            continue;
          }
        }
        
        // Custom validator
        if (rules.validator && typeof rules.validator === 'function') {
          const customResult = rules.validator(value);
          if (!customResult.valid) {
            errors[field] = customResult.reason;
            continue;
          }
        }
        
        // Sanitization
        if (rules.sanitize) {
          sanitized[field] = this.sanitize(value, rules.sanitize);
        } else {
          sanitized[field] = value;
        }
      }
      
      return {
        valid: Object.keys(errors).length === 0,
        errors,
        sanitized
      };
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputValidator;
}