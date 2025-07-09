// Main Application - Coordinates all components for SimpleSwap Polygon Checkout

class SimpleSwapCheckout {
  constructor() {
    // Initialize event emitter for cross-component communication
    window.eventEmitter = new EventTarget();
    
    // Initialize components
    this.walletHandler = new WalletHandler();
    this.deepLinkBuilder = new DeepLinkBuilder();
    this.geoRedirector = new GeoRedirector();
    
    // UI elements
    this.buyButton = null;
    this.loadingSpinner = null;
    this.errorMessage = null;
    
    // State
    this.isProcessing = false;
    this.geoCheckResult = null;
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[SimpleSwapCheckout] Application initialized');
    }
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Starting initialization...');
      }
      
      // Set up UI elements
      this.setupUIElements();
      
      // Initialize wallet handler
      this.walletHandler.init();
      
      // Perform geo check (optional)
      await this.performGeoCheck();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Log initialization complete
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Initialization complete');
        this.logConfiguration();
      }
      
    } catch (error) {
      console.error('[SimpleSwapCheckout] Initialization error:', error);
      this.showError(UI_CONFIG.messages.generalError);
    }
  }

  /**
   * Set up UI element references
   */
  setupUIElements() {
    this.buyButton = document.querySelector('.buy-button');
    this.loadingSpinner = document.querySelector('.loading-spinner');
    this.errorMessage = document.querySelector('.error-message');
    
    // Verify critical elements exist
    if (!this.buyButton) {
      throw new Error('Buy button not found');
    }
  }

  /**
   * Perform geo location check
   */
  async performGeoCheck() {
    try {
      this.geoCheckResult = await this.geoRedirector.init();
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Geo check result:', this.geoCheckResult);
      }
      
      // Handle restricted access
      if (!this.geoCheckResult.allowed) {
        this.geoRedirector.showRegionBlockedUI(this.geoCheckResult);
      } else {
        this.geoRedirector.displayRegionStatus(this.geoCheckResult);
      }
      
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[SimpleSwapCheckout] Geo check error:', error);
      }
      // Continue anyway if geo check fails
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Buy button click handler
    if (this.buyButton) {
      this.buyButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleBuyClick();
      });
    }
    
    // Listen for component events
    window.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPIED, (e) => {
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Wallet copied:', e.detail);
      }
    });
    
    window.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPY_FAILED, (e) => {
      if (DEV_CONFIG.enableLogging) {
        console.error('[SimpleSwapCheckout] Wallet copy failed:', e.detail);
      }
    });
    
    window.eventEmitter.addEventListener(APP_EVENTS.REDIRECT_STARTED, (e) => {
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Redirect started:', e.detail);
      }
    });
    
    window.eventEmitter.addEventListener(APP_EVENTS.ERROR_OCCURRED, (e) => {
      console.error('[SimpleSwapCheckout] Error occurred:', e.detail);
      this.showError(UI_CONFIG.messages.generalError);
    });
  }

  /**
   * Handle buy button click
   */
  async handleBuyClick() {
    if (this.isProcessing) {
      return;
    }
    
    try {
      this.isProcessing = true;
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Buy button clicked');
      }
      
      // Check geo restrictions
      if (this.geoCheckResult && !this.geoCheckResult.allowed) {
        if (DEV_CONFIG.enableLogging) {
          console.log('[SimpleSwapCheckout] Access restricted for region');
        }
        return;
      }
      
      // Show loading state
      this.showLoading(true);
      
      // Copy wallet address to clipboard
      const copySuccess = await this.walletHandler.copyToClipboard();
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Wallet copy result:', copySuccess);
      }
      
      // Small delay to show copy confirmation
      await this.delay(500);
      
      // Build and open SimpleSwap URL
      await this.redirectToSimpleSwap();
      
    } catch (error) {
      console.error('[SimpleSwapCheckout] Buy process error:', error);
      this.showError(UI_CONFIG.messages.generalError);
      this.showLoading(false);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Redirect to SimpleSwap with configured parameters
   */
  async redirectToSimpleSwap() {
    try {
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Preparing SimpleSwap redirect...');
      }
      
      // Build URL with all parameters
      const url = this.deepLinkBuilder.buildSimpleSwapURL({
        amount: TRANSACTION_CONFIG.amount,
        fromCurrency: TRANSACTION_CONFIG.fromCurrency,
        toCurrency: TRANSACTION_CONFIG.toCurrency,
        walletAddress: WALLET_CONFIG.address,
        provider: TRANSACTION_CONFIG.provider
      });
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[SimpleSwapCheckout] Redirecting to:', url);
      }
      
      // Update button text
      if (this.buyButton) {
        this.buyButton.textContent = 'Redirecting...';
      }
      
      // Delay to ensure user sees the message
      await this.delay(1000);
      
      // Open URL (same tab by default)
      this.deepLinkBuilder.openURL(url, { newTab: false });
      
    } catch (error) {
      console.error('[SimpleSwapCheckout] Redirect error:', error);
      throw error;
    }
  }

  /**
   * Show/hide loading state
   * @param {boolean} show - Show or hide loading
   */
  showLoading(show) {
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = show ? 'block' : 'none';
    }
    
    if (this.buyButton) {
      if (show) {
        this.buyButton.disabled = true;
        this.buyButton.textContent = UI_CONFIG.messages.loadingRedirect;
      } else {
        this.buyButton.disabled = false;
        this.buyButton.textContent = 'Buy Crypto';
      }
    }
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.style.display = 'block';
      
      // Hide after 5 seconds
      setTimeout(() => {
        this.errorMessage.style.display = 'none';
      }, 5000);
    }
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log current configuration (for debugging)
   */
  logConfiguration() {
    console.group('[SimpleSwapCheckout] Configuration');
    console.log('Wallet:', WALLET_CONFIG);
    console.log('Transaction:', TRANSACTION_CONFIG);
    console.log('SimpleSwap:', SIMPLESWAP_CONFIG);
    console.log('Regional:', REGIONAL_CONFIG);
    console.log('UI:', UI_CONFIG);
    console.groupEnd();
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (DEV_CONFIG.enableLogging) {
    console.log('[SimpleSwapCheckout] DOM loaded, initializing application...');
  }
  
  // Create and initialize app instance
  const app = new SimpleSwapCheckout();
  app.init();
  
  // Make app instance available globally for debugging
  window.simpleSwapCheckout = app;
});