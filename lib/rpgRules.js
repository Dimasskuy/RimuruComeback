const EXCLUSIVE_ITEMS = {
  relicshard: {
    name: 'Relic Shard',
    obtain: 'Drop dari command .relichunt (cooldown 6 jam)'
  },
  ancientrelic: {
    name: 'Ancient Relic',
    obtain: 'Craft dari 10 Relic Shard via .reliccraft'
  }
}

const GUARDED_NUMERIC_FIELDS = {
  money: { min: 0, max: 1_000_000_000_000 },
  exp: { min: 0, max: 1_000_000_000 },
  limit: { min: 0, max: 1_000_000 },
  diamond: { min: 0, max: 10_000_000 },
  emerald: { min: 0, max: 50_000_000 },
  iron: { min: 0, max: 50_000_000 },
  emas: { min: 0, max: 50_000_000 },
  coal: { min: 0, max: 50_000_000 },
  potion: { min: 0, max: 5_000_000 },
  common: { min: 0, max: 5_000_000 },
  uncommon: { min: 0, max: 5_000_000 },
  mythic: { min: 0, max: 1_000_000 },
  legendary: { min: 0, max: 500_000 },
  relicshard: { min: 0, max: 1_000_000 },
  ancientrelic: { min: 0, max: 100_000 }
}

module.exports = {
  EXCLUSIVE_ITEMS,
  GUARDED_NUMERIC_FIELDS
}
