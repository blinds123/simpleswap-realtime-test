// Health Check - System health monitoring endpoint

class HealthCheck {
    constructor() {
        this.checks = new Map();
        this.results = new Map();
        this.config = {
            enabled: true,
            interval: 60000, // 1 minute
            timeout: 5000,
            endpoint: '/api/health'
        };
        
        this.initializeHealthChecks();
    }
    
    /**
     * Initialize health checks
     */
    initializeHealthChecks() {
        // Register default health checks
        this.registerCheck('api', this.checkAPIConnectivity.bind(this));
        this.registerCheck('performance', this.checkPerformance.bind(this));
        this.registerCheck('security', this.checkSecurity.bind(this));
        this.registerCheck('storage', this.checkStorage.bind(this));
        this.registerCheck('browser', this.checkBrowserCompatibility.bind(this));
        
        // Set up health check endpoint
        this.setupEndpoint();
        
        // Start periodic checks
        if (this.config.enabled) {
            this.startPeriodicChecks();
        }
        
        console.log('[HealthCheck] Health monitoring initialized');
    }
    
    /**
     * Register a health check
     * @param {string} name - Check name
     * @param {Function} checkFunction - Check function
     */
    registerCheck(name, checkFunction) {
        this.checks.set(name, checkFunction);
    }
    
    /**
     * Check API connectivity
     * @returns {Promise<Object>} Check result
     */
    async checkAPIConnectivity() {
        const apis = [
            { name: 'simpleswap', url: 'https://api.simpleswap.io/health', critical: true },
            { name: 'mercuryo', url: 'https://api.mercuryo.io/health', critical: true },
            { name: 'geolocation', url: 'https://ipapi.co/json/', critical: false }
        ];
        
        const results = await Promise.all(
            apis.map(async (api) => {
                try {
                    const response = await fetch(api.url, {
                        method: 'HEAD',
                        mode: 'no-cors', // Avoid CORS issues for health check
                        cache: 'no-cache',
                        signal: AbortSignal.timeout(3000)
                    });
                    
                    return {
                        name: api.name,
                        status: 'healthy',
                        critical: api.critical,
                        responseTime: 0 // Would need proper timing
                    };
                } catch (error) {
                    return {
                        name: api.name,
                        status: 'unhealthy',
                        critical: api.critical,
                        error: error.message
                    };
                }
            })
        );
        
        const unhealthyCritical = results.filter(r => r.critical && r.status === 'unhealthy');
        
        return {
            status: unhealthyCritical.length === 0 ? 'healthy' : 'unhealthy',
            apis: results,
            timestamp: Date.now()
        };
    }
    
    /**
     * Check performance metrics
     * @returns {Object} Check result
     */
    checkPerformance() {
        const metrics = {
            memoryUsage: this.getMemoryUsage(),
            loadTime: this.getPageLoadTime(),
            resourceCount: performance.getEntriesByType('resource').length,
            longTasks: performance.getEntriesByType('longtask').length
        };
        
        // Determine health based on thresholds
        const issues = [];
        
        if (metrics.memoryUsage > 90) {
            issues.push('High memory usage');
        }
        
        if (metrics.loadTime > 3000) {
            issues.push('Slow page load');
        }
        
        if (metrics.longTasks > 5) {
            issues.push('Too many long tasks');
        }
        
        return {
            status: issues.length === 0 ? 'healthy' : 'degraded',
            metrics,
            issues,
            timestamp: Date.now()
        };
    }
    
    /**
     * Check security status
     * @returns {Object} Check result
     */
    checkSecurity() {
        const securityChecks = {
            https: window.location.protocol === 'https:',
            csp: this.hasCSP(),
            secureHeaders: this.checkSecureHeaders(),
            mixedContent: !this.hasMixedContent()
        };
        
        const failedChecks = Object.entries(securityChecks)
            .filter(([_, passed]) => !passed)
            .map(([check]) => check);
        
        return {
            status: failedChecks.length === 0 ? 'healthy' : 'unhealthy',
            checks: securityChecks,
            failedChecks,
            timestamp: Date.now()
        };
    }
    
    /**
     * Check storage availability
     * @returns {Object} Check result
     */
    checkStorage() {
        const storage = {
            localStorage: this.isStorageAvailable('localStorage'),
            sessionStorage: this.isStorageAvailable('sessionStorage'),
            indexedDB: 'indexedDB' in window,
            cookies: navigator.cookieEnabled
        };
        
        // Check storage quota
        let quota = null;
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            navigator.storage.estimate().then(estimate => {
                quota = {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentage: (estimate.usage / estimate.quota) * 100
                };
            });
        }
        
        const unavailable = Object.entries(storage)
            .filter(([_, available]) => !available)
            .map(([type]) => type);
        
        return {
            status: unavailable.length === 0 ? 'healthy' : 'degraded',
            storage,
            unavailable,
            quota,
            timestamp: Date.now()
        };
    }
    
    /**
     * Check browser compatibility
     * @returns {Object} Check result
     */
    checkBrowserCompatibility() {
        const features = {
            fetch: 'fetch' in window,
            promises: 'Promise' in window,
            crypto: 'crypto' in window,
            clipboard: 'clipboard' in navigator,
            serviceWorker: 'serviceWorker' in navigator,
            webVitals: 'PerformanceObserver' in window,
            customElements: 'customElements' in window
        };
        
        const missing = Object.entries(features)
            .filter(([_, supported]) => !supported)
            .map(([feature]) => feature);
        
        return {
            status: missing.length === 0 ? 'healthy' : 'degraded',
            features,
            missing,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        };
    }
    
    /**
     * Run all health checks
     * @returns {Promise<Object>} Aggregated results
     */
    async runAllChecks() {
        const results = {};
        const startTime = Date.now();
        
        // Run checks in parallel
        const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
            try {
                const result = await Promise.race([
                    checkFn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Check timeout')), this.config.timeout)
                    )
                ]);
                
                results[name] = result;
                this.results.set(name, result);
            } catch (error) {
                results[name] = {
                    status: 'error',
                    error: error.message,
                    timestamp: Date.now()
                };
            }
        });
        
        await Promise.all(checkPromises);
        
        // Calculate overall health
        const statuses = Object.values(results).map(r => r.status);
        let overallStatus = 'healthy';
        
        if (statuses.includes('unhealthy') || statuses.includes('error')) {
            overallStatus = 'unhealthy';
        } else if (statuses.includes('degraded')) {
            overallStatus = 'degraded';
        }
        
        return {
            status: overallStatus,
            checks: results,
            duration: Date.now() - startTime,
            timestamp: Date.now()
        };
    }
    
    /**
     * Start periodic health checks
     */
    startPeriodicChecks() {
        // Run initial check
        this.runAllChecks();
        
        // Schedule periodic checks
        this.checkInterval = setInterval(() => {
            this.runAllChecks();
        }, this.config.interval);
    }
    
    /**
     * Stop periodic health checks
     */
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    /**
     * Set up health check endpoint
     */
    setupEndpoint() {
        // This would typically be handled by a server
        // For client-side, we'll expose it via window
        window.getHealthStatus = async () => {
            return await this.runAllChecks();
        };
        
        // Also handle specific endpoint path
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', async (event) => {
                if (event.data && event.data.type === 'HEALTH_CHECK') {
                    const status = await this.runAllChecks();
                    event.ports[0].postMessage(status);
                }
            });
        }
    }
    
    /**
     * Get current health status
     * @returns {Object} Current health status
     */
    getStatus() {
        const results = {};
        
        this.results.forEach((result, name) => {
            results[name] = result;
        });
        
        // Calculate overall status
        const statuses = Object.values(results).map(r => r.status);
        let overallStatus = 'healthy';
        
        if (statuses.length === 0) {
            overallStatus = 'unknown';
        } else if (statuses.includes('unhealthy') || statuses.includes('error')) {
            overallStatus = 'unhealthy';
        } else if (statuses.includes('degraded')) {
            overallStatus = 'degraded';
        }
        
        return {
            status: overallStatus,
            checks: results,
            lastCheck: Math.max(...Object.values(results).map(r => r.timestamp || 0)),
            uptime: Date.now() - (window.performance?.timing?.navigationStart || Date.now())
        };
    }
    
    /**
     * Utility: Get memory usage percentage
     * @returns {number} Memory usage percentage
     */
    getMemoryUsage() {
        if (performance.memory) {
            return (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        }
        return 0;
    }
    
    /**
     * Utility: Get page load time
     * @returns {number} Page load time in ms
     */
    getPageLoadTime() {
        if (performance.timing) {
            return performance.timing.loadEventEnd - performance.timing.navigationStart;
        }
        return 0;
    }
    
    /**
     * Utility: Check if CSP is present
     * @returns {boolean}
     */
    hasCSP() {
        const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
        return metaTags.length > 0;
    }
    
    /**
     * Utility: Check secure headers
     * @returns {boolean}
     */
    checkSecureHeaders() {
        // In a real implementation, this would check actual response headers
        // For now, check meta tags
        const secureHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection'
        ];
        
        const metaTags = Array.from(document.querySelectorAll('meta[http-equiv]'));
        const presentHeaders = metaTags.map(tag => tag.getAttribute('http-equiv'));
        
        return secureHeaders.every(header => presentHeaders.includes(header));
    }
    
    /**
     * Utility: Check for mixed content
     * @returns {boolean}
     */
    hasMixedContent() {
        if (window.location.protocol !== 'https:') {
            return false; // Not applicable for non-HTTPS
        }
        
        // Check for non-HTTPS resources
        const resources = performance.getEntriesByType('resource');
        return resources.some(resource => 
            resource.name.startsWith('http://') && !resource.name.startsWith('http://localhost')
        );
    }
    
    /**
     * Utility: Check storage availability
     * @param {string} type - Storage type
     * @returns {boolean}
     */
    isStorageAvailable(type) {
        try {
            const storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Generate health report
     * @returns {Object} Detailed health report
     */
    generateReport() {
        const status = this.getStatus();
        const report = {
            ...status,
            summary: {
                healthy: Object.values(status.checks).filter(c => c.status === 'healthy').length,
                degraded: Object.values(status.checks).filter(c => c.status === 'degraded').length,
                unhealthy: Object.values(status.checks).filter(c => c.status === 'unhealthy').length,
                error: Object.values(status.checks).filter(c => c.status === 'error').length
            },
            recommendations: this.generateRecommendations(status)
        };
        
        return report;
    }
    
    /**
     * Generate recommendations based on health status
     * @param {Object} status - Current status
     * @returns {Array} Recommendations
     */
    generateRecommendations(status) {
        const recommendations = [];
        
        Object.entries(status.checks).forEach(([check, result]) => {
            if (result.status !== 'healthy') {
                switch (check) {
                    case 'api':
                        if (result.apis) {
                            result.apis.filter(api => api.status === 'unhealthy').forEach(api => {
                                recommendations.push({
                                    severity: api.critical ? 'high' : 'medium',
                                    message: `API ${api.name} is not responding`,
                                    action: 'Check network connectivity and API status'
                                });
                            });
                        }
                        break;
                        
                    case 'performance':
                        if (result.issues) {
                            result.issues.forEach(issue => {
                                recommendations.push({
                                    severity: 'medium',
                                    message: issue,
                                    action: 'Optimize application performance'
                                });
                            });
                        }
                        break;
                        
                    case 'security':
                        if (result.failedChecks) {
                            result.failedChecks.forEach(check => {
                                recommendations.push({
                                    severity: 'high',
                                    message: `Security check failed: ${check}`,
                                    action: 'Review security configuration'
                                });
                            });
                        }
                        break;
                        
                    case 'storage':
                        if (result.unavailable) {
                            result.unavailable.forEach(storage => {
                                recommendations.push({
                                    severity: 'low',
                                    message: `${storage} is not available`,
                                    action: 'Check browser settings and permissions'
                                });
                            });
                        }
                        break;
                        
                    case 'browser':
                        if (result.missing) {
                            result.missing.forEach(feature => {
                                recommendations.push({
                                    severity: 'medium',
                                    message: `Browser feature not supported: ${feature}`,
                                    action: 'Update browser or use a modern browser'
                                });
                            });
                        }
                        break;
                }
            }
        });
        
        return recommendations;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HealthCheck;
}