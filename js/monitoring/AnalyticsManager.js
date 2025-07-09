// Analytics Manager - User journey tracking and analytics

class AnalyticsManager {
  constructor() {
    this.sessions = new Map();
    this.events = [];
    this.funnels = new Map();
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // Analytics configuration
    this.config = {
      sessionTimeout: 1800000, // 30 minutes
      maxEvents: 1000,
      enableAutoTracking: true,
      enablePrivacyMode: false,
      samplingRate: 1.0, // 100% sampling
      customDimensions: {},
      debugMode: DEV_CONFIG.enableLogging
    };
    
    // Predefined events
    this.eventTypes = {
      // Page events
      PAGE_VIEW: 'page_view',
      PAGE_EXIT: 'page_exit',
      
      // User actions
      BUTTON_CLICK: 'button_click',
      FORM_SUBMIT: 'form_submit',
      LINK_CLICK: 'link_click',
      
      // Checkout flow
      CHECKOUT_START: 'checkout_start',
      WALLET_COPY: 'wallet_copy',
      WALLET_COPY_FAILED: 'wallet_copy_failed',
      REDIRECT_INITIATED: 'redirect_initiated',
      
      // Errors
      ERROR_OCCURRED: 'error_occurred',
      
      // Performance
      PERFORMANCE_METRIC: 'performance_metric',
      
      // Custom
      CUSTOM_EVENT: 'custom_event'
    };
    
    // Conversion funnel stages
    this.funnelStages = {
      checkout: [
        'page_view',
        'checkout_start',
        'wallet_copy',
        'redirect_initiated'
      ]
    };
    
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics
   */
  initializeAnalytics() {
    // Create or get session
    this.currentSession = this.createSession();
    
    // Set up auto-tracking
    if (this.config.enableAutoTracking) {
      this.setupAutoTracking();
    }
    
    // Set up funnel tracking
    this.setupFunnels();
    
    // Listen for events from other components
    this.setupEventListeners();
    
    // Track initial page view
    this.trackPageView();
    
    if (this.config.debugMode) {
      console.log('[AnalyticsManager] Analytics initialized');
    }
  }

  /**
   * Create new session
   * @returns {Object} Session object
   */
  createSession() {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: [],
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      referrer: document.referrer,
      utmParams: this.extractUTMParams()
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Generate session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract UTM parameters
   * @returns {Object} UTM parameters
   */
  extractUTMParams() {
    const params = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = params.get(param);
      if (value) {
        utmParams[param] = value;
      }
    });
    
    return utmParams;
  }

  /**
   * Set up auto-tracking
   */
  setupAutoTracking() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button, [role="button"]');
      if (target) {
        this.trackClick(target, event);
      }
    });
    
    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.trackFormSubmit(event.target);
    });
    
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent(this.eventTypes.PAGE_EXIT, {
          duration: Date.now() - this.currentSession.startTime
        });
      }
    });
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent(this.eventTypes.PAGE_EXIT, {
        duration: Date.now() - this.currentSession.startTime
      });
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for wallet events
    this.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPIED, (event) => {
      this.trackEvent(this.eventTypes.WALLET_COPY, {
        method: event.detail.method,
        address: this.hashValue(event.detail.address)
      });
    });
    
    this.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPY_FAILED, (event) => {
      this.trackEvent(this.eventTypes.WALLET_COPY_FAILED, {
        error: event.detail.error
      });
    });
    
    // Listen for redirect events
    this.eventEmitter.addEventListener(APP_EVENTS.REDIRECT_STARTED, (event) => {
      this.trackEvent(this.eventTypes.REDIRECT_INITIATED, {
        url: event.detail.url,
        method: event.detail.method
      });
    });
    
    // Listen for errors
    this.eventEmitter.addEventListener('error:occurred', (event) => {
      this.trackEvent(this.eventTypes.ERROR_OCCURRED, {
        category: event.detail.category,
        message: event.detail.message
      });
    });
    
    // Listen for performance metrics
    this.eventEmitter.addEventListener('performance:metric', (event) => {
      this.trackEvent(this.eventTypes.PERFORMANCE_METRIC, {
        metric: event.detail.name,
        value: event.detail.value,
        rating: event.detail.rating
      });
    });
  }

  /**
   * Set up funnel tracking
   */
  setupFunnels() {
    // Initialize checkout funnel
    this.funnels.set('checkout', {
      stages: this.funnelStages.checkout,
      sessions: new Map()
    });
  }

  /**
   * Track event
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @param {Object} options - Tracking options
   */
  trackEvent(eventName, properties = {}, options = {}) {
    // Check sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }
    
    // Create event object
    const event = {
      id: this.generateEventId(),
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      properties: this.sanitizeProperties(properties),
      context: {
        url: window.location.href,
        title: document.title,
        ...this.config.customDimensions
      }
    };
    
    // Store event
    this.storeEvent(event);
    
    // Update session
    this.updateSession(event);
    
    // Update funnels
    this.updateFunnels(event);
    
    // Log in debug mode
    if (this.config.debugMode) {
      console.log('[AnalyticsManager] Event tracked:', event);
    }
    
    // Send to analytics service (if configured)
    if (!options.skipRemote) {
      this.sendToAnalyticsService(event);
    }
  }

  /**
   * Track page view
   * @param {Object} properties - Page properties
   */
  trackPageView(properties = {}) {
    this.currentSession.pageViews++;
    
    this.trackEvent(this.eventTypes.PAGE_VIEW, {
      ...properties,
      pageUrl: window.location.href,
      pageTitle: document.title,
      pageLoadTime: window.performance?.timing?.loadEventEnd - window.performance?.timing?.navigationStart
    });
  }

  /**
   * Track click
   * @param {Element} element - Clicked element
   * @param {Event} event - Click event
   */
  trackClick(element, event) {
    const properties = {
      elementType: element.tagName.toLowerCase(),
      elementText: element.textContent?.trim().substring(0, 50),
      elementId: element.id,
      elementClass: element.className,
      href: element.href,
      clickX: event.clientX,
      clickY: event.clientY
    };
    
    if (element.tagName === 'BUTTON' || element.role === 'button') {
      this.trackEvent(this.eventTypes.BUTTON_CLICK, properties);
      
      // Special handling for buy button
      if (element.id === 'buy-button' || element.classList.contains('buy-button')) {
        this.trackEvent(this.eventTypes.CHECKOUT_START, properties);
      }
    } else if (element.tagName === 'A') {
      this.trackEvent(this.eventTypes.LINK_CLICK, properties);
    }
  }

  /**
   * Track form submission
   * @param {Element} form - Form element
   */
  trackFormSubmit(form) {
    this.trackEvent(this.eventTypes.FORM_SUBMIT, {
      formId: form.id,
      formName: form.name,
      formAction: form.action,
      formMethod: form.method
    });
  }

  /**
   * Track custom event
   * @param {string} eventName - Custom event name
   * @param {Object} properties - Event properties
   */
  trackCustomEvent(eventName, properties = {}) {
    this.trackEvent(this.eventTypes.CUSTOM_EVENT, {
      customEventName: eventName,
      ...properties
    });
  }

  /**
   * Track user journey step
   * @param {string} step - Journey step
   * @param {Object} data - Step data
   */
  trackUserJourney(step, data = {}) {
    this.trackEvent('user_journey', {
      journeyStep: step,
      ...data
    });
  }

  /**
   * Track conversion
   * @param {string} conversionType - Conversion type
   * @param {number} value - Conversion value
   * @param {Object} metadata - Additional metadata
   */
  trackConversion(conversionType, value = 0, metadata = {}) {
    this.trackEvent('conversion', {
      conversionType,
      conversionValue: value,
      ...metadata
    });
  }

  /**
   * Update session with event
   * @param {Object} event - Event object
   */
  updateSession(event) {
    this.currentSession.lastActivity = Date.now();
    this.currentSession.events.push(event.id);
    
    // Check session timeout
    if (Date.now() - this.currentSession.startTime > this.config.sessionTimeout) {
      // Create new session
      this.currentSession = this.createSession();
    }
  }

  /**
   * Update funnels with event
   * @param {Object} event - Event object
   */
  updateFunnels(event) {
    this.funnels.forEach((funnel, funnelName) => {
      const stageIndex = funnel.stages.indexOf(event.name);
      
      if (stageIndex !== -1) {
        let sessionFunnel = funnel.sessions.get(this.currentSession.id);
        
        if (!sessionFunnel) {
          sessionFunnel = {
            startTime: Date.now(),
            currentStage: -1,
            completedStages: [],
            abandoned: false
          };
          funnel.sessions.set(this.currentSession.id, sessionFunnel);
        }
        
        // Update funnel progress
        if (stageIndex === sessionFunnel.currentStage + 1) {
          sessionFunnel.currentStage = stageIndex;
          sessionFunnel.completedStages.push({
            stage: event.name,
            timestamp: event.timestamp
          });
          
          // Check if funnel completed
          if (stageIndex === funnel.stages.length - 1) {
            this.trackEvent('funnel_completed', {
              funnelName,
              duration: Date.now() - sessionFunnel.startTime,
              stages: sessionFunnel.completedStages
            });
          }
        }
      }
    });
  }

  /**
   * Store event
   * @param {Object} event - Event object
   */
  storeEvent(event) {
    this.events.push(event);
    
    // Limit array size
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Sanitize properties for privacy
   * @param {Object} properties - Properties to sanitize
   * @returns {Object} Sanitized properties
   */
  sanitizeProperties(properties) {
    if (!this.config.enablePrivacyMode) {
      return properties;
    }
    
    const sanitized = {};
    
    Object.entries(properties).forEach(([key, value]) => {
      // Skip sensitive fields
      if (['email', 'phone', 'address', 'ip'].includes(key.toLowerCase())) {
        sanitized[key] = '[redacted]';
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }

  /**
   * Hash sensitive value
   * @param {string} value - Value to hash
   * @returns {string} Hashed value
   */
  hashValue(value) {
    // Simple hash for demo - use proper hashing in production
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `hash_${Math.abs(hash)}`;
  }

  /**
   * Generate event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send event to analytics service
   * @param {Object} event - Event to send
   */
  sendToAnalyticsService(event) {
    // In production, this would send to Google Analytics, Mixpanel, etc.
    if (this.config.debugMode) {
      console.log('[AnalyticsManager] Would send to analytics service:', event);
    }
  }

  /**
   * Get analytics report
   * @param {Object} options - Report options
   * @returns {Object} Analytics report
   */
  generateReport(options = {}) {
    const {
      startTime = Date.now() - 86400000, // Last 24 hours
      endTime = Date.now(),
      groupBy = 'hour'
    } = options;
    
    const report = {
      summary: {
        totalEvents: 0,
        uniqueSessions: 0,
        averageSessionDuration: 0,
        topEvents: {},
        conversionRates: {}
      },
      timeline: [],
      funnels: {},
      errors: []
    };
    
    // Filter events by time range
    const filteredEvents = this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );
    
    // Calculate summary
    report.summary.totalEvents = filteredEvents.length;
    report.summary.uniqueSessions = new Set(filteredEvents.map(e => e.sessionId)).size;
    
    // Count event types
    filteredEvents.forEach(event => {
      report.summary.topEvents[event.name] = (report.summary.topEvents[event.name] || 0) + 1;
    });
    
    // Calculate funnel conversion rates
    this.funnels.forEach((funnel, funnelName) => {
      const sessions = Array.from(funnel.sessions.values());
      const completed = sessions.filter(s => s.currentStage === funnel.stages.length - 1).length;
      
      report.funnels[funnelName] = {
        totalSessions: sessions.length,
        completedSessions: completed,
        conversionRate: sessions.length > 0 ? (completed / sessions.length) * 100 : 0,
        dropoffByStage: this.calculateDropoff(funnel)
      };
    });
    
    // Count errors
    report.errors = filteredEvents.filter(e => e.name === this.eventTypes.ERROR_OCCURRED);
    
    return report;
  }

  /**
   * Calculate funnel dropoff
   * @param {Object} funnel - Funnel object
   * @returns {Array} Dropoff by stage
   */
  calculateDropoff(funnel) {
    const dropoff = [];
    const sessions = Array.from(funnel.sessions.values());
    
    funnel.stages.forEach((stage, index) => {
      const reachedStage = sessions.filter(s => s.currentStage >= index).length;
      const reachedPrevious = index > 0 ? 
        sessions.filter(s => s.currentStage >= index - 1).length : 
        sessions.length;
      
      dropoff.push({
        stage,
        reached: reachedStage,
        dropoffRate: reachedPrevious > 0 ? 
          ((reachedPrevious - reachedStage) / reachedPrevious) * 100 : 0
      });
    });
    
    return dropoff;
  }

  /**
   * Get current session
   * @returns {Object} Current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Set custom dimension
   * @param {string} name - Dimension name
   * @param {*} value - Dimension value
   */
  setCustomDimension(name, value) {
    this.config.customDimensions[name] = value;
  }

  /**
   * Clear analytics data
   */
  clearData() {
    this.events = [];
    this.sessions.clear();
    this.funnels.forEach(funnel => funnel.sessions.clear());
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnalyticsManager;
}