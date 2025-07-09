// SimpleSwap API Research and Testing
// Attempting to find ways to create pre-configured transactions

(async function() {
    'use strict';
    
    // Strategy 1: Try SimpleSwap's potential API endpoints
    const API_ENDPOINTS = {
        // Potential API endpoints based on common patterns
        v1: 'https://api.simpleswap.io/v1',
        v2: 'https://api.simpleswap.io/v2',
        get: 'https://api.simpleswap.io/get_exchange',
        create: 'https://api.simpleswap.io/create_exchange',
        widget: 'https://widget.simpleswap.io/create',
        partner: 'https://partner.simpleswap.io/api'
    };
    
    // Strategy 2: Try to find Mercuryo's direct widget URL
    const MERCURYO_ENDPOINTS = {
        widget: 'https://widget.mercuryo.io/',
        exchange: 'https://exchange.mercuryo.io/',
        api: 'https://api.mercuryo.io/v1.6'
    };
    
    /**
     * Attempt to create a SimpleSwap exchange via API
     */
    async function trySimpleSwapAPI() {
        console.log('🔍 Attempting SimpleSwap API discovery...');
        
        const testPayload = {
            fixed: true,
            currency_from: 'eur',
            currency_to: 'matic',
            amount: '19.50',
            provider: 'mercuryo',
            payment_method: 'mercuryo'
        };
        
        // Try different endpoints
        for (const [name, endpoint] of Object.entries(API_ENDPOINTS)) {
            try {
                console.log(`Testing ${name}: ${endpoint}`);
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(testPayload)
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ SUCCESS on ${name}:`, data);
                    return data;
                }
            } catch (error) {
                console.log(`❌ Failed on ${name}:`, error.message);
            }
        }
    }
    
    /**
     * Generate Mercuryo direct widget URL
     */
    function generateMercuryoDirectUrl(amount = 19.50) {
        const params = new URLSearchParams({
            type: 'buy',
            fiat_currency: 'EUR',
            crypto_currency: 'MATIC',
            fiat_amount: amount.toString(),
            network: 'POLYGON',
            return_url: window.location.href,
            // These might need a widget_id from Mercuryo
            // widget_id: 'YOUR_WIDGET_ID',
            // secret_key: 'YOUR_SECRET'
        });
        
        return `${MERCURYO_ENDPOINTS.widget}?${params.toString()}`;
    }
    
    /**
     * Strategy 3: Analyze SimpleSwap's JavaScript for hooks
     */
    function analyzeSimpleSwapPage() {
        console.log('🔍 Analyzing SimpleSwap page structure...');
        
        // Common state management patterns to look for
        const statePatterns = [
            'window.__REDUX_STORE__',
            'window.__INITIAL_STATE__',
            'window.simpleSwapConfig',
            'window.exchangeConfig',
            'window.app',
            'window.store'
        ];
        
        const results = {};
        
        statePatterns.forEach(pattern => {
            try {
                const value = eval(pattern);
                if (value) {
                    results[pattern] = value;
                    console.log(`✅ Found: ${pattern}`);
                }
            } catch (e) {
                // Pattern doesn't exist
            }
        });
        
        return results;
    }
    
    /**
     * Strategy 4: Create an automated selector script
     */
    function createAutoSelector() {
        return `
        // Auto-selector script for SimpleSwap
        (function() {
            console.log('🤖 SimpleSwap Auto-Selector Active');
            
            let attempts = 0;
            const maxAttempts = 50;
            
            function selectMercuryo() {
                attempts++;
                
                // Look for Mercuryo option
                const mercuryoSelectors = [
                    '[data-provider="mercuryo"]',
                    '[data-test="mercuryo"]',
                    '.provider-mercuryo',
                    'button:contains("Mercuryo")',
                    'div:contains("Mercuryo"):clickable'
                ];
                
                for (const selector of mercuryoSelectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log('✅ Found Mercuryo selector:', selector);
                        element.click();
                        
                        // After selecting Mercuryo, fix the amount
                        setTimeout(fixAmount, 500);
                        return true;
                    }
                }
                
                // Try again if not found
                if (attempts < maxAttempts) {
                    setTimeout(selectMercuryo, 200);
                }
                
                return false;
            }
            
            function fixAmount() {
                // Find amount input
                const amountSelectors = [
                    'input[type="number"]',
                    'input[name="amount"]',
                    'input[data-test="amount"]',
                    '.amount-input'
                ];
                
                for (const selector of amountSelectors) {
                    const input = document.querySelector(selector);
                    if (input) {
                        console.log('✅ Found amount input:', selector);
                        input.value = '19.50';
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
                
                return false;
            }
            
            // Start the process
            setTimeout(selectMercuryo, 1000);
        })();
        `;
    }
    
    /**
     * Strategy 5: Create a bookmarklet for manual override
     */
    function createBookmarklet() {
        const code = createAutoSelector();
        const bookmarklet = 'javascript:' + encodeURIComponent(code);
        
        return {
            name: 'SimpleSwap Mercuryo Force',
            url: bookmarklet,
            instructions: 'Drag this link to your bookmarks bar, then click it on SimpleSwap page'
        };
    }
    
    // Export solutions
    window.SimpleSwapAdvanced = {
        tryAPI: trySimpleSwapAPI,
        mercuryoDirectUrl: generateMercuryoDirectUrl(),
        analyzeState: analyzeSimpleSwapPage,
        autoSelector: createAutoSelector(),
        bookmarklet: createBookmarklet()
    };
    
    console.log('🚀 Advanced SimpleSwap strategies loaded');
    console.log('💡 Try these approaches:');
    console.log('1. Mercuryo Direct URL:', generateMercuryoDirectUrl());
    console.log('2. Run SimpleSwapAdvanced.tryAPI() to test API endpoints');
    console.log('3. Use the bookmarklet:', createBookmarklet());
    
})();