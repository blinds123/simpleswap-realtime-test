#!/usr/bin/env python3
"""
Autonomous SimpleSwap testing using Playwright
Tests all URL strategies and monitors for amount/provider hijacking
"""

import asyncio
import json
import time
from datetime import datetime
from playwright.async_api import async_playwright

class SimpleSwapTester:
    def __init__(self):
        self.base_url = "https://blinds123.github.io/simpleswap-realtime-test"
        self.strategies = [
            "basic", "withProvider", "buyInterface", "fixedRate", 
            "withWallet", "buySell", "allLocks", "altCurrency", 
            "directMercuryo", "iframe"
        ]
        self.results = []
        
    async def test_strategy(self, browser, strategy):
        """Test a specific strategy and monitor for hijacking"""
        print(f"\n🧪 Testing strategy: {strategy}")
        
        context = await browser.new_context()
        page = await context.new_page()
        
        try:
            # Navigate to the testing page with specific strategy
            url = f"{self.base_url}?strategy={strategy}"
            print(f"📍 Navigating to: {url}")
            
            await page.goto(url, wait_until="networkidle")
            
            # Wait for app to initialize
            await page.wait_for_selector("#buy-button", timeout=10000)
            await asyncio.sleep(2)
            
            # Check if debug output is visible
            debug_output = await page.query_selector("#debug-output")
            if debug_output:
                debug_text = await debug_output.text_content()
                print(f"🐛 Debug output: {debug_text[:200]}...")
            
            # Monitor console logs
            console_logs = []
            def log_console(msg):
                console_logs.append(f"[{msg.type}] {msg.text}")
                print(f"📋 Console: [{msg.type}] {msg.text}")
            
            page.on("console", log_console)
            
            # Click the buy button
            print("🖱️ Clicking buy button...")
            await page.click("#buy-button")
            
            # Wait for redirect or iframe
            if strategy == "iframe":
                # Look for iframe creation
                await asyncio.sleep(3)
                iframe_container = await page.query_selector("div[style*='position: fixed']")
                if iframe_container:
                    print("✅ Iframe overlay created")
                    # Look for iframe
                    iframe = await iframe_container.query_selector("iframe")
                    if iframe:
                        iframe_src = await iframe.get_attribute("src")
                        print(f"🖼️ Iframe src: {iframe_src}")
                        
                        # Try to analyze iframe content (may be blocked by CORS)
                        try:
                            iframe_content = await iframe.content_frame()
                            if iframe_content:
                                print("✅ Iframe content accessible")
                                # Look for amount displays
                                await asyncio.sleep(5)
                                amount_elements = await iframe_content.query_selector_all("*")
                                for element in amount_elements[:20]:  # Check first 20 elements
                                    text = await element.text_content() or ""
                                    if "19.50" in text or "21.42" in text:
                                        print(f"💰 Amount found: {text}")
                        except Exception as e:
                            print(f"❌ Iframe content blocked: {e}")
                    else:
                        print("❌ No iframe found in container")
                else:
                    print("❌ No iframe overlay created")
            else:
                # Wait for redirect
                await asyncio.sleep(2)
                current_url = page.url
                print(f"🔄 Current URL: {current_url}")
                
                if "simpleswap.io" in current_url:
                    print("✅ Successfully redirected to SimpleSwap")
                    
                    # Wait for page to load
                    await page.wait_for_load_state("networkidle", timeout=15000)
                    
                    # Monitor for amount changes
                    print("👀 Monitoring for amount changes...")
                    await self.monitor_simpleswap_page(page, strategy)
                    
                else:
                    print("❌ No redirect to SimpleSwap detected")
            
            # Collect results
            result = {
                "strategy": strategy,
                "timestamp": datetime.now().isoformat(),
                "success": "simpleswap.io" in page.url or strategy == "iframe",
                "final_url": page.url,
                "console_logs": console_logs[-10:],  # Last 10 logs
                "notes": []
            }
            
            self.results.append(result)
            print(f"✅ Strategy {strategy} completed")
            
        except Exception as e:
            print(f"❌ Error testing {strategy}: {e}")
            self.results.append({
                "strategy": strategy,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "error": str(e),
                "console_logs": [],
                "notes": ["Exception occurred during testing"]
            })
            
        finally:
            await context.close()
    
    async def monitor_simpleswap_page(self, page, strategy):
        """Monitor SimpleSwap page for amount and provider changes"""
        print("🔍 Monitoring SimpleSwap page for hijacking...")
        
        # Look for amount displays
        amount_checks = [
            "input[type='text']", "input[type='number']", 
            "*[class*='amount']", "*[class*='price']", "*[class*='value']"
        ]
        
        for i in range(10):  # Monitor for 10 seconds
            await asyncio.sleep(1)
            
            # Check for amount values
            for selector in amount_checks:
                elements = await page.query_selector_all(selector)
                for element in elements:
                    try:
                        # Check input value
                        value = await element.input_value() if await element.get_attribute("type") in ["text", "number"] else None
                        if value and ("19.50" in value or "21.42" in value):
                            print(f"💰 Amount input found: {value} (selector: {selector})")
                        
                        # Check text content
                        text = await element.text_content() or ""
                        if "19.50" in text or "21.42" in text:
                            print(f"💰 Amount text found: {text} (selector: {selector})")
                            
                    except Exception as e:
                        continue
            
            # Check for provider elements
            provider_elements = await page.query_selector_all("*")
            for element in provider_elements[:100]:  # Check first 100 elements
                try:
                    text = await element.text_content() or ""
                    if "mercuryo" in text.lower() or "moonpay" in text.lower():
                        classes = await element.get_attribute("class") or ""
                        print(f"🏦 Provider found: {text[:50]} (classes: {classes})")
                except Exception as e:
                    continue
            
            print(f"⏰ Monitoring... {i+1}/10")
        
        # Take screenshot for manual review
        screenshot_path = f"/tmp/simpleswap_{strategy}_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path)
        print(f"📸 Screenshot saved: {screenshot_path}")
    
    async def run_all_tests(self):
        """Run all strategy tests"""
        print("🚀 Starting comprehensive SimpleSwap testing...")
        
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=False)  # headless=False to see what's happening
            
            for strategy in self.strategies:
                await self.test_strategy(browser, strategy)
                await asyncio.sleep(2)  # Brief pause between tests
            
            await browser.close()
        
        # Save results
        results_file = f"/tmp/simpleswap_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📊 Results saved to: {results_file}")
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("🎯 SIMPLESWAP TESTING SUMMARY")
        print("="*50)
        
        successful = [r for r in self.results if r.get("success")]
        failed = [r for r in self.results if not r.get("success")]
        
        print(f"✅ Successful: {len(successful)}")
        print(f"❌ Failed: {len(failed)}")
        
        if successful:
            print("\n✅ Working strategies:")
            for result in successful:
                print(f"  - {result['strategy']}: {result['final_url']}")
        
        if failed:
            print("\n❌ Failed strategies:")
            for result in failed:
                error = result.get("error", "Unknown error")
                print(f"  - {result['strategy']}: {error}")

if __name__ == "__main__":
    tester = SimpleSwapTester()
    asyncio.run(tester.run_all_tests())