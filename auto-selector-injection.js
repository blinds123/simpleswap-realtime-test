// Advanced Auto-Selector for SimpleSwap
// This script automatically performs the manual selection that works

(function() {
    'use strict';
    
    console.log('🤖 SimpleSwap Auto-Selector v2.0 Initialized');
    
    // Configuration
    const CONFIG = {
        targetAmount: '19.50',
        targetProvider: 'mercuryo',
        maxAttempts: 100,
        attemptDelay: 300,
        debugMode: true
    };
    
    // State tracking
    let state = {
        attempts: 0,
        providerSelected: false,
        amountCorrected: false,
        monitoring: true
    };
    
    /**
     * Enhanced element finder with multiple strategies
     */
    function findElement(strategies) {
        for (const strategy of strategies) {
            let elements = [];
            
            // Strategy 1: Query selector
            if (strategy.selector) {
                elements = document.querySelectorAll(strategy.selector);
            }
            
            // Strategy 2: Text content search
            if (strategy.text && !elements.length) {
                const allElements = document.querySelectorAll(strategy.tag || '*');
                elements = Array.from(allElements).filter(el => 
                    el.textContent.toLowerCase().includes(strategy.text.toLowerCase())
                );
            }
            
            // Strategy 3: Attribute search
            if (strategy.attribute && !elements.length) {
                elements = document.querySelectorAll(`[${strategy.attribute}*="${strategy.value}"]`);
            }
            
            // Filter by visibility
            const visibleElements = Array.from(elements).filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            
            if (visibleElements.length > 0) {
                if (CONFIG.debugMode) {
                    console.log(`✅ Found element with strategy:`, strategy, visibleElements[0]);
                }
                return visibleElements[0];
            }
        }
        
        return null;
    }
    
    /**
     * Wait for element with promise
     */
    function waitForElement(strategies, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = findElement(strategies);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Element not found within timeout'));
                } else {
                    setTimeout(check, 100);
                }
            }
            
            check();
        });
    }
    
    /**
     * Simulate realistic user interaction
     */
    function simulateClick(element) {
        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait for scroll
        setTimeout(() => {
            // Trigger mouse events
            const events = ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'];
            events.forEach(eventType => {
                const event = new MouseEvent(eventType, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    buttons: 1
                });
                element.dispatchEvent(event);
            });
            
            // Also try direct click
            element.click();
            
            if (CONFIG.debugMode) {
                console.log('🖱️ Clicked element:', element);
            }
        }, 300);
    }
    
    /**
     * Set input value with all necessary events
     */
    function setInputValue(input, value) {
        // Focus the input
        input.focus();
        
        // Clear existing value
        input.value = '';
        
        // Set new value
        input.value = value;
        
        // Trigger all relevant events
        const events = ['input', 'change', 'keyup', 'keydown', 'blur'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            input.dispatchEvent(event);
        });
        
        // For React/Vue apps
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, value);
        
        const inputEvent = new Event('input', { bubbles: true });
        input.dispatchEvent(inputEvent);
        
        if (CONFIG.debugMode) {
            console.log('💰 Set input value to:', value);
        }
    }
    
    /**
     * Main selection process
     */
    async function performAutoSelection() {
        try {
            console.log('🚀 Starting auto-selection process...');
            
            // Step 1: Wait for page to be ready
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });
            
            // Additional wait for dynamic content
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 2: Find and click Mercuryo provider
            console.log('🔍 Looking for Mercuryo option...');
            
            const mercuryoStrategies = [
                { selector: '[data-provider="mercuryo"]' },
                { selector: '[data-value="mercuryo"]' },
                { selector: '.provider-mercuryo' },
                { selector: 'button[value="mercuryo"]' },
                { text: 'mercuryo', tag: 'button' },
                { text: 'mercuryo', tag: 'div' },
                { attribute: 'class', value: 'mercuryo' },
                { attribute: 'id', value: 'mercuryo' }
            ];
            
            try {
                const mercuryoElement = await waitForElement(mercuryoStrategies);
                simulateClick(mercuryoElement);
                state.providerSelected = true;
                console.log('✅ Mercuryo provider selected');
                
                // Wait for UI to update
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.log('⚠️ Could not find Mercuryo option:', error.message);
            }
            
            // Step 3: Correct the amount
            console.log('🔍 Looking for amount input...');
            
            const amountStrategies = [
                { selector: 'input[type="number"]' },
                { selector: 'input[name="amount"]' },
                { selector: 'input[placeholder*="amount"]' },
                { selector: '.amount-input' },
                { selector: 'input[data-test="amount"]' },
                { attribute: 'class', value: 'amount' }
            ];
            
            try {
                const amountInput = await waitForElement(amountStrategies);
                setInputValue(amountInput, CONFIG.targetAmount);
                state.amountCorrected = true;
                console.log('✅ Amount set to:', CONFIG.targetAmount);
            } catch (error) {
                console.log('⚠️ Could not find amount input:', error.message);
            }
            
            // Step 4: Monitor for changes and re-correct if needed
            startMonitoring();
            
        } catch (error) {
            console.error('❌ Auto-selection failed:', error);
            
            // Retry if we haven't exceeded attempts
            if (state.attempts < CONFIG.maxAttempts) {
                state.attempts++;
                console.log(`🔄 Retrying... (${state.attempts}/${CONFIG.maxAttempts})`);
                setTimeout(performAutoSelection, CONFIG.attemptDelay);
            }
        }
    }
    
    /**
     * Monitor for changes and re-correct
     */
    function startMonitoring() {
        if (!state.monitoring) return;
        
        console.log('👁️ Starting continuous monitoring...');
        
        // Monitor amount changes
        setInterval(() => {
            const amountInputs = document.querySelectorAll('input[type="number"]');
            amountInputs.forEach(input => {
                if (input.value && parseFloat(input.value) !== parseFloat(CONFIG.targetAmount)) {
                    console.log('⚠️ Amount changed, correcting...');
                    setInputValue(input, CONFIG.targetAmount);
                }
            });
        }, 500);
        
        // Monitor for provider changes
        const observer = new MutationObserver((mutations) => {
            // Check if Mercuryo is still selected
            const mercuryoActive = document.querySelector('.provider-active[data-provider="mercuryo"]') ||
                                 document.querySelector('.selected[data-provider="mercuryo"]');
            
            if (!mercuryoActive && state.providerSelected) {
                console.log('⚠️ Provider changed, re-selecting Mercuryo...');
                performAutoSelection();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-selected', 'data-active']
        });
    }
    
    /**
     * Manual trigger function
     */
    window.forceSimpleSwapSelection = function() {
        console.log('🔧 Manual trigger activated');
        state.attempts = 0;
        performAutoSelection();
    };
    
    // Start the process
    if (window.location.hostname.includes('simpleswap.io')) {
        performAutoSelection();
    } else {
        console.log('📍 Not on SimpleSwap - script ready for manual activation');
    }
    
})();

// Bookmarklet version
console.log(`
📚 BOOKMARKLET VERSION:
Drag this to your bookmarks bar:

javascript:(function(){${encodeURIComponent(
    document.querySelector('script').textContent.replace(/\n/g, ' ').replace(/\s+/g, ' ')
)}})();
`);