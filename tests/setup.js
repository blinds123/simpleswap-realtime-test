// Test Setup and Configuration
// Sets up the test environment for Jest

// Mock DOM environment
global.document = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    createElement: jest.fn(() => ({
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn()
        },
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn()
    })),
    head: {
        appendChild: jest.fn()
    },
    body: {
        appendChild: jest.fn()
    },
    addEventListener: jest.fn(),
    cookie: '',
    referrer: 'https://example.com',
    title: 'Test Page'
};

global.window = {
    location: {
        href: 'https://checkout.simpleswap.io',
        hostname: 'checkout.simpleswap.io',
        protocol: 'https:',
        search: '',
        hash: ''
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (Test Browser)',
        language: 'en-US',
        clipboard: {
            writeText: jest.fn().mockResolvedValue(true)
        }
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    sessionStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    crypto: {
        getRandomValues: (array) => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
    },
    performance: {
        now: () => Date.now(),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => [{ duration: 100 }]),
        timing: {
            navigationStart: Date.now() - 1000,
            loadEventEnd: Date.now()
        }
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    innerWidth: 1024,
    innerHeight: 768,
    screen: {
        width: 1920,
        height: 1080
    },
    EventTarget: class EventTarget {
        constructor() {
            this.listeners = {};
        }
        addEventListener(type, listener) {
            if (!this.listeners[type]) {
                this.listeners[type] = [];
            }
            this.listeners[type].push(listener);
        }
        removeEventListener(type, listener) {
            if (this.listeners[type]) {
                this.listeners[type] = this.listeners[type].filter(l => l !== listener);
            }
        }
        dispatchEvent(event) {
            if (this.listeners[event.type]) {
                this.listeners[event.type].forEach(listener => listener(event));
            }
        }
    },
    CustomEvent: class CustomEvent {
        constructor(type, options = {}) {
            this.type = type;
            this.detail = options.detail;
            this.bubbles = options.bubbles || false;
            this.cancelable = options.cancelable || false;
        }
    },
    Event: class Event {
        constructor(type) {
            this.type = type;
        }
    },
    fetch: jest.fn()
};

// Global configurations
global.SIMPLESWAP_CONFIG = {
    apiKey: 'test-api-key',
    walletAddress: '0xE5173e7c3089bD89cd1341b637b8e1951745ED5C',
    amount: '19.50',
    currency: 'MATIC',
    baseUrl: 'https://api.simpleswap.io'
};

global.ProductionConfig = {
    environment: 'test',
    api: {
        simpleswap: {
            baseUrl: 'https://api.simpleswap.io',
            timeout: 10000
        }
    }
};

global.SecurityConfig = {
    csp: {
        enabled: true,
        directives: {
            'default-src': ["'self'"]
        }
    },
    validation: {
        walletPatterns: {
            polygon: /^0x[a-fA-F0-9]{40}$/,
            bitcoin: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
        }
    }
};

global.MonitoringConfig = {
    analytics: {
        enabled: true,
        events: {
            automatic: {
                pageViews: true,
                clicks: true
            }
        }
    }
};

global.DEV_CONFIG = {
    testMode: true,
    enableLogging: false,
    showDebugUI: false
};

global.APP_EVENTS = {
    WALLET_COPIED: 'wallet:copied',
    WALLET_COPY_FAILED: 'wallet:copyFailed',
    REDIRECT_STARTED: 'redirect:started'
};

global.UI_CONFIG = {
    messages: {
        generalError: 'An error occurred. Please try again.'
    }
};

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Helper function to create DOM elements
global.createMockElement = (tag, props = {}) => {
    const element = {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn(() => false)
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        getAttribute: jest.fn(),
        setAttribute: jest.fn(),
        removeAttribute: jest.fn(),
        ...props
    };
    return element;
};

// Helper to reset all mocks
global.resetAllMocks = () => {
    jest.clearAllMocks();
    global.window.localStorage.getItem.mockClear();
    global.window.localStorage.setItem.mockClear();
    global.window.fetch.mockClear();
    global.console.log.mockClear();
    global.console.warn.mockClear();
    global.console.error.mockClear();
};

// Setup before each test
beforeEach(() => {
    global.window.eventEmitter = new global.window.EventTarget();
    global.resetAllMocks();
});

// Cleanup after each test
afterEach(() => {
    jest.restoreAllMocks();
});