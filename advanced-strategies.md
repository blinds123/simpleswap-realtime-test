# Advanced Strategies for SimpleSwap Integration

## Problem Statement
SimpleSwap actively overrides URL parameters for amount and provider selection. Manual intervention is currently the only way to maintain €19.50 with Mercuryo.

## Strategy 1: Direct Mercuryo Widget Integration
Instead of going through SimpleSwap, integrate Mercuryo's widget directly:
```javascript
// Mercuryo Direct Widget
https://widget.mercuryo.io/?widget_id=YOUR_WIDGET_ID&type=buy&fiat_currency=EUR&crypto_currency=MATIC&fiat_amount=19.50
```

## Strategy 2: SimpleSwap Partner/Referral API
Check if SimpleSwap has a partner API that respects locked parameters:
- Look for `/api/v1/create-exchange` endpoint
- Partner dashboard might have transaction pre-configuration
- Referral parameters might have more weight

## Strategy 3: Browser Automation Extension
Create a browser extension that:
1. Detects SimpleSwap page load
2. Waits for UI to render
3. Automatically clicks Mercuryo
4. Forces the amount back to 19.50
5. Auto-submits the form

## Strategy 4: Post-Message iframe Control
Attempt to control SimpleSwap through iframe messaging:
```javascript
// Try to send messages to SimpleSwap iframe
iframe.contentWindow.postMessage({
    action: 'selectProvider',
    provider: 'mercuryo',
    amount: '19.50'
}, 'https://simpleswap.io');
```

## Strategy 5: URL Fragment State Monitoring
Create a solution that:
1. Opens SimpleSwap in a popup window
2. Monitors the popup's URL/state
3. Injects JavaScript to auto-select options
4. Uses window.postMessage for communication

## Strategy 6: Reverse Engineer SimpleSwap's State Management
Analyze their JavaScript to find:
- Redux/state management actions
- Event dispatchers for provider selection
- Methods to programmatically trigger UI clicks

## Strategy 7: Create a Transaction via API First
Some exchanges allow creating a transaction via API that returns a checkout URL:
```javascript
POST https://simpleswap.io/api/v1/create-exchange
{
    "from": "eur",
    "to": "matic", 
    "amount": "19.50",
    "provider": "mercuryo",
    "fixed": true
}
// Returns: { "id": "abc123", "redirect_url": "https://simpleswap.io/exchange/abc123" }
```

## Strategy 8: Use SimpleSwap's Deeplink Parameters
Mobile apps often have deeper integration:
```
simpleswap://exchange?amount=19.50&from=eur&to=matic&provider=mercuryo&fixed=true
```

## Strategy 9: Proxy/Middleware Approach
Create a proxy that:
1. Intercepts SimpleSwap's API calls
2. Modifies their responses to maintain our values
3. Prevents their amount recalculation

## Strategy 10: Contact SimpleSwap Support
Sometimes the best technical solution is a business solution:
- Request a special partner link that respects parameters
- Ask for a dedicated checkout page for your use case
- Negotiate a custom integration

## Most Promising Approach: Mercuryo Direct
Since manual selection of Mercuryo works, the most reliable approach might be to bypass SimpleSwap entirely and use Mercuryo's widget directly for EUR→MATIC transactions.