// APIManager Tests

const APIManager = require('../js/api/APIManager.js');

describe('APIManager', () => {
    let apiManager;
    let mockFetch;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;
        
        // Mock cache manager
        global.CacheManager = jest.fn().mockImplementation(() => ({
            get: jest.fn().mockReturnValue(null),
            set: jest.fn()
        }));
        
        // Create instance
        apiManager = new APIManager();
    });

    describe('initialization', () => {
        test('should create APIManager instance', () => {
            expect(apiManager).toBeDefined();
            expect(apiManager.endpoints).toBeDefined();
            expect(apiManager.circuitBreakers).toBeDefined();
        });

        test('should register default endpoints', () => {
            expect(apiManager.endpoints.has('simpleswap')).toBe(true);
            expect(apiManager.endpoints.has('geolocation')).toBe(true);
        });

        test('should initialize circuit breakers for endpoints', () => {
            const simpleswapBreaker = apiManager.circuitBreakers.get('simpleswap');
            expect(simpleswapBreaker).toBeDefined();
            expect(simpleswapBreaker.state).toBe('CLOSED');
            expect(simpleswapBreaker.failures).toBe(0);
        });
    });

    describe('makeRequest', () => {
        test('should make successful GET request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true, data: 'test' })
            });

            const result = await apiManager.makeRequest('simpleswap', '/test', {
                method: 'GET'
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.simpleswap.io/test',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Object)
                })
            );
            expect(result).toEqual({ success: true, data: 'test' });
        });

        test('should make successful POST request', async () => {
            const postData = { key: 'value' };
            
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true })
            });

            const result = await apiManager.makeRequest('simpleswap', '/create', {
                method: 'POST',
                data: postData
            });

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.simpleswap.io/create',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(postData)
                })
            );
            expect(result).toEqual({ success: true });
        });

        test('should use cache for GET requests when available', async () => {
            const cachedData = { cached: true, data: 'cached' };
            apiManager.cache.get.mockReturnValueOnce(cachedData);

            const result = await apiManager.makeRequest('simpleswap', '/test', {
                method: 'GET',
                cache: true
            });

            expect(apiManager.cache.get).toHaveBeenCalled();
            expect(mockFetch).not.toHaveBeenCalled();
            expect(result).toEqual(cachedData);
        });

        test('should cache successful GET responses', async () => {
            const responseData = { success: true, data: 'test' };
            
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => responseData
            });

            await apiManager.makeRequest('simpleswap', '/test', {
                method: 'GET',
                cache: true
            });

            expect(apiManager.cache.set).toHaveBeenCalledWith(
                expect.any(String),
                responseData,
                expect.objectContaining({ ttl: expect.any(Number) })
            );
        });
    });

    describe('Circuit Breaker', () => {
        test('should open circuit breaker after failure threshold', async () => {
            // Mock failures
            mockFetch.mockRejectedValue(new Error('Network error'));

            // Cause failures up to threshold
            for (let i = 0; i < 5; i++) {
                try {
                    await apiManager.makeRequest('simpleswap', '/test');
                } catch (e) {
                    // Expected
                }
            }

            const breaker = apiManager.circuitBreakers.get('simpleswap');
            expect(breaker.state).toBe('OPEN');
            expect(breaker.failures).toBe(5);
        });

        test('should reject requests when circuit breaker is open', async () => {
            const breaker = apiManager.circuitBreakers.get('simpleswap');
            breaker.state = 'OPEN';
            breaker.lastFailureTime = Date.now();

            await expect(apiManager.makeRequest('simpleswap', '/test')).rejects.toThrow(
                'Circuit breaker OPEN for simpleswap'
            );
        });

        test('should transition to half-open after timeout', async () => {
            const breaker = apiManager.circuitBreakers.get('simpleswap');
            breaker.state = 'OPEN';
            breaker.lastFailureTime = Date.now() - 61000; // Past reset timeout

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true })
            });

            await apiManager.makeRequest('simpleswap', '/test');

            expect(breaker.state).toBe('HALF_OPEN');
        });

        test('should close circuit breaker after successful requests in half-open', async () => {
            const breaker = apiManager.circuitBreakers.get('simpleswap');
            breaker.state = 'HALF_OPEN';
            breaker.successCount = 0;

            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true })
            });

            // Make successful requests
            for (let i = 0; i < 3; i++) {
                await apiManager.makeRequest('simpleswap', '/test');
            }

            expect(breaker.state).toBe('CLOSED');
            expect(breaker.failures).toBe(0);
        });
    });

    describe('Retry Logic', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should retry failed requests', async () => {
            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ success: true })
                });

            const promise = apiManager.makeRequest('simpleswap', '/test', {
                maxRetries: 3
            });

            // Fast-forward through retry delays
            jest.runAllTimers();

            const result = await promise;
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual({ success: true });
        });

        test('should use exponential backoff for retries', async () => {
            const delays = [];
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = jest.fn((fn, delay) => {
                delays.push(delay);
                return originalSetTimeout(fn, 0);
            });

            mockFetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ success: true })
                });

            await apiManager.makeRequest('simpleswap', '/test', {
                maxRetries: 2,
                retryDelay: 1000
            });

            // Check exponential backoff: 1000ms, 2000ms
            expect(delays[0]).toBe(1000);
            expect(delays[1]).toBe(2000);

            global.setTimeout = originalSetTimeout;
        });

        test('should not retry non-retryable errors', async () => {
            const error = new Error('Bad request');
            error.status = 400;
            
            mockFetch.mockRejectedValue(error);

            await expect(apiManager.makeRequest('simpleswap', '/test', {
                maxRetries: 3
            })).rejects.toThrow('Bad request');

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Handling', () => {
        test('should handle HTTP error responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ error: 'Resource not found' })
            });

            await expect(apiManager.makeRequest('simpleswap', '/test')).rejects.toThrow(
                'HTTP 404: Not Found'
            );
        });

        test('should handle timeout errors', async () => {
            // Mock AbortController
            const mockAbort = jest.fn();
            global.AbortController = jest.fn().mockImplementation(() => ({
                signal: { aborted: false },
                abort: mockAbort
            }));

            mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
                setTimeout(() => reject(new Error('AbortError')), 100);
            }));

            await expect(apiManager.makeRequest('simpleswap', '/test', {
                timeout: 50
            })).rejects.toThrow();
        });

        test('should enhance errors with context', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            try {
                await apiManager.makeRequest('simpleswap', '/test', {
                    method: 'POST',
                    data: { test: true }
                });
            } catch (error) {
                expect(error.endpoint).toBe('simpleswap');
                expect(error.path).toBe('/test');
                expect(error.method).toBe('POST');
            }
        });
    });

    describe('Request Building', () => {
        test('should build URL with query parameters', () => {
            const url = apiManager.buildURL('https://api.test.com', '/path', {
                param1: 'value1',
                param2: 'value2',
                nullParam: null,
                undefinedParam: undefined
            });

            expect(url).toBe('https://api.test.com/path?param1=value1&param2=value2');
        });

        test('should generate correct cache key', () => {
            const key = apiManager.getCacheKey('simpleswap', '/test', {
                b: '2',
                a: '1',
                c: '3'
            });

            // Should sort parameters
            expect(key).toBe('api:simpleswap:/test:a=1&b=2&c=3');
        });
    });

    describe('Health Checks', () => {
        test('should check API health successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const health = await apiManager.checkAPIHealth('simpleswap');
            expect(health).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.simpleswap.io',
                expect.objectContaining({ method: 'HEAD' })
            );
        });

        test('should handle health check failures', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const health = await apiManager.checkAPIHealth('simpleswap');
            expect(health).toBe(false);
        });
    });

    describe('Batch Requests', () => {
        test('should execute batch requests', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true })
            });

            const requests = [
                { endpoint: 'simpleswap', path: '/test1' },
                { endpoint: 'simpleswap', path: '/test2' },
                { endpoint: 'geolocation', path: '/json/' }
            ];

            const results = await apiManager.batchRequests(requests);

            expect(results).toHaveLength(3);
            expect(mockFetch).toHaveBeenCalledTimes(3);
            results.forEach(result => {
                expect(result).toHaveProperty('success', true);
            });
        });

        test('should handle partial batch failures', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ success: true })
                })
                .mockRejectedValueOnce(new Error('Request failed'))
                .mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    headers: new Map([['content-type', 'application/json']]),
                    json: async () => ({ success: true })
                });

            const requests = [
                { endpoint: 'simpleswap', path: '/test1' },
                { endpoint: 'simpleswap', path: '/test2' },
                { endpoint: 'simpleswap', path: '/test3' }
            ];

            const results = await apiManager.batchRequests(requests);

            expect(results).toHaveLength(3);
            expect(results[0]).toHaveProperty('success', true);
            expect(results[1]).toHaveProperty('error');
            expect(results[2]).toHaveProperty('success', true);
        });
    });
});