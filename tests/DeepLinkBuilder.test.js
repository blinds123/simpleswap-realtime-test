// DeepLinkBuilder Tests

const DeepLinkBuilder = require('../js/deepLinkBuilder.js');

describe('DeepLinkBuilder', () => {
    let deepLinkBuilder;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create instance
        deepLinkBuilder = new DeepLinkBuilder();
    });

    describe('initialization', () => {
        test('should create DeepLinkBuilder instance', () => {
            expect(deepLinkBuilder).toBeDefined();
            expect(deepLinkBuilder.mercuryoBaseUrl).toBe('https://exchange.mercuryo.io/');
            expect(deepLinkBuilder.simpleswapUrl).toBe('https://simpleswap.io');
        });
    });

    describe('buildMercuryoLink', () => {
        test('should build basic Mercuryo link with required params', () => {
            const params = {
                address: '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                amount: '19.50',
                currency: 'MATIC',
                fiatCurrency: 'EUR'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            
            expect(link).toContain('https://exchange.mercuryo.io/');
            expect(link).toContain('widget_id=');
            expect(link).toContain('address=0xE5173e7c3089bD89cd1341b637b8e1951745ED5C');
            expect(link).toContain('amount=19.50');
            expect(link).toContain('currency=MATIC');
            expect(link).toContain('fiat_currency=EUR');
            expect(link).toContain('type=buy');
        });

        test('should include widget ID from config', () => {
            global.SIMPLESWAP_CONFIG = {
                mercuryoWidgetId: 'test-widget-123'
            };
            
            const params = {
                address: '0x123',
                currency: 'MATIC'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            
            expect(link).toContain('widget_id=test-widget-123');
        });

        test('should encode special characters in address', () => {
            const params = {
                address: '0x!@#$%^&*()',
                currency: 'MATIC'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            
            expect(link).toContain('address=0x!%40%23%24%25%5E%26*()');
        });

        test('should include optional parameters when provided', () => {
            const params = {
                address: '0x123',
                currency: 'MATIC',
                returnUrl: 'https://example.com/success',
                userId: 'user123',
                email: 'test@example.com'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            
            expect(link).toContain('return_url=' + encodeURIComponent('https://example.com/success'));
            expect(link).toContain('user_id=user123');
            expect(link).toContain('email=' + encodeURIComponent('test@example.com'));
        });

        test('should set default values', () => {
            const params = {
                address: '0x123',
                currency: 'MATIC'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            
            expect(link).toContain('type=buy');
            expect(link).toContain('fiat_currency=EUR');
        });

        test('should validate required parameters', () => {
            const consoleError = jest.spyOn(console, 'error');
            
            const link = deepLinkBuilder.buildMercuryoLink({});
            
            expect(link).toBeNull();
            expect(consoleError).toHaveBeenCalledWith(
                expect.stringContaining('Missing required parameters')
            );
        });

        test('should build link with all supported parameters', () => {
            const params = {
                address: '0x123',
                currency: 'MATIC',
                amount: '100',
                fiatCurrency: 'USD',
                returnUrl: 'https://example.com',
                userId: 'user123',
                email: 'user@example.com',
                phone: '+1234567890',
                countryCode: 'US',
                merchantTransactionId: 'tx123'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            const url = new URL(link);
            const searchParams = url.searchParams;
            
            expect(searchParams.get('address')).toBe('0x123');
            expect(searchParams.get('currency')).toBe('MATIC');
            expect(searchParams.get('amount')).toBe('100');
            expect(searchParams.get('fiat_currency')).toBe('USD');
            expect(searchParams.get('return_url')).toBe('https://example.com');
            expect(searchParams.get('user_id')).toBe('user123');
            expect(searchParams.get('email')).toBe('user@example.com');
            expect(searchParams.get('phone')).toBe('+1234567890');
            expect(searchParams.get('country_code')).toBe('US');
            expect(searchParams.get('merchant_transaction_id')).toBe('tx123');
        });
    });

    describe('buildSimpleSwapLink', () => {
        test('should build basic SimpleSwap redirect link', () => {
            const params = {
                from: 'btc',
                to: 'eth',
                amount: '0.1'
            };
            
            const link = deepLinkBuilder.buildSimpleSwapLink(params);
            
            expect(link).toBe('https://simpleswap.io?from=btc&to=eth&amount=0.1');
        });

        test('should handle all SimpleSwap parameters', () => {
            const params = {
                from: 'btc',
                to: 'eth',
                amount: '0.1',
                address: '0x123',
                fixedRate: true
            };
            
            const link = deepLinkBuilder.buildSimpleSwapLink(params);
            const url = new URL(link);
            
            expect(url.searchParams.get('from')).toBe('btc');
            expect(url.searchParams.get('to')).toBe('eth');
            expect(url.searchParams.get('amount')).toBe('0.1');
            expect(url.searchParams.get('address')).toBe('0x123');
            expect(url.searchParams.get('fixed')).toBe('true');
        });

        test('should validate required SimpleSwap parameters', () => {
            const consoleError = jest.spyOn(console, 'error');
            
            const link = deepLinkBuilder.buildSimpleSwapLink({ from: 'btc' });
            
            expect(link).toBeNull();
            expect(consoleError).toHaveBeenCalledWith(
                expect.stringContaining('Missing required parameters')
            );
        });
    });

    describe('buildDeepLink', () => {
        test('should build deep link for supported providers', () => {
            const mercuryoLink = deepLinkBuilder.buildDeepLink('mercuryo', {
                address: '0x123',
                currency: 'MATIC'
            });
            
            expect(mercuryoLink).toContain('exchange.mercuryo.io');
            
            const simpleswapLink = deepLinkBuilder.buildDeepLink('simpleswap', {
                from: 'btc',
                to: 'eth'
            });
            
            expect(simpleswapLink).toContain('simpleswap.io');
        });

        test('should return null for unsupported provider', () => {
            const consoleError = jest.spyOn(console, 'error');
            
            const link = deepLinkBuilder.buildDeepLink('unknown', {});
            
            expect(link).toBeNull();
            expect(consoleError).toHaveBeenCalledWith(
                expect.stringContaining('Unsupported provider')
            );
        });
    });

    describe('Currency Mapping', () => {
        test('should map currency correctly for Mercuryo', () => {
            const testCases = [
                { input: 'MATIC', expected: 'MATIC' },
                { input: 'matic', expected: 'MATIC' },
                { input: 'polygon', expected: 'MATIC' },
                { input: 'POLYGON', expected: 'MATIC' },
                { input: 'BTC', expected: 'BTC' },
                { input: 'ETH', expected: 'ETH' }
            ];
            
            testCases.forEach(({ input, expected }) => {
                const link = deepLinkBuilder.buildMercuryoLink({
                    address: '0x123',
                    currency: input
                });
                
                expect(link).toContain(`currency=${expected}`);
            });
        });
    });

    describe('Validation', () => {
        test('should validate email format', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+tag@example.org'
            ];
            
            validEmails.forEach(email => {
                const link = deepLinkBuilder.buildMercuryoLink({
                    address: '0x123',
                    currency: 'MATIC',
                    email
                });
                
                expect(link).toContain(`email=${encodeURIComponent(email)}`);
            });
        });

        test('should validate amount format', () => {
            const validAmounts = ['19.50', '100', '0.001', '1000.00'];
            
            validAmounts.forEach(amount => {
                const link = deepLinkBuilder.buildMercuryoLink({
                    address: '0x123',
                    currency: 'MATIC',
                    amount
                });
                
                expect(link).toContain(`amount=${amount}`);
            });
        });

        test('should handle invalid amount gracefully', () => {
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC',
                amount: 'invalid'
            });
            
            // Should still build link without amount
            expect(link).toBeDefined();
            expect(link).not.toContain('amount=invalid');
        });
    });

    describe('URL Building', () => {
        test('should handle base URL with trailing slash', () => {
            deepLinkBuilder.mercuryoBaseUrl = 'https://exchange.mercuryo.io/';
            
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC'
            });
            
            expect(link).toMatch(/^https:\/\/exchange\.mercuryo\.io\/\?/);
            expect(link).not.toContain('///?');
        });

        test('should handle base URL without trailing slash', () => {
            deepLinkBuilder.mercuryoBaseUrl = 'https://exchange.mercuryo.io';
            
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC'
            });
            
            expect(link).toMatch(/^https:\/\/exchange\.mercuryo\.io\?/);
        });

        test('should properly encode all parameter values', () => {
            const params = {
                address: '0x!@#$%',
                currency: 'MATIC',
                email: 'test+user@example.com',
                returnUrl: 'https://example.com/success?order=123&status=complete'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(params);
            const url = new URL(link);
            
            // Check that values are properly decoded by URL parser
            expect(url.searchParams.get('address')).toBe('0x!@#$%');
            expect(url.searchParams.get('email')).toBe('test+user@example.com');
            expect(url.searchParams.get('return_url')).toBe('https://example.com/success?order=123&status=complete');
        });
    });

    describe('Integration', () => {
        test('should work with actual configuration', () => {
            global.SIMPLESWAP_CONFIG = {
                mercuryoWidgetId: 'real-widget-id',
                walletAddress: '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                amount: '19.50',
                currency: 'MATIC'
            };
            
            const link = deepLinkBuilder.buildMercuryoLink({
                address: SIMPLESWAP_CONFIG.walletAddress,
                amount: SIMPLESWAP_CONFIG.amount,
                currency: SIMPLESWAP_CONFIG.currency,
                fiatCurrency: 'EUR'
            });
            
            expect(link).toContain('widget_id=real-widget-id');
            expect(link).toContain('address=0xE5173e7c3089bD89cd1341b637b8e1951745ED5C');
            expect(link).toContain('amount=19.50');
            expect(link).toContain('currency=MATIC');
        });

        test('should generate complete checkout URL', () => {
            const checkoutParams = {
                address: '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                amount: '19.50',
                currency: 'MATIC',
                fiatCurrency: 'EUR',
                returnUrl: window.location.href,
                merchantTransactionId: `tx_${Date.now()}`
            };
            
            const link = deepLinkBuilder.buildMercuryoLink(checkoutParams);
            
            // Verify it's a valid URL
            expect(() => new URL(link)).not.toThrow();
            
            // Verify all required checkout params are present
            const url = new URL(link);
            expect(url.searchParams.get('type')).toBe('buy');
            expect(url.searchParams.get('address')).toBeTruthy();
            expect(url.searchParams.get('currency')).toBeTruthy();
            expect(url.searchParams.get('fiat_currency')).toBeTruthy();
        });
    });

    describe('Error Handling', () => {
        test('should handle missing global config gracefully', () => {
            delete global.SIMPLESWAP_CONFIG;
            
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC'
            });
            
            expect(link).toBeDefined();
            expect(link).toContain('widget_id=');
        });

        test('should handle null parameters', () => {
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC',
                amount: null,
                email: null,
                returnUrl: null
            });
            
            expect(link).toBeDefined();
            expect(link).not.toContain('amount=null');
            expect(link).not.toContain('email=null');
            expect(link).not.toContain('return_url=null');
        });

        test('should handle undefined parameters', () => {
            const link = deepLinkBuilder.buildMercuryoLink({
                address: '0x123',
                currency: 'MATIC',
                amount: undefined,
                email: undefined,
                returnUrl: undefined
            });
            
            expect(link).toBeDefined();
            expect(link).not.toContain('amount=undefined');
            expect(link).not.toContain('email=undefined');
            expect(link).not.toContain('return_url=undefined');
        });
    });
});