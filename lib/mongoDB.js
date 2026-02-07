const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class mongoDB {
  constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
    this.url = url
    this.options = options
    this.data = null
    this._model = null
  }

  async read() {
    try {
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
        console.log('[MONGODB] Initialized new database')
      } else {
        this.data = doc.data
        console.log('[MONGODB] Database loaded successfully')
      }
      this._lastData = JSON.stringify(this.data)
      return this.data
    } catch (e) {
      console.error('[MONGODB] Failed to read database:', e)
      return null
    }
  }

  async write(data) {
    if (!this._model) return false;
    data = data || this.data;
    if (!data) return false;

    try {
      // Check if data has changed to save CPU/Network/Database operations
      const currentData = JSON.stringify(data);
      if (this._lastData === currentData) return true;

      await this._model.updateOne({}, { data }, { upsert: true });
      this._lastData = currentData;
      console.log('[MONGODB] Database saved successfully');
      return true;
    } catch (e) {
      console.error('[MONGODB] Failed to save database:', e);
      return false;
    }
  }
}
