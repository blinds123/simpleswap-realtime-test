// Mobile Optimizer - Runtime mobile optimizations and enhancements

class MobileOptimizer {
    constructor() {
        this.isMobile = this.detectMobile();
        this.isIOS = this.detectIOS();
        this.isAndroid = this.detectAndroid();
        this.isPWA = this.detectPWA();
        this.touchSupported = this.detectTouch();
        
        this.config = {
            enableVibration: true,
            enableHapticFeedback: true,
            enableSwipeGestures: true,
            enablePullToRefresh: false,
            viewportOptimization: true,
            keyboardOptimization: true
        };
        
        this.initializeOptimizations();
    }
    
    /**
     * Initialize mobile optimizations
     */
    initializeOptimizations() {
        if (!this.isMobile) return;
        
        // Viewport optimizations
        this.optimizeViewport();
        
        // Touch optimizations
        this.optimizeTouchEvents();
        
        // Keyboard optimizations
        this.optimizeKeyboard();
        
        // Performance optimizations
        this.optimizePerformance();
        
        // iOS-specific fixes
        if (this.isIOS) {
            this.applyIOSFixes();
        }
        
        // Android-specific optimizations
        if (this.isAndroid) {
            this.applyAndroidOptimizations();
        }
        
        // PWA enhancements
        if (this.isPWA) {
            this.enhancePWAExperience();
        }
        
        console.log('[MobileOptimizer] Mobile optimizations applied');
    }
    
    /**
     * Detect if device is mobile
     * @returns {boolean}
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || window.matchMedia('(max-width: 768px)').matches;
    }
    
    /**
     * Detect iOS devices
     * @returns {boolean}
     */
    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    /**
     * Detect Android devices
     * @returns {boolean}
     */
    detectAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    /**
     * Detect if running as PWA
     * @returns {boolean}
     */
    detectPWA() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true;
    }
    
    /**
     * Detect touch support
     * @returns {boolean}
     */
    detectTouch() {
        return 'ontouchstart' in window || 
               navigator.maxTouchPoints > 0 ||
               navigator.msMaxTouchPoints > 0;
    }
    
    /**
     * Optimize viewport for mobile
     */
    optimizeViewport() {
        if (!this.config.viewportOptimization) return;
        
        // Fix viewport height on iOS
        if (this.isIOS) {
            const setViewportHeight = () => {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
            };
            
            setViewportHeight();
            window.addEventListener('resize', setViewportHeight);
            window.addEventListener('orientationchange', setViewportHeight);
        }
        
        // Prevent double-tap zoom
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });
        
        // Add viewport meta tag if missing
        this.ensureViewportMeta();
    }
    
    /**
     * Ensure proper viewport meta tag
     */
    ensureViewportMeta() {
        let viewport = document.querySelector('meta[name="viewport"]');
        
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = 'viewport';
            document.head.appendChild(viewport);
        }
        
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
    }
    
    /**
     * Optimize touch events
     */
    optimizeTouchEvents() {
        if (!this.touchSupported) return;
        
        // Add touch feedback
        this.addTouchFeedback();
        
        // Improve scroll performance
        this.optimizeScrolling();
        
        // Handle swipe gestures
        if (this.config.enableSwipeGestures) {
            this.setupSwipeGestures();
        }
        
        // Prevent pull-to-refresh if disabled
        if (!this.config.enablePullToRefresh) {
            this.preventPullToRefresh();
        }
    }
    
    /**
     * Add touch feedback
     */
    addTouchFeedback() {
        const touchElements = document.querySelectorAll(
            'button, a, .touchable, [role="button"]'
        );
        
        touchElements.forEach(element => {
            // Visual feedback
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
                
                // Haptic feedback
                if (this.config.enableHapticFeedback) {
                    this.triggerHaptic('light');
                }
            }, { passive: true });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.classList.remove('touch-active');
                }, 100);
            }, { passive: true });
            
            // Prevent ghost clicks
            element.addEventListener('touchend', (e) => {
                e.preventDefault();
                element.click();
            }, { passive: false });
        });
    }
    
    /**
     * Trigger haptic feedback
     * @param {string} style - Haptic style
     */
    triggerHaptic(style = 'light') {
        if (!this.config.enableVibration) return;
        
        // Vibration API
        if ('vibrate' in navigator) {
            switch (style) {
                case 'light':
                    navigator.vibrate(10);
                    break;
                case 'medium':
                    navigator.vibrate(20);
                    break;
                case 'heavy':
                    navigator.vibrate(30);
                    break;
                case 'success':
                    navigator.vibrate([10, 10, 10]);
                    break;
                case 'error':
                    navigator.vibrate([50, 20, 50]);
                    break;
            }
        }
    }
    
    /**
     * Optimize scrolling performance
     */
    optimizeScrolling() {
        // Add momentum scrolling to scrollable areas
        const scrollables = document.querySelectorAll(
            '.scrollable, .overflow-auto, .overflow-scroll'
        );
        
        scrollables.forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
            element.style.overflowY = 'auto';
            
            // Passive listeners for better scroll performance
            element.addEventListener('touchstart', () => {}, { passive: true });
            element.addEventListener('touchmove', () => {}, { passive: true });
        });
    }
    
    /**
     * Set up swipe gestures
     */
    setupSwipeGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe();
        }, { passive: true });
        
        const handleSwipe = () => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const threshold = 50;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (deltaX > threshold) {
                    this.onSwipeRight();
                } else if (deltaX < -threshold) {
                    this.onSwipeLeft();
                }
            } else {
                // Vertical swipe
                if (deltaY > threshold) {
                    this.onSwipeDown();
                } else if (deltaY < -threshold) {
                    this.onSwipeUp();
                }
            }
        };
        
        this.handleSwipe = handleSwipe;
    }
    
    /**
     * Swipe gesture handlers
     */
    onSwipeLeft() {
        // Override in implementation
    }
    
    onSwipeRight() {
        // Override in implementation
    }
    
    onSwipeUp() {
        // Override in implementation
    }
    
    onSwipeDown() {
        // Override in implementation
    }
    
    /**
     * Prevent pull-to-refresh
     */
    preventPullToRefresh() {
        let touchStartY = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].pageY;
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].pageY;
            const touchDiff = touchY - touchStartY;
            
            if (touchDiff > 0 && document.documentElement.scrollTop === 0) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * Optimize keyboard behavior
     */
    optimizeKeyboard() {
        if (!this.config.keyboardOptimization) return;
        
        const inputs = document.querySelectorAll('input, textarea');
        
        inputs.forEach(input => {
            // Prevent zoom on input focus (iOS)
            input.addEventListener('focus', () => {
                if (this.isIOS) {
                    document.querySelector('meta[name="viewport"]').content = 
                        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
                }
                
                // Scroll input into view
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            });
            
            // Restore zoom on blur
            input.addEventListener('blur', () => {
                if (this.isIOS) {
                    document.querySelector('meta[name="viewport"]').content = 
                        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
                }
            });
        });
        
        // Handle virtual keyboard resize
        this.handleVirtualKeyboard();
    }
    
    /**
     * Handle virtual keyboard resize
     */
    handleVirtualKeyboard() {
        let windowHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const keyboardHeight = windowHeight - currentHeight;
            
            if (keyboardHeight > 50) {
                // Keyboard is shown
                document.body.classList.add('keyboard-visible');
                document.body.style.paddingBottom = `${keyboardHeight}px`;
            } else {
                // Keyboard is hidden
                document.body.classList.remove('keyboard-visible');
                document.body.style.paddingBottom = '';
            }
        });
    }
    
    /**
     * Optimize performance for mobile
     */
    optimizePerformance() {
        // Reduce motion for low-power devices
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.body.classList.add('reduce-motion');
        }
        
        // Lazy load images
        this.setupLazyLoading();
        
        // Debounce resize events
        this.debounceResize();
        
        // Optimize animations
        this.optimizeAnimations();
    }
    
    /**
     * Set up lazy loading for images
     */
    setupLazyLoading() {
        if ('loading' in HTMLImageElement.prototype) {
            // Native lazy loading
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                img.loading = 'lazy';
                img.src = img.dataset.src;
            });
        } else {
            // IntersectionObserver fallback
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    /**
     * Debounce resize events
     */
    debounceResize() {
        let resizeTimer;
        const originalResize = window.onresize;
        
        window.onresize = function(...args) {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (originalResize) {
                    originalResize.apply(window, args);
                }
            }, 250);
        };
    }
    
    /**
     * Optimize animations for mobile
     */
    optimizeAnimations() {
        // Use CSS transforms for animations
        const animatedElements = document.querySelectorAll('.animate');
        
        animatedElements.forEach(element => {
            element.style.willChange = 'transform';
            element.style.transform = 'translateZ(0)';
            element.style.backfaceVisibility = 'hidden';
        });
    }
    
    /**
     * Apply iOS-specific fixes
     */
    applyIOSFixes() {
        // Fix 100vh issue
        document.documentElement.style.setProperty(
            '--full-height',
            `${window.innerHeight}px`
        );
        
        // Fix position:fixed issues
        document.addEventListener('focus', (e) => {
            if (e.target.matches('input, textarea')) {
                document.body.classList.add('ios-input-focus');
            }
        }, true);
        
        document.addEventListener('blur', () => {
            document.body.classList.remove('ios-input-focus');
        }, true);
        
        // Fix rubber band scrolling
        document.body.addEventListener('touchmove', (e) => {
            if (!e.target.closest('.scrollable')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    /**
     * Apply Android-specific optimizations
     */
    applyAndroidOptimizations() {
        // Enable hardware acceleration
        document.body.style.transform = 'translateZ(0)';
        
        // Optimize for different Android versions
        const androidVersion = this.getAndroidVersion();
        if (androidVersion && androidVersion < 5) {
            // Older Android optimizations
            document.body.classList.add('android-legacy');
        }
    }
    
    /**
     * Get Android version
     * @returns {number|null}
     */
    getAndroidVersion() {
        const match = navigator.userAgent.match(/Android (\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }
    
    /**
     * Enhance PWA experience
     */
    enhancePWAExperience() {
        // Add PWA-specific classes
        document.body.classList.add('pwa-mode');
        
        // Handle app install prompt
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show custom install UI
            this.showInstallPrompt(deferredPrompt);
        });
        
        // Handle app installed
        window.addEventListener('appinstalled', () => {
            console.log('[MobileOptimizer] PWA installed');
            this.triggerHaptic('success');
        });
    }
    
    /**
     * Show install prompt
     * @param {Event} deferredPrompt
     */
    showInstallPrompt(deferredPrompt) {
        // Implementation depends on UI
        const installButton = document.querySelector('.install-button');
        if (installButton) {
            installButton.style.display = 'block';
            installButton.addEventListener('click', async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`[MobileOptimizer] Install prompt outcome: ${outcome}`);
            });
        }
    }
    
    /**
     * Get device info
     * @returns {Object}
     */
    getDeviceInfo() {
        return {
            isMobile: this.isMobile,
            isIOS: this.isIOS,
            isAndroid: this.isAndroid,
            isPWA: this.isPWA,
            touchSupported: this.touchSupported,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileOptimizer;
}