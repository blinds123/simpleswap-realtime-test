// Deep Link Builder - Constructs SimpleSwap URLs with mobile overrides

class DeepLinkBuilder {
  constructor() {
    this.baseUrl = SIMPLESWAP_CONFIG.baseUrl;
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[DeepLinkBuilder] Initialized with base URL:', this.baseUrl);
    }
  }

  /**
   * Build SimpleSwap URL with all required parameters
   * @param {Object} options - Optional parameter overrides
   * @returns {string} Complete SimpleSwap URL
   */
  buildSimpleSwapURL(options = {}) {
    try {
      // Merge default configuration with any provided options
      const params = {
        amount: options.amount || TRANSACTION_CONFIG.amount,
        fromCurrency: options.fromCurrency || TRANSACTION_CONFIG.fromCurrency,
        toCurrency: options.toCurrency || TRANSACTION_CONFIG.toCurrency,
        walletAddress: options.walletAddress || WALLET_CONFIG.address,
        provider: options.provider || TRANSACTION_CONFIG.provider
      };

      // Validate parameters
      if (!this.validateParameters(params)) {
        throw new Error('Invalid parameters for deep link');
      }

      // Construct URL with parameters
      const url = new URL(this.baseUrl);
      
      // Basic transaction parameters
      url.searchParams.set('from', params.fromCurrency);
      url.searchParams.set('to', params.toCurrency);
      url.searchParams.set('amount', params.amount);
      url.searchParams.set('address', params.walletAddress);
      url.searchParams.set('provider', params.provider);
      
      // Fixed amount flag
      if (TRANSACTION_CONFIG.fixed) {
        url.searchParams.set('fixed', 'true');
      }

      // Add mobile override parameters if on mobile or forced
      if (this.shouldApplyMobileOverrides()) {
        this.addMobileOverrides(url);
      }

      // Add return URL for success validation
      if (SIMPLESWAP_CONFIG.returnUrl) {
        url.searchParams.set('return_url', SIMPLESWAP_CONFIG.returnUrl);
      }

      const finalUrl = url.toString();
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[DeepLinkBuilder] Built URL:', finalUrl);
        console.log('[DeepLinkBuilder] Parameters:', Object.fromEntries(url.searchParams));
      }

      return finalUrl;
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Error building URL:', error);
      }
      
      // Emit error event
      this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.ERROR_OCCURRED, {
        detail: { error: error.message, component: 'DeepLinkBuilder' }
      }));
      
      throw error;
    }
  }

  /**
   * Validate URL parameters
   * @param {Object} params - Parameters to validate
   * @returns {boolean} Valid status
   */
  validateParameters(params) {
    // Validate amount
    if (!params.amount || params.amount <= 0) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Invalid amount:', params.amount);
      }
      return false;
    }

    // Validate currencies
    if (!params.fromCurrency || !params.toCurrency) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Invalid currencies:', params.fromCurrency, params.toCurrency);
      }
      return false;
    }

    // Validate wallet address (Ethereum format for Polygon)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethAddressRegex.test(params.walletAddress)) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Invalid wallet address:', params.walletAddress);
      }
      return false;
    }

    // Validate provider
    if (!params.provider) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Invalid provider:', params.provider);
      }
      return false;
    }

    return true;
  }

  /**
   * Check if mobile overrides should be applied
   * @returns {boolean} Should apply overrides
   */
  shouldApplyMobileOverrides() {
    // Always apply if forced in config
    if (UI_CONFIG.forceMobileOverrides) {
      return true;
    }

    // Check if on mobile device
    return this.isMobileDevice();
  }

  /**
   * Detect if current device is mobile
   * @returns {boolean} Is mobile device
   */
  isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check against known mobile patterns
    const isMobile = MOBILE_PATTERNS.userAgents.some(pattern => pattern.test(userAgent));
    
    // Check for problematic browsers
    const isProblematicBrowser = MOBILE_PATTERNS.problematicBrowsers.some(browser => 
      userAgent.includes(browser)
    );
    
    // Check if device should force desktop mode
    const forceDesktop = MOBILE_PATTERNS.forceDesktopDevices.some(device => 
      userAgent.includes(device)
    );
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[DeepLinkBuilder] Mobile detection:', {
        userAgent,
        isMobile,
        isProblematicBrowser,
        forceDesktop
      });
    }
    
    return (isMobile || isProblematicBrowser) && !forceDesktop;
  }

  /**
   * Add mobile override parameters to URL
   * @param {URL} url - URL object to modify
   */
  addMobileOverrides(url) {
    const overrides = SIMPLESWAP_CONFIG.mobileOverrides;
    
    // Force provider selection
    url.searchParams.set('force_provider', overrides.force_provider);
    
    // Prevent mobile override
    url.searchParams.set('mobile_override', overrides.mobile_override.toString());
    
    // Lock provider selection
    url.searchParams.set('lock_selection', overrides.lock_selection.toString());
    
    // Force desktop mode
    if (overrides.desktop_mode) {
      url.searchParams.set('desktop_mode', 'true');
    }
    
    // Add redundant provider parameters to ensure Mercuryo selection
    url.searchParams.set('selected_provider', TRANSACTION_CONFIG.provider);
    url.searchParams.set('default_provider', TRANSACTION_CONFIG.provider);
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[DeepLinkBuilder] Added mobile overrides');
    }
  }

  /**
   * Open SimpleSwap URL in appropriate manner
   * @param {string} url - URL to open
   * @param {Object} options - Opening options
   */
  openURL(url, options = {}) {
    try {
      const { newTab = false, fallbackDelay = 100 } = options;
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[DeepLinkBuilder] Opening URL:', url, 'Options:', options);
      }
      
      // Emit redirect started event
      this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.REDIRECT_STARTED, {
        detail: { url, method: newTab ? 'new-tab' : 'same-tab' }
      }));
      
      if (newTab) {
        // Try to open in new tab
        const newWindow = window.open(url, '_blank');
        
        // Check if popup was blocked
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          if (DEV_CONFIG.enableLogging) {
            console.warn('[DeepLinkBuilder] Popup blocked, falling back to same tab');
          }
          
          // Fallback to same tab after delay
          setTimeout(() => {
            window.location.href = url;
          }, fallbackDelay);
        }
      } else {
        // Open in same tab
        window.location.href = url;
      }
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Error opening URL:', error);
      }
      
      // Emit redirect failed event
      this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.REDIRECT_FAILED, {
        detail: { error: error.message }
      }));
      
      // Last resort fallback
      window.location.href = url;
    }
  }

  /**
   * Build and open SimpleSwap URL
   * @param {Object} options - URL options
   * @param {Object} openOptions - Opening options
   * @returns {Promise<void>}
   */
  async buildAndOpen(options = {}, openOptions = {}) {
    try {
      const url = this.buildSimpleSwapURL(options);
      
      // Small delay to ensure any UI updates complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.openURL(url, openOptions);
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[DeepLinkBuilder] Build and open failed:', error);
      }
      throw error;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeepLinkBuilder;
}