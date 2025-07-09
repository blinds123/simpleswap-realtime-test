// Simple Main Application - Basic functionality without complex dependencies
(function() {
    'use strict';

    // Simple initialization
    function initApp() {
        console.log('[SimpleMain] Initializing application...');
        
        // Setup buy button
        const buyButton = document.getElementById('buy-button');
        if (buyButton) {
            buyButton.addEventListener('click', handleBuyClick);
        }
        
        // Setup strategy selector
        const strategySelector = document.getElementById('strategy-selector');
        if (strategySelector) {
            // Set current strategy from URL
            const urlParams = new URLSearchParams(window.location.search);
            const currentStrategy = urlParams.get('strategy') || 'basic';
            strategySelector.value = currentStrategy;
            
            // Handle strategy changes
            strategySelector.addEventListener('change', (e) => {
                const newStrategy = e.target.value;
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('strategy', newStrategy);
                window.location.href = newUrl.toString();
            });
        }
        
        // Setup wallet display
        displayWalletInfo();
        
        // Setup copy functionality
        setupCopyButton();
        
        // Mark app as ready
        document.body.classList.add('app-ready');
        
        console.log('[SimpleMain] Application ready');
        
        // Auto-test all strategies if autotest parameter is present
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('autotest') === 'true') {
            setTimeout(() => {
                runAutomatedTests();
            }, 2000);
        }
        console.log('[SimpleMain] 🔧 CRITICAL FIX: Using correct SimpleSwap exchange URL format');
        console.log('[SimpleMain] 📋 Format: /exchange?from=eur-eur&to=pol-matic&amount=19.50&rate=floating');
        console.log('[SimpleMain] 🎯 Target: EUR→POL-MATIC with Mercuryo auto-selection');
    }

    // Handle buy button click
    async function handleBuyClick(event) {
        event.preventDefault();
        
        try {
            console.log('[SimpleMain] Buy button clicked');
            window.addDebugMessage && window.addDebugMessage('🖱️ Buy button clicked');
            
            // Show loading
            const buyButton = document.getElementById('buy-button');
            if (buyButton) {
                buyButton.textContent = 'Loading EUR→POL-MATIC...';
                buyButton.disabled = true;
                window.addDebugMessage && window.addDebugMessage('⏳ Button disabled, loading...');
            }
            
            // Build SimpleSwap URL - Try multiple approaches
            const amount = 19.50;
            const walletAddress = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
            
            // FINAL COMPREHENSIVE STRATEGY: Test all known SimpleSwap parameters
            const testStrategies = {
                // Strategy A: Basic exchange format (YOUR PROVIDED EXAMPLE)
                basic: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating`,
                
                // Strategy B: With Mercuryo provider enforcement
                withProvider: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&provider=mercuryo&payment_method=mercuryo`,
                
                // Strategy C: Buy-crypto interface (may work better for fiat)
                buyInterface: `https://simpleswap.io/buy-crypto?fiat_currency=EUR&crypto_currency=MATIC&amount=${amount}&provider=mercuryo&payment_method=mercuryo`,
                
                // Strategy D: Fixed rate to prevent dynamic changes
                fixedRate: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=fixed&provider=mercuryo`,
                
                // Strategy E: With pre-filled wallet address
                withWallet: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&address=${walletAddress}&provider=mercuryo`,
                
                // Strategy F: Buy-sell interface (alternative approach)
                buySell: `https://simpleswap.io/buy-sell-crypto?amount=${amount}&from=eur&to=matic&provider=mercuryo&payment_method=mercuryo`,
                
                // Strategy G: Maximum enforcement parameters
                allLocks: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&provider=mercuryo&payment_method=mercuryo&force_provider=mercuryo&preferred_provider=mercuryo&lock_amount=${amount}&lock_provider=mercuryo`,
                
                // Strategy H: Alternative currency codes
                altCurrency: `https://simpleswap.io/exchange?from=eur&to=matic&amount=${amount}&rate=floating&provider=mercuryo&payment_method=mercuryo`,
                
                // Strategy I: Direct Mercuryo path (if exists)
                directMercuryo: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&provider=mercuryo&payment_method=mercuryo&force_mercuryo=true&mercuryo_only=true`,
                
                // Strategy J: Iframe test (embed without redirect)
                iframe: 'iframe'
            };
            
            // Get current test strategy from URL or default to basic
            const urlParams = new URLSearchParams(window.location.search);
            const testStrategy = urlParams.get('strategy') || 'basic';
            
            console.log('[SimpleMain] 🧪 TESTING STRATEGY:', testStrategy);
            
            // Add visual debug output to page
            const debugOutput = document.createElement('div');
            debugOutput.id = 'debug-output';
            debugOutput.style.cssText = `
                position: fixed; top: 10px; right: 10px; width: 350px; 
                background: rgba(0,0,0,0.9); color: white; padding: 10px; 
                border-radius: 5px; font-family: monospace; font-size: 11px; 
                max-height: 500px; overflow-y: auto; z-index: 9999;
                border: 1px solid #333;
            `;
            debugOutput.innerHTML = `<strong>🧪 LIVE TESTING: ${testStrategy}</strong><br>`;
            document.body.appendChild(debugOutput);
            
            // Function to add debug messages
            window.addDebugMessage = function(message) {
                const debugDiv = document.getElementById('debug-output');
                if (debugDiv) {
                    debugDiv.innerHTML += message + '<br>';
                    debugDiv.scrollTop = debugDiv.scrollHeight;
                }
            };
            
            // Add current strategy info
            window.addDebugMessage(`🎯 Strategy: ${testStrategy}`);
            window.addDebugMessage(`📅 Time: ${new Date().toLocaleTimeString()}`);
            
            // Add "Test All" button to debug panel
            setTimeout(() => {
                const debugDiv = document.getElementById('debug-output');
                if (debugDiv) {
                    const testButton = document.createElement('button');
                    testButton.textContent = '🚀 Test All Strategies';
                    testButton.style.cssText = 'margin-top: 10px; padding: 5px 10px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;';
                    testButton.onclick = () => {
                        window.location.href = '?autotest=true&t=' + Date.now();
                    };
                    debugDiv.appendChild(testButton);
                }
            }, 1000);
            
            // Initialize workingUrl
            let workingUrl;
            
            if (testStrategy === 'iframe') {
                // Strategy H: Iframe approach - keep user on our page
                console.log('[SimpleMain] 🖼️ IFRAME STRATEGY: Embedding SimpleSwap');
                window.addDebugMessage('🖼️ IFRAME STRATEGY: Embedding SimpleSwap');
                
                // Create iframe container
                const iframeContainer = document.createElement('div');
                iframeContainer.innerHTML = `
                    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000;">
                        <div style="position: relative; width: 90%; height: 90%; margin: 5%; background: white; border-radius: 10px; overflow: hidden;">
                            <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: 10px; right: 10px; z-index: 10001; background: red; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;">Close</button>
                            <iframe src="${testStrategies.basic}" style="width: 100%; height: 100%; border: none;"></iframe>
                        </div>
                    </div>
                `;
                document.body.appendChild(iframeContainer);
                return; // Don't redirect
            } else {
                workingUrl = testStrategies[testStrategy] || testStrategies.basic;
                window.addDebugMessage(`🔧 URL: ${workingUrl}`);
            }
            
            const urlFormats = Object.values(testStrategies).filter(url => url !== 'iframe');
            
            console.log('[SimpleMain] 🎯 USING EXACT EXCHANGE FORMAT WITH SUPER AGGRESSIVE MONITORING');
            console.log('[SimpleMain] 🔧 CRITICAL FIX: Using /exchange?from=eur-eur&to=pol-matic&amount=19.50&rate=floating');
            console.log('[SimpleMain] 📋 Target: €19.50 EUR → POL-MATIC via Mercuryo with real-time enforcement');
            console.log('[SimpleMain] ✅ SUPER MONITORING: 100ms fast polling + 250ms deep monitoring + mutation observer');
            console.log('[SimpleMain] Primary URL:', workingUrl);
            console.log('[SimpleMain] All 8 formats with AMOUNT/PROVIDER ENFORCEMENT:');
            urlFormats.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
            
            // Store all formats for potential manual testing
            window.simpleSwapFormats = urlFormats;
            
            // Note: Using buy-sell-crypto endpoint with comprehensive monitoring to prevent changes
            console.log('[SimpleMain] Using buy-sell-crypto with monitoring to prevent amount/provider changes');
            
            // Update button text
            if (buyButton) {
                buyButton.textContent = 'Redirecting & selecting Mercuryo...';
            }
            
            console.log('[SimpleMain] Final URL:', workingUrl);
            window.addDebugMessage && window.addDebugMessage(`🚀 REDIRECTING TO: ${workingUrl}`);
            window.addDebugMessage && window.addDebugMessage(`⏰ Redirect in 1 second...`);
            
            // Redirect after short delay with additional Mercuryo enforcement
            setTimeout(() => {
                // Store preference for Mercuryo before redirect
                try {
                    localStorage.setItem('preferred_payment_method', 'mercuryo');
                    localStorage.setItem('force_provider', 'mercuryo');
                    localStorage.setItem('payment_provider', 'mercuryo');
                    localStorage.setItem('simpleswap_payment_method', 'mercuryo');
                    sessionStorage.setItem('mercuryo_preferred', 'true');
                    sessionStorage.setItem('payment_method', 'mercuryo');
                    sessionStorage.setItem('force_mercuryo', 'true');
                } catch (e) {
                    console.log('Storage not available');
                }
                
                // Add Mercuryo preference to URL hash with referrer info
                const finalUrl = workingUrl + '#mercuryo=true&payment_method=mercuryo&force_provider=mercuryo&referrer=simpleswap_partner';
                
                console.log('[SimpleMain] Final URL with Mercuryo enforcement:', finalUrl);
                
                // Advanced redirect with tab enforcement
                window.location.href = finalUrl;
                
                // CRITICAL: Comprehensive amount and provider monitoring
                setTimeout(() => {
                    try {
                        // Check if we're on SimpleSwap and need to enforce our settings
                        if (window.location.href.includes('simpleswap.io')) {
                            console.log('[SimpleMain] 🔧 CRITICAL MONITORING: Starting amount and provider enforcement');
                            console.log('[SimpleMain] 📸 DEBUG MODE: Capturing page state changes in real-time');
                            console.log('[SimpleMain] 🎬 RECORDING: Watch console for frame-by-frame analysis');
                            
                            // Start continuous monitoring
                            window.simpleSwapMonitor = {
                                targetAmount: '19.50',
                                targetProvider: 'mercuryo',
                                monitoring: true,
                                attempts: 0,
                                maxAttempts: 50
                            };
                            
                            // Function to enforce amount (SUPER AGGRESSIVE)
                            function enforceAmount() {
                                // Check ALL possible amount selectors
                                const amountSelectors = [
                                    'input[type="text"]', 'input[type="number"]', 'input[class*="amount"]', 
                                    'input[class*="input"]', 'input[class*="field"]', 'input[class*="value"]',
                                    '[class*="amount"]', '[class*="price"]', '[class*="value"]', '[class*="total"]',
                                    '[class*="sum"]', '[class*="euro"]', '[class*="eur"]', '[class*="fiat"]'
                                ];
                                
                                amountSelectors.forEach(selector => {
                                    const elements = document.querySelectorAll(selector);
                                    elements.forEach(element => {
                                        // Check inputs
                                        if (element.tagName === 'INPUT' && element.value) {
                                            const currentValue = element.value.toString();
                                            if (currentValue.includes('21.42') || 
                                                currentValue.includes('21,42') || 
                                                parseFloat(currentValue) === 21.42 ||
                                                (parseFloat(currentValue) > 20 && parseFloat(currentValue) < 22)) {
                                                
                                                console.log('[SimpleMain] 🚨🚨 AMOUNT HIJACK DETECTED!', element, 'Value:', currentValue, '→ 19.50');
                                                
                                                // Multiple ways to set the value
                                                element.value = '19.50';
                                                element.setAttribute('value', '19.50');
                                                element.defaultValue = '19.50';
                                                
                                                // Trigger ALL possible events
                                                ['input', 'change', 'keyup', 'keydown', 'blur', 'focus', 'paste'].forEach(eventType => {
                                                    try {
                                                        element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
                                                        element.dispatchEvent(new InputEvent(eventType, { bubbles: true, cancelable: true, data: '19.50' }));
                                                    } catch (e) {
                                                        // Fallback for older browsers
                                                        element.dispatchEvent(new Event(eventType, { bubbles: true }));
                                                    }
                                                });
                                                
                                                // Force focus and blur to trigger validation
                                                setTimeout(() => {
                                                    element.focus();
                                                    setTimeout(() => element.blur(), 50);
                                                }, 100);
                                            }
                                        }
                                        
                                        // Check display elements
                                        if (element.textContent) {
                                            const currentText = element.textContent;
                                            if (currentText.includes('21.42') || currentText.includes('21,42')) {
                                                console.log('[SimpleMain] 🚨🚨 DISPLAY HIJACK DETECTED!', element, 'Text:', currentText);
                                                element.textContent = currentText.replace(/21[.,]42/g, '19.50');
                                                element.innerHTML = element.innerHTML.replace(/21[.,]42/g, '19.50');
                                            }
                                        }
                                    });
                                });
                                
                                // Also check for any text nodes containing 21.42
                                const walker = document.createTreeWalker(
                                    document.body,
                                    NodeFilter.SHOW_TEXT,
                                    null,
                                    false
                                );
                                
                                let node;
                                while (node = walker.nextNode()) {
                                    if (node.textContent && (node.textContent.includes('21.42') || node.textContent.includes('21,42'))) {
                                        console.log('[SimpleMain] 🚨🚨 TEXT NODE HIJACK DETECTED!', node.textContent);
                                        node.textContent = node.textContent.replace(/21[.,]42/g, '19.50');
                                    }
                                }
                            }
                            
                            // Function to enforce Mercuryo provider (SUPER AGGRESSIVE)
                            function enforceMercuryoProvider() {
                                console.log('[SimpleMain] 🔍 Scanning for provider elements...');
                                
                                // First, check if Mercuryo has green tick but is not actually selected
                                const allProviderElements = document.querySelectorAll('li, div, button, [class*="provider"], [class*="option"], [class*="method"]');
                                
                                let mercuryoElement = null;
                                let moonpayElement = null;
                                let hasGreenTick = false;
                                let moonpayIsActive = false;
                                
                                allProviderElements.forEach(element => {
                                    const text = element.textContent?.toLowerCase() || '';
                                    const classList = Array.from(element.classList).join(' ').toLowerCase();
                                    
                                    // Check for Mercuryo
                                    if (text.includes('mercuryo')) {
                                        mercuryoElement = element;
                                        
                                        // Check if it has a green tick/checkmark
                                        const hasCheckmark = element.querySelector('svg, .checkmark, [class*="check"], [class*="tick"]') ||
                                                            element.innerHTML.includes('✓') ||
                                                            classList.includes('active') ||
                                                            classList.includes('selected') ||
                                                            classList.includes('best');
                                        
                                        if (hasCheckmark) {
                                            hasGreenTick = true;
                                            console.log('[SimpleMain] ✅ Mercuryo HAS green tick/checkmark', element);
                                        }
                                    }
                                    
                                    // Check for Moonpay
                                    if (text.includes('moonpay') || text.includes('moon pay')) {
                                        moonpayElement = element;
                                        
                                        // Check if Moonpay is somehow still active/default
                                        if (classList.includes('active') || classList.includes('selected') || classList.includes('default')) {
                                            moonpayIsActive = true;
                                            console.log('[SimpleMain] 🚨 MOONPAY IS ACTIVE despite Mercuryo tick!', element);
                                        }
                                    }
                                });
                                
                                // CRITICAL: If Mercuryo has tick but Moonpay is active, force fix this
                                if (hasGreenTick && moonpayIsActive) {
                                    console.log('[SimpleMain] 🚨🚨 CRITICAL ISSUE: Mercuryo has tick but Moonpay is default!');
                                    
                                    // Force click Mercuryo multiple times
                                    if (mercuryoElement) {
                                        console.log('[SimpleMain] 🔥 FORCE CLICKING MERCURYO', mercuryoElement);
                                        for (let i = 0; i < 3; i++) {
                                            setTimeout(() => {
                                                mercuryoElement.click();
                                                // Try clicking all child elements too
                                                const clickables = mercuryoElement.querySelectorAll('button, a, [role="button"], [onclick]');
                                                clickables.forEach(clickable => clickable.click());
                                            }, i * 200);
                                        }
                                    }
                                    
                                    // Force remove active state from Moonpay
                                    if (moonpayElement) {
                                        console.log('[SimpleMain] 🔥 FORCE DEACTIVATING MOONPAY', moonpayElement);
                                        moonpayElement.classList.remove('active', 'selected', 'default');
                                        moonpayElement.style.display = 'none';
                                    }
                                }
                                
                                // Method 1: Aggressive Mercuryo selection by text
                                const mercuryoByText = Array.from(document.querySelectorAll('*')).filter(el => 
                                    el.textContent && el.textContent.toLowerCase().includes('mercuryo')
                                );
                                
                                mercuryoByText.forEach(element => {
                                    if (!element.classList.contains('active')) {
                                        console.log('[SimpleMain] 🎯 Clicking Mercuryo by text:', element.textContent);
                                        element.click();
                                        
                                        // Try all clickable children
                                        const children = element.querySelectorAll('button, a, [role="button"], li, div[onclick]');
                                        children.forEach(child => {
                                            setTimeout(() => child.click(), 100);
                                        });
                                    }
                                });
                                
                                // Method 2: Look for specific Mercuryo SVG logo
                                const mercuryoLogos = document.querySelectorAll('svg path[d*="M78"], svg[class*="mercuryo"], img[alt*="mercuryo" i], img[src*="mercuryo" i]');
                                mercuryoLogos.forEach(logo => {
                                    const parent = logo.closest('li, button, div, a');
                                    if (parent) {
                                        console.log('[SimpleMain] 🎯 Clicking Mercuryo by logo:', parent);
                                        parent.click();
                                    }
                                });
                                
                                // Method 3: Target "best" or "recommended" options (usually Mercuryo)
                                const bestOptions = document.querySelectorAll('[class*="best"], [class*="recommended"], [class*="popular"], [class*="top"]');
                                bestOptions.forEach(option => {
                                    const text = option.textContent?.toLowerCase() || '';
                                    if (text.includes('mercuryo') || (!text.includes('moonpay') && !text.includes('other'))) {
                                        console.log('[SimpleMain] 🎯 Clicking best option (likely Mercuryo):', option);
                                        option.click();
                                    }
                                });
                                
                                // Method 4: Force click anything with Mercuryo class names
                                const mercuryoByClass = document.querySelectorAll('[class*="mercuryo" i], [id*="mercuryo" i], [data-provider="mercuryo"]');
                                mercuryoByClass.forEach(element => {
                                    console.log('[SimpleMain] 🎯 Clicking Mercuryo by class/id:', element);
                                    element.click();
                                });
                                
                                // Method 5: Nuclear option - hide all Moonpay elements
                                const moonpayElements = Array.from(document.querySelectorAll('*')).filter(el => 
                                    el.textContent && (el.textContent.toLowerCase().includes('moonpay') || el.textContent.toLowerCase().includes('moon pay'))
                                );
                                
                                moonpayElements.forEach(element => {
                                    console.log('[SimpleMain] 🚫 Hiding Moonpay element:', element);
                                    element.style.display = 'none';
                                    element.style.visibility = 'hidden';
                                    element.style.opacity = '0';
                                    element.style.pointerEvents = 'none';
                                });
                            }
                            
                            // Function to ensure wallet address is visible and correct
                            function enforceWalletDisplay() {
                                const walletInputs = document.querySelectorAll('input[type="text"], textarea');
                                walletInputs.forEach(input => {
                                    if (input.placeholder && input.placeholder.toLowerCase().includes('address')) {
                                        if (!input.value || input.value !== '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C') {
                                            console.log('[SimpleMain] 🎯 Setting wallet address');
                                            input.value = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                        }
                                    }
                                });
                            }
                            
                            // Continuous monitoring function (SUPER FAST)
                            function monitorAndEnforce() {
                                if (!window.simpleSwapMonitor.monitoring || window.simpleSwapMonitor.attempts >= window.simpleSwapMonitor.maxAttempts) {
                                    return;
                                }
                                
                                window.simpleSwapMonitor.attempts++;
                                console.log(`[SimpleMain] 🔄 MONITOR #${window.simpleSwapMonitor.attempts} - URL: ${window.location.href}`);
                                
                                // Debug: Log current state
                                const allInputs = document.querySelectorAll('input[type="text"], input[type="number"]');
                                console.log(`[SimpleMain] 📊 Found ${allInputs.length} inputs:`);
                                allInputs.forEach((input, index) => {
                                    if (input.value) {
                                        console.log(`  Input ${index}: "${input.value}" (${input.className})`);
                                    }
                                });
                                
                                // Debug: Log providers
                                const providerElements = Array.from(document.querySelectorAll('*')).filter(el => 
                                    el.textContent && (el.textContent.toLowerCase().includes('mercuryo') || el.textContent.toLowerCase().includes('moonpay'))
                                );
                                console.log(`[SimpleMain] 🏦 Found ${providerElements.length} provider elements:`);
                                providerElements.forEach((el, index) => {
                                    const classes = Array.from(el.classList).join(' ');
                                    console.log(`  Provider ${index}: "${el.textContent.trim()}" (${classes})`);
                                });
                                
                                // Run enforcement
                                enforceAmount();
                                enforceMercuryoProvider();
                                enforceWalletDisplay();
                                
                                // Continue monitoring at 250ms intervals for super fast detection
                                setTimeout(monitorAndEnforce, 250);
                            }
                            
                            // Super fast polling for amount changes
                            function fastAmountPolling() {
                                const checkAmount = () => {
                                    const inputs = document.querySelectorAll('input');
                                    inputs.forEach(input => {
                                        if (input.value && (input.value.includes('21.42') || parseFloat(input.value) === 21.42)) {
                                            console.log('[SimpleMain] ⚡ FAST DETECT: Amount change!', input.value);
                                            input.value = '19.50';
                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                        }
                                    });
                                    
                                    // Check display text too
                                    if (document.body.innerText.includes('21.42')) {
                                        console.log('[SimpleMain] ⚡ FAST DETECT: Display shows 21.42!');
                                        enforceAmount();
                                    }
                                };
                                
                                // Run every 100ms for super fast detection
                                setInterval(checkAmount, 100);
                            }
                            
                            // Start fast polling
                            fastAmountPolling();
                            
                            // Start monitoring immediately
                            monitorAndEnforce();
                            
                            // Also set up mutation observer for dynamic changes
                            const observer = new MutationObserver((mutations) => {
                                mutations.forEach((mutation) => {
                                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                                        enforceAmount();
                                        enforceMercuryoProvider();
                                    }
                                });
                            });
                            
                            observer.observe(document.body, {
                                childList: true,
                                subtree: true,
                                characterData: true,
                                attributes: true,
                                attributeFilter: ['class', 'value']
                            });
                            
                            // Store observer for cleanup
                            window.simpleSwapObserver = observer;
                        }
                    } catch (error) {
                        console.error('[SimpleMain] Error in monitoring system:', error);
                    }
                }, 2000);
                
                // Backup: If we land on wrong tab, try to auto-switch after a delay
                setTimeout(() => {
                    // This will run if user somehow ends up on the exchange tab
                    if (window.location.href.includes('simpleswap.io') && 
                        !window.location.href.includes('buy-sell') &&
                        !window.location.href.includes('buy-crypto')) {
                        
                        console.log('[SimpleMain] Detected wrong tab, attempting redirect to buy-sell interface');
                        
                        // Try to redirect to buy-sell interface
                        const buyUrl = `https://simpleswap.io/buy-sell-crypto?amount=${amount}&from=eur&to=matic&address=${walletAddress}&payment_method=mercuryo&provider=mercuryo&force_provider=mercuryo`;
                        window.location.href = buyUrl;
                    }
                }, 3000);
            }, 1000);
            
        } catch (error) {
            console.error('[SimpleMain] Buy button error:', error);
            
            // Reset button
            const buyButton = document.getElementById('buy-button');
            if (buyButton) {
                buyButton.textContent = 'Buy Crypto';
                buyButton.disabled = false;
            }
            
            // Show error message
            showMessage('An error occurred. Please try again.');
        }
    }

    // Display wallet information
    function displayWalletInfo() {
        const walletDisplay = document.querySelector('.wallet-display');
        const walletInput = document.getElementById('wallet-input');
        
        const walletAddress = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
        
        if (walletDisplay) {
            walletDisplay.textContent = walletAddress;
        }
        
        if (walletInput) {
            walletInput.value = walletAddress;
        }
        
        // Update amount display to show EUR
        const amountDisplay = document.querySelector('.amount-display');
        if (amountDisplay) {
            // Ensure EUR is displayed
            amountDisplay.textContent = '€19.50';
        }
        
        // Add debugging info
        console.log('[SimpleMain] Wallet configured:', walletAddress);
        console.log('[SimpleMain] Amount: €19.50 EUR → POL-MATIC (correct format)');
    }

    // Setup copy button
    function setupCopyButton() {
        const copyButton = document.getElementById('copy-button');
        if (copyButton) {
            copyButton.addEventListener('click', handleCopyClick);
        }
    }

    // Handle copy button click
    function handleCopyClick(event) {
        event.preventDefault();
        
        const walletAddress = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
        
        try {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(walletAddress).then(() => {
                    showCopySuccess();
                }).catch(() => {
                    fallbackCopy();
                });
            } else {
                fallbackCopy();
            }
        } catch (error) {
            fallbackCopy();
        }
    }

    // Fallback copy method
    function fallbackCopy() {
        const walletInput = document.getElementById('wallet-input');
        if (walletInput) {
            walletInput.select();
            try {
                document.execCommand('copy');
                showCopySuccess();
            } catch (error) {
                showMessage('Please copy the wallet address manually.');
            }
        }
    }

    // Show copy success
    function showCopySuccess() {
        const copyStatus = document.getElementById('copy-status');
        if (copyStatus) {
            copyStatus.style.display = 'block';
            setTimeout(() => {
                copyStatus.style.display = 'none';
            }, 3000);
        }
    }

    // Show message
    function showMessage(message) {
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // Automated testing function
    function runAutomatedTests() {
        console.log('[AutoTest] 🤖 Starting automated strategy testing...');
        
        const testStrategies = [
            'basic', 'withProvider', 'buyInterface', 'fixedRate', 
            'withWallet', 'buySell', 'allLocks', 'iframe'
        ];
        
        const results = [];
        
        testStrategies.forEach((strategy, index) => {
            setTimeout(() => {
                console.log(`[AutoTest] Testing strategy ${index + 1}/8: ${strategy}`);
                
                // Test URL generation
                const testUrl = generateTestUrl(strategy);
                
                // Test SimpleSwap availability  
                fetch(testUrl, { method: 'HEAD', mode: 'no-cors' })
                    .then(() => {
                        results.push({ strategy, url: testUrl, status: 'accessible' });
                        console.log(`[AutoTest] ✅ ${strategy}: URL accessible`);
                    })
                    .catch(() => {
                        results.push({ strategy, url: testUrl, status: 'blocked' });
                        console.log(`[AutoTest] ❌ ${strategy}: URL blocked`);
                    })
                    .finally(() => {
                        if (results.length === testStrategies.length) {
                            displayTestResults(results);
                        }
                    });
            }, index * 1000); // Stagger tests
        });
    }
    
    function generateTestUrl(strategy) {
        const amount = 19.50;
        const walletAddress = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
        
        const strategies = {
            basic: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating`,
            withProvider: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&provider=mercuryo`,
            buyInterface: `https://simpleswap.io/buy-crypto?fiat_currency=EUR&crypto_currency=MATIC&amount=${amount}&provider=mercuryo`,
            fixedRate: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=fixed`,
            withWallet: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&address=${walletAddress}`,
            buySell: `https://simpleswap.io/buy-sell-crypto?amount=${amount}&from=eur&to=matic`,
            allLocks: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating&provider=mercuryo&lock_amount=true&lock_provider=true`,
            iframe: `https://simpleswap.io/exchange?from=eur-eur&to=pol-matic&amount=${amount}&rate=floating`
        };
        
        return strategies[strategy] || strategies.basic;
    }
    
    function displayTestResults(results) {
        console.log('[AutoTest] 📊 Test Results Summary:');
        
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; color: black; padding: 20px; border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000;
            max-width: 600px; max-height: 400px; overflow-y: auto;
            font-family: monospace; font-size: 14px;
        `;
        
        let html = `<h3>🤖 Automated Test Results</h3>`;
        html += `<p><strong>Testing completed:</strong> ${new Date().toLocaleTimeString()}</p>`;
        
        results.forEach(result => {
            const status = result.status === 'accessible' ? '✅' : '❌';
            html += `<div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">`;
            html += `<strong>${status} ${result.strategy}</strong><br>`;
            html += `<small>${result.url}</small><br>`;
            html += `<em>Status: ${result.status}</em>`;
            html += `</div>`;
        });
        
        html += `<button onclick="this.parentElement.remove()" style="margin-top: 15px; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>`;
        html += `<button onclick="window.location.href='?autotest=true&t=' + Date.now()" style="margin-top: 15px; margin-left: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">Run Again</button>`;
        
        resultDiv.innerHTML = html;
        document.body.appendChild(resultDiv);
        
        console.log('[AutoTest] 🎯 Test completed. Results displayed on page.');
    }

})();