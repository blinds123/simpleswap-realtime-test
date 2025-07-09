#!/usr/bin/env python3
"""
Adaptive SimpleSwap testing with learning and improvement
Learns from each test failure and adapts the approach
"""

import asyncio
import json
import time
from datetime import datetime
from playwright.async_api import async_playwright

class AdaptiveSimpleSwapTester:
    def __init__(self):
        self.base_url = "https://blinds123.github.io/simpleswap-realtime-test"
        self.strategies = [
            "basic", "withProvider", "buyInterface", "fixedRate", 
            "withWallet", "buySell", "allLocks", "altCurrency", 
            "directMercuryo", "iframe"
        ]
        self.results = []
        self.learned_insights = []
        
    def log_insight(self, insight):
        """Log a learned insight"""
        timestamp = datetime.now().isoformat()
        self.learned_insights.append({
            "timestamp": timestamp,
            "insight": insight
        })
        print(f"🧠 LEARNED: {insight}")
    
    async def wait_for_cache_update(self, strategy_index):
        """Wait progressively longer for cache updates"""
        if strategy_index < 3:
            wait_time = 5  # First few tests might hit old cache
        else:
            wait_time = 2  # Later tests should have updated cache
        
        print(f"⏳ Waiting {wait_time}s for cache update...")
        await asyncio.sleep(wait_time)
    
    async def analyze_console_logs(self, logs):
        """Analyze console logs to understand failures"""
        error_patterns = {
            "ReferenceError: workingUrl is not defined": "JavaScript variable not properly initialized",
            "Refused to frame": "CSP blocks iframe embedding",
            "networkidle timeout": "Page taking too long to load"
        }
        
        findings = []
        for log in logs:
            for pattern, meaning in error_patterns.items():
                if pattern in log:
                    findings.append(f"Found: {meaning}")
        
        return findings
    
    async def test_strategy_with_learning(self, browser, strategy, attempt=1):
        """Test a strategy with adaptive learning"""
        print(f"\n🧪 Testing strategy: {strategy} (attempt {attempt})")
        
        context = await browser.new_context()
        page = await context.new_page()
        
        # Set up console monitoring
        console_logs = []
        def log_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
        
        page.on("console", log_console)
        
        try:
            # Navigate with cache busting
            cache_buster = int(time.time())
            url = f"{self.base_url}?strategy={strategy}&t={cache_buster}"
            print(f"📍 Navigating to: {url}")
            
            await page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for app initialization
            await page.wait_for_selector("#buy-button", timeout=15000)
            await self.wait_for_cache_update(len(self.results))
            
            # Check for debug output (learning point)
            debug_output = await page.query_selector("#debug-output")
            if debug_output:
                debug_text = await debug_output.text_content()
                print(f"🐛 Debug found: {debug_text[:100]}...")
                self.log_insight(f"Debug output present in {strategy}")
            else:
                self.log_insight(f"No debug output in {strategy} - may indicate loading issue")
            
            # Monitor for JavaScript errors before clicking
            js_errors = [log for log in console_logs if "error" in log.lower()]
            if js_errors:
                self.log_insight(f"Pre-click JS errors in {strategy}: {js_errors[-1]}")
            
            print("🖱️ Clicking buy button...")
            await page.click("#buy-button")
            
            # Wait and monitor for changes
            await asyncio.sleep(3)
            
            # Check if we stayed on same page or redirected
            current_url = page.url
            if current_url == url:
                self.log_insight(f"No redirect occurred in {strategy} - checking for errors")
                
                # Analyze console logs for failure reason
                findings = await self.analyze_console_logs(console_logs)
                for finding in findings:
                    self.log_insight(finding)
                
                # Check if it's a JavaScript error we can learn from
                recent_errors = [log for log in console_logs[-5:] if "error" in log.lower()]
                if recent_errors:
                    error_text = recent_errors[-1]
                    if "workingUrl is not defined" in error_text:
                        self.log_insight("JavaScript variable scope issue detected")
                        
                        # Try to fix by waiting longer and retry
                        if attempt < 2:
                            print("🔄 Retrying with longer wait...")
                            await context.close()
                            await asyncio.sleep(5)
                            return await self.test_strategy_with_learning(browser, strategy, attempt + 1)
                
                success = False
                notes = ["No redirect occurred", "Checking console logs for cause"]
                
            elif "simpleswap.io" in current_url:
                print("✅ Successfully redirected to SimpleSwap")
                self.log_insight(f"Successful redirect with {strategy}")
                success = True
                notes = ["Successful redirect"]
                
                # Monitor SimpleSwap page for hijacking
                await self.monitor_simpleswap_with_learning(page, strategy)
                
            else:
                print(f"🤔 Unexpected redirect to: {current_url}")
                self.log_insight(f"Unexpected redirect in {strategy}: {current_url}")
                success = False
                notes = [f"Unexpected redirect to {current_url}"]
            
            # Collect comprehensive results
            result = {
                "strategy": strategy,
                "attempt": attempt,
                "timestamp": datetime.now().isoformat(),
                "success": success,
                "final_url": current_url,
                "console_logs": console_logs[-10:],
                "notes": notes
            }
            
            self.results.append(result)
            
        except Exception as e:
            print(f"❌ Error testing {strategy}: {e}")
            self.log_insight(f"Exception in {strategy}: {str(e)}")
            
            self.results.append({
                "strategy": strategy,
                "attempt": attempt,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "error": str(e),
                "console_logs": console_logs[-5:] if console_logs else [],
                "notes": ["Exception occurred"]
            })
        
        finally:
            await context.close()
    
    async def monitor_simpleswap_with_learning(self, page, strategy):
        """Monitor SimpleSwap with adaptive learning"""
        print("🔍 Monitoring SimpleSwap for amount/provider hijacking...")
        
        amount_found = False
        provider_found = False
        
        # Look for amount changes over time
        for i in range(15):  # Monitor for 15 seconds
            await asyncio.sleep(1)
            
            # Check for amount displays
            try:
                # Method 1: Check input values
                inputs = await page.query_selector_all("input")
                for inp in inputs:
                    value = await inp.input_value() if inp else ""
                    if value and ("19.5" in value or "21.42" in value):
                        print(f"💰 Amount input: {value}")
                        amount_found = True
                        if "21.42" in value:
                            self.log_insight(f"Amount hijack detected in {strategy}: {value}")
                
                # Method 2: Check text content
                page_text = await page.content()
                if "19.5" in page_text or "21.42" in page_text:
                    if not amount_found:
                        print(f"💰 Amount in page text found")
                        amount_found = True
                    if "21.42" in page_text:
                        self.log_insight(f"Amount hijack in page text for {strategy}")
                
                # Method 3: Check for provider elements
                if "mercuryo" in page_text.lower():
                    provider_found = True
                    print(f"🏦 Mercuryo found in page")
                
                if "moonpay" in page_text.lower():
                    print(f"🏦 Moonpay found in page")
                    if provider_found:
                        self.log_insight(f"Provider competition detected in {strategy}")
                
            except Exception as e:
                print(f"⚠️ Monitoring error: {e}")
                continue
        
        # Learning summary
        if amount_found:
            self.log_insight(f"Amount monitoring successful in {strategy}")
        else:
            self.log_insight(f"No amount found in {strategy} - may need different selectors")
        
        if provider_found:
            self.log_insight(f"Provider detection successful in {strategy}")
        
        # Take screenshot for analysis
        screenshot_path = f"/tmp/simpleswap_{strategy}_{int(time.time())}.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"📸 Full page screenshot: {screenshot_path}")
    
    async def run_adaptive_tests(self):
        """Run all tests with adaptive learning"""
        print("🚀 Starting adaptive SimpleSwap testing with learning...")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            
            for i, strategy in enumerate(self.strategies):
                print(f"\n{'='*60}")
                print(f"🧪 TESTING STRATEGY {i+1}/{len(self.strategies)}: {strategy}")
                print(f"{'='*60}")
                
                await self.test_strategy_with_learning(browser, strategy)
                
                # Learn from previous results
                if i > 0:
                    self.analyze_patterns()
                
                # Adaptive delay based on results
                if i < len(self.strategies) - 1:
                    await asyncio.sleep(3)
            
            await browser.close()
        
        # Save comprehensive results
        results_file = f"/tmp/adaptive_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump({
                "results": self.results,
                "insights": self.learned_insights,
                "analysis": self.final_analysis()
            }, f, indent=2)
        
        print(f"\n📊 Comprehensive results saved to: {results_file}")
        self.print_adaptive_summary()
    
    def analyze_patterns(self):
        """Analyze patterns from previous tests"""
        successful_strategies = [r for r in self.results if r.get("success")]
        failed_strategies = [r for r in self.results if not r.get("success")]
        
        if successful_strategies:
            success_pattern = f"Found {len(successful_strategies)} successful strategies"
            self.log_insight(success_pattern)
        
        if failed_strategies:
            # Look for common failure patterns
            js_error_count = sum(1 for r in failed_strategies if any("error" in log.lower() for log in r.get("console_logs", [])))
            if js_error_count > 0:
                self.log_insight(f"JavaScript errors in {js_error_count} strategies - code issue")
    
    def final_analysis(self):
        """Provide final analysis and recommendations"""
        analysis = {
            "total_tests": len(self.results),
            "successful": len([r for r in self.results if r.get("success")]),
            "failed": len([r for r in self.results if not r.get("success")]),
            "key_insights": [],
            "recommendations": []
        }
        
        # Extract key insights
        if "JavaScript variable scope issue detected" in [i["insight"] for i in self.learned_insights]:
            analysis["key_insights"].append("JavaScript variable scoping needs fixing")
            analysis["recommendations"].append("Fix workingUrl variable initialization")
        
        if "CSP blocks iframe embedding" in [i["insight"] for i in self.learned_insights]:
            analysis["key_insights"].append("Iframe approach blocked by CSP")
            analysis["recommendations"].append("Use popup window instead of iframe")
        
        return analysis
    
    def print_adaptive_summary(self):
        """Print adaptive summary with insights"""
        print("\n" + "="*60)
        print("🧠 ADAPTIVE TESTING SUMMARY WITH LEARNING")
        print("="*60)
        
        successful = [r for r in self.results if r.get("success")]
        failed = [r for r in self.results if not r.get("success")]
        
        print(f"✅ Successful: {len(successful)}")
        print(f"❌ Failed: {len(failed)}")
        print(f"🧠 Total insights learned: {len(self.learned_insights)}")
        
        if successful:
            print("\n✅ Working strategies:")
            for result in successful:
                print(f"  - {result['strategy']}: {result['final_url']}")
        
        print("\n🧠 Key insights learned:")
        for insight in self.learned_insights[-10:]:  # Show last 10 insights
            print(f"  - {insight['insight']}")
        
        # Analysis
        analysis = self.final_analysis()
        print(f"\n📊 Analysis:")
        print(f"  - Total tests: {analysis['total_tests']}")
        print(f"  - Success rate: {analysis['successful']}/{analysis['total_tests']}")
        
        if analysis['recommendations']:
            print(f"\n🎯 Recommendations:")
            for rec in analysis['recommendations']:
                print(f"  - {rec}")

if __name__ == "__main__":
    tester = AdaptiveSimpleSwapTester()
    asyncio.run(tester.run_adaptive_tests())