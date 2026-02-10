const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class mongoDB {
  constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
    this.url = url
    this.options = options
    this.data = null
    this._model = null
    this._lastDataString = ''
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
    this._lastDataString = JSON.stringify(this.data)
    return this.data
  }

  async write(data) {
    if (!this._model) return false;
    data = data || this.data;
    if (!data) return false;

    const currentDataString = JSON.stringify(data)
    if (currentDataString === this._lastDataString) return true; // No changes, skip write

    await this._model.updateOne({}, { data }, { upsert: true });
    this._lastDataString = currentDataString
    return true;
  }
}
