// ErrorHandler Tests

const ErrorHandler = require('../js/monitoring/ErrorHandler.js');

describe('ErrorHandler', () => {
    let errorHandler;
    let mockEventEmitter;

    beforeEach(() => {
        // Reset mocks and timers
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        // Mock event emitter
        mockEventEmitter = {
            addEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        };
        global.window.eventEmitter = mockEventEmitter;
        
        // Mock window event listeners
        global.window.addEventListener = jest.fn();
        
        // Create instance
        errorHandler = new ErrorHandler();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('initialization', () => {
        test('should create ErrorHandler instance', () => {
            expect(errorHandler).toBeDefined();
            expect(errorHandler.errors).toEqual([]);
            expect(errorHandler.retryQueue).toBeDefined();
            expect(errorHandler.config).toBeDefined();
        });

        test('should set up global error handler', () => {
            const errorListener = window.addEventListener.mock.calls.find(
                call => call[0] === 'error'
            );
            
            expect(errorListener).toBeDefined();
            
            // Simulate global error
            const errorEvent = {
                message: 'Test error',
                filename: 'test.js',
                lineno: 10,
                colno: 5,
                error: new Error('Test error'),
                preventDefault: jest.fn()
            };
            
            errorListener[1](errorEvent);
            
            expect(errorHandler.errors).toHaveLength(1);
            expect(errorHandler.errors[0]).toMatchObject({
                type: 'global',
                message: 'Test error',
                filename: 'test.js',
                lineno: 10,
                colno: 5
            });
        });

        test('should set up unhandled rejection handler', () => {
            const rejectionListener = window.addEventListener.mock.calls.find(
                call => call[0] === 'unhandledrejection'
            );
            
            expect(rejectionListener).toBeDefined();
            
            // Simulate unhandled rejection
            const rejectionEvent = {
                reason: 'Promise rejected',
                promise: Promise.reject('test'),
                preventDefault: jest.fn()
            };
            
            rejectionListener[1](rejectionEvent);
            
            const error = errorHandler.errors.find(e => e.type === 'unhandledRejection');
            expect(error).toBeDefined();
            expect(error.message).toContain('Promise rejected');
        });

        test('should capture console errors when enabled', () => {
            const originalConsoleError = console.error;
            
            errorHandler.config.enableConsoleCapture = true;
            errorHandler.setupConsoleCapture();
            
            console.error('Test console error', { detail: 'info' });
            
            const error = errorHandler.errors.find(e => e.type === 'console');
            expect(error).toBeDefined();
            expect(error.message).toBe('Test console error [object Object]');
            
            // Restore console.error
            console.error = originalConsoleError;
        });
    });

    describe('Error Classification', () => {
        test('should classify network errors', () => {
            const networkErrors = [
                'Network request failed',
                'Failed to fetch',
                'ERR_INTERNET_DISCONNECTED',
                'XMLHttpRequest error'
            ];
            
            networkErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('network');
            });
        });

        test('should classify timeout errors', () => {
            const timeoutErrors = [
                'Request timeout',
                'Operation timed out',
                'Deadline exceeded'
            ];
            
            timeoutErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('timeout');
            });
        });

        test('should classify rate limit errors', () => {
            const rateLimitErrors = [
                'Rate limit exceeded',
                'Too many requests',
                'Error 429'
            ];
            
            rateLimitErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('rateLimit');
            });
        });

        test('should classify auth errors', () => {
            const authErrors = [
                'Unauthorized access',
                '401 error',
                '403 Forbidden'
            ];
            
            authErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('auth');
            });
        });

        test('should classify validation errors', () => {
            const validationErrors = [
                'Validation failed',
                'Invalid input',
                'Field is required'
            ];
            
            validationErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('validation');
            });
        });

        test('should classify browser compatibility errors', () => {
            const browserErrors = [
                'Browser not supported',
                'Feature incompatible'
            ];
            
            browserErrors.forEach(message => {
                const category = errorHandler.classifyError({ message });
                expect(category).toBe('browser');
            });
        });

        test('should classify extension errors', () => {
            const error = {
                message: 'Script error',
                filename: 'chrome-extension://abc123/content.js'
            };
            
            const category = errorHandler.classifyError(error);
            expect(category).toBe('extension');
        });

        test('should classify unknown errors', () => {
            const error = { message: 'Something went wrong' };
            const category = errorHandler.classifyError(error);
            expect(category).toBe('unknown');
        });
    });

    describe('Error Handling', () => {
        test('should handle error with full context', () => {
            const errorInfo = {
                type: 'test',
                message: 'Test error message',
                stack: 'Error stack trace'
            };
            
            const context = {
                userId: '123',
                action: 'button_click'
            };
            
            const errorRecord = errorHandler.handleError(errorInfo, context);
            
            expect(errorRecord).toBeDefined();
            expect(errorRecord.id).toMatch(/^error_\d+_[a-z0-9]+$/);
            expect(errorRecord.timestamp).toBeLessThanOrEqual(Date.now());
            expect(errorRecord.message).toBe('Test error message');
            expect(errorRecord.context).toEqual(context);
            expect(errorRecord.category).toBeDefined();
            expect(errorRecord.userAgent).toBe(navigator.userAgent);
            expect(errorRecord.url).toBe(window.location.href);
        });

        test('should emit error event', () => {
            errorHandler.handleError({ message: 'Test error' });
            
            expect(mockEventEmitter.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error:occurred',
                    detail: expect.objectContaining({
                        message: 'Test error'
                    })
                })
            );
        });

        test('should show user-friendly message', () => {
            const dispatchSpy = jest.fn();
            errorHandler.eventEmitter.dispatchEvent = dispatchSpy;
            
            errorHandler.handleError({ message: 'Network error' });
            
            const messageEvent = dispatchSpy.mock.calls.find(
                call => call[0].type === 'error:showMessage'
            );
            
            expect(messageEvent).toBeDefined();
            expect(messageEvent[0].detail.message).toBe('Connection error. Please check your internet connection.');
        });

        test('should limit stored errors', () => {
            errorHandler.config.maxErrors = 5;
            
            for (let i = 0; i < 10; i++) {
                errorHandler.handleError({ message: `Error ${i}` });
            }
            
            expect(errorHandler.errors.length).toBe(5);
            expect(errorHandler.errors[0].message).toBe('Error 5');
            expect(errorHandler.errors[4].message).toBe('Error 9');
        });
    });

    describe('Retry Logic', () => {
        test('should schedule retry for network errors', () => {
            const error = {
                message: 'Network request failed',
                context: {
                    retryKey: 'test-retry',
                    retryFunction: jest.fn().mockResolvedValue('success')
                }
            };
            
            errorHandler.handleError(error, error.context);
            
            const retryInfo = errorHandler.retryQueue.get('test-retry');
            expect(retryInfo).toBeDefined();
            expect(retryInfo.attempts).toBe(1);
            
            // Fast-forward to retry
            jest.advanceTimersByTime(1000);
            
            expect(error.context.retryFunction).toHaveBeenCalled();
        });

        test('should use exponential backoff for retries', () => {
            const retryFunction = jest.fn()
                .mockRejectedValueOnce(new Error('Retry 1'))
                .mockRejectedValueOnce(new Error('Retry 2'))
                .mockResolvedValueOnce('success');
            
            const error = {
                message: 'Network error',
                context: {
                    retryKey: 'exp-backoff',
                    retryFunction
                }
            };
            
            // First attempt
            errorHandler.handleError(error, error.context);
            expect(errorHandler.retryQueue.get('exp-backoff').attempts).toBe(1);
            
            // First retry after 1000ms
            jest.advanceTimersByTime(1000);
            
            // Second retry after 2000ms (exponential)
            jest.advanceTimersByTime(2000);
            
            // Third retry after 4000ms
            jest.advanceTimersByTime(4000);
            
            expect(retryFunction).toHaveBeenCalledTimes(3);
        });

        test('should respect max retry attempts', () => {
            const retryFunction = jest.fn().mockRejectedValue(new Error('Always fails'));
            errorHandler.config.retryAttempts = 3;
            
            const error = {
                message: 'Network error',
                context: {
                    retryKey: 'max-retry',
                    retryFunction
                }
            };
            
            errorHandler.handleError(error, error.context);
            
            // Advance through all retry attempts
            for (let i = 0; i < 5; i++) {
                jest.advanceTimersByTime(1000 * Math.pow(2, i));
            }
            
            expect(retryFunction).toHaveBeenCalledTimes(3);
            expect(errorHandler.retryQueue.has('max-retry')).toBe(false);
        });

        test('should emit max retries event', () => {
            errorHandler.config.retryAttempts = 1;
            
            const error = {
                message: 'Network error',
                context: {
                    retryKey: 'max-retry-event',
                    retryFunction: jest.fn().mockRejectedValue(new Error('Fail'))
                }
            };
            
            errorHandler.handleError(error, error.context);
            jest.advanceTimersByTime(1000);
            jest.advanceTimersByTime(2000);
            
            const maxRetriesEvent = mockEventEmitter.dispatchEvent.mock.calls.find(
                call => call[0].type === 'error:maxRetries'
            );
            
            expect(maxRetriesEvent).toBeDefined();
        });

        test('should emit retry success event', () => {
            const retryFunction = jest.fn().mockResolvedValue('success');
            
            const error = {
                message: 'Network error',
                context: {
                    retryKey: 'retry-success',
                    retryFunction
                }
            };
            
            errorHandler.handleError(error, error.context);
            jest.advanceTimersByTime(1000);
            
            const successEvent = mockEventEmitter.dispatchEvent.mock.calls.find(
                call => call[0].type === 'error:retrySuccess'
            );
            
            expect(successEvent).toBeDefined();
            expect(successEvent[0].detail.result).toBe('success');
        });

        test('should handle rate limit errors with custom delay', () => {
            const error = {
                message: 'Rate limit exceeded',
                context: {
                    retryKey: 'rate-limit',
                    retryFunction: jest.fn(),
                    retryAfter: 5000
                }
            };
            
            errorHandler.handleError(error, error.context);
            
            jest.advanceTimersByTime(4999);
            expect(error.context.retryFunction).not.toHaveBeenCalled();
            
            jest.advanceTimersByTime(1);
            expect(error.context.retryFunction).toHaveBeenCalled();
        });
    });

    describe('Error Category Handlers', () => {
        test('should handle auth errors', () => {
            const authError = {
                message: 'Unauthorized',
                category: 'auth'
            };
            
            errorHandler.handleError(authError);
            
            const authEvent = mockEventEmitter.dispatchEvent.mock.calls.find(
                call => call[0].type === 'error:auth'
            );
            
            expect(authEvent).toBeDefined();
        });

        test('should handle validation errors without retry', () => {
            const validationError = {
                message: 'Invalid input',
                context: {
                    retryKey: 'validation',
                    retryFunction: jest.fn()
                }
            };
            
            errorHandler.handleError(validationError);
            
            expect(errorHandler.retryQueue.has('validation')).toBe(false);
        });

        test('should show browser compatibility message', () => {
            const browserError = {
                message: 'Feature not supported'
            };
            
            errorHandler.handleBrowserError(browserError);
            
            const messageEvent = mockEventEmitter.dispatchEvent.mock.calls.find(
                call => call[0].type === 'error:showMessage'
            );
            
            expect(messageEvent[0].detail.message).toContain('browser may not support');
        });
    });

    describe('Error Reporting', () => {
        test('should report high error rate', () => {
            errorHandler.config.reportingThreshold = 3;
            
            // Generate errors
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError({ message: `Error ${i}` });
            }
            
            // Trigger reporting
            jest.advanceTimersByTime(60000);
            
            const highRateEvent = mockEventEmitter.dispatchEvent.mock.calls.find(
                call => call[0].type === 'error:highRate'
            );
            
            expect(highRateEvent).toBeDefined();
            expect(highRateEvent[0].detail.count).toBe(5);
        });

        test('should get error statistics', () => {
            // Add various errors
            errorHandler.handleError({ message: 'Network error', type: 'global' });
            errorHandler.handleError({ message: 'Timeout', type: 'console' });
            errorHandler.handleError({ message: 'Auth failed', type: 'global' });
            
            const stats = errorHandler.getErrorStats();
            
            expect(stats.total).toBe(3);
            expect(stats.byCategory.network).toBe(1);
            expect(stats.byCategory.timeout).toBe(1);
            expect(stats.byCategory.auth).toBe(1);
            expect(stats.byType.global).toBe(2);
            expect(stats.byType.console).toBe(1);
            expect(stats.retryQueue).toBe(0);
        });

        test('should get recent errors', () => {
            const now = Date.now();
            
            // Add errors at different times
            errorHandler.errors = [
                { timestamp: now - 120000, message: 'Old error' }, // 2 min ago
                { timestamp: now - 30000, message: 'Recent error 1' }, // 30 sec ago
                { timestamp: now - 10000, message: 'Recent error 2' } // 10 sec ago
            ];
            
            const recentErrors = errorHandler.getRecentErrors(60000); // Last minute
            
            expect(recentErrors).toHaveLength(2);
            expect(recentErrors[0].message).toBe('Recent error 1');
            expect(recentErrors[1].message).toBe('Recent error 2');
        });
    });

    describe('Error Boundary', () => {
        test('should create error boundary wrapper', async () => {
            const riskyFunction = jest.fn().mockImplementation(() => {
                throw new Error('Function failed');
            });
            
            const wrapped = errorHandler.createErrorBoundary(riskyFunction, {
                component: 'TestComponent'
            });
            
            await wrapped('arg1', 'arg2');
            
            expect(errorHandler.errors).toHaveLength(1);
            expect(errorHandler.errors[0].type).toBe('boundary');
            expect(errorHandler.errors[0].context.component).toBe('TestComponent');
            expect(errorHandler.errors[0].context.arguments).toEqual(['arg1', 'arg2']);
        });

        test('should rethrow when specified', async () => {
            const riskyFunction = jest.fn().mockImplementation(() => {
                throw new Error('Should rethrow');
            });
            
            const wrapped = errorHandler.createErrorBoundary(riskyFunction, {
                rethrow: true
            });
            
            await expect(wrapped()).rejects.toThrow('Should rethrow');
            expect(errorHandler.errors).toHaveLength(1);
        });
    });

    describe('Retry Wrapper', () => {
        test('should wrap function with retry logic', async () => {
            const failingFunction = jest.fn()
                .mockRejectedValueOnce(new Error('First fail'))
                .mockResolvedValueOnce('Success');
            
            const wrapped = errorHandler.withRetry(failingFunction);
            
            const promise = wrapped('test');
            
            // First call fails and schedules retry
            await expect(promise).rejects.toThrow('First fail');
            
            // Advance time for retry
            jest.advanceTimersByTime(1000);
            
            // Verify retry was scheduled
            expect(failingFunction).toHaveBeenCalledTimes(2);
        });

        test('should pass custom retry options', async () => {
            const failingFunction = jest.fn().mockRejectedValue(new Error('Always fails'));
            
            const wrapped = errorHandler.withRetry(failingFunction, {
                retryKey: 'custom-key',
                maxAttempts: 2,
                customOption: 'test'
            });
            
            await expect(wrapped()).rejects.toThrow('Always fails');
            
            const retryInfo = errorHandler.retryQueue.get('custom-key');
            expect(retryInfo).toBeDefined();
            
            const lastError = errorHandler.errors[errorHandler.errors.length - 1];
            expect(lastError.context.customOption).toBe('test');
        });
    });

    describe('Data Management', () => {
        test('should clear error history', () => {
            // Add errors
            for (let i = 0; i < 5; i++) {
                errorHandler.handleError({ message: `Error ${i}` });
            }
            
            expect(errorHandler.errors.length).toBe(5);
            
            errorHandler.clearErrors();
            
            expect(errorHandler.errors).toEqual([]);
        });

        test('should generate unique error IDs', () => {
            const ids = new Set();
            
            for (let i = 0; i < 100; i++) {
                const id = errorHandler.generateErrorId();
                expect(ids.has(id)).toBe(false);
                ids.add(id);
            }
            
            expect(ids.size).toBe(100);
        });
    });
});