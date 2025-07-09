// Configuration & Constants for SimpleSwap Polygon Checkout

// Wallet Configuration
const WALLET_CONFIG = {
  // Hardcoded Polygon wallet address
  address: '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
  network: 'polygon',
  currencyCode: 'matic',
  displayName: 'Polygon (MATIC)'
};

// Transaction Configuration
const TRANSACTION_CONFIG = {
  amount: 19.50,
  fromCurrency: 'eur',
  toCurrency: 'matic',
  provider: 'mercuryo',
  fixed: true
};

// SimpleSwap Configuration
const SIMPLESWAP_CONFIG = {
  baseUrl: 'https://simpleswap.io',
  // Mobile override parameters to prevent Moonpay selection
  mobileOverrides: {
    force_provider: 'mercuryo',
    mobile_override: false,
    lock_selection: true,
    desktop_mode: true
  },
  // Timeout for any API calls
  apiTimeout: 5000,
  // Return URL for success validation
  returnUrl: window.location.origin + '/success'
};

// UI Configuration
const UI_CONFIG = {
  // Loading states
  loadingTimeout: 5000,
  copySuccessDisplayTime: 2000,
  
  // Clipboard fallback
  showManualCopyFallback: true,
  
  // Mobile detection
  forceMobileOverrides: true,
  
  // Error messages
  messages: {
    copySuccess: '✓ Wallet address copied!',
    copyFailed: 'Please copy the wallet address manually',
    loadingRedirect: 'Preparing secure checkout...',
    regionRestricted: 'Service not available in your region',
    generalError: 'Something went wrong. Please try again.'
  }
};

// Regional Configuration
const REGIONAL_CONFIG = {
  supportedCountries: ['AU', 'CA', 'US'],
  restrictedUSStates: ['NY', 'HI', 'LA'],
  enableGeoBlocking: true,
  fallbackBehavior: 'show_error' // or 'allow_anyway'
};

// Development Configuration
const DEV_CONFIG = {
  enableLogging: true,
  logLevel: 'debug', // 'error', 'warn', 'info', 'debug'
  testMode: false,
  mockAPI: false,
  showDebugUI: false
};

// Mobile Detection Patterns
const MOBILE_PATTERNS = {
  userAgents: [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i
  ],
  // Force desktop mode on these devices
  forceDesktopDevices: ['iPad'],
  // Known problematic browsers
  problematicBrowsers: ['FB_IAB', 'Instagram']
};

// State Management Events
const APP_EVENTS = {
  WALLET_COPIED: 'wallet:copied',
  WALLET_COPY_FAILED: 'wallet:copy:failed',
  REDIRECT_STARTED: 'redirect:started',
  REDIRECT_FAILED: 'redirect:failed',
  GEO_CHECK_COMPLETE: 'geo:check:complete',
  ERROR_OCCURRED: 'app:error'
};

// Export all configurations
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WALLET_CONFIG,
    TRANSACTION_CONFIG,
    SIMPLESWAP_CONFIG,
    UI_CONFIG,
    REGIONAL_CONFIG,
    DEV_CONFIG,
    MOBILE_PATTERNS,
    APP_EVENTS
  };
}