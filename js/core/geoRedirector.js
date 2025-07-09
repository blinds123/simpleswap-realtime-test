// Geo Redirector - Optional regional access control

class GeoRedirector {
  constructor() {
    this.userLocation = null;
    this.isRestricted = false;
    this.eventEmitter = window.eventEmitter || new EventTarget();
    this.geoApiUrl = 'https://ipapi.co/json/';
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[GeoRedirector] Initialized');
    }
  }

  /**
   * Initialize geo checking if enabled
   * @returns {Promise<Object>} Location check result
   */
  async init() {
    if (!REGIONAL_CONFIG.enableGeoBlocking) {
      if (DEV_CONFIG.enableLogging) {
        console.log('[GeoRedirector] Geo blocking disabled, allowing access');
      }
      return { allowed: true, location: null };
    }

    try {
      await this.checkUserLocation();
      const accessResult = this.validateRegionalAccess();
      
      // Emit geo check complete event
      this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.GEO_CHECK_COMPLETE, {
        detail: {
          location: this.userLocation,
          allowed: !this.isRestricted,
          reason: accessResult.reason
        }
      }));
      
      return accessResult;
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[GeoRedirector] Geo check failed:', error);
      }
      
      // Handle based on fallback behavior
      return this.handleGeoCheckFailure();
    }
  }

  /**
   * Check user's location using IP geolocation API
   * @returns {Promise<void>}
   */
  async checkUserLocation() {
    try {
      const response = await fetch(this.geoApiUrl, {
        signal: AbortSignal.timeout(UI_CONFIG.loadingTimeout)
      });
      
      if (!response.ok) {
        throw new Error(`Geo API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      this.userLocation = {
        country: data.country_code || 'UNKNOWN',
        region: data.region_code || 'UNKNOWN',
        city: data.city || 'Unknown',
        ip: data.ip
      };
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[GeoRedirector] Location detected:', this.userLocation);
      }
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[GeoRedirector] Location detection error:', error);
      }
      throw error;
    }
  }

  /**
   * Validate if user's region has access
   * @returns {Object} Access validation result
   */
  validateRegionalAccess() {
    if (!this.userLocation) {
      return this.handleUnknownLocation();
    }

    const { country, region } = this.userLocation;
    
    // Check if country is supported
    if (!REGIONAL_CONFIG.supportedCountries.includes(country)) {
      this.isRestricted = true;
      return {
        allowed: false,
        reason: 'country_not_supported',
        message: UI_CONFIG.messages.regionRestricted,
        location: this.userLocation
      };
    }
    
    // Check US state restrictions
    if (country === 'US' && REGIONAL_CONFIG.restrictedUSStates.includes(region)) {
      this.isRestricted = true;
      return {
        allowed: false,
        reason: 'state_restricted',
        message: `Service not available in ${region}`,
        location: this.userLocation
      };
    }
    
    // Access allowed
    this.isRestricted = false;
    return {
      allowed: true,
      reason: 'region_allowed',
      message: 'Access granted',
      location: this.userLocation
    };
  }

  /**
   * Handle unknown location based on fallback behavior
   * @returns {Object} Access result
   */
  handleUnknownLocation() {
    const fallbackBehavior = REGIONAL_CONFIG.fallbackBehavior;
    
    if (fallbackBehavior === 'allow_anyway') {
      if (DEV_CONFIG.enableLogging) {
        console.log('[GeoRedirector] Unknown location, allowing access per config');
      }
      
      return {
        allowed: true,
        reason: 'unknown_location_allowed',
        message: 'Proceeding with unknown location',
        location: { country: 'UNKNOWN', region: 'UNKNOWN' }
      };
    } else {
      // Default to show_error
      this.isRestricted = true;
      return {
        allowed: false,
        reason: 'unknown_location_blocked',
        message: UI_CONFIG.messages.regionRestricted,
        location: { country: 'UNKNOWN', region: 'UNKNOWN' }
      };
    }
  }

  /**
   * Handle geo check failure
   * @returns {Object} Fallback result
   */
  handleGeoCheckFailure() {
    if (REGIONAL_CONFIG.fallbackBehavior === 'allow_anyway') {
      if (DEV_CONFIG.enableLogging) {
        console.log('[GeoRedirector] Geo check failed, allowing access per config');
      }
      
      return {
        allowed: true,
        reason: 'geo_check_failed_allowed',
        message: 'Proceeding despite geo check failure',
        location: null
      };
    } else {
      return {
        allowed: false,
        reason: 'geo_check_failed_blocked',
        message: UI_CONFIG.messages.generalError,
        location: null
      };
    }
  }

  /**
   * Display region status to user
   * @param {Object} result - Access result
   */
  displayRegionStatus(result) {
    const regionStatusElement = document.querySelector('.region-status');
    if (!regionStatusElement) return;
    
    if (result.allowed) {
      const countryName = this.getCountryName(this.userLocation?.country);
      regionStatusElement.innerHTML = `
        <span class="region-icon">✅</span>
        <span class="region-text">Available in ${countryName}</span>
      `;
      regionStatusElement.classList.add('region-allowed');
    } else {
      regionStatusElement.innerHTML = `
        <span class="region-icon">❌</span>
        <span class="region-text">${result.message}</span>
      `;
      regionStatusElement.classList.add('region-blocked');
    }
    
    regionStatusElement.style.display = 'block';
  }

  /**
   * Get friendly country name
   * @param {string} countryCode - Country code
   * @returns {string} Country name
   */
  getCountryName(countryCode) {
    const countryNames = {
      'AU': 'Australia',
      'CA': 'Canada',
      'US': 'United States',
      'UNKNOWN': 'your region'
    };
    
    return countryNames[countryCode] || countryCode;
  }

  /**
   * Show region blocked UI
   * @param {Object} result - Access result
   */
  showRegionBlockedUI(result) {
    // Hide buy button
    const buyButton = document.querySelector('.buy-button');
    if (buyButton) {
      buyButton.disabled = true;
      buyButton.textContent = 'Not Available in Your Region';
    }
    
    // Show error message
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
      errorElement.textContent = result.message;
      errorElement.style.display = 'block';
    }
    
    // Display region status
    this.displayRegionStatus(result);
  }

  /**
   * Check if access is allowed
   * @returns {boolean} Access allowed
   */
  isAccessAllowed() {
    return !this.isRestricted;
  }

  /**
   * Get user location
   * @returns {Object|null} User location
   */
  getUserLocation() {
    return this.userLocation;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeoRedirector;
}