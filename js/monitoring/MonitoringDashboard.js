// Monitoring Dashboard - Real-time metrics and monitoring visualization

class MonitoringDashboard {
  constructor() {
    this.metrics = {
      performance: {},
      errors: [],
      api: {},
      analytics: {},
      security: {}
    };
    
    this.updateInterval = null;
    this.dashboardElement = null;
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    // Dashboard configuration
    this.config = {
      updateFrequency: 1000, // 1 second
      maxErrorsDisplay: 10,
      maxEventsDisplay: 20,
      enableAutoRefresh: true,
      position: 'bottom-right',
      theme: 'dark'
    };
    
    // Check if dashboard should be shown
    this.shouldShow = this.checkShouldShow();
    
    if (this.shouldShow) {
      this.initializeDashboard();
    }
  }

  /**
   * Check if dashboard should be shown
   * @returns {boolean} Should show dashboard
   */
  checkShouldShow() {
    const params = new URLSearchParams(window.location.search);
    return params.has('debug') || params.has('monitor') || DEV_CONFIG.showDebugUI;
  }

  /**
   * Initialize monitoring dashboard
   */
  initializeDashboard() {
    // Create dashboard UI
    this.createDashboardUI();
    
    // Set up data collection
    this.setupDataCollection();
    
    // Start update loop
    if (this.config.enableAutoRefresh) {
      this.startUpdateLoop();
    }
    
    // Initial update
    this.updateDashboard();
    
    console.log('[MonitoringDashboard] Dashboard initialized');
  }

  /**
   * Create dashboard UI
   */
  createDashboardUI() {
    // Remove existing dashboard
    const existing = document.getElementById('monitoring-dashboard');
    if (existing) {
      existing.remove();
    }
    
    // Create dashboard container
    this.dashboardElement = document.createElement('div');
    this.dashboardElement.id = 'monitoring-dashboard';
    this.dashboardElement.className = `monitoring-dashboard theme-${this.config.theme} position-${this.config.position}`;
    this.dashboardElement.innerHTML = this.getDashboardHTML();
    
    // Add styles
    this.injectStyles();
    
    // Add to page
    document.body.appendChild(this.dashboardElement);
    
    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Get dashboard HTML
   * @returns {string} Dashboard HTML
   */
  getDashboardHTML() {
    return `
      <div class="dashboard-header">
        <h3>Monitoring Dashboard</h3>
        <div class="dashboard-controls">
          <button class="btn-minimize" title="Minimize">−</button>
          <button class="btn-close" title="Close">×</button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <!-- Performance Metrics -->
        <div class="metric-section">
          <h4>Performance</h4>
          <div class="metrics-grid" id="performance-metrics">
            <div class="metric">
              <span class="metric-label">LCP</span>
              <span class="metric-value" id="metric-lcp">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">FID</span>
              <span class="metric-value" id="metric-fid">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">CLS</span>
              <span class="metric-value" id="metric-cls">--</span>
            </div>
            <div class="metric">
              <span class="metric-label">Load Time</span>
              <span class="metric-value" id="metric-load">--</span>
            </div>
          </div>
        </div>
        
        <!-- API Status -->
        <div class="metric-section">
          <h4>API Status</h4>
          <div class="api-status" id="api-status">
            <div class="status-item">
              <span class="status-indicator" id="api-simpleswap"></span>
              <span>SimpleSwap</span>
            </div>
            <div class="status-item">
              <span class="status-indicator" id="api-geolocation"></span>
              <span>Geolocation</span>
            </div>
          </div>
        </div>
        
        <!-- Error Log -->
        <div class="metric-section">
          <h4>Recent Errors <span class="error-count" id="error-count">(0)</span></h4>
          <div class="error-log" id="error-log">
            <div class="empty-state">No errors detected</div>
          </div>
        </div>
        
        <!-- Analytics Summary -->
        <div class="metric-section">
          <h4>Analytics</h4>
          <div class="analytics-summary" id="analytics-summary">
            <div class="stat">
              <span class="stat-label">Events</span>
              <span class="stat-value" id="total-events">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Session</span>
              <span class="stat-value" id="session-duration">0s</span>
            </div>
            <div class="stat">
              <span class="stat-label">Conversions</span>
              <span class="stat-value" id="conversions">0</span>
            </div>
          </div>
        </div>
        
        <!-- Security Status -->
        <div class="metric-section">
          <h4>Security</h4>
          <div class="security-status" id="security-status">
            <div class="status-item">
              <span class="status-indicator status-good"></span>
              <span>CSP Active</span>
            </div>
            <div class="status-item">
              <span class="status-indicator" id="security-events"></span>
              <span>Events: <span id="security-event-count">0</span></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dashboard-footer">
        <span class="timestamp">Last updated: <span id="last-updated">--</span></span>
        <button class="btn-refresh" id="btn-refresh">Refresh</button>
      </div>
    `;
  }

  /**
   * Inject dashboard styles
   */
  injectStyles() {
    const styleId = 'monitoring-dashboard-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const styles = document.createElement('style');
    styles.id = styleId;
    styles.textContent = `
      .monitoring-dashboard {
        position: fixed;
        width: 350px;
        max-height: 600px;
        background: rgba(0, 0, 0, 0.95);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-family: -apple-system, monospace;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .monitoring-dashboard.position-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .monitoring-dashboard.position-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .dashboard-header {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .dashboard-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }
      
      .dashboard-controls {
        display: flex;
        gap: 8px;
      }
      
      .dashboard-controls button {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .dashboard-controls button:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      
      .dashboard-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        max-height: 480px;
      }
      
      .metric-section {
        margin-bottom: 20px;
      }
      
      .metric-section h4 {
        margin: 0 0 12px 0;
        font-size: 12px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .metric {
        background: rgba(255, 255, 255, 0.05);
        padding: 12px;
        border-radius: 6px;
        text-align: center;
      }
      
      .metric-label {
        display: block;
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }
      
      .metric-value {
        display: block;
        font-size: 18px;
        font-weight: 600;
      }
      
      .metric-value.good { color: #10b981; }
      .metric-value.needs-improvement { color: #f59e0b; }
      .metric-value.poor { color: #ef4444; }
      
      .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }
      
      .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #6b7280;
      }
      
      .status-indicator.status-good { background: #10b981; }
      .status-indicator.status-warning { background: #f59e0b; }
      .status-indicator.status-error { background: #ef4444; }
      
      .error-log {
        max-height: 120px;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 8px;
      }
      
      .error-item {
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .error-item:last-child {
        margin-bottom: 0;
        border-bottom: none;
      }
      
      .error-time {
        font-size: 10px;
        color: #888;
      }
      
      .error-message {
        font-size: 11px;
        color: #ef4444;
        margin-top: 2px;
      }
      
      .empty-state {
        text-align: center;
        color: #6b7280;
        padding: 16px;
      }
      
      .analytics-summary {
        display: flex;
        gap: 16px;
      }
      
      .stat {
        flex: 1;
        text-align: center;
        background: rgba(255, 255, 255, 0.05);
        padding: 12px;
        border-radius: 6px;
      }
      
      .stat-label {
        display: block;
        font-size: 10px;
        color: #888;
        margin-bottom: 4px;
      }
      
      .stat-value {
        display: block;
        font-size: 16px;
        font-weight: 600;
      }
      
      .dashboard-footer {
        padding: 12px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .timestamp {
        font-size: 10px;
        color: #888;
      }
      
      .btn-refresh {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #fff;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        transition: background 0.2s;
      }
      
      .btn-refresh:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .monitoring-dashboard.minimized .dashboard-content,
      .monitoring-dashboard.minimized .dashboard-footer {
        display: none;
      }
      
      .monitoring-dashboard.minimized {
        width: auto;
        height: auto;
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Set up event handlers
   */
  setupEventHandlers() {
    // Minimize button
    this.dashboardElement.querySelector('.btn-minimize')?.addEventListener('click', () => {
      this.toggleMinimize();
    });
    
    // Close button
    this.dashboardElement.querySelector('.btn-close')?.addEventListener('click', () => {
      this.closeDashboard();
    });
    
    // Refresh button
    this.dashboardElement.querySelector('#btn-refresh')?.addEventListener('click', () => {
      this.updateDashboard();
    });
  }

  /**
   * Set up data collection
   */
  setupDataCollection() {
    // Collect performance metrics
    this.eventEmitter.addEventListener('performance:metric', (event) => {
      this.metrics.performance[event.detail.name] = {
        value: event.detail.value,
        rating: event.detail.rating
      };
    });
    
    // Collect errors
    this.eventEmitter.addEventListener('error:occurred', (event) => {
      this.metrics.errors.unshift({
        timestamp: Date.now(),
        category: event.detail.category,
        message: event.detail.message
      });
      
      // Limit errors array
      if (this.metrics.errors.length > this.config.maxErrorsDisplay) {
        this.metrics.errors.pop();
      }
    });
    
    // Collect API status
    this.eventEmitter.addEventListener('api:circuitBreakerOpen', (event) => {
      this.metrics.api[event.detail.endpoint] = 'error';
    });
    
    this.eventEmitter.addEventListener('api:request', (event) => {
      const endpoint = event.detail.url.includes('simpleswap') ? 'simpleswap' : 'geolocation';
      this.metrics.api[endpoint] = event.detail.status < 400 ? 'good' : 'error';
    });
    
    // Collect security events
    this.eventEmitter.addEventListener('security:event', (event) => {
      this.metrics.security.eventCount = (this.metrics.security.eventCount || 0) + 1;
    });
  }

  /**
   * Start update loop
   */
  startUpdateLoop() {
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, this.config.updateFrequency);
  }

  /**
   * Stop update loop
   */
  stopUpdateLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update dashboard with latest data
   */
  updateDashboard() {
    if (!this.dashboardElement) return;
    
    // Update performance metrics
    this.updatePerformanceMetrics();
    
    // Update API status
    this.updateAPIStatus();
    
    // Update error log
    this.updateErrorLog();
    
    // Update analytics
    this.updateAnalytics();
    
    // Update security status
    this.updateSecurityStatus();
    
    // Update timestamp
    this.updateTimestamp();
  }

  /**
   * Update performance metrics display
   */
  updatePerformanceMetrics() {
    const metrics = ['LCP', 'FID', 'CLS'];
    
    metrics.forEach(metric => {
      const element = this.dashboardElement.querySelector(`#metric-${metric.toLowerCase()}`);
      if (element && this.metrics.performance[metric]) {
        const data = this.metrics.performance[metric];
        element.textContent = metric === 'CLS' ? data.value.toFixed(3) : `${Math.round(data.value)}ms`;
        element.className = `metric-value ${data.rating}`;
      }
    });
    
    // Update load time
    const loadElement = this.dashboardElement.querySelector('#metric-load');
    if (loadElement && window.performance?.timing) {
      const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      if (loadTime > 0) {
        loadElement.textContent = `${Math.round(loadTime)}ms`;
        loadElement.className = `metric-value ${loadTime < 3000 ? 'good' : loadTime < 5000 ? 'needs-improvement' : 'poor'}`;
      }
    }
  }

  /**
   * Update API status display
   */
  updateAPIStatus() {
    ['simpleswap', 'geolocation'].forEach(api => {
      const element = this.dashboardElement.querySelector(`#api-${api}`);
      if (element) {
        const status = this.metrics.api[api] || 'unknown';
        element.className = `status-indicator status-${status === 'good' ? 'good' : status === 'error' ? 'error' : 'warning'}`;
      }
    });
  }

  /**
   * Update error log display
   */
  updateErrorLog() {
    const errorLog = this.dashboardElement.querySelector('#error-log');
    const errorCount = this.dashboardElement.querySelector('#error-count');
    
    if (errorLog && errorCount) {
      errorCount.textContent = `(${this.metrics.errors.length})`;
      
      if (this.metrics.errors.length === 0) {
        errorLog.innerHTML = '<div class="empty-state">No errors detected</div>';
      } else {
        errorLog.innerHTML = this.metrics.errors.map(error => `
          <div class="error-item">
            <div class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</div>
            <div class="error-message">[${error.category}] ${error.message}</div>
          </div>
        `).join('');
      }
    }
  }

  /**
   * Update analytics display
   */
  updateAnalytics() {
    // Get analytics data
    if (window.analyticsManager) {
      const session = window.analyticsManager.getCurrentSession();
      const report = window.analyticsManager.generateReport({ startTime: session.startTime });
      
      // Update total events
      const eventsElement = this.dashboardElement.querySelector('#total-events');
      if (eventsElement) {
        eventsElement.textContent = report.summary.totalEvents;
      }
      
      // Update session duration
      const durationElement = this.dashboardElement.querySelector('#session-duration');
      if (durationElement) {
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        durationElement.textContent = `${duration}s`;
      }
      
      // Update conversions
      const conversionsElement = this.dashboardElement.querySelector('#conversions');
      if (conversionsElement && report.funnels.checkout) {
        conversionsElement.textContent = report.funnels.checkout.completedSessions;
      }
    }
  }

  /**
   * Update security status display
   */
  updateSecurityStatus() {
    const eventCountElement = this.dashboardElement.querySelector('#security-event-count');
    const statusElement = this.dashboardElement.querySelector('#security-events');
    
    if (eventCountElement) {
      const count = this.metrics.security.eventCount || 0;
      eventCountElement.textContent = count;
      
      if (statusElement) {
        statusElement.className = `status-indicator status-${count === 0 ? 'good' : count < 5 ? 'warning' : 'error'}`;
      }
    }
  }

  /**
   * Update timestamp
   */
  updateTimestamp() {
    const timestampElement = this.dashboardElement.querySelector('#last-updated');
    if (timestampElement) {
      timestampElement.textContent = new Date().toLocaleTimeString();
    }
  }

  /**
   * Toggle minimize state
   */
  toggleMinimize() {
    this.dashboardElement.classList.toggle('minimized');
    const minimizeBtn = this.dashboardElement.querySelector('.btn-minimize');
    if (minimizeBtn) {
      minimizeBtn.textContent = this.dashboardElement.classList.contains('minimized') ? '+' : '−';
    }
  }

  /**
   * Close dashboard
   */
  closeDashboard() {
    this.stopUpdateLoop();
    this.dashboardElement?.remove();
    this.dashboardElement = null;
  }

  /**
   * Get monitoring data
   * @returns {Object} Monitoring data
   */
  getMonitoringData() {
    return this.metrics;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MonitoringDashboard;
}