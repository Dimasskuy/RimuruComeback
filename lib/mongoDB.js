const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class mongoDB {
  constructor(url, options = { useNewUrlParser: true, useUnifiedTopology: true }) {
    this.url = url
    this.data = this._data = this._schema = this._model = {}
    this.db
    this.options = options
  }

  async read() {
    this.db = await mongoose.connect(this.url, { ...this.options })
    this.connection = mongoose.connection
    let schema = this._schema = new Schema({
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
    this._data = await this._model.findOne({})
    if (!this._data) {
      this.data = {}
      await this.write(this.data)
      this._data = await this._model.findOne({})
    } else {
      this.data = this._data.data
    }
    return this.data
  }

  async write(data) {
    if (!data) data = this.data
    if (!data) return
    if (!this._data) {
      this._data = new this._model({ data })
      await this._data.save()
    } else {
      await this._model.findOneAndUpdate({}, { data }, { upsert: true })
    }
    return true
  }
}
