/**
 * API Rate Limiting Queue System
 * Mencegah API bans dan connection exhaustion
 * 
 * Usage:
 * const queue = require('./lib/queue');
 * await queue.add(() => fetch(url), { priority: 'normal', retries: 3 });
 */

const logger = require('./logger');

// Configuration
const CONFIG = {
    maxConcurrent: 5,           // Max concurrent requests
    maxQueueSize: 100,          // Max queue size
    defaultRetries: 2,          // Default retry count
    retryDelay: 2000,           // Delay between retries (ms)
    timeout: 30000,             // Request timeout (ms)
    rateLimitDelay: 1000,       // Delay between requests to same API (ms)
};

// Queue storage
const queue = [];
const activeRequests = new Map(); // Track active requests by API domain
const apiLastRequest = new Map(); // Track last request time per API

// Stats
const stats = {
    total: 0,
    success: 0,
    failed: 0,
    retried: 0,
    queued: 0
};

/**
 * Get API domain from URL
 */
function getDomain(url) {
    try {
        if (typeof url === 'string') {
            const parsed = new URL(url);
            return parsed.hostname;
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

/**
 * Sleep helper
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute request with timeout and retry logic
 */
async function executeWithRetry(fn, options = {}) {
    const {
        retries = CONFIG.defaultRetries,
        timeout = CONFIG.timeout,
        url = null
    } = options;

    let lastError;
    let attempt = 0;

    while (attempt <= retries) {
        try {
            // Rate limiting per API domain
            if (url) {
                const domain = getDomain(url);
                const lastRequest = apiLastRequest.get(domain);
                
                if (lastRequest) {
                    const timeSinceLast = Date.now() - lastRequest;
                    if (timeSinceLast < CONFIG.rateLimitDelay) {
                        await sleep(CONFIG.rateLimitDelay - timeSinceLast);
                    }
                }
                apiLastRequest.set(domain, Date.now());
            }

            // Execute with timeout
            const result = await Promise.race([
                fn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), timeout)
                )
            ]);

            return result;

        } catch (error) {
            lastError = error;
            attempt++;

            if (attempt <= retries) {
                stats.retried++;
                logger.warn(`[Queue] Request failed (attempt ${attempt}/${retries + 1}), retrying in ${CONFIG.retryDelay}ms: ${error.message}`);
                await sleep(CONFIG.retryDelay);
            }
        }
    }

    throw lastError;
}

/**
 * Process queue
 */
async function processQueue() {
    if (queue.length === 0) return;

    const availableSlots = CONFIG.maxConcurrent - activeRequests.size;
    if (availableSlots <= 0) return;

    const toProcess = queue.splice(0, availableSlots);

    for (const item of toProcess) {
        const { fn, resolve, reject, options, url } = item;
        stats.queued--;

        const requestId = `${Date.now()}-${Math.random()}`;
        activeRequests.set(requestId, { fn, options, url });

        executeWithRetry(fn, options)
            .then(result => {
                stats.success++;
                resolve(result);
            })
            .catch(error => {
                stats.failed++;
                logger.error(`[Queue] Request failed: ${error.message}`);
                reject(error);
            })
            .finally(() => {
                activeRequests.delete(requestId);
                // Process next in queue
                setImmediate(() => processQueue());
            });
    }
}

module.exports = {
    /**
     * Add request to queue
     * @param {Function} fn - Function that returns Promise
     * @param {Object} options - Options
     * @param {string} options.url - URL for rate limiting
     * @param {number} options.retries - Number of retries
     * @param {number} options.timeout - Timeout in ms
     * @param {'high'|'normal'|'low'} options.priority - Priority level
     * @returns {Promise}
     */
    add(fn, options = {}) {
        return new Promise((resolve, reject) => {
            if (queue.length >= CONFIG.maxQueueSize) {
                reject(new Error('Queue is full'));
                return;
            }

            stats.total++;
            stats.queued++;

            const item = {
                fn,
                resolve,
                reject,
                options,
                url: options.url,
                priority: options.priority || 'normal',
                addedAt: Date.now()
            };

            // Priority queue insertion
            if (item.priority === 'high') {
                queue.unshift(item);
            } else if (item.priority === 'low') {
                queue.push(item);
            } else {
                // Normal priority - insert after high, before low
                const highPriorityCount = queue.findIndex(i => i.priority !== 'high');
                queue.splice(highPriorityCount === -1 ? queue.length : highPriorityCount, 0, item);
            }

            // Trigger queue processing
            setImmediate(() => processQueue());
        });
    },

    /**
     * Fetch with queue (drop-in replacement for node-fetch)
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>}
     */
    async fetch(url, options = {}) {
        const fetchFn = () => {
            const nodeFetch = require('node-fetch');
            return nodeFetch(url, options);
        };

        return this.add(fetchFn, { ...options, url });
    },

    /**
     * Axios request with queue
     * @param {Object} config - Axios config
     * @returns {Promise}
     */
    async axios(config) {
        const axiosFn = () => {
            const axios = require('axios');
            return axios(config);
        };

        const url = typeof config === 'string' ? config : config.url;
        return this.add(axiosFn, { url });
    },

    /**
     * Get queue stats
     */
    getStats() {
        return {
            ...stats,
            active: activeRequests.size,
            queued: queue.length,
            maxConcurrent: CONFIG.maxConcurrent,
            maxQueueSize: CONFIG.maxQueueSize
        };
    },

    /**
     * Configure queue
     */
    configure(newConfig) {
        Object.assign(CONFIG, newConfig);
        logger.info(`[Queue] Configuration updated: ${JSON.stringify(CONFIG)}`);
    },

    /**
     * Clear queue
     */
    clear() {
        queue.length = 0;
        stats.queued = 0;
        logger.info('[Queue] Queue cleared');
    },

    /**
     * Get queue length
     */
    getLength() {
        return queue.length;
    }
};
