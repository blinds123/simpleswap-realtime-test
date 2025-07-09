// Security Configuration - Comprehensive security settings

const SecurityConfig = {
  // Content Security Policy
  csp: {
    enabled: true,
    reportOnly: false,
    reportUri: process.env.CSP_REPORT_URI || null,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://api.simpleswap.io', 'https://exchange.mercuryo.io'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https://api.simpleswap.io', 'https://api.mercuryo.io', 'https://ipapi.co', 'https://exchange.mercuryo.io'],
      'frame-src': ["'self'", 'https://exchange.mercuryo.io'],
      'frame-ancestors': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
      'block-all-mixed-content': []
    },
    
    // Nonce generation for inline scripts
    nonce: {
      enabled: true,
      algorithm: 'sha256',
      length: 16
    }
  },
  
  // Security Headers
  headers: {
    'Strict-Transport-Security': {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    'X-Frame-Options': {
      enabled: true,
      value: 'DENY'
    },
    'X-Content-Type-Options': {
      enabled: true,
      value: 'nosniff'
    },
    'X-XSS-Protection': {
      enabled: true,
      value: '1; mode=block'
    },
    'Referrer-Policy': {
      enabled: true,
      value: 'strict-origin-when-cross-origin'
    },
    'Permissions-Policy': {
      enabled: true,
      directives: {
        'accelerometer': ['none'],
        'camera': ['none'],
        'geolocation': ['self'],
        'gyroscope': ['none'],
        'magnetometer': ['none'],
        'microphone': ['none'],
        'payment': ['self', 'https://exchange.mercuryo.io'],
        'usb': ['none']
      }
    },
    'Cross-Origin-Resource-Policy': {
      enabled: true,
      value: 'same-origin'
    },
    'Cross-Origin-Opener-Policy': {
      enabled: true,
      value: 'same-origin'
    },
    'Cross-Origin-Embedder-Policy': {
      enabled: true,
      value: 'require-corp'
    }
  },
  
  // Input Validation Rules
  validation: {
    // Wallet address patterns
    walletPatterns: {
      bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
      ethereum: /^0x[a-fA-F0-9]{40}$/,
      polygon: /^0x[a-fA-F0-9]{40}$/,
      litecoin: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
      ripple: /^r[a-zA-Z0-9]{24,34}$/
    },
    
    // Input sanitization rules
    sanitization: {
      stripTags: true,
      escapeHtml: true,
      maxLength: {
        default: 1000,
        walletAddress: 100,
        email: 254,
        url: 2048
      },
      
      // Dangerous patterns to block
      blacklistPatterns: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /eval\s*\(/gi,
        /expression\s*\(/gi
      ],
      
      // Safe HTML tags (if HTML is allowed)
      allowedTags: ['b', 'i', 'em', 'strong', 'span', 'p', 'br'],
      allowedAttributes: {
        'span': ['class'],
        'p': ['class']
      }
    },
    
    // Rate limiting for form submissions
    formRateLimiting: {
      maxAttempts: 5,
      timeWindow: 300000, // 5 minutes
      blockDuration: 900000 // 15 minutes
    }
  },
  
  // CORS Configuration
  cors: {
    enabled: true,
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://simpleswap.io'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  
  // Authentication & Session Security
  session: {
    name: 'session_id',
    secret: process.env.SESSION_SECRET || generateSecureRandom(32),
    duration: 3600000, // 1 hour
    activeDuration: 900000, // 15 minutes extension on activity
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict',
    
    // Session storage
    storage: {
      type: 'memory', // or 'redis' for production
      prefix: 'sess:',
      ttl: 3600 // seconds
    }
  },
  
  // API Security
  api: {
    // API Key management
    keys: {
      headerName: 'X-API-Key',
      storage: 'encrypted',
      rotation: {
        enabled: true,
        interval: 2592000000 // 30 days
      }
    },
    
    // Request signing
    signing: {
      enabled: true,
      algorithm: 'HMAC-SHA256',
      headerName: 'X-Signature',
      includeTimestamp: true,
      timestampTolerance: 300000 // 5 minutes
    },
    
    // Request validation
    validation: {
      maxBodySize: 1048576, // 1MB
      maxUrlLength: 2048,
      allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded'],
      rejectUnknownFields: true
    }
  },
  
  // Crypto Configuration
  crypto: {
    // Encryption settings
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: 100000,
      saltLength: 32,
      tagLength: 16
    },
    
    // Hashing settings
    hashing: {
      algorithm: 'sha256',
      encoding: 'hex'
    },
    
    // Random generation
    random: {
      algorithm: 'crypto.getRandomValues',
      fallback: 'Math.random' // Only for non-critical uses
    }
  },
  
  // XSS Protection
  xss: {
    enabled: true,
    mode: 'sanitize', // 'sanitize' or 'reject'
    
    // DOM purification settings
    domPurify: {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'p', 'br', 'a'],
      ALLOWED_ATTR: ['href', 'class', 'id', 'target'],
      ALLOW_DATA_ATTR: false,
      USE_PROFILES: { html: true }
    }
  },
  
  // SQL Injection Protection
  sqlInjection: {
    enabled: true,
    parameterizedQueries: true,
    escapeUserInput: true,
    
    // Dangerous SQL patterns to block
    blacklistPatterns: [
      /(\b)(union)(\b)/gi,
      /(\b)(select)(\b).*(\b)(from)(\b)/gi,
      /(\b)(insert)(\b).*(\b)(into)(\b)/gi,
      /(\b)(update)(\b).*(\b)(set)(\b)/gi,
      /(\b)(delete)(\b).*(\b)(from)(\b)/gi,
      /(\b)(drop)(\b).*(\b)(table)(\b)/gi,
      /(\b)(exec(ute)?)(\b)/gi,
      /;.*--/g
    ]
  },
  
  // File Upload Security
  fileUpload: {
    enabled: false, // No file uploads in this app
    maxFileSize: 5242880, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
    scanForVirus: true,
    storageLocation: '/secure/uploads/',
    randomizeFilenames: true
  },
  
  // Brute Force Protection
  bruteForce: {
    enabled: true,
    maxAttempts: {
      perIP: 10,
      perAccount: 5,
      global: 1000
    },
    timeWindow: 900000, // 15 minutes
    blockDuration: 3600000, // 1 hour
    
    // Progressive delays
    delays: {
      base: 500, // ms
      multiplier: 2,
      maxDelay: 30000 // 30 seconds
    }
  },
  
  // Security Monitoring
  monitoring: {
    // Security event logging
    logging: {
      enabled: true,
      logLevel: 'warn',
      events: [
        'authentication_failure',
        'authorization_failure',
        'validation_failure',
        'rate_limit_exceeded',
        'suspicious_activity',
        'security_header_violation',
        'csp_violation'
      ]
    },
    
    // Intrusion detection
    intrusionDetection: {
      enabled: true,
      rules: [
        {
          name: 'sql_injection_attempt',
          pattern: /(\b)(union|select|insert|update|delete|drop)(\b)/gi,
          severity: 'high',
          action: 'block'
        },
        {
          name: 'xss_attempt',
          pattern: /<script|javascript:|onerror=|onload=/gi,
          severity: 'high',
          action: 'block'
        },
        {
          name: 'path_traversal',
          pattern: /\.\.[\/\\]/g,
          severity: 'medium',
          action: 'log'
        }
      ]
    },
    
    // Anomaly detection
    anomalyDetection: {
      enabled: true,
      thresholds: {
        requestsPerMinute: 100,
        failedAuthPerHour: 10,
        uniqueIPsPerMinute: 50
      }
    }
  },
  
  // Privacy Configuration
  privacy: {
    // Data anonymization
    anonymization: {
      enabled: true,
      fields: ['ip_address', 'user_agent', 'referrer'],
      method: 'hash', // 'hash', 'mask', or 'remove'
      saltRotation: 86400000 // 24 hours
    },
    
    // GDPR compliance
    gdpr: {
      enabled: true,
      consentRequired: true,
      dataRetention: 2592000000, // 30 days
      rightToErasure: true,
      dataPortability: true
    },
    
    // Cookie settings
    cookies: {
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      consentRequired: true,
      essential: ['session_id', 'csrf_token'],
      functional: ['language', 'theme'],
      analytics: ['_ga', '_gid']
    }
  },
  
  // Emergency Response
  emergency: {
    // Kill switch
    killSwitch: {
      enabled: true,
      triggers: [
        { metric: 'error_rate', threshold: 50, duration: 60000 },
        { metric: 'security_violations', threshold: 100, duration: 300000 },
        { metric: 'api_failures', threshold: 90, duration: 60000 }
      ],
      actions: ['disable_api', 'show_maintenance', 'alert_admin']
    },
    
    // Incident response
    incidentResponse: {
      contactEmail: process.env.SECURITY_EMAIL || 'security@example.com',
      escalationPath: ['on-call', 'security-team', 'management'],
      automatedActions: {
        blockSuspiciousIPs: true,
        disableCompromisedAccounts: true,
        preserveEvidence: true
      }
    }
  }
};

// Generate secure random string
function generateSecureRandom(length) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for environments without crypto
  return Array.from({ length }, () => Math.random().toString(36).charAt(2)).join('');
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecurityConfig;
} else {
  window.SecurityConfig = SecurityConfig;
}