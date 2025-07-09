// Performance Manager - Core Web Vitals monitoring and optimization

class PerformanceManager {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // Performance thresholds (Core Web Vitals)
    this.thresholds = {
      LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
      FID: { good: 100, needsImprovement: 300 },   // First Input Delay
      CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
      FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
      TTFB: { good: 800, needsImprovement: 1800 }   // Time to First Byte
    };
    
    // Resource optimization settings
    this.resourceConfig = {
      enableLazyLoading: true,
      enableResourceHints: true,
      enableCaching: true,
      cacheVersion: 'v1',
      criticalResources: []
    };
    
    this.initializePerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializePerformanceMonitoring() {
    // Measure Core Web Vitals
    this.measureCoreWebVitals();
    
    // Set up performance observers
    this.setupPerformanceObservers();
    
    // Monitor resource loading
    this.monitorResourceLoading();
    
    // Track navigation timing
    this.trackNavigationTiming();
    
    // Set up resource optimization
    this.optimizeResourceLoading();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[PerformanceManager] Performance monitoring initialized');
    }
  }

  /**
   * Measure Core Web Vitals
   */
  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // Additional metrics
    this.observeFCP();
    this.measureTTFB();
  }

  /**
   * Observe Largest Contentful Paint
   */
  observeLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          const lcp = lastEntry.renderTime || lastEntry.loadTime;
          this.recordMetric('LCP', lcp);
          
          // Disconnect after recording
          lcpObserver.disconnect();
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('LCP', lcpObserver);
      } catch (e) {
        console.warn('[PerformanceManager] LCP observation not supported');
      }
    }
  }

  /**
   * Observe First Input Delay
   */
  observeFID() {
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            const fid = entry.processingStart - entry.startTime;
            this.recordMetric('FID', fid);
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('FID', fidObserver);
      } catch (e) {
        console.warn('[PerformanceManager] FID observation not supported');
      }
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  observeCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        let clsEntries = [];
        
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            // Only count layout shifts without recent user input
            if (!entry.hadRecentInput) {
              const firstSessionEntry = clsEntries[0];
              const lastSessionEntry = clsEntries[clsEntries.length - 1];
              
              // If the entry is more than 1 second after the previous entry and
              // more than 5 seconds after the first entry, start a new session
              if (entry.startTime - lastSessionEntry?.startTime > 1000 ||
                  entry.startTime - firstSessionEntry?.startTime > 5000) {
                clsEntries = [];
                clsValue = 0;
              }
              
              clsEntries.push(entry);
              clsValue += entry.value;
              this.recordMetric('CLS', clsValue);
            }
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('CLS', clsObserver);
      } catch (e) {
        console.warn('[PerformanceManager] CLS observation not supported');
      }
    }
  }

  /**
   * Observe First Contentful Paint
   */
  observeFCP() {
    if ('PerformanceObserver' in window) {
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              this.recordMetric('FCP', entry.startTime);
              fcpObserver.disconnect();
            }
          });
        });
        
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('FCP', fcpObserver);
      } catch (e) {
        console.warn('[PerformanceManager] FCP observation not supported');
      }
    }
  }

  /**
   * Measure Time to First Byte
   */
  measureTTFB() {
    // Use Navigation Timing API
    if (window.performance && window.performance.timing) {
      const navigationTiming = window.performance.timing;
      
      // Ensure the page has loaded
      if (navigationTiming.loadEventEnd > 0) {
        const ttfb = navigationTiming.responseStart - navigationTiming.navigationStart;
        this.recordMetric('TTFB', ttfb);
      } else {
        // Wait for load event
        window.addEventListener('load', () => {
          const ttfb = navigationTiming.responseStart - navigationTiming.navigationStart;
          this.recordMetric('TTFB', ttfb);
        });
      }
    }
  }

  /**
   * Record performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  recordMetric(name, value) {
    this.metrics.set(name, {
      value: value,
      timestamp: Date.now(),
      rating: this.getRating(name, value)
    });
    
    // Emit metric event
    this.eventEmitter.dispatchEvent(new CustomEvent('performance:metric', {
      detail: { name, value, rating: this.getRating(name, value) }
    }));
    
    if (DEV_CONFIG.enableLogging) {
      console.log(`[PerformanceManager] ${name}: ${value.toFixed(2)}ms (${this.getRating(name, value)})`);
    }
  }

  /**
   * Get rating for metric value
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @returns {string} Rating (good, needs-improvement, poor)
   */
  getRating(name, value) {
    const threshold = this.thresholds[name];
    if (!threshold) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Set up general performance observers
   */
  setupPerformanceObservers() {
    // Long Task Observer
    this.observeLongTasks();
    
    // Resource Timing Observer
    this.observeResourceTiming();
  }

  /**
   * Observe long tasks
   */
  observeLongTasks() {
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            console.warn('[PerformanceManager] Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: entry.attribution
            });
            
            // Track long tasks
            this.eventEmitter.dispatchEvent(new CustomEvent('performance:longtask', {
              detail: { duration: entry.duration, startTime: entry.startTime }
            }));
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('[PerformanceManager] Long task observation not supported');
      }
    }
  }

  /**
   * Observe resource timing
   */
  observeResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            // Track slow resources
            if (entry.duration > 1000) {
              console.warn('[PerformanceManager] Slow resource:', {
                name: entry.name,
                duration: entry.duration,
                type: entry.initiatorType
              });
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (e) {
        console.warn('[PerformanceManager] Resource timing observation not supported');
      }
    }
  }

  /**
   * Monitor resource loading
   */
  monitorResourceLoading() {
    // Get all resource entries
    const resources = performance.getEntriesByType('resource');
    
    // Categorize resources
    const resourcesByType = {};
    resources.forEach(resource => {
      const type = resource.initiatorType;
      if (!resourcesByType[type]) {
        resourcesByType[type] = [];
      }
      resourcesByType[type].push({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0
      });
    });
    
    // Calculate totals
    const totals = {
      count: resources.length,
      duration: resources.reduce((sum, r) => sum + r.duration, 0),
      size: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
    };
    
    this.metrics.set('resources', {
      byType: resourcesByType,
      totals: totals,
      timestamp: Date.now()
    });
  }

  /**
   * Track navigation timing
   */
  trackNavigationTiming() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      
      // Calculate key metrics
      const navigationMetrics = {
        domainLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnection: timing.connectEnd - timing.connectStart,
        request: timing.responseStart - timing.requestStart,
        response: timing.responseEnd - timing.responseStart,
        domProcessing: timing.domComplete - timing.domLoading,
        onLoad: timing.loadEventEnd - timing.loadEventStart,
        totalTime: timing.loadEventEnd - timing.navigationStart
      };
      
      this.metrics.set('navigation', {
        metrics: navigationMetrics,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Optimize resource loading
   */
  optimizeResourceLoading() {
    if (this.resourceConfig.enableResourceHints) {
      this.addResourceHints();
    }
    
    if (this.resourceConfig.enableLazyLoading) {
      this.enableLazyLoading();
    }
    
    if (this.resourceConfig.enableCaching) {
      this.implementCaching();
    }
  }

  /**
   * Add resource hints for critical resources
   */
  addResourceHints() {
    // Preconnect to critical domains
    const criticalDomains = ['https://simpleswap.io', 'https://api.simpleswap.io'];
    
    criticalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
    
    // Prefetch critical resources
    this.resourceConfig.criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * Enable lazy loading for images
   */
  enableLazyLoading() {
    // Native lazy loading for images
    document.querySelectorAll('img').forEach(img => {
      if (!img.loading) {
        img.loading = 'lazy';
      }
    });
    
    // Intersection Observer for advanced lazy loading
    if ('IntersectionObserver' in window) {
      const lazyImages = document.querySelectorAll('img[data-src]');
      
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });
      
      lazyImages.forEach(img => imageObserver.observe(img));
    }
  }

  /**
   * Implement caching strategies
   */
  implementCaching() {
    // Add cache control headers via meta tags
    const cacheControl = document.createElement('meta');
    cacheControl.httpEquiv = 'Cache-Control';
    cacheControl.content = 'public, max-age=3600'; // 1 hour
    document.head.appendChild(cacheControl);
  }

  /**
   * Mark performance timing
   * @param {string} markName - Name of the mark
   */
  mark(markName) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(markName);
    }
  }

  /**
   * Measure between two marks
   * @param {string} measureName - Name of the measure
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   */
  measure(measureName, startMark, endMark) {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(measureName, startMark, endMark);
        const measure = window.performance.getEntriesByName(measureName, 'measure')[0];
        
        if (measure) {
          this.recordMetric(measureName, measure.duration);
        }
      } catch (e) {
        console.warn(`[PerformanceManager] Failed to measure ${measureName}`);
      }
    }
  }

  /**
   * Get performance report
   * @returns {Object} Performance report
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      coreWebVitals: {},
      navigation: {},
      resources: {},
      recommendations: []
    };
    
    // Core Web Vitals
    ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].forEach(metric => {
      const data = this.metrics.get(metric);
      if (data) {
        report.coreWebVitals[metric] = {
          value: data.value,
          rating: data.rating,
          threshold: this.thresholds[metric]
        };
      }
    });
    
    // Navigation timing
    const navigation = this.metrics.get('navigation');
    if (navigation) {
      report.navigation = navigation.metrics;
    }
    
    // Resources
    const resources = this.metrics.get('resources');
    if (resources) {
      report.resources = resources.totals;
    }
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    return report;
  }

  /**
   * Generate performance recommendations
   * @param {Object} report - Performance report
   * @returns {Array} Recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    // Check Core Web Vitals
    Object.entries(report.coreWebVitals).forEach(([metric, data]) => {
      if (data.rating === 'poor') {
        recommendations.push({
          metric: metric,
          severity: 'high',
          message: `${metric} is poor (${data.value.toFixed(2)}ms). Target: < ${data.threshold.good}ms`
        });
      } else if (data.rating === 'needs-improvement') {
        recommendations.push({
          metric: metric,
          severity: 'medium',
          message: `${metric} needs improvement (${data.value.toFixed(2)}ms). Target: < ${data.threshold.good}ms`
        });
      }
    });
    
    // Check resource count
    if (report.resources.count > 50) {
      recommendations.push({
        metric: 'resources',
        severity: 'medium',
        message: `Too many resources (${report.resources.count}). Consider bundling or lazy loading.`
      });
    }
    
    // Check total load time
    if (report.navigation.totalTime > 5000) {
      recommendations.push({
        metric: 'totalTime',
        severity: 'high',
        message: `Page load time is too high (${report.navigation.totalTime}ms). Target: < 3000ms`
      });
    }
    
    return recommendations;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceManager;
}