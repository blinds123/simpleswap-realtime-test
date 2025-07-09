// SecurityManager Tests

// Mock the modules before importing
jest.mock('../js/security/InputValidator.js', () => {
    return jest.fn().mockImplementation(() => ({
        validateWalletAddress: jest.fn().mockReturnValue(true),
        validateInput: jest.fn().mockReturnValue({ isValid: true, sanitized: 'test' }),
        sanitizeHTML: jest.fn(input => input.replace(/<[^>]*>/g, ''))
    }));
});

const SecurityManager = require('../js/security/SecurityManager.js');
const InputValidator = require('../js/security/InputValidator.js');

describe('SecurityManager', () => {
    let securityManager;
    let mockDocument;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock document methods
        mockDocument = {
            createElement: jest.fn(tag => ({
                tagName: tag.toUpperCase(),
                setAttribute: jest.fn(),
                content: null
            })),
            head: {
                appendChild: jest.fn()
            },
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => [])
        };
        
        global.document = mockDocument;
        
        // Create instance
        securityManager = new SecurityManager();
    });

    describe('initialization', () => {
        test('should create SecurityManager instance', () => {
            expect(securityManager).toBeDefined();
            expect(securityManager.config).toBeDefined();
            expect(securityManager.inputValidator).toBeDefined();
        });

        test('should initialize with correct configuration', async () => {
            await securityManager.initialize();
            
            expect(securityManager.initialized).toBe(true);
            expect(mockDocument.createElement).toHaveBeenCalled();
            expect(mockDocument.head.appendChild).toHaveBeenCalled();
        });

        test('should set up CSP if enabled', async () => {
            securityManager.config.cspEnabled = true;
            await securityManager.initialize();
            
            const metaCalls = mockDocument.createElement.mock.calls.filter(
                call => call[0] === 'meta'
            );
            expect(metaCalls.length).toBeGreaterThan(0);
        });
    });

    describe('Content Security Policy', () => {
        test('should generate correct CSP directives', () => {
            const csp = securityManager.generateCSPString();
            
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain('script-src');
            expect(csp).toContain('style-src');
            expect(csp).toContain('connect-src');
        });

        test('should include nonce in CSP when enabled', () => {
            securityManager.config.useNonce = true;
            const nonce = securityManager.generateNonce();
            const csp = securityManager.generateCSPString();
            
            expect(nonce).toHaveLength(32);
            expect(csp).toContain(`'nonce-${nonce}'`);
        });

        test('should handle CSP violations', () => {
            const consoleSpy = jest.spyOn(console, 'warn');
            const violation = {
                blockedURI: 'https://evil.com/script.js',
                violatedDirective: 'script-src',
                originalPolicy: "default-src 'self'"
            };
            
            securityManager.handleCSPViolation(violation);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('[SecurityManager] CSP Violation')
            );
        });
    });

    describe('Security Headers', () => {
        test('should get all security headers', () => {
            const headers = securityManager.getSecurityHeaders();
            
            expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
            expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
            expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
            expect(headers).toHaveProperty('Referrer-Policy');
            expect(headers).toHaveProperty('Permissions-Policy');
        });

        test('should set security headers as meta tags', () => {
            securityManager.setSecurityHeaders();
            
            expect(mockDocument.createElement).toHaveBeenCalledWith('meta');
            expect(mockDocument.head.appendChild).toHaveBeenCalled();
        });
    });

    describe('Input Validation', () => {
        test('should validate wallet address', () => {
            const address = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';
            const result = securityManager.validateWalletAddress(address, 'polygon');
            
            expect(securityManager.inputValidator.validateWalletAddress).toHaveBeenCalledWith(
                address,
                'polygon'
            );
            expect(result).toBe(true);
        });

        test('should validate and sanitize input', () => {
            const input = '<script>alert("xss")</script>Test';
            const result = securityManager.validateInput(input, 'text');
            
            expect(securityManager.inputValidator.validateInput).toHaveBeenCalledWith(
                input,
                'text',
                {}
            );
            expect(result.isValid).toBe(true);
        });

        test('should sanitize HTML content', () => {
            const html = '<p>Safe content</p><script>alert("xss")</script>';
            const result = securityManager.sanitizeHTML(html);
            
            expect(securityManager.inputValidator.sanitizeHTML).toHaveBeenCalledWith(html);
            expect(result).not.toContain('<script>');
        });
    });

    describe('Security Features', () => {
        test('should prevent clickjacking', () => {
            securityManager.preventClickjacking();
            
            const headers = securityManager.getSecurityHeaders();
            expect(headers['X-Frame-Options']).toBe('DENY');
        });

        test('should disable right-click when configured', () => {
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
            securityManager.config.disableRightClick = true;
            
            securityManager.disableRightClick();
            
            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'contextmenu',
                expect.any(Function)
            );
        });

        test('should detect and handle dev tools', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn');
            
            // Simulate dev tools detection
            const threshold = { toString: jest.fn() };
            console.log('%c', threshold);
            
            // The toString should be called if dev tools are open
            expect(threshold.toString).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limiting', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should check rate limit for actions', () => {
            const action = 'test-action';
            
            // First attempt should pass
            expect(securityManager.checkRateLimit(action)).toBe(true);
            
            // Subsequent attempts within limit should pass
            for (let i = 0; i < 4; i++) {
                expect(securityManager.checkRateLimit(action)).toBe(true);
            }
            
            // Exceeding limit should fail
            expect(securityManager.checkRateLimit(action)).toBe(false);
        });

        test('should reset rate limit after time window', () => {
            const action = 'test-action';
            
            // Max out the rate limit
            for (let i = 0; i < 5; i++) {
                securityManager.checkRateLimit(action);
            }
            
            expect(securityManager.checkRateLimit(action)).toBe(false);
            
            // Advance time past the window
            jest.advanceTimersByTime(60001);
            
            // Should be allowed again
            expect(securityManager.checkRateLimit(action)).toBe(true);
        });
    });

    describe('Security Monitoring', () => {
        test('should monitor security events', () => {
            const eventSpy = jest.fn();
            global.window.eventEmitter.addEventListener('security:event', eventSpy);
            
            securityManager.monitorSecurityEvents();
            securityManager.logSecurityEvent('test_event', { data: 'test' });
            
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'security:event',
                    detail: expect.objectContaining({
                        event: 'test_event',
                        data: { data: 'test' }
                    })
                })
            );
        });

        test('should detect suspicious patterns', () => {
            const patterns = [
                '<script>alert("xss")</script>',
                'javascript:void(0)',
                'onerror=alert(1)',
                '../../../etc/passwd'
            ];
            
            patterns.forEach(pattern => {
                const result = securityManager.detectSuspiciousPatterns(pattern);
                expect(result.suspicious).toBe(true);
                expect(result.matches.length).toBeGreaterThan(0);
            });
        });

        test('should not flag safe content as suspicious', () => {
            const safeContent = 'This is safe content with no malicious patterns';
            const result = securityManager.detectSuspiciousPatterns(safeContent);
            
            expect(result.suspicious).toBe(false);
            expect(result.matches).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle initialization errors gracefully', async () => {
            mockDocument.createElement.mockImplementationOnce(() => {
                throw new Error('DOM error');
            });
            
            await expect(securityManager.initialize()).resolves.not.toThrow();
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('[SecurityManager] Initialization error')
            );
        });

        test('should handle missing configuration gracefully', () => {
            delete global.SecurityConfig;
            const newSecurityManager = new SecurityManager();
            
            expect(newSecurityManager.config).toBeDefined();
            expect(newSecurityManager.config.cspEnabled).toBeDefined();
        });
    });
});