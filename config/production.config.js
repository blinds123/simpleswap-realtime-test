// Production Configuration - Main production settings

const ProductionConfig = {
  // Environment settings
  environment: 'production',
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  
  // API Configuration
  api: {
    simpleswap: {
      baseUrl: 'https://api.simpleswap.io',
      apiKey: SIMPLESWAP_CONFIG.apiKey,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheEnabled: true,
      cacheTTL: 300000 // 5 minutes
    },
    mercuryo: {
      baseUrl: 'https://api.mercuryo.io',
      widgetUrl: 'https://exchange.mercuryo.io',
      timeout: 30000,
      retryAttempts: 3
    },
    geolocation: {
      baseUrl: 'https://ipapi.co',
      timeout: 10000,
      cacheEnabled: true,
      cacheTTL: 3600000 // 1 hour
    }
  },
  
  // Performance Configuration
  performance: {
    // Lazy loading settings
    lazyLoading: {
      enabled: true,
      rootMargin: '50px',
      threshold: 0.1
    },
    
    // Resource hints
    resourceHints: {
      preconnect: [
        'https://api.simpleswap.io',
        'https://exchange.mercuryo.io',
        'https://ipapi.co',
        'https://fonts.googleapis.com'
      ],
      dnsPrefetch: [
        'https://api.mercuryo.io',
        'https://www.google-analytics.com'
      ]
    },
    
    // Bundle optimization
    bundling: {
      enableCodeSplitting: true,
      enableTreeShaking: true,
      minifyJS: true,
      minifyCSS: true,
      compressAssets: true,
      maxAssetSize: 244000, // 244KB warning threshold
      maxEntrypointSize: 500000 // 500KB warning threshold
    },
    
    // Core Web Vitals targets
    coreWebVitals: {
      LCP: { target: 2500, warning: 4000 },
      FID: { target: 100, warning: 300 },
      CLS: { target: 0.1, warning: 0.25 }
    }
  },
  
  // Caching Configuration
  caching: {
    // Service Worker caching
    serviceWorker: {
      enabled: true,
      cacheVersion: 'v1',
      maxAge: 86400000, // 24 hours
      strategies: {
        static: 'cache-first',
        api: 'network-first',
        images: 'cache-first'
      }
    },
    
    // Browser caching
    browser: {
      maxAge: 3600, // 1 hour
      immutable: ['fonts', 'images'],
      privateCache: ['api-responses']
    },
    
    // CDN configuration
    cdn: {
      enabled: true,
      baseUrl: process.env.CDN_URL || '',
      assets: ['css', 'js', 'images', 'fonts']
    }
  },
  
  // Error Handling
  errorHandling: {
    enableGlobalErrorHandler: true,
    enableUnhandledRejection: true,
    enableConsoleCapture: false, // Disabled in production
    maxErrors: 100,
    retryAttempts: 3,
    retryBackoff: 'exponential',
    reportingEndpoint: process.env.ERROR_REPORTING_URL || null,
    reportingThreshold: 5, // errors per minute
    userNotifications: {
      enabled: true,
      duration: 5000,
      position: 'top-right'
    }
  },
  
  // Feature Flags
  features: {
    enableAnalytics: true,
    enableMonitoring: false, // Only show with ?debug param
    enableA11y: true,
    enablePWA: true,
    enableWebVitals: true,
    enableErrorReporting: true,
    enableRateLimiting: true,
    enableCircuitBreaker: true,
    enableSecurityHeaders: true,
    enableInputValidation: true
  },
  
  // Deployment Configuration
  deployment: {
    target: process.env.DEPLOYMENT_TARGET || 'production',
    region: process.env.DEPLOYMENT_REGION || 'us-east-1',
    buildOptimizations: {
      removeConsole: true,
      removeComments: true,
      removeSourceMaps: false, // Keep for error tracking
      enableCompression: true,
      compressionLevel: 9
    }
  },
  
  // Third-party integrations
  integrations: {
    analytics: {
      googleAnalytics: {
        enabled: process.env.GA_ENABLED === 'true',
        trackingId: process.env.GA_TRACKING_ID || '',
        anonymizeIp: true,
        enhancedEcommerce: true
      },
      customAnalytics: {
        enabled: true,
        endpoint: process.env.ANALYTICS_ENDPOINT || null,
        batchSize: 50,
        flushInterval: 30000 // 30 seconds
      }
    },
    
    monitoring: {
      sentry: {
        enabled: process.env.SENTRY_ENABLED === 'true',
        dsn: process.env.SENTRY_DSN || '',
        environment: 'production',
        tracesSampleRate: 0.1,
        beforeSend: (event) => {
          // Filter out sensitive data
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          return event;
        }
      }
    }
  },
  
  // Rate Limiting
  rateLimiting: {
    api: {
      simpleswap: {
        maxRequests: 100,
        timeWindow: 60000, // 1 minute
        blockDuration: 300000 // 5 minutes
      },
      mercuryo: {
        maxRequests: 50,
        timeWindow: 60000
      },
      default: {
        maxRequests: 200,
        timeWindow: 60000
      }
    },
    user: {
      maxCopyAttempts: 10,
      copyTimeWindow: 60000,
      maxRedirects: 5,
      redirectTimeWindow: 300000
    }
  },
  
  // Localization
  localization: {
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    detectLanguage: true,
    fallbackLanguage: 'en',
    loadPath: '/locales/{{lng}}/{{ns}}.json'
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'error',
    enableConsole: false,
    enableRemote: true,
    remoteEndpoint: process.env.LOG_ENDPOINT || null,
    excludePatterns: [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i
    ]
  },
  
  // Health Check Configuration
  healthCheck: {
    enabled: true,
    endpoint: '/health',
    interval: 60000, // 1 minute
    timeout: 5000,
    checks: [
      'api-connectivity',
      'cache-status',
      'performance-metrics',
      'error-rate'
    ]
  }
};

// Environment variable overrides
if (typeof process !== 'undefined' && process.env) {
  // Override with environment variables
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('PROD_CONFIG_')) {
      const configPath = key.replace('PROD_CONFIG_', '').toLowerCase().split('_');
      let current = ProductionConfig;
      
      for (let i = 0; i < configPath.length - 1; i++) {
        if (!current[configPath[i]]) {
          current[configPath[i]] = {};
        }
        current = current[configPath[i]];
      }
      
      current[configPath[configPath.length - 1]] = process.env[key];
    }
  });
}

// Freeze configuration to prevent modifications
if (typeof Object.freeze === 'function') {
  deepFreeze(ProductionConfig);
}

function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProductionConfig;
} else {
  window.ProductionConfig = ProductionConfig;
}