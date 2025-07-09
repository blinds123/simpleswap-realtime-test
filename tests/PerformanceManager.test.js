// PerformanceManager Tests

const PerformanceManager = require('../js/performance/PerformanceManager.js');

describe('PerformanceManager', () => {
    let performanceManager;
    let mockObserver;
    let observerCallbacks;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock PerformanceObserver
        observerCallbacks = {};
        mockObserver = {
            observe: jest.fn(),
            disconnect: jest.fn()
        };
        
        global.PerformanceObserver = jest.fn().mockImplementation(callback => {
            // Store callback by entry type for testing
            const cb = callback;
            mockObserver._callback = cb;
            return mockObserver;
        });
        
        // Mock performance.getEntriesByType
        global.performance.getEntriesByType = jest.fn().mockReturnValue([]);
        
        // Create instance
        performanceManager = new PerformanceManager();
    });

    describe('initialization', () => {
        test('should create PerformanceManager instance', () => {
            expect(performanceManager).toBeDefined();
            expect(performanceManager.metrics).toBeDefined();
            expect(performanceManager.observers).toBeDefined();
        });

        test('should set up Core Web Vitals observers', () => {
            expect(PerformanceObserver).toHaveBeenCalledTimes(3); // LCP, FID, CLS
            expect(mockObserver.observe).toHaveBeenCalledWith({ type: 'largest-contentful-paint', buffered: true });
            expect(mockObserver.observe).toHaveBeenCalledWith({ type: 'first-input', buffered: true });
            expect(mockObserver.observe).toHaveBeenCalledWith({ type: 'layout-shift', buffered: true });
        });

        test('should track initial page load metrics', () => {
            expect(performanceManager.trackPageLoad).toHaveBeenCalled();
        });
    });

    describe('Core Web Vitals', () => {
        test('should observe and track LCP', () => {
            const lcpEntry = {
                name: 'largest-contentful-paint',
                startTime: 2500,
                renderTime: 2500,
                size: 50000,
                element: { tagName: 'IMG' }
            };
            
            // Simulate LCP observation
            const lcpObserver = Array.from(PerformanceObserver.mock.calls).find(
                call => call[0].toString().includes('largest-contentful-paint')
            );
            
            if (lcpObserver && mockObserver._callback) {
                mockObserver._callback({
                    getEntries: () => [lcpEntry]
                });
            }
            
            expect(performanceManager.metrics.webVitals.LCP).toEqual({
                value: 2500,
                rating: 'needs-improvement',
                entries: [lcpEntry]
            });
        });

        test('should observe and track FID', () => {
            const fidEntry = {
                name: 'first-input',
                processingStart: 100,
                startTime: 50,
                duration: 150
            };
            
            // Find FID observer callback
            const fidObserver = Array.from(PerformanceObserver.mock.calls).find(
                call => call[0].toString().includes('first-input')
            );
            
            if (fidObserver && mockObserver._callback) {
                mockObserver._callback({
                    getEntries: () => [fidEntry]
                });
            }
            
            expect(performanceManager.metrics.webVitals.FID).toEqual({
                value: 50, // processingStart - startTime
                rating: 'good',
                entries: [fidEntry]
            });
        });

        test('should observe and track CLS', () => {
            const clsEntries = [
                { value: 0.05, hadRecentInput: false },
                { value: 0.03, hadRecentInput: false },
                { value: 0.02, hadRecentInput: true } // Should be ignored
            ];
            
            // Find CLS observer callback
            const clsObserver = Array.from(PerformanceObserver.mock.calls).find(
                call => call[0].toString().includes('layout-shift')
            );
            
            if (clsObserver && mockObserver._callback) {
                mockObserver._callback({
                    getEntries: () => clsEntries
                });
            }
            
            expect(performanceManager.metrics.webVitals.CLS.value).toBeCloseTo(0.08); // 0.05 + 0.03
            expect(performanceManager.metrics.webVitals.CLS.rating).toBe('good');
        });

        test('should emit web vitals metrics', () => {
            const eventSpy = jest.fn();
            window.eventEmitter.addEventListener('performance:metric', eventSpy);
            
            const lcpEntry = {
                name: 'largest-contentful-paint',
                startTime: 2000
            };
            
            const lcpObserver = Array.from(PerformanceObserver.mock.calls).find(
                call => call[0].toString().includes('largest-contentful-paint')
            );
            
            if (lcpObserver && mockObserver._callback) {
                mockObserver._callback({
                    getEntries: () => [lcpEntry]
                });
            }
            
            expect(eventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'performance:metric',
                    detail: expect.objectContaining({
                        name: 'LCP',
                        value: 2000,
                        rating: 'good'
                    })
                })
            );
        });
    });

    describe('Performance Ratings', () => {
        test('should rate LCP correctly', () => {
            expect(performanceManager.getRating('LCP', 2000)).toBe('good');
            expect(performanceManager.getRating('LCP', 3000)).toBe('needs-improvement');
            expect(performanceManager.getRating('LCP', 5000)).toBe('poor');
        });

        test('should rate FID correctly', () => {
            expect(performanceManager.getRating('FID', 50)).toBe('good');
            expect(performanceManager.getRating('FID', 200)).toBe('needs-improvement');
            expect(performanceManager.getRating('FID', 400)).toBe('poor');
        });

        test('should rate CLS correctly', () => {
            expect(performanceManager.getRating('CLS', 0.05)).toBe('good');
            expect(performanceManager.getRating('CLS', 0.15)).toBe('needs-improvement');
            expect(performanceManager.getRating('CLS', 0.30)).toBe('poor');
        });

        test('should handle unknown metrics', () => {
            expect(performanceManager.getRating('UNKNOWN', 100)).toBe('unknown');
        });
    });

    describe('Page Load Tracking', () => {
        test('should track page load metrics', () => {
            global.performance.timing = {
                navigationStart: 1000,
                domContentLoadedEventEnd: 2000,
                loadEventEnd: 3000,
                responseEnd: 1500,
                domInteractive: 1800
            };
            
            performanceManager.trackPageLoad();
            
            expect(performanceManager.metrics.pageLoad).toEqual({
                domContentLoaded: 1000,
                loadComplete: 2000,
                timeToFirstByte: 500,
                domInteractive: 800
            });
        });

        test('should handle missing performance.timing', () => {
            global.performance.timing = undefined;
            
            expect(() => performanceManager.trackPageLoad()).not.toThrow();
            expect(performanceManager.metrics.pageLoad).toEqual({});
        });
    });

    describe('Resource Monitoring', () => {
        test('should monitor resource loading', () => {
            const resources = [
                {
                    name: 'https://example.com/script.js',
                    entryType: 'resource',
                    initiatorType: 'script',
                    duration: 150,
                    transferSize: 50000
                },
                {
                    name: 'https://example.com/style.css',
                    entryType: 'resource',
                    initiatorType: 'css',
                    duration: 100,
                    transferSize: 20000
                },
                {
                    name: 'https://example.com/image.png',
                    entryType: 'resource',
                    initiatorType: 'img',
                    duration: 200,
                    transferSize: 100000
                }
            ];
            
            global.performance.getEntriesByType.mockReturnValue(resources);
            
            performanceManager.monitorResources();
            
            expect(performanceManager.metrics.resources.count).toBe(3);
            expect(performanceManager.metrics.resources.totalSize).toBe(170000);
            expect(performanceManager.metrics.resources.totalDuration).toBe(450);
            expect(performanceManager.metrics.resources.byType.script).toBe(1);
            expect(performanceManager.metrics.resources.byType.css).toBe(1);
            expect(performanceManager.metrics.resources.byType.img).toBe(1);
        });

        test('should identify slow resources', () => {
            const resources = [
                {
                    name: 'https://example.com/slow-script.js',
                    entryType: 'resource',
                    initiatorType: 'script',
                    duration: 2000 // Slow
                },
                {
                    name: 'https://example.com/fast-style.css',
                    entryType: 'resource',
                    initiatorType: 'css',
                    duration: 50 // Fast
                }
            ];
            
            global.performance.getEntriesByType.mockReturnValue(resources);
            
            performanceManager.monitorResources();
            
            expect(performanceManager.metrics.resources.slowResources).toHaveLength(1);
            expect(performanceManager.metrics.resources.slowResources[0]).toContain('slow-script.js');
        });
    });

    describe('Memory Monitoring', () => {
        test('should monitor memory usage when available', () => {
            global.performance.memory = {
                usedJSHeapSize: 10 * 1024 * 1024, // 10MB
                totalJSHeapSize: 50 * 1024 * 1024, // 50MB
                jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
            };
            
            performanceManager.monitorMemory();
            
            expect(performanceManager.metrics.memory).toEqual({
                usedJSHeapSize: 10 * 1024 * 1024,
                totalJSHeapSize: 50 * 1024 * 1024,
                jsHeapSizeLimit: 100 * 1024 * 1024,
                usage: 20 // 20% usage
            });
        });

        test('should handle missing performance.memory', () => {
            global.performance.memory = undefined;
            
            expect(() => performanceManager.monitorMemory()).not.toThrow();
            expect(performanceManager.metrics.memory).toEqual({});
        });
    });

    describe('Long Tasks', () => {
        test('should monitor long tasks', () => {
            const longTaskEntries = [
                {
                    name: 'self',
                    entryType: 'longtask',
                    duration: 150,
                    startTime: 1000
                },
                {
                    name: 'same-origin',
                    entryType: 'longtask',
                    duration: 200,
                    startTime: 2000
                }
            ];
            
            global.performance.getEntriesByType.mockReturnValue(longTaskEntries);
            
            performanceManager.monitorLongTasks();
            
            expect(performanceManager.metrics.longTasks).toEqual({
                count: 2,
                totalDuration: 350,
                tasks: longTaskEntries
            });
        });
    });

    describe('Custom Performance Marks', () => {
        test('should set performance marks', () => {
            performanceManager.mark('custom-start');
            
            expect(global.performance.mark).toHaveBeenCalledWith('custom-start');
        });

        test('should measure between marks', () => {
            global.performance.measure = jest.fn();
            global.performance.getEntriesByName = jest.fn().mockReturnValue([{ duration: 500 }]);
            
            performanceManager.mark('task-start');
            performanceManager.mark('task-end');
            const duration = performanceManager.measure('task-duration', 'task-start', 'task-end');
            
            expect(global.performance.measure).toHaveBeenCalledWith('task-duration', 'task-start', 'task-end');
            expect(duration).toBe(500);
        });

        test('should track custom timing', () => {
            performanceManager.trackTiming('api-call', 250);
            
            expect(performanceManager.metrics.customTimings['api-call']).toBe(250);
        });
    });

    describe('Performance Budget', () => {
        test('should check performance budget', () => {
            performanceManager.metrics.webVitals = {
                LCP: { value: 2000 },
                FID: { value: 50 },
                CLS: { value: 0.05 }
            };
            
            const budget = {
                LCP: 2500,
                FID: 100,
                CLS: 0.1
            };
            
            const result = performanceManager.checkBudget(budget);
            
            expect(result.passed).toBe(true);
            expect(result.results.LCP.passed).toBe(true);
            expect(result.results.FID.passed).toBe(true);
            expect(result.results.CLS.passed).toBe(true);
        });

        test('should report budget violations', () => {
            performanceManager.metrics.webVitals = {
                LCP: { value: 3000 },
                FID: { value: 150 },
                CLS: { value: 0.2 }
            };
            
            const budget = {
                LCP: 2500,
                FID: 100,
                CLS: 0.1
            };
            
            const result = performanceManager.checkBudget(budget);
            
            expect(result.passed).toBe(false);
            expect(result.results.LCP.passed).toBe(false);
            expect(result.results.LCP.difference).toBe(500);
            expect(result.results.FID.passed).toBe(false);
            expect(result.results.CLS.passed).toBe(false);
        });
    });

    describe('Performance Report', () => {
        test('should generate performance report', () => {
            performanceManager.metrics = {
                webVitals: {
                    LCP: { value: 2000, rating: 'good' },
                    FID: { value: 50, rating: 'good' },
                    CLS: { value: 0.05, rating: 'good' }
                },
                pageLoad: {
                    domContentLoaded: 1000,
                    loadComplete: 2000
                },
                resources: {
                    count: 10,
                    totalSize: 500000,
                    totalDuration: 1500
                },
                memory: {
                    usage: 25
                }
            };
            
            const report = performanceManager.getReport();
            
            expect(report.timestamp).toBeDefined();
            expect(report.webVitals).toEqual(performanceManager.metrics.webVitals);
            expect(report.pageLoad).toEqual(performanceManager.metrics.pageLoad);
            expect(report.resources).toEqual(performanceManager.metrics.resources);
            expect(report.memory).toEqual(performanceManager.metrics.memory);
            expect(report.summary.overallRating).toBe('good');
        });
    });

    describe('Optimization Suggestions', () => {
        test('should provide optimization suggestions for poor metrics', () => {
            performanceManager.metrics.webVitals = {
                LCP: { value: 5000, rating: 'poor' },
                FID: { value: 400, rating: 'poor' },
                CLS: { value: 0.3, rating: 'poor' }
            };
            
            const suggestions = performanceManager.getOptimizationSuggestions();
            
            expect(suggestions.LCP).toBeDefined();
            expect(suggestions.FID).toBeDefined();
            expect(suggestions.CLS).toBeDefined();
            expect(suggestions.LCP).toContain('Optimize largest image');
        });

        test('should not suggest optimizations for good metrics', () => {
            performanceManager.metrics.webVitals = {
                LCP: { value: 1000, rating: 'good' },
                FID: { value: 50, rating: 'good' },
                CLS: { value: 0.05, rating: 'good' }
            };
            
            const suggestions = performanceManager.getOptimizationSuggestions();
            
            expect(Object.keys(suggestions)).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        test('should handle PerformanceObserver not supported', () => {
            global.PerformanceObserver = undefined;
            
            expect(() => new PerformanceManager()).not.toThrow();
        });

        test('should handle observer errors gracefully', () => {
            const errorObserver = {
                observe: jest.fn().mockImplementation(() => {
                    throw new Error('Observer error');
                }),
                disconnect: jest.fn()
            };
            
            global.PerformanceObserver = jest.fn().mockReturnValue(errorObserver);
            
            expect(() => new PerformanceManager()).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        test('should disconnect observers on cleanup', () => {
            performanceManager.cleanup();
            
            performanceManager.observers.forEach(observer => {
                expect(observer.disconnect).toHaveBeenCalled();
            });
        });
    });
});