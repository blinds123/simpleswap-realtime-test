// WalletHandler Tests

const WalletHandler = require('../js/walletHandler.js');

describe('WalletHandler', () => {
    let walletHandler;
    const testAddress = '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C';

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock clipboard API
        global.navigator.clipboard = {
            writeText: jest.fn().mockResolvedValue(true)
        };
        
        // Mock document.execCommand
        global.document.execCommand = jest.fn().mockReturnValue(true);
        
        // Create instance
        walletHandler = new WalletHandler(testAddress);
    });

    describe('initialization', () => {
        test('should create WalletHandler instance', () => {
            expect(walletHandler).toBeDefined();
            expect(walletHandler.walletAddress).toBe(testAddress);
            expect(walletHandler.copyMethods).toBeDefined();
        });

        test('should validate wallet address on initialization', () => {
            const consoleWarn = jest.spyOn(console, 'warn');
            const invalidHandler = new WalletHandler('invalid-address');
            
            expect(consoleWarn).toHaveBeenCalledWith(
                expect.stringContaining('Invalid wallet address provided')
            );
        });

        test('should accept dependencies', () => {
            const mockValidator = { validateWalletAddress: jest.fn() };
            const mockAnalytics = { trackEvent: jest.fn() };
            
            const handler = new WalletHandler(testAddress, {
                inputValidator: mockValidator,
                analytics: mockAnalytics
            });
            
            expect(handler.inputValidator).toBe(mockValidator);
            expect(handler.analytics).toBe(mockAnalytics);
        });
    });

    describe('copyToClipboard', () => {
        test('should copy using Clipboard API when available', async () => {
            const result = await walletHandler.copyToClipboard();
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testAddress);
            expect(result.success).toBe(true);
            expect(result.method).toBe('clipboard-api');
        });

        test('should emit success event on successful copy', async () => {
            const eventSpy = jest.fn();
            window.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPIED, eventSpy);
            
            await walletHandler.copyToClipboard();
            
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: APP_EVENTS.WALLET_COPIED,
                    detail: expect.objectContaining({
                        address: testAddress,
                        method: 'clipboard-api'
                    })
                })
            );
        });

        test('should track analytics on successful copy', async () => {
            const mockAnalytics = { trackEvent: jest.fn() };
            walletHandler.analytics = mockAnalytics;
            
            await walletHandler.copyToClipboard();
            
            expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('wallet_copy', {
                method: 'clipboard-api',
                success: true
            });
        });

        test('should fallback to execCommand when Clipboard API fails', async () => {
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Permission denied'));
            
            // Mock text selection
            const mockTextarea = {
                value: '',
                style: {},
                select: jest.fn(),
                setSelectionRange: jest.fn()
            };
            document.createElement = jest.fn().mockReturnValue(mockTextarea);
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
            
            const result = await walletHandler.copyToClipboard();
            
            expect(document.execCommand).toHaveBeenCalledWith('copy');
            expect(result.success).toBe(true);
            expect(result.method).toBe('exec-command');
            expect(mockTextarea.value).toBe(testAddress);
        });

        test('should handle complete failure gracefully', async () => {
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Not supported'));
            document.execCommand.mockReturnValueOnce(false);
            
            const result = await walletHandler.copyToClipboard();
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should emit failure event on copy failure', async () => {
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Failed'));
            document.execCommand.mockReturnValueOnce(false);
            
            const eventSpy = jest.fn();
            window.eventEmitter.addEventListener(APP_EVENTS.WALLET_COPY_FAILED, eventSpy);
            
            await walletHandler.copyToClipboard();
            
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: APP_EVENTS.WALLET_COPY_FAILED,
                    detail: expect.objectContaining({
                        error: expect.any(String)
                    })
                })
            );
        });
    });

    describe('Copy Methods', () => {
        test('should use Clipboard API method', async () => {
            const result = await walletHandler.copyMethods.clipboardAPI(testAddress);
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testAddress);
            expect(result).toBe(true);
        });

        test('should use execCommand method', () => {
            const mockTextarea = {
                value: '',
                style: {},
                select: jest.fn(),
                setSelectionRange: jest.fn()
            };
            document.createElement = jest.fn().mockReturnValue(mockTextarea);
            document.body.appendChild = jest.fn();
            document.body.removeChild = jest.fn();
            
            const result = walletHandler.copyMethods.execCommand(testAddress);
            
            expect(mockTextarea.value).toBe(testAddress);
            expect(mockTextarea.select).toHaveBeenCalled();
            expect(document.execCommand).toHaveBeenCalledWith('copy');
            expect(document.body.removeChild).toHaveBeenCalledWith(mockTextarea);
            expect(result).toBe(true);
        });

        test('should handle execCommand for iOS devices', () => {
            const originalUserAgent = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                configurable: true
            });
            
            const mockInput = {
                value: '',
                style: {},
                contentEditable: true,
                readOnly: false,
                select: jest.fn(),
                setSelectionRange: jest.fn()
            };
            document.createElement = jest.fn().mockReturnValue(mockInput);
            
            const mockRange = { selectNodeContents: jest.fn() };
            const mockSelection = {
                removeAllRanges: jest.fn(),
                addRange: jest.fn()
            };
            window.getSelection = jest.fn().mockReturnValue(mockSelection);
            document.createRange = jest.fn().mockReturnValue(mockRange);
            
            walletHandler.copyMethods.execCommand(testAddress);
            
            expect(mockInput.contentEditable).toBe(true);
            expect(mockInput.readOnly).toBe(false);
            expect(mockRange.selectNodeContents).toHaveBeenCalledWith(mockInput);
            expect(mockSelection.addRange).toHaveBeenCalledWith(mockRange);
            
            Object.defineProperty(navigator, 'userAgent', {
                value: originalUserAgent,
                configurable: true
            });
        });

        test('should provide manual selection method', () => {
            const mockElement = {
                select: jest.fn(),
                setSelectionRange: jest.fn(),
                value: testAddress
            };
            
            const result = walletHandler.copyMethods.manualSelect(mockElement);
            
            expect(mockElement.select).toHaveBeenCalled();
            expect(mockElement.setSelectionRange).toHaveBeenCalledWith(0, testAddress.length);
            expect(result).toBe(true);
        });
    });

    describe('Utility Methods', () => {
        test('should validate polygon addresses', () => {
            const validAddresses = [
                '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
                '0x0000000000000000000000000000000000000000',
                '0xffffffffffffffffffffffffffffffffffffffff'
            ];
            
            validAddresses.forEach(address => {
                expect(walletHandler.isValidAddress(address, 'polygon')).toBe(true);
            });
        });

        test('should reject invalid polygon addresses', () => {
            const invalidAddresses = [
                '0xINVALID',
                '1234567890',
                '0x12345', // Too short
                '0xE5173e7c3089bD89cd1341b637b8e1951745ED5CZ', // Too long
                null,
                undefined,
                ''
            ];
            
            invalidAddresses.forEach(address => {
                expect(walletHandler.isValidAddress(address, 'polygon')).toBe(false);
            });
        });

        test('should validate with custom validator when provided', () => {
            const mockValidator = {
                validateWalletAddress: jest.fn().mockReturnValue(true)
            };
            walletHandler.inputValidator = mockValidator;
            
            const result = walletHandler.isValidAddress(testAddress, 'polygon');
            
            expect(mockValidator.validateWalletAddress).toHaveBeenCalledWith(testAddress, 'polygon');
            expect(result).toBe(true);
        });

        test('should get formatted address', () => {
            const formatted = walletHandler.getFormattedAddress();
            expect(formatted).toBe('0xE517...ED5C');
        });

        test('should handle QR code generation placeholder', () => {
            const qrCode = walletHandler.getQRCode();
            expect(qrCode).toBeNull();
        });
    });

    describe('Browser Compatibility', () => {
        test('should detect clipboard API support', () => {
            expect(walletHandler.supportsClipboardAPI()).toBe(true);
            
            delete navigator.clipboard;
            expect(walletHandler.supportsClipboardAPI()).toBe(false);
            
            navigator.clipboard = { writeText: jest.fn() };
        });

        test('should handle missing window.eventEmitter', async () => {
            const originalEmitter = window.eventEmitter;
            window.eventEmitter = null;
            
            await expect(walletHandler.copyToClipboard()).resolves.toBeDefined();
            
            window.eventEmitter = originalEmitter;
        });

        test('should handle different currency types', () => {
            const btcAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
            const btcHandler = new WalletHandler(btcAddress);
            
            // Should not validate as polygon address
            expect(btcHandler.isValidAddress(btcAddress, 'polygon')).toBe(false);
            // But should still allow copying
            expect(btcHandler.walletAddress).toBe(btcAddress);
        });
    });

    describe('Error Handling', () => {
        test('should handle clipboard permission errors', async () => {
            const permissionError = new Error('Permission denied');
            permissionError.name = 'NotAllowedError';
            navigator.clipboard.writeText.mockRejectedValueOnce(permissionError);
            
            const result = await walletHandler.copyToClipboard();
            
            expect(result.success).toBeDefined();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Clipboard API failed')
            );
        });

        test('should handle document.execCommand errors', () => {
            document.execCommand.mockImplementationOnce(() => {
                throw new Error('ExecCommand failed');
            });
            
            navigator.clipboard.writeText.mockRejectedValueOnce(new Error('API failed'));
            
            const result = walletHandler.copyToClipboard();
            
            expect(result).resolves.toHaveProperty('success', false);
        });

        test('should handle missing wallet address', async () => {
            walletHandler.walletAddress = null;
            
            const result = await walletHandler.copyToClipboard();
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('No wallet address');
        });
    });

    describe('Integration', () => {
        test('should work with SecurityManager validation', async () => {
            const mockSecurityManager = {
                inputValidator: {
                    validateWalletAddress: jest.fn().mockReturnValue(true),
                    sanitizeInput: jest.fn(input => ({ isValid: true, sanitized: input }))
                }
            };
            
            const handler = new WalletHandler(testAddress, {
                inputValidator: mockSecurityManager.inputValidator
            });
            
            const isValid = handler.isValidAddress(testAddress, 'polygon');
            expect(isValid).toBe(true);
            expect(mockSecurityManager.inputValidator.validateWalletAddress).toHaveBeenCalled();
        });

        test('should work with AnalyticsManager tracking', async () => {
            const mockAnalytics = {
                trackEvent: jest.fn(),
                trackCustomEvent: jest.fn()
            };
            
            const handler = new WalletHandler(testAddress, {
                analytics: mockAnalytics
            });
            
            await handler.copyToClipboard();
            
            expect(mockAnalytics.trackEvent).toHaveBeenCalledWith('wallet_copy', {
                method: expect.any(String),
                success: true
            });
        });
    });
});