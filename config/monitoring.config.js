// Monitoring Configuration - Analytics and monitoring settings

const MonitoringConfig = {
  // Analytics Configuration
  analytics: {
    // Core analytics settings
    enabled: true,
    sessionTimeout: 1800000, // 30 minutes
    maxEvents: 1000,
    samplingRate: 1.0, // 100% in production
    enablePrivacyMode: true,
    
    // Event tracking
    events: {
      automatic: {
        pageViews: true,
        clicks: true,
        scrollDepth: true,
        formSubmissions: true,
        errors: true,
        performance: true
      },
      
      // Custom event definitions
      custom: {
        // Checkout flow events
        checkout: {
          start: { category: 'checkout', action: 'start' },
          walletCopy: { category: 'checkout', action: 'wallet_copy' },
          redirect: { category: 'checkout', action: 'redirect' },
          complete: { category: 'checkout', action: 'complete' },
          abandon: { category: 'checkout', action: 'abandon' }
        },
        
        // User interaction events
        interaction: {
          buttonClick: { category: 'interaction', action: 'button_click' },
          linkClick: { category: 'interaction', action: 'link_click' },
          tabSwitch: { category: 'interaction', action: 'tab_switch' },
          tooltipHover: { category: 'interaction', action: 'tooltip_hover' }
        },
        
        // Error events
        errors: {
          api: { category: 'error', action: 'api_error' },
          validation: { category: 'error', action: 'validation_error' },
          network: { category: 'error', action: 'network_error' },
          browser: { category: 'error', action: 'browser_error' }
        }
      }
    },
    
    // Conversion tracking
    conversions: {
      goals: [
        {
          id: 'wallet_copy',
          name: 'Wallet Address Copied',
          value: 1,
          type: 'event',
          condition: { event: 'wallet_copy' }
        },
        {
          id: 'redirect_complete',
          name: 'Redirect to Payment',
          value: 5,
          type: 'event',
          condition: { event: 'redirect_initiated' }
        },
        {
          id: 'time_on_page',
          name: 'Engaged User',
          value: 0.5,
          type: 'time',
          condition: { duration: 60000 } // 1 minute
        }
      ],
      
      // Funnel tracking
      funnels: {
        checkout: {
          name: 'Checkout Flow',
          steps: [
            { id: 'view', name: 'Page View', event: 'page_view' },
            { id: 'start', name: 'Start Checkout', event: 'checkout_start' },
            { id: 'copy', name: 'Copy Wallet', event: 'wallet_copy' },
            { id: 'redirect', name: 'Redirect', event: 'redirect_initiated' }
          ],
          completionValue: 10
        }
      }
    },
    
    // User segmentation
    segmentation: {
      dimensions: {
        device: { 
          extract: () => /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        },
        browser: {
          extract: () => {
            const ua = navigator.userAgent;
            if (/chrome/i.test(ua)) return 'chrome';
            if (/firefox/i.test(ua)) return 'firefox';
            if (/safari/i.test(ua)) return 'safari';
            if (/edge/i.test(ua)) return 'edge';
            return 'other';
          }
        },
        referrerType: {
          extract: () => {
            const ref = document.referrer;
            if (!ref) return 'direct';
            if (/google\.|bing\.|yahoo\.|duckduckgo\./i.test(ref)) return 'search';
            if (/facebook\.|twitter\.|linkedin\.|reddit\./i.test(ref)) return 'social';
            return 'referral';
          }
        }
      }
    },
    
    // Data retention
    retention: {
      raw: 7, // days
      aggregated: 90, // days
      userProfiles: 365 // days
    }
  },
  
  // Performance Monitoring
  performance: {
    enabled: true,
    
    // Core Web Vitals monitoring
    webVitals: {
      enabled: true,
      metrics: ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'],
      thresholds: {
        LCP: { good: 2500, needsImprovement: 4000 },
        FID: { good: 100, needsImprovement: 300 },
        CLS: { good: 0.1, needsImprovement: 0.25 },
        FCP: { good: 1800, needsImprovement: 3000 },
        TTFB: { good: 800, needsImprovement: 1800 }
      },
      reportingEndpoint: process.env.WEB_VITALS_ENDPOINT || null,
      sampleRate: 1.0 // 100% for production monitoring
    },
    
    // Resource monitoring
    resources: {
      enabled: true,
      trackTypes: ['script', 'css', 'img', 'font', 'xhr', 'fetch'],
      slowResourceThreshold: 1000, // ms
      largeResourceThreshold: 100000, // bytes
      
      // Bundle size monitoring
      bundles: {
        track: true,
        warnThreshold: 200000, // 200KB
        errorThreshold: 500000, // 500KB
        reportOversized: true
      }
    },
    
    // API performance monitoring
    api: {
      enabled: true,
      endpoints: {
        simpleswap: {
          track: true,
          slowThreshold: 2000,
          errorThreshold: 0.05 // 5% error rate
        },
        mercuryo: {
          track: true,
          slowThreshold: 3000,
          errorThreshold: 0.05
        },
        geolocation: {
          track: true,
          slowThreshold: 1000,
          errorThreshold: 0.1
        }
      }
    },
    
    // User experience metrics
    userExperience: {
      enabled: true,
      metrics: {
        timeToInteractive: true,
        firstInputDelay: true,
        scrollJank: true,
        longTasks: true,
        memoryUsage: true
      },
      
      // Rage click detection
      rageClick: {
        enabled: true,
        threshold: 3, // clicks
        timeWindow: 1000 // ms
      },
      
      // Dead click detection
      deadClick: {
        enabled: true,
        threshold: 500 // ms without response
      }
    }
  },
  
  // Error Monitoring
  errorMonitoring: {
    enabled: true,
    
    // Error collection
    collection: {
      jsErrors: true,
      promiseRejections: true,
      consoleErrors: true,
      networkErrors: true,
      
      // Error grouping
      grouping: {
        enabled: true,
        by: ['message', 'stack', 'type'],
        similarityThreshold: 0.8
      },
      
      // Error context
      context: {
        includeUserAgent: true,
        includeBreadcrumbs: true,
        includeLocalStorage: false, // Privacy
        includeSessionStorage: false, // Privacy
        maxBreadcrumbs: 50
      }
    },
    
    // Error reporting
    reporting: {
      endpoint: process.env.ERROR_REPORTING_ENDPOINT || null,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      
      // Filtering
      filters: {
        ignoreErrors: [
          'ResizeObserver loop limit exceeded',
          'Non-Error promise rejection captured',
          'Network request failed'
        ],
        ignoreUrls: [
          /extensions\//i,
          /^chrome:\/\//i,
          /^moz-extension:\/\//i
        ]
      },
      
      // Sampling
      sampling: {
        enabled: true,
        rate: 1.0, // 100% in production
        rules: [
          { errorType: 'network', rate: 0.1 },
          { errorType: 'browser', rate: 0.5 }
        ]
      }
    },
    
    // Alert thresholds
    alerts: {
      enabled: true,
      channels: ['email', 'slack', 'pagerduty'],
      rules: [
        {
          name: 'high_error_rate',
          condition: { metric: 'error_rate', operator: '>', value: 0.05, duration: 300000 },
          severity: 'critical',
          channels: ['pagerduty']
        },
        {
          name: 'new_error_type',
          condition: { metric: 'new_error', operator: 'exists' },
          severity: 'warning',
          channels: ['slack']
        },
        {
          name: 'api_errors',
          condition: { metric: 'api_errors', operator: '>', value: 10, duration: 60000 },
          severity: 'high',
          channels: ['email', 'slack']
        }
      ]
    }
  },
  
  // Real-time Monitoring Dashboard
  dashboard: {
    enabled: false, // Only with ?debug parameter
    
    // Dashboard configuration
    config: {
      position: 'bottom-right',
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 1000, // 1 second
      
      // Sections to display
      sections: {
        performance: true,
        errors: true,
        api: true,
        analytics: true,
        security: true
      },
      
      // Display limits
      limits: {
        maxErrors: 10,
        maxEvents: 20,
        maxApiCalls: 50
      }
    },
    
    // Access control
    access: {
      requiresAuth: false, // Set to true in production
      allowedRoles: ['admin', 'developer'],
      allowedIPs: process.env.DASHBOARD_ALLOWED_IPS ? process.env.DASHBOARD_ALLOWED_IPS.split(',') : [],
      debugParam: 'debug', // URL parameter to show dashboard
      secretKey: process.env.DASHBOARD_SECRET || null
    }
  },
  
  // Health Checks
  healthChecks: {
    enabled: true,
    
    // Health check definitions
    checks: {
      api: {
        name: 'API Connectivity',
        interval: 60000, // 1 minute
        timeout: 5000,
        critical: true,
        endpoints: [
          { name: 'simpleswap', url: 'https://api.simpleswap.io/health' },
          { name: 'mercuryo', url: 'https://api.mercuryo.io/health' }
        ]
      },
      
      performance: {
        name: 'Performance Metrics',
        interval: 300000, // 5 minutes
        thresholds: {
          cpuUsage: 80, // percentage
          memoryUsage: 90, // percentage
          responseTime: 2000 // ms
        }
      },
      
      errors: {
        name: 'Error Rate',
        interval: 60000,
        thresholds: {
          rate: 0.05, // 5%
          count: 100 // per interval
        }
      },
      
      security: {
        name: 'Security Status',
        interval: 300000,
        checks: [
          'csp_active',
          'headers_present',
          'certificate_valid'
        ]
      }
    },
    
    // Health status aggregation
    aggregation: {
      method: 'weighted', // 'all', 'any', 'weighted'
      weights: {
        api: 0.4,
        performance: 0.3,
        errors: 0.2,
        security: 0.1
      }
    },
    
    // Health reporting
    reporting: {
      endpoint: '/api/health',
      format: 'json', // 'json', 'prometheus'
      includeDetails: false, // Security: don't expose internals
      cacheDuration: 30000 // 30 seconds
    }
  },
  
  // Logging Configuration
  logging: {
    enabled: true,
    
    // Log levels and categories
    levels: {
      production: 'error',
      staging: 'warn',
      development: 'debug'
    },
    
    // Log targets
    targets: {
      console: {
        enabled: false, // Disabled in production
        format: 'json',
        colorize: false
      },
      
      file: {
        enabled: true,
        path: '/var/log/simpleswap',
        maxSize: '100m',
        maxFiles: 10,
        compress: true
      },
      
      remote: {
        enabled: true,
        endpoint: process.env.LOG_ENDPOINT || null,
        batchSize: 100,
        flushInterval: 10000, // 10 seconds
        retry: {
          attempts: 3,
          backoff: 'exponential'
        }
      }
    },
    
    // Log formatting
    formatting: {
      timestamp: true,
      level: true,
      category: true,
      message: true,
      context: true,
      stackTrace: true,
      
      // Structured logging
      structured: {
        enabled: true,
        fields: {
          service: 'simpleswap-checkout',
          environment: process.env.NODE_ENV || 'production',
          version: process.env.APP_VERSION || '1.0.0',
          instance: process.env.INSTANCE_ID || 'default'
        }
      }
    },
    
    // Privacy and security
    privacy: {
      maskSensitiveData: true,
      sensitiveFields: ['password', 'token', 'apiKey', 'wallet', 'email'],
      maskPattern: '***',
      excludeHeaders: ['authorization', 'cookie', 'x-api-key']
    }
  },
  
  // Integration Configuration
  integrations: {
    // Google Analytics
    googleAnalytics: {
      enabled: process.env.GA_ENABLED === 'true',
      measurementId: process.env.GA_MEASUREMENT_ID || '',
      
      // Enhanced measurement
      enhancedMeasurement: {
        pageViews: true,
        scrolling: true,
        outboundClicks: true,
        siteSearch: true,
        videoEngagement: false,
        fileDownloads: false
      },
      
      // Custom dimensions
      customDimensions: {
        cryptoCurrency: 'dimension1',
        paymentMethod: 'dimension2',
        userType: 'dimension3'
      }
    },
    
    // Sentry
    sentry: {
      enabled: process.env.SENTRY_ENABLED === 'true',
      dsn: process.env.SENTRY_DSN || '',
      
      options: {
        environment: 'production',
        release: process.env.APP_VERSION || '1.0.0',
        sampleRate: 1.0,
        tracesSampleRate: 0.1,
        attachStacktrace: true,
        
        beforeSend: (event, hint) => {
          // Filter out non-critical errors
          if (event.level === 'info') return null;
          
          // Remove sensitive data
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          
          return event;
        },
        
        integrations: [
          'BrowserTracing',
          'Replay'
        ]
      }
    },
    
    // Custom monitoring service
    customMonitoring: {
      enabled: process.env.CUSTOM_MONITORING_ENABLED === 'true',
      endpoint: process.env.CUSTOM_MONITORING_ENDPOINT || '',
      apiKey: process.env.CUSTOM_MONITORING_API_KEY || '',
      
      // Data collection
      collect: {
        metrics: true,
        events: true,
        errors: true,
        traces: true
      },
      
      // Batching
      batching: {
        enabled: true,
        maxBatchSize: 100,
        maxWaitTime: 30000 // 30 seconds
      }
    }
  }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonitoringConfig;
} else {
  window.MonitoringConfig = MonitoringConfig;
}