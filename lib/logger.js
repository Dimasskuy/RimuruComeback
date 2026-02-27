/**
 * Centralized Logger System
 * Menggantikan console.log/console.error untuk performa lebih baik
 * dengan configurable log levels dan async writing
 */

const chalk = require('chalk');

// Log levels dengan priority
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Default config - bisa di-override dari config.js
let currentLevel = LOG_LEVELS.info;
let enableColors = true;
let enableTimestamp = true;

// Format helpers
const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
};

const formatLevel = (level) => {
    const labels = {
        error: chalk.redBright('ERROR'),
        warn: chalk.yellowBright('WARN'),
        info: chalk.greenBright('INFO'),
        debug: chalk.blueBright('DEBUG')
    };
    return labels[level] || level;
};

// Logger instance
const logger = {
    /**
     * Configure logger
     * @param {Object} options - Configuration options
     * @param {string} options.level - Log level: 'error' | 'warn' | 'info' | 'debug'
     * @param {boolean} options.colors - Enable/disable colors
     * @param {boolean} options.timestamp - Enable/disable timestamp
     */
    configure(options = {}) {
        if (options.level && LOG_LEVELS[options.level] !== undefined) {
            currentLevel = LOG_LEVELS[options.level];
        }
        if (typeof options.colors === 'boolean') {
            enableColors = options.colors;
        }
        if (typeof options.timestamp === 'boolean') {
            enableTimestamp = options.timestamp;
        }
    },

    /**
     * Set log level dynamically
     * @param {string} level - 'error' | 'warn' | 'info' | 'debug'
     */
    setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            currentLevel = LOG_LEVELS[level];
        }
    },

    /**
     * Check if a level is enabled
     * @param {string} level - Log level to check
     * @returns {boolean}
     */
    isEnabled(level) {
        return LOG_LEVELS[level] <= currentLevel;
    },

    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {Object} [meta] - Additional metadata
     */
    error(message, meta) {
        if (currentLevel < LOG_LEVELS.error) return;
        this._write('error', message, meta);
    },

    /**
     * Log warning message
     * @param {string} message - Message to log
     * @param {Object} [meta] - Additional metadata
     */
    warn(message, meta) {
        if (currentLevel < LOG_LEVELS.warn) return;
        this._write('warn', message, meta);
    },

    /**
     * Log info message
     * @param {string} message - Message to log
     * @param {Object} [meta] - Additional metadata
     */
    info(message, meta) {
        if (currentLevel < LOG_LEVELS.info) return;
        this._write('info', message, meta);
    },

    /**
     * Log debug message
     * @param {string} message - Message to log
     * @param {Object} [meta] - Additional metadata
     */
    debug(message, meta) {
        if (currentLevel < LOG_LEVELS.debug) return;
        this._write('debug', message, meta);
    },

    /**
     * Internal write method
     * @private
     */
    _write(level, message, meta) {
        const parts = [];

        if (enableTimestamp) {
            parts.push(chalk.gray(`[${formatTimestamp()}]`));
        }

        if (enableColors) {
            parts.push(formatLevel(level));
        } else {
            parts.push(`[${level.toUpperCase()}]`);
        }

        parts.push(message);

        if (meta) {
            const metaStr = typeof meta === 'object' ? JSON.stringify(meta, null, 2) : meta;
            parts.push(chalk.gray(metaStr));
        }

        // Use appropriate console method based on level
        const consoleMethod = level === 'error' || level === 'warn' ? 'error' : 'log';
        console[consoleMethod](parts.join(' '));
    },

    /**
     * Create a child logger with prefix
     * @param {string} prefix - Prefix for all log messages
     * @returns {Object} Child logger
     */
    child(prefix) {
        const parent = this;
        return {
            configure: (opts) => parent.configure(opts),
            setLevel: (level) => parent.setLevel(level),
            isEnabled: (level) => parent.isEnabled(level),
            error: (msg, meta) => parent.error(`${prefix}: ${msg}`, meta),
            warn: (msg, meta) => parent.warn(`${prefix}: ${msg}`, meta),
            info: (msg, meta) => parent.info(`${prefix}: ${msg}`, meta),
            debug: (msg, meta) => parent.debug(`${prefix}: ${msg}`, meta)
        };
    }
};

// Auto-configure from global.opts if available
if (typeof global !== 'undefined' && global.opts) {
    if (global.opts['log-level']) {
        logger.setLevel(global.opts['log-level']);
    }
    if (global.opts['nocolor']) {
        logger.configure({ colors: false });
    }
}

module.exports = logger;
