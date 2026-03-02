const mongoose = require('mongoose')
const { Schema } = mongoose
const logger = require('./logger')
const crypto = require('crypto')

module.exports = class mongoDB {
  constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
    this.url = url
    this.options = options
    this.data = null
    this._model = null
    this._lastHash = ''

    // Write queue untuk throttling (stable & promise-safe)
    this._writeQueue = null
    this._writeDebounce = Number(global?.performance?.dbWriteDebounce || process.env.DB_WRITE_DEBOUNCE || 5000)
    this._pendingWrites = 0
    this._queuedData = null
    this._queuedHash = ''
    this._queuedResolvers = []
    this._queuedRejectors = []
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

    this._lastHash = crypto.createHash('md5').update(JSON.stringify(this.data)).digest('hex')
    logger.info('[MongoDB] Database loaded successfully')
    return this.data
  }

  async write(data, immediate = false) {
    if (!this._model) {
      logger.warn('[MongoDB] Write attempted before model initialized')
      return false
    }

    data = data || this.data
    if (!data) {
      logger.warn('[MongoDB] No data to write')
      return false
    }

    const currentDataString = JSON.stringify(data)
    const currentHash = crypto.createHash('md5').update(currentDataString).digest('hex')

    if (currentHash === this._lastHash) {
      return true
    }

    if (immediate) {
      return await this._executeWrite(data, currentHash)
    }

    // Batch all pending callers into one write + resolve all promises reliably
    this._queuedData = data
    this._queuedHash = currentHash

    return new Promise((resolve, reject) => {
      this._queuedResolvers.push(resolve)
      this._queuedRejectors.push(reject)

      if (this._writeQueue) clearTimeout(this._writeQueue)

      this._writeQueue = setTimeout(async () => {
        const resolvers = this._queuedResolvers.splice(0)
        const rejectors = this._queuedRejectors.splice(0)
        const queuedData = this._queuedData
        const queuedHash = this._queuedHash
        this._writeQueue = null

        try {
          const result = await this._executeWrite(queuedData, queuedHash)
          for (const done of resolvers) done(result)
        } catch (e) {
          for (const fail of rejectors) fail(e)
        }
      }, this._writeDebounce)
    })
  }

  async _executeWrite(data, currentHash) {
    const startTime = Date.now()
    this._pendingWrites++

    try {
      await this._model.updateOne({}, { data }, { upsert: true })
      this._lastHash = currentHash
      const duration = Date.now() - startTime
      logger.debug(`[MongoDB] Write completed in ${duration}ms (pending: ${this._pendingWrites})`)
      this._pendingWrites--
      return true
    } catch (e) {
      logger.error(`[MongoDB] Write failed: ${e.message}`)
      this._pendingWrites--
      throw e
    }
  }

  async forceWrite(data) {
    return this.write(data, true)
  }

  async flush() {
    if (this._writeQueue) {
      clearTimeout(this._writeQueue)
      this._writeQueue = null

      const resolvers = this._queuedResolvers.splice(0)
      const rejectors = this._queuedRejectors.splice(0)
      try {
        const result = await this._executeWrite(this._queuedData || this.data, this._queuedHash || '')
        for (const done of resolvers) done(result)
        return result
      } catch (e) {
        for (const fail of rejectors) fail(e)
        throw e
      }
    }
    return true
  }

  getWriteStats() {
    return {
      hasPendingWrite: !!this._writeQueue,
      pendingWrites: this._pendingWrites,
      debounceMs: this._writeDebounce
    }
  }
}
