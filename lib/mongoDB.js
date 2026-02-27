const mongoose = require('mongoose')
const { Schema } = mongoose
const logger = require('./logger');

const crypto = require('crypto');

module.exports = class mongoDB {
  constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
    this.url = url
    this.options = options
    this.data = null
    this._model = null
    this._lastHash = ''
    
    // Write queue untuk throttling
    this._writeQueue = null
    this._writeDebounce = 5000 // 5 detik debounce
    this._pendingWrites = 0
  }

  async read() {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(this.url, { ...this.options })
    }

    let schema = new Schema({
      data: {
        type: Object,
        required: true,
        default: {}
      }
    })

    try {
      this._model = mongoose.model('data', schema)
    } catch {
      this._model = mongoose.model('data')
    }

    let doc = await this._model.findOne({})
    if (!doc) {
      this.data = {}
      doc = new this._model({ data: this.data })
      await doc.save()
    } else {
      this.data = doc.data
    }
    this._lastHash = crypto.createHash('md5').update(JSON.stringify(this.data)).digest('hex');
    logger.info('[MongoDB] Database loaded successfully');
    return this.data
  }

  /**
   * Write dengan debounce/throttling
   * Multiple calls within debounce period will be batched into single write
   * @param {Object} data - Optional data to write (uses this.data if not provided)
   * @param {boolean} immediate - Skip debounce and write immediately
   * @returns {Promise<boolean>}
   */
  async write(data, immediate = false) {
    if (!this._model) {
      logger.warn('[MongoDB] Write attempted before model initialized');
      return false;
    }
    
    data = data || this.data;
    if (!data) {
      logger.warn('[MongoDB] No data to write');
      return false;
    }

    const currentDataString = JSON.stringify(data)
    const currentHash = crypto.createHash('md5').update(currentDataString).digest('hex');
    
    // Skip jika tidak ada perubahan
    if (currentHash === this._lastHash) {
      return true;
    }

    // Clear pending write jika ada
    if (this._writeQueue && !immediate) {
      clearTimeout(this._writeQueue);
      this._writeQueue = null;
    }

    // Immediate write atau debounce
    if (immediate) {
      return await this._executeWrite(data, currentHash);
    } else {
      // Queue write dengan debounce
      return new Promise((resolve, reject) => {
        this._writeQueue = setTimeout(async () => {
          try {
            const result = await this._executeWrite(data, currentHash);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        }, this._writeDebounce);
      });
    }
  }

  /**
   * Execute actual write operation
   * @private
   */
  async _executeWrite(data, currentHash) {
    const startTime = Date.now();
    this._pendingWrites++;
    
    try {
      await this._model.updateOne({}, { data }, { upsert: true });
      this._lastHash = currentHash;
      const duration = Date.now() - startTime;
      logger.debug(`[MongoDB] Write completed in ${duration}ms (pending: ${this._pendingWrites})`);
      this._pendingWrites--;
      return true;
    } catch (e) {
      logger.error(`[MongoDB] Write failed: ${e.message}`);
      this._pendingWrites--;
      throw e;
    }
  }

  /**
   * Force write immediately (bypass debounce)
   * @param {Object} data - Optional data to write
   * @returns {Promise<boolean>}
   */
  async forceWrite(data) {
    return this.write(data, true);
  }

  /**
   * Flush write queue immediately
   * @returns {Promise<boolean>}
   */
  async flush() {
    if (this._writeQueue) {
      clearTimeout(this._writeQueue);
      this._writeQueue = null;
      return this.write(this.data, true);
    }
    return true;
  }

  /**
   * Get write queue stats
   * @returns {Object}
   */
  getWriteStats() {
    return {
      hasPendingWrite: !!this._writeQueue,
      pendingWrites: this._pendingWrites,
      debounceMs: this._writeDebounce
    };
  }
}
