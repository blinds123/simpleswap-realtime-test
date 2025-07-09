// Main Application Entry Point - Production Version
// Initializes all Phase 2 components and manages application lifecycle

(function() {
    'use strict';

    // Application state
    const AppState = {
        initialized: false,
        components: {},
        config: {},
        ready: false
    };

    // Component initialization order (dependencies matter)
    const INIT_ORDER = [
        'SecurityManager',
        'ErrorHandler',
        'CacheManager',
        'PerformanceManager',
        'APIManager',
        'AnalyticsManager',
        'MobileOptimizer',
        'WalletHandler',
        'DeepLinkBuilder',
        'GeoRedirector',
        'MonitoringDashboard',
        'HealthCheck'
    ];

    /**
     * Initialize the application
     */
    async function initializeApp() {
        try {
            console.log('[Main] Starting application initialization...');
            
            // Mark initialization start
            performance.mark('init-start');
            
            // Load configurations
            await loadConfigurations();
            
            // Initialize components in order
            await initializeComponents();
            
            // Set up event handlers
            setupEventHandlers();
            
            // Perform initial checks
            await performInitialChecks();
            
            // Mark app as ready
            markAppReady();
            
            console.log('[Main] Application initialized successfully');
            
        } catch (error) {
            handleInitializationError(error);
        }
    }

    /**
     * Load all configuration files
     */
    async function loadConfigurations() {
        try {
            // Merge configurations
            AppState.config = {
                ...window.WALLET_CONFIG,
                ...window.TRANSACTION_CONFIG,
                ...window.SIMPLESWAP_CONFIG,
                ...window.ProductionConfig,
                security: window.SecurityConfig,
                monitoring: window.MonitoringConfig,
                // Ensure critical values are set
                walletAddress: window.WALLET_CONFIG?.address || '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                amount: window.TRANSACTION_CONFIG?.amount || 19.50,
                currency: window.WALLET_CONFIG?.currencyCode || 'matic',
                apiKey: window.SIMPLESWAP_CONFIG?.apiKey || ''
            };
            
            // Validate critical configurations
            validateConfigurations();
            
        } catch (error) {
            throw new Error(`Configuration loading failed: ${error.message}`);
        }
    }

    /**
     * Validate critical configurations
     */
    function validateConfigurations() {
        const required = ['walletAddress', 'amount', 'currency'];
        const missing = required.filter(key => !AppState.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
    }

    /**
     * Initialize all components
     */
    async function initializeComponents() {
        for (const componentName of INIT_ORDER) {
            try {
                await initializeComponent(componentName);
            } catch (error) {
                console.error(`[Main] Failed to initialize ${componentName}:`, error);
                
                // Determine if this is a critical component
                const criticalComponents = ['SecurityManager', 'ErrorHandler', 'APIManager'];
                if (criticalComponents.includes(componentName)) {
                    throw error;
                }
            }
        }
    }

    /**
     * Initialize a single component
     */
    async function initializeComponent(componentName) {
        console.log(`[Main] Initializing ${componentName}...`);
        
        switch (componentName) {
            case 'SecurityManager':
                AppState.components.securityManager = new SecurityManager();
                window.securityManager = AppState.components.securityManager;
                await AppState.components.securityManager.initialize();
                break;
                
            case 'ErrorHandler':
                AppState.components.errorHandler = new ErrorHandler();
                window.errorHandler = AppState.components.errorHandler;
                break;
                
            case 'CacheManager':
                AppState.components.cacheManager = new CacheManager();
                window.cacheManager = AppState.components.cacheManager;
                break;
                
            case 'PerformanceManager':
                AppState.components.performanceManager = new PerformanceManager();
                window.performanceManager = AppState.components.performanceManager;
                break;
                
            case 'APIManager':
                AppState.components.apiManager = new APIManager();
                window.apiManager = AppState.components.apiManager;
                break;
                
            case 'AnalyticsManager':
                AppState.components.analyticsManager = new AnalyticsManager();
                window.analyticsManager = AppState.components.analyticsManager;
                break;
                
            case 'MobileOptimizer':
                if (typeof MobileOptimizer !== 'undefined') {
                    AppState.components.mobileOptimizer = new MobileOptimizer();
                    window.mobileOptimizer = AppState.components.mobileOptimizer;
                }
                break;
                
            case 'WalletHandler':
                AppState.components.walletHandler = new WalletHandler();
                if (AppState.components.walletHandler.init) {
                    AppState.components.walletHandler.init();
                }
                break;
                
            case 'DeepLinkBuilder':
                AppState.components.deepLinkBuilder = new DeepLinkBuilder();
                break;
                
            case 'GeoRedirector':
                AppState.components.geoRedirector = new GeoRedirector({
                    apiManager: AppState.components.apiManager
                });
                break;
                
            case 'MonitoringDashboard':
                if (window.DEV_CONFIG.showDebugUI) {
                    AppState.components.monitoringDashboard = new MonitoringDashboard();
                }
                break;
                
            case 'HealthCheck':
                if (typeof HealthCheck !== 'undefined') {
                    AppState.components.healthCheck = new HealthCheck();
                    window.healthCheck = AppState.components.healthCheck;
                }
                break;
        }
    }

    /**
     * Set up event handlers
     */
    function setupEventHandlers() {
        // Main buy button handler
        const buyButton = document.getElementById('buy-button');
        if (buyButton) {
            buyButton.addEventListener('click', handleBuyButtonClick);
        }
        
        // Copy button handlers
        const copyButton = document.getElementById('copy-button');
        if (copyButton) {
            copyButton.addEventListener('click', handleCopyButtonClick);
        }
        
        // Manual copy button
        const manualCopyButton = document.getElementById('copy-manual');
        if (manualCopyButton) {
            manualCopyButton.addEventListener('click', handleManualCopyClick);
        }
        
        // Wallet input selection
        const walletInput = document.getElementById('wallet-input');
        if (walletInput) {
            walletInput.addEventListener('click', () => walletInput.select());
        }
        
        // Error message handlers
        window.eventEmitter.addEventListener('error:showMessage', handleErrorMessage);
        
        // Analytics events
        window.eventEmitter.addEventListener(window.APP_EVENTS?.WALLET_COPIED, handleWalletCopied);
        window.eventEmitter.addEventListener(window.APP_EVENTS?.REDIRECT_STARTED, handleRedirectStarted);
    }

    /**
     * Handle buy button click
     */
    async function handleBuyButtonClick(event) {
        event.preventDefault();
        
        try {
            // Track event
            AppState.components.analyticsManager?.trackEvent('checkout_start', {
                amount: AppState.config.amount,
                currency: AppState.config.currency
            });
            
            // Show loading state
            showLoadingState(true);
            
            // Check geo restrictions
            const geoCheck = await AppState.components.geoRedirector?.checkAndRedirect();
            if (geoCheck?.restricted) {
                showMessage('error', geoCheck.message || 'Service not available in your region');
                return;
            }
            
            // Build deep link for SimpleSwap
            const deepLink = AppState.components.deepLinkBuilder?.buildSimpleSwapURL({
                amount: AppState.config.amount || 19.50,
                fromCurrency: 'eur',
                toCurrency: AppState.config.currency || 'matic',
                walletAddress: AppState.config.walletAddress || '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                provider: 'mercuryo'
            });
            
            if (!deepLink) {
                throw new Error('Failed to generate payment link');
            }
            
            // Track redirect
            window.eventEmitter.dispatchEvent(new CustomEvent(window.APP_EVENTS.REDIRECT_STARTED, {
                detail: { url: deepLink, method: 'mercuryo' }
            }));
            
            // Perform redirect
            setTimeout(() => {
                window.location.href = deepLink;
            }, 500);
            
        } catch (error) {
            console.error('[Main] Buy button error:', error);
            showMessage('error', 'Failed to start checkout. Please try again.');
            
            // Track error
            AppState.components.analyticsManager?.trackEvent('error_occurred', {
                category: 'checkout',
                message: error.message
            });
            
        } finally {
            showLoadingState(false);
        }
    }

    /**
     * Handle copy button click
     */
    async function handleCopyButtonClick(event) {
        event.preventDefault();
        
        const walletAddress = AppState.config.walletAddress;
        const result = await AppState.components.walletHandler?.copyToClipboard(walletAddress);
        
        if (result.success) {
            showCopySuccess();
        } else {
            showWalletFallback();
        }
    }

    /**
     * Handle manual copy click
     */
    function handleManualCopyClick(event) {
        event.preventDefault();
        
        const walletInput = document.getElementById('wallet-input');
        if (walletInput) {
            walletInput.select();
            
            try {
                document.execCommand('copy');
                showCopySuccess();
                
                // Track manual copy
                AppState.components.analyticsManager?.trackEvent('wallet_copy', {
                    method: 'manual'
                });
            } catch (error) {
                showMessage('error', 'Failed to copy. Please select and copy manually.');
            }
        }
    }

    /**
     * Handle wallet copied event
     */
    function handleWalletCopied(event) {
        console.log('[Main] Wallet copied:', event.detail);
        showCopySuccess();
    }

    /**
     * Handle redirect started event
     */
    function handleRedirectStarted(event) {
        console.log('[Main] Redirect started:', event.detail);
        showMessage('success', 'Redirecting to secure payment...');
    }

    /**
     * Handle error messages
     */
    function handleErrorMessage(event) {
        const { message, category } = event.detail;
        showMessage('error', message);
    }

    /**
     * Show copy success
     */
    function showCopySuccess() {
        const copyStatus = document.getElementById('copy-status');
        if (copyStatus) {
            copyStatus.style.display = 'block';
            setTimeout(() => {
                copyStatus.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Show wallet fallback
     */
    function showWalletFallback() {
        const fallback = document.getElementById('wallet-fallback');
        if (fallback) {
            fallback.style.display = 'block';
            
            // Auto-select input
            const walletInput = document.getElementById('wallet-input');
            if (walletInput) {
                walletInput.select();
            }
        }
    }

    /**
     * Show loading state
     */
    function showLoadingState(show) {
        const buyButton = document.getElementById('buy-button');
        const loadingState = document.getElementById('loading-state');
        
        if (buyButton && loadingState) {
            buyButton.style.display = show ? 'none' : 'block';
            loadingState.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Show message
     */
    function showMessage(type, message) {
        const messageElements = {
            error: document.getElementById('error-message'),
            success: document.getElementById('success-message'),
            info: document.getElementById('info-message')
        };
        
        // Hide all messages
        Object.values(messageElements).forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Show specific message
        const element = messageElements[type];
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            
            // Auto-hide after delay
            setTimeout(() => {
                element.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Perform initial checks
     */
    async function performInitialChecks() {
        try {
            // Check API connectivity
            if (AppState.components.apiManager) {
                const healthChecks = await Promise.all([
                    AppState.components.apiManager.checkAPIHealth('simpleswap'),
                    AppState.components.apiManager.checkAPIHealth('geolocation')
                ]);
                
                console.log('[Main] API health checks:', healthChecks);
            }
            
            // Validate wallet address
            if (AppState.components.securityManager) {
                const isValid = AppState.components.securityManager.inputValidator.validateWalletAddress(
                    AppState.config.walletAddress,
                    AppState.config.currency.toLowerCase()
                );
                
                if (!isValid) {
                    console.warn('[Main] Invalid wallet address configured');
                }
            }
            
        } catch (error) {
            console.warn('[Main] Initial checks failed:', error);
        }
    }

    /**
     * Mark app as ready
     */
    function markAppReady() {
        AppState.ready = true;
        AppState.initialized = true;
        
        // Dispatch ready event
        window.eventEmitter.dispatchEvent(new Event('app:ready'));
        window.dispatchEvent(new Event('app:ready'));
        
        // Performance measurement
        performance.mark('init-end');
        performance.measure('app-init', 'init-start', 'init-end');
        
        // Log performance
        const measure = performance.getEntriesByName('app-init')[0];
        console.log(`[Main] App initialized in ${Math.round(measure.duration)}ms`);
    }

    /**
     * Handle initialization error
     */
    function handleInitializationError(error) {
        console.error('[Main] Initialization failed:', error);
        
        // Show user-friendly error
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = 'Failed to initialize application. Please refresh the page.';
            errorMessage.style.display = 'block';
        }
        
        // Remove loading screen
        const loader = document.getElementById('app-loading');
        if (loader) {
            loader.classList.add('loaded');
        }
        
        // Report critical error
        if (window.errorHandler) {
            window.errorHandler.handleError({
                type: 'initialization',
                message: error.message,
                stack: error.stack,
                critical: true
            });
        }
    }

    /**
     * Wait for DOM and dependencies
     */
    function waitForDependencies() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 50; // 5 seconds max
            
            const checkInterval = setInterval(() => {
                checkCount++;
                
                // Check if required globals are available
                const requiredGlobals = [
                    'SecurityManager',
                    'ErrorHandler',
                    'APIManager',
                    'WalletHandler',
                    'DeepLinkBuilder',
                    'GeoRedirector'
                ];
                
                const allAvailable = requiredGlobals.every(name => window[name] !== undefined);
                
                if (allAvailable || checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        });
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await waitForDependencies();
            initializeApp();
        });
    } else {
        waitForDependencies().then(() => initializeApp());
    }

})();