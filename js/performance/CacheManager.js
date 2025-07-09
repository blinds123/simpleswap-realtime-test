// Cache Manager - Client-side caching strategies and optimization

class CacheManager {
  constructor() {
    this.caches = new Map();
    this.cacheConfig = {
      defaultTTL: 3600000, // 1 hour in milliseconds
      maxSize: 50, // Maximum items per cache
      enableLocalStorage: true,
      enableSessionStorage: true,
      enableMemoryCache: true
    };
    
    this.initializeCaches();
  }

  /**
   * Initialize cache stores
   */
  initializeCaches() {
    // Memory cache (fastest)
    if (this.cacheConfig.enableMemoryCache) {
      this.caches.set('memory', new Map());
    }
    
    // Session storage (persists for session)
    if (this.cacheConfig.enableSessionStorage && this.isStorageAvailable('sessionStorage')) {
      this.caches.set('session', sessionStorage);
    }
    
    // Local storage (persists across sessions)
    if (this.cacheConfig.enableLocalStorage && this.isStorageAvailable('localStorage')) {
      this.caches.set('local', localStorage);
    }
    
    // Clean up expired items on initialization
    this.cleanupExpiredItems();
    
    if (DEV_CONFIG.enableLogging) {
      console.log('[CacheManager] Cache stores initialized');
    }
  }

  /**
   * Check if storage is available
   * @param {string} type - Storage type
   * @returns {boolean} Available status
   */
  isStorageAvailable(type) {
    try {
      const storage = window[type];
      const test = '__cache_test__';
      storage.setItem(test, test);
      storage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Cache options
   */
  set(key, value, options = {}) {
    const {
      ttl = this.cacheConfig.defaultTTL,
      store = 'memory',
      compress = false
    } = options;
    
    const cacheEntry = {
      value: compress ? this.compress(value) : value,
      timestamp: Date.now(),
      ttl: ttl,
      compressed: compress
    };
    
    try {
      const cache = this.caches.get(store);
      if (!cache) {
        throw new Error(`Cache store ${store} not available`);
      }
      
      if (store === 'memory') {
        // Memory cache
        cache.set(key, cacheEntry);
        this.enforceMemoryLimit(cache);
      } else {
        // Storage cache (session/local)
        cache.setItem(this.getCacheKey(key), JSON.stringify(cacheEntry));
        this.enforceStorageLimit(cache);
      }
      
      if (DEV_CONFIG.enableLogging) {
        console.log(`[CacheManager] Cached ${key} in ${store}`);
      }
    } catch (error) {
      console.error(`[CacheManager] Failed to cache ${key}:`, error);
    }
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @param {Object} options - Get options
   * @returns {*} Cached value or null
   */
  get(key, options = {}) {
    const { store = 'memory', fallbackStores = ['session', 'local'] } = options;
    
    // Try primary store first
    let result = this.getFromStore(key, store);
    
    // Try fallback stores if not found
    if (result === null && fallbackStores.length > 0) {
      for (const fallbackStore of fallbackStores) {
        result = this.getFromStore(key, fallbackStore);
        if (result !== null) {
          // Promote to primary store for faster access
          this.set(key, result, { store: store });
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Get from specific cache store
   * @param {string} key - Cache key
   * @param {string} store - Store name
   * @returns {*} Cached value or null
   */
  getFromStore(key, store) {
    try {
      const cache = this.caches.get(store);
      if (!cache) return null;
      
      let cacheEntry;
      
      if (store === 'memory') {
        cacheEntry = cache.get(key);
      } else {
        const stored = cache.getItem(this.getCacheKey(key));
        if (!stored) return null;
        cacheEntry = JSON.parse(stored);
      }
      
      if (!cacheEntry) return null;
      
      // Check if expired
      if (this.isExpired(cacheEntry)) {
        this.remove(key, { store });
        return null;
      }
      
      // Decompress if needed
      const value = cacheEntry.compressed ? 
        this.decompress(cacheEntry.value) : 
        cacheEntry.value;
      
      if (DEV_CONFIG.enableLogging) {
        console.log(`[CacheManager] Retrieved ${key} from ${store}`);
      }
      
      return value;
    } catch (error) {
      console.error(`[CacheManager] Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Remove item from cache
   * @param {string} key - Cache key
   * @param {Object} options - Remove options
   */
  remove(key, options = {}) {
    const { store = 'all' } = options;
    
    if (store === 'all') {
      // Remove from all stores
      this.caches.forEach((cache, storeName) => {
        this.removeFromStore(key, storeName);
      });
    } else {
      this.removeFromStore(key, store);
    }
  }

  /**
   * Remove from specific store
   * @param {string} key - Cache key
   * @param {string} store - Store name
   */
  removeFromStore(key, store) {
    try {
      const cache = this.caches.get(store);
      if (!cache) return;
      
      if (store === 'memory') {
        cache.delete(key);
      } else {
        cache.removeItem(this.getCacheKey(key));
      }
    } catch (error) {
      console.error(`[CacheManager] Failed to remove ${key}:`, error);
    }
  }

  /**
   * Clear all caches
   * @param {Object} options - Clear options
   */
  clear(options = {}) {
    const { store = 'all' } = options;
    
    if (store === 'all') {
      this.caches.forEach((cache, storeName) => {
        this.clearStore(storeName);
      });
    } else {
      this.clearStore(store);
    }
  }

  /**
   * Clear specific store
   * @param {string} store - Store name
   */
  clearStore(store) {
    try {
      const cache = this.caches.get(store);
      if (!cache) return;
      
      if (store === 'memory') {
        cache.clear();
      } else {
        // Only clear our cache keys
        const keys = [];
        for (let i = 0; i < cache.length; i++) {
          const key = cache.key(i);
          if (key && key.startsWith('cache_')) {
            keys.push(key);
          }
        }
        keys.forEach(key => cache.removeItem(key));
      }
      
      if (DEV_CONFIG.enableLogging) {
        console.log(`[CacheManager] Cleared ${store} cache`);
      }
    } catch (error) {
      console.error(`[CacheManager] Failed to clear ${store}:`, error);
    }
  }

  /**
   * Check if cache entry is expired
   * @param {Object} entry - Cache entry
   * @returns {boolean} Expired status
   */
  isExpired(entry) {
    if (!entry.ttl || entry.ttl === Infinity) return false;
    return Date.now() > entry.timestamp + entry.ttl;
  }

  /**
   * Clean up expired items from all stores
   */
  cleanupExpiredItems() {
    this.caches.forEach((cache, store) => {
      if (store === 'memory') {
        // Memory cache cleanup
        const keysToRemove = [];
        cache.forEach((entry, key) => {
          if (this.isExpired(entry)) {
            keysToRemove.push(key);
          }
        });
        keysToRemove.forEach(key => cache.delete(key));
      } else {
        // Storage cleanup
        const keysToRemove = [];
        for (let i = 0; i < cache.length; i++) {
          const key = cache.key(i);
          if (key && key.startsWith('cache_')) {
            try {
              const entry = JSON.parse(cache.getItem(key));
              if (this.isExpired(entry)) {
                keysToRemove.push(key);
              }
            } catch (e) {
              // Invalid entry, remove it
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(key => cache.removeItem(key));
      }
    });
  }

  /**
   * Enforce memory cache size limit
   * @param {Map} cache - Memory cache
   */
  enforceMemoryLimit(cache) {
    if (cache.size > this.cacheConfig.maxSize) {
      // Remove oldest entries (FIFO)
      const keysToRemove = Array.from(cache.keys()).slice(0, cache.size - this.cacheConfig.maxSize);
      keysToRemove.forEach(key => cache.delete(key));
    }
  }

  /**
   * Enforce storage size limit
   * @param {Storage} cache - Storage object
   */
  enforceStorageLimit(cache) {
    try {
      const cacheKeys = [];
      for (let i = 0; i < cache.length; i++) {
        const key = cache.key(i);
        if (key && key.startsWith('cache_')) {
          const entry = JSON.parse(cache.getItem(key));
          cacheKeys.push({ key, timestamp: entry.timestamp });
        }
      }
      
      if (cacheKeys.length > this.cacheConfig.maxSize) {
        // Sort by timestamp and remove oldest
        cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - this.cacheConfig.maxSize);
        keysToRemove.forEach(item => cache.removeItem(item.key));
      }
    } catch (error) {
      console.error('[CacheManager] Failed to enforce storage limit:', error);
    }
  }

  /**
   * Get cache key with prefix
   * @param {string} key - Original key
   * @returns {string} Prefixed key
   */
  getCacheKey(key) {
    return `cache_${key}`;
  }

  /**
   * Simple compression (for demonstration)
   * @param {*} value - Value to compress
   * @returns {string} Compressed value
   */
  compress(value) {
    // In production, use a proper compression library
    return JSON.stringify(value);
  }

  /**
   * Simple decompression
   * @param {string} value - Compressed value
   * @returns {*} Decompressed value
   */
  decompress(value) {
    // In production, use a proper compression library
    return JSON.parse(value);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const stats = {
      stores: {},
      totalItems: 0,
      totalSize: 0
    };
    
    this.caches.forEach((cache, store) => {
      let count = 0;
      let size = 0;
      
      if (store === 'memory') {
        count = cache.size;
        // Estimate memory size
        cache.forEach(entry => {
          size += JSON.stringify(entry).length;
        });
      } else {
        for (let i = 0; i < cache.length; i++) {
          const key = cache.key(i);
          if (key && key.startsWith('cache_')) {
            count++;
            const item = cache.getItem(key);
            if (item) {
              size += key.length + item.length;
            }
          }
        }
      }
      
      stats.stores[store] = { count, size };
      stats.totalItems += count;
      stats.totalSize += size;
    });
    
    return stats;
  }

  /**
   * Cache function result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to cache
   * @param {Object} options - Cache options
   * @returns {Promise<*>} Function result
   */
  async memoize(key, fn, options = {}) {
    // Try to get from cache first
    const cached = this.get(key, options);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    try {
      const result = await fn();
      this.set(key, result, options);
      return result;
    } catch (error) {
      console.error(`[CacheManager] Memoization failed for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Batch operations
   * @param {Array} operations - Array of operations
   * @returns {Promise<Array>} Results
   */
  async batch(operations) {
    return Promise.all(operations.map(op => {
      switch (op.type) {
        case 'get':
          return this.get(op.key, op.options);
        case 'set':
          return this.set(op.key, op.value, op.options);
        case 'remove':
          return this.remove(op.key, op.options);
        default:
          throw new Error(`Unknown operation type: ${op.type}`);
      }
    }));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}