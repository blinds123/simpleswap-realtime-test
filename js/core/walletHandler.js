// Wallet Handler - Manages wallet address display and clipboard functionality

class WalletHandler {
  constructor() {
    this.walletAddress = WALLET_CONFIG.address;
    this.copyStatusElement = null;
    this.fallbackElement = null;
    this.displayElement = null;
    this.eventEmitter = window.eventEmitter || new EventTarget();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[WalletHandler] Initialized with address:', this.walletAddress);
    }
  }

  /**
   * Initialize wallet handler and set up UI elements
   */
  init() {
    this.displayElement = document.querySelector('.wallet-display');
    this.copyStatusElement = document.querySelector('.wallet-copy-status');
    this.fallbackElement = document.querySelector('.wallet-fallback');
    
    // Display wallet address
    this.displayWalletAddress();
    
    // Set up manual copy button if fallback is present
    const manualCopyBtn = this.fallbackElement?.querySelector('button');
    if (manualCopyBtn) {
      manualCopyBtn.addEventListener('click', () => this.handleManualCopy());
    }
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[WalletHandler] UI elements initialized');
    }
  }

  /**
   * Display wallet address on the page
   */
  displayWalletAddress() {
    if (this.displayElement) {
      this.displayElement.textContent = this.walletAddress;
      this.displayElement.setAttribute('data-wallet', this.walletAddress);
      
      if (DEV_CONFIG.enableLogging) {
        console.log('[WalletHandler] Wallet address displayed');
      }
    }
  }

  /**
   * Copy wallet address to clipboard with fallback
   * @returns {Promise<boolean>} Success status
   */
  async copyToClipboard() {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(this.walletAddress);
        this.confirmCopySuccess();
        
        if (DEV_CONFIG.enableLogging) {
          console.log('[WalletHandler] Address copied via Clipboard API');
        }
        
        // Emit success event
        this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.WALLET_COPIED, {
          detail: { address: this.walletAddress, method: 'clipboard-api' }
        }));
        
        return true;
      } else {
        // Try fallback method
        return this.copyUsingFallback();
      }
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[WalletHandler] Clipboard copy failed:', error);
      }
      
      // Show fallback UI
      this.showFallbackUI();
      
      // Emit failure event
      this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.WALLET_COPY_FAILED, {
        detail: { error: error.message }
      }));
      
      return false;
    }
  }

  /**
   * Fallback copy method using execCommand
   * @returns {boolean} Success status
   */
  copyUsingFallback() {
    try {
      // Create temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = this.walletAddress;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        this.confirmCopySuccess();
        
        if (DEV_CONFIG.enableLogging) {
          console.log('[WalletHandler] Address copied via execCommand');
        }
        
        // Emit success event
        this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.WALLET_COPIED, {
          detail: { address: this.walletAddress, method: 'exec-command' }
        }));
        
        return true;
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (error) {
      if (DEV_CONFIG.enableLogging) {
        console.error('[WalletHandler] Fallback copy failed:', error);
      }
      
      // Show fallback UI
      this.showFallbackUI();
      return false;
    }
  }

  /**
   * Handle manual copy button click
   */
  handleManualCopy() {
    const input = this.fallbackElement.querySelector('input');
    if (input) {
      input.select();
      input.setSelectionRange(0, 99999); // For mobile devices
      
      try {
        document.execCommand('copy');
        this.confirmCopySuccess();
        
        // Hide fallback UI after successful copy
        setTimeout(() => {
          this.hideFallbackUI();
        }, UI_CONFIG.copySuccessDisplayTime);
        
        // Emit success event
        this.eventEmitter.dispatchEvent(new CustomEvent(APP_EVENTS.WALLET_COPIED, {
          detail: { address: this.walletAddress, method: 'manual' }
        }));
      } catch (error) {
        if (DEV_CONFIG.enableLogging) {
          console.error('[WalletHandler] Manual copy failed:', error);
        }
      }
    }
  }

  /**
   * Show copy success confirmation
   */
  confirmCopySuccess() {
    if (this.copyStatusElement) {
      this.copyStatusElement.textContent = UI_CONFIG.messages.copySuccess;
      this.copyStatusElement.style.display = 'block';
      this.copyStatusElement.classList.add('show-success');
      
      // Hide after timeout
      setTimeout(() => {
        this.copyStatusElement.style.display = 'none';
        this.copyStatusElement.classList.remove('show-success');
      }, UI_CONFIG.copySuccessDisplayTime);
    }
  }

  /**
   * Show fallback UI for manual copying
   */
  showFallbackUI() {
    if (this.fallbackElement && UI_CONFIG.showManualCopyFallback) {
      this.fallbackElement.style.display = 'block';
      this.fallbackElement.classList.add('show-fallback');
      
      // Focus on input for easy selection
      const input = this.fallbackElement.querySelector('input');
      if (input) {
        setTimeout(() => {
          input.focus();
          input.select();
        }, 100);
      }
      
      // Show copy failed message
      if (this.copyStatusElement) {
        this.copyStatusElement.textContent = UI_CONFIG.messages.copyFailed;
        this.copyStatusElement.style.display = 'block';
        this.copyStatusElement.classList.add('show-error');
      }
    }
  }

  /**
   * Hide fallback UI
   */
  hideFallbackUI() {
    if (this.fallbackElement) {
      this.fallbackElement.style.display = 'none';
      this.fallbackElement.classList.remove('show-fallback');
    }
  }

  /**
   * Validate wallet address format (Ethereum-compatible)
   * @param {string} address - Address to validate
   * @returns {boolean} Valid status
   */
  validateAddress(address = this.walletAddress) {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  /**
   * Get current wallet address
   * @returns {string} Wallet address
   */
  getAddress() {
    return this.walletAddress;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WalletHandler;
}