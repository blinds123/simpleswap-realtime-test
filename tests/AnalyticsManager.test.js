// AnalyticsManager Tests

const AnalyticsManager = require('../js/monitoring/AnalyticsManager.js');

describe('AnalyticsManager', () => {
    let analyticsManager;
    let mockEventEmitter;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock event emitter
        mockEventEmitter = {
            addEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        };
        global.window.eventEmitter = mockEventEmitter;
        
        // Mock document
        global.document.addEventListener = jest.fn();
        global.document.hidden = false;
        
        // Create instance
        analyticsManager = new AnalyticsManager();
    });

    afterEach(() => {
        // Clear any intervals/timeouts
        jest.clearAllTimers();
    });

    describe('initialization', () => {
        test('should create AnalyticsManager instance', () => {
            expect(analyticsManager).toBeDefined();
            expect(analyticsManager.sessions).toBeDefined();
            expect(analyticsManager.events).toBeDefined();
            expect(analyticsManager.funnels).toBeDefined();
        });

        test('should create initial session', () => {
            expect(analyticsManager.currentSession).toBeDefined();
            expect(analyticsManager.currentSession.id).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(analyticsManager.currentSession.startTime).toBeLessThanOrEqual(Date.now());
        });

        test('should set up auto-tracking when enabled', () => {
            expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        });

        test('should track initial page view', () => {
            const pageViewEvent = analyticsManager.events.find(
                event => event.name === 'page_view'
            );
            expect(pageViewEvent).toBeDefined();
        });
    });

    describe('Event Tracking', () => {
        test('should track custom events', () => {
            const eventName = 'test_event';
            const properties = { key: 'value', number: 123 };
            
            analyticsManager.trackEvent(eventName, properties);
            
            const event = analyticsManager.events.find(e => e.name === eventName);
            expect(event).toBeDefined();
            expect(event.properties).toMatchObject(properties);
            expect(event.sessionId).toBe(analyticsManager.currentSession.id);
            expect(event.timestamp).toBeLessThanOrEqual(Date.now());
        });

        test('should respect sampling rate', () => {
            analyticsManager.config.samplingRate = 0; // 0% sampling
            
            analyticsManager.trackEvent('test_event');
            
            const event = analyticsManager.events.find(e => e.name === 'test_event');
            expect(event).toBeUndefined();
        });

        test('should sanitize properties in privacy mode', () => {
            analyticsManager.config.enablePrivacyMode = true;
            
            analyticsManager.trackEvent('test_event', {
                email: 'user@example.com',
                phone: '123-456-7890',
                safe_field: 'safe_value'
            });
            
            const event = analyticsManager.events[analyticsManager.events.length - 1];
            expect(event.properties.email).toBe('[redacted]');
            expect(event.properties.phone).toBe('[redacted]');
            expect(event.properties.safe_field).toBe('safe_value');
        });

        test('should limit event array size', () => {
            analyticsManager.config.maxEvents = 5;
            
            for (let i = 0; i < 10; i++) {
                analyticsManager.trackEvent(`event_${i}`);
            }
            
            expect(analyticsManager.events.length).toBe(5);
            expect(analyticsManager.events[0].name).toBe('event_5');
            expect(analyticsManager.events[4].name).toBe('event_9');
        });
    });

    describe('Page View Tracking', () => {
        test('should track page views with metadata', () => {
            analyticsManager.trackPageView({
                customProp: 'customValue'
            });
            
            const pageView = analyticsManager.events.find(
                e => e.name === 'page_view' && e.properties.customProp
            );
            
            expect(pageView).toBeDefined();
            expect(pageView.properties.pageUrl).toBe(window.location.href);
            expect(pageView.properties.pageTitle).toBe(document.title);
            expect(pageView.properties.customProp).toBe('customValue');
            expect(analyticsManager.currentSession.pageViews).toBeGreaterThan(0);
        });
    });

    describe('Click Tracking', () => {
        test('should track button clicks', () => {
            const button = createMockElement('button', {
                id: 'test-button',
                textContent: 'Click Me',
                className: 'btn btn-primary'
            });
            
            const clickEvent = new Event('click');
            clickEvent.target = button;
            clickEvent.clientX = 100;
            clickEvent.clientY = 200;
            
            const clickHandler = document.addEventListener.mock.calls.find(
                call => call[0] === 'click'
            )[1];
            
            clickHandler(clickEvent);
            
            const trackedEvent = analyticsManager.events.find(
                e => e.name === 'button_click'
            );
            
            expect(trackedEvent).toBeDefined();
            expect(trackedEvent.properties.elementType).toBe('button');
            expect(trackedEvent.properties.elementId).toBe('test-button');
            expect(trackedEvent.properties.clickX).toBe(100);
            expect(trackedEvent.properties.clickY).toBe(200);
        });

        test('should track checkout start for buy button', () => {
            const buyButton = createMockElement('button', {
                id: 'buy-button',
                textContent: 'Buy Now'
            });
            
            const clickEvent = new Event('click');
            clickEvent.target = buyButton;
            
            const clickHandler = document.addEventListener.mock.calls.find(
                call => call[0] === 'click'
            )[1];
            
            clickHandler(clickEvent);
            
            const checkoutEvent = analyticsManager.events.find(
                e => e.name === 'checkout_start'
            );
            
            expect(checkoutEvent).toBeDefined();
        });

        test('should track link clicks', () => {
            const link = createMockElement('a', {
                href: 'https://example.com',
                textContent: 'External Link'
            });
            
            const clickEvent = new Event('click');
            clickEvent.target = link;
            
            const clickHandler = document.addEventListener.mock.calls.find(
                call => call[0] === 'click'
            )[1];
            
            clickHandler(clickEvent);
            
            const linkEvent = analyticsManager.events.find(
                e => e.name === 'link_click'
            );
            
            expect(linkEvent).toBeDefined();
            expect(linkEvent.properties.href).toBe('https://example.com');
        });
    });

    describe('Form Tracking', () => {
        test('should track form submissions', () => {
            const form = createMockElement('form', {
                id: 'test-form',
                name: 'testForm',
                action: '/submit',
                method: 'POST'
            });
            
            const submitEvent = new Event('submit');
            submitEvent.target = form;
            
            const submitHandler = document.addEventListener.mock.calls.find(
                call => call[0] === 'submit'
            )[1];
            
            submitHandler(submitEvent);
            
            const formEvent = analyticsManager.events.find(
                e => e.name === 'form_submit'
            );
            
            expect(formEvent).toBeDefined();
            expect(formEvent.properties.formId).toBe('test-form');
            expect(formEvent.properties.formName).toBe('testForm');
            expect(formEvent.properties.formAction).toBe('/submit');
            expect(formEvent.properties.formMethod).toBe('POST');
        });
    });

    describe('Session Management', () => {
        test('should update session activity', () => {
            const initialActivity = analyticsManager.currentSession.lastActivity;
            
            // Wait a bit
            jest.advanceTimersByTime(100);
            
            analyticsManager.trackEvent('test_event');
            
            expect(analyticsManager.currentSession.lastActivity).toBeGreaterThan(initialActivity);
        });

        test('should create new session after timeout', () => {
            const initialSessionId = analyticsManager.currentSession.id;
            
            // Simulate session timeout
            analyticsManager.currentSession.startTime = Date.now() - 3600001; // Just past timeout
            
            analyticsManager.trackEvent('test_event');
            
            expect(analyticsManager.currentSession.id).not.toBe(initialSessionId);
            expect(analyticsManager.sessions.size).toBe(2);
        });

        test('should extract UTM parameters', () => {
            // Mock URL with UTM parameters
            const originalSearch = window.location.search;
            window.location.search = '?utm_source=google&utm_medium=cpc&utm_campaign=test';
            
            const newAnalytics = new AnalyticsManager();
            
            expect(newAnalytics.currentSession.utmParams).toMatchObject({
                utm_source: 'google',
                utm_medium: 'cpc',
                utm_campaign: 'test'
            });
            
            window.location.search = originalSearch;
        });
    });

    describe('Funnel Tracking', () => {
        test('should track funnel progression', () => {
            const funnelStages = ['page_view', 'checkout_start', 'wallet_copy', 'redirect_initiated'];
            
            // Progress through funnel
            funnelStages.forEach(stage => {
                analyticsManager.trackEvent(stage);
            });
            
            const checkoutFunnel = analyticsManager.funnels.get('checkout');
            const sessionFunnel = checkoutFunnel.sessions.get(analyticsManager.currentSession.id);
            
            expect(sessionFunnel).toBeDefined();
            expect(sessionFunnel.currentStage).toBe(3); // 0-indexed
            expect(sessionFunnel.completedStages).toHaveLength(4);
        });

        test('should track funnel completion', () => {
            const completionSpy = jest.fn();
            analyticsManager.trackEvent = jest.fn(analyticsManager.trackEvent.bind(analyticsManager));
            
            // Complete the funnel
            analyticsManager.trackEvent('page_view');
            analyticsManager.trackEvent('checkout_start');
            analyticsManager.trackEvent('wallet_copy');
            analyticsManager.trackEvent('redirect_initiated');
            
            // Check for completion event
            const completionCall = analyticsManager.trackEvent.mock.calls.find(
                call => call[0] === 'funnel_completed'
            );
            
            expect(completionCall).toBeDefined();
            expect(completionCall[1].funnelName).toBe('checkout');
        });

        test('should handle non-sequential funnel events', () => {
            // Skip some stages
            analyticsManager.trackEvent('page_view');
            analyticsManager.trackEvent('redirect_initiated'); // Skip middle stages
            
            const checkoutFunnel = analyticsManager.funnels.get('checkout');
            const sessionFunnel = checkoutFunnel.sessions.get(analyticsManager.currentSession.id);
            
            expect(sessionFunnel.currentStage).toBe(0); // Still at first stage
            expect(sessionFunnel.completedStages).toHaveLength(1);
        });
    });

    describe('Event Listeners', () => {
        test('should listen for wallet copy events', () => {
            const walletCopyHandler = mockEventEmitter.addEventListener.mock.calls.find(
                call => call[0] === APP_EVENTS.WALLET_COPIED
            )[1];
            
            walletCopyHandler({
                detail: {
                    method: 'clipboard',
                    address: '0x1234567890abcdef'
                }
            });
            
            const event = analyticsManager.events.find(e => e.name === 'wallet_copy');
            expect(event).toBeDefined();
            expect(event.properties.method).toBe('clipboard');
            expect(event.properties.address).toMatch(/^hash_\d+$/); // Should be hashed
        });

        test('should listen for redirect events', () => {
            const redirectHandler = mockEventEmitter.addEventListener.mock.calls.find(
                call => call[0] === APP_EVENTS.REDIRECT_STARTED
            )[1];
            
            redirectHandler({
                detail: {
                    url: 'https://payment.example.com',
                    method: 'mercuryo'
                }
            });
            
            const event = analyticsManager.events.find(e => e.name === 'redirect_initiated');
            expect(event).toBeDefined();
            expect(event.properties.url).toBe('https://payment.example.com');
            expect(event.properties.method).toBe('mercuryo');
        });

        test('should track page exit on visibility change', () => {
            const visibilityHandler = document.addEventListener.mock.calls.find(
                call => call[0] === 'visibilitychange'
            )[1];
            
            document.hidden = true;
            visibilityHandler();
            
            const exitEvent = analyticsManager.events.find(e => e.name === 'page_exit');
            expect(exitEvent).toBeDefined();
            expect(exitEvent.properties.duration).toBeGreaterThan(0);
        });
    });

    describe('Report Generation', () => {
        test('should generate analytics report', () => {
            // Add some events
            analyticsManager.trackEvent('page_view');
            analyticsManager.trackEvent('button_click');
            analyticsManager.trackEvent('error_occurred');
            analyticsManager.trackEvent('button_click');
            
            const report = analyticsManager.generateReport({
                startTime: Date.now() - 3600000,
                endTime: Date.now()
            });
            
            expect(report.summary.totalEvents).toBeGreaterThanOrEqual(4);
            expect(report.summary.uniqueSessions).toBeGreaterThanOrEqual(1);
            expect(report.summary.topEvents['button_click']).toBe(2);
            expect(report.errors).toHaveLength(1);
        });

        test('should calculate funnel conversion rates', () => {
            // Create multiple sessions with different funnel progress
            const session1 = analyticsManager.currentSession.id;
            analyticsManager.trackEvent('page_view');
            analyticsManager.trackEvent('checkout_start');
            
            // Create new session
            analyticsManager.currentSession = analyticsManager.createSession();
            analyticsManager.trackEvent('page_view');
            analyticsManager.trackEvent('checkout_start');
            analyticsManager.trackEvent('wallet_copy');
            analyticsManager.trackEvent('redirect_initiated');
            
            const report = analyticsManager.generateReport();
            
            expect(report.funnels.checkout.totalSessions).toBe(2);
            expect(report.funnels.checkout.completedSessions).toBe(1);
            expect(report.funnels.checkout.conversionRate).toBe(50);
        });

        test('should calculate funnel dropoff', () => {
            // Add sessions with dropoff at different stages
            for (let i = 0; i < 4; i++) {
                analyticsManager.currentSession = analyticsManager.createSession();
                analyticsManager.trackEvent('page_view');
                
                if (i >= 1) analyticsManager.trackEvent('checkout_start');
                if (i >= 2) analyticsManager.trackEvent('wallet_copy');
                if (i >= 3) analyticsManager.trackEvent('redirect_initiated');
            }
            
            const report = analyticsManager.generateReport();
            const dropoff = report.funnels.checkout.dropoffByStage;
            
            expect(dropoff).toHaveLength(4);
            expect(dropoff[0].reached).toBe(4); // All reached page_view
            expect(dropoff[1].reached).toBe(3); // 3 reached checkout_start
            expect(dropoff[2].reached).toBe(2); // 2 reached wallet_copy
            expect(dropoff[3].reached).toBe(1); // 1 reached redirect
        });
    });

    describe('Custom Methods', () => {
        test('should track custom events', () => {
            analyticsManager.trackCustomEvent('special_action', {
                value: 123,
                category: 'test'
            });
            
            const event = analyticsManager.events.find(
                e => e.name === 'custom_event' && 
                e.properties.customEventName === 'special_action'
            );
            
            expect(event).toBeDefined();
            expect(event.properties.value).toBe(123);
            expect(event.properties.category).toBe('test');
        });

        test('should track user journey steps', () => {
            analyticsManager.trackUserJourney('onboarding_start', {
                step: 1,
                total: 5
            });
            
            const event = analyticsManager.events.find(
                e => e.name === 'user_journey' &&
                e.properties.journeyStep === 'onboarding_start'
            );
            
            expect(event).toBeDefined();
            expect(event.properties.step).toBe(1);
            expect(event.properties.total).toBe(5);
        });

        test('should track conversions', () => {
            analyticsManager.trackConversion('purchase', 19.50, {
                currency: 'EUR',
                product: 'MATIC'
            });
            
            const event = analyticsManager.events.find(
                e => e.name === 'conversion'
            );
            
            expect(event).toBeDefined();
            expect(event.properties.conversionType).toBe('purchase');
            expect(event.properties.conversionValue).toBe(19.50);
            expect(event.properties.currency).toBe('EUR');
        });
    });

    describe('Data Management', () => {
        test('should clear analytics data', () => {
            // Add some data
            analyticsManager.trackEvent('test1');
            analyticsManager.trackEvent('test2');
            
            expect(analyticsManager.events.length).toBeGreaterThan(0);
            expect(analyticsManager.sessions.size).toBeGreaterThan(0);
            
            analyticsManager.clearData();
            
            expect(analyticsManager.events).toHaveLength(0);
            expect(analyticsManager.sessions.size).toBe(0);
            expect(analyticsManager.funnels.get('checkout').sessions.size).toBe(0);
        });

        test('should set custom dimensions', () => {
            analyticsManager.setCustomDimension('userType', 'premium');
            analyticsManager.setCustomDimension('segment', 'crypto-trader');
            
            analyticsManager.trackEvent('test_event');
            
            const event = analyticsManager.events[analyticsManager.events.length - 1];
            expect(event.context.userType).toBe('premium');
            expect(event.context.segment).toBe('crypto-trader');
        });
    });
});