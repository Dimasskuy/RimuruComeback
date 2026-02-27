/**
 * Centralized Scheduler
 * Prevent duplicated intervals/timeouts and simplify cleanup on reload/shutdown
 */

const logger = require('./logger');

const intervals = new Map();
const timeouts = new Map();

function setManagedInterval(key, fn, ms) {
  if (!key || typeof fn !== 'function') throw new Error('setManagedInterval requires key and function');
  clearManagedInterval(key);
  const id = setInterval(fn, ms);
  intervals.set(key, id);
  return id;
}

function setManagedTimeout(key, fn, ms) {
  if (!key || typeof fn !== 'function') throw new Error('setManagedTimeout requires key and function');
  clearManagedTimeout(key);
  const id = setTimeout(() => {
    try { fn(); } finally { timeouts.delete(key); }
  }, ms);
  timeouts.set(key, id);
  return id;
}

function clearManagedInterval(key) {
  const id = intervals.get(key);
  if (id) {
    clearInterval(id);
    intervals.delete(key);
  }
}

function clearManagedTimeout(key) {
  const id = timeouts.get(key);
  if (id) {
    clearTimeout(id);
    timeouts.delete(key);
  }
}

function clearAll() {
  for (const id of intervals.values()) clearInterval(id);
  for (const id of timeouts.values()) clearTimeout(id);
  const counts = { intervals: intervals.size, timeouts: timeouts.size };
  intervals.clear();
  timeouts.clear();
  logger.info(`[Scheduler] Cleared all tasks (intervals=${counts.intervals}, timeouts=${counts.timeouts})`);
}

function getStats() {
  return {
    intervals: intervals.size,
    timeouts: timeouts.size,
    intervalKeys: [...intervals.keys()],
    timeoutKeys: [...timeouts.keys()]
  };
}

module.exports = {
  setManagedInterval,
  setManagedTimeout,
  clearManagedInterval,
  clearManagedTimeout,
  clearAll,
  getStats
};
