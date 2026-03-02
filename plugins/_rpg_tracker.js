// Deprecated tracker intentionally disabled.
// Progress is now incremented only on successful action inside each RPG plugin
// to prevent quest farming via failed/cooldown command spam.

let handler = m => m

handler.before = function () {
  return true
}

module.exports = handler
