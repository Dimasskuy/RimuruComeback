const localUtils = require('./functions.local')
const networkUtils = require('./functions.network')

module.exports = {
  ...networkUtils,
  ...localUtils
}
