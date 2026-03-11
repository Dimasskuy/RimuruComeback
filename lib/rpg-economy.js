const BUY_MARKUP = 1.2;
const SELL_FACTOR = 0.5;

const BASE_PRICES = {
  potion: 10000,
  diamond: 5000,
  emerald: 50000,
  coal: 3000,
  common: 20000,
  uncommon: 100000,
  mythic: 750000,
  legendary: 5000000,
  sampah: 200,
  kaleng: 1500,
  kardus: 1500,
  botol: 1000,
  kayu: 5000,
  pisang: 20000,
  anggur: 20000,
  mangga: 15000,
  jeruk: 25000,
  apel: 20000,
  emasbiasa: 1000000,
  pet: 500000,
  makananpet: 200000,
  makanannaga: 500000,
  makananphonix: 300000,
  makanankyubi: 500000,
  makanangriffin: 300000,
  makanancentaur: 500000,
  healtmonster: 75000,
  aqua: 20000,
  iron: 100000,
  emasbatang: 1500000,
  phonix: 1000000000,
  griffin: 100000000,
  kyubi: 100000000,
  naga: 100000000,
  centaur: 100000000,
  kuda: 50000000,
  rubah: 100000000,
  kucing: 5000000,
  serigala: 50000000,
  string: 200000,
  sword: 500000,
  batu: 1500,
  umpan: 5000,
  pancingan: 20000000,
  bensin: 75000,
  weapon: 500000,
  obat: 50000,
  eleksirb: 2000,
  koinexpg: 500000,
  bibitpisang: 2000,
  bibitanggur: 2000,
  bibitmangga: 2000,
  bibitjeruk: 2000,
  bibitapel: 2000,
  gardenboxs: 50000
};

function getBuyPrice(item) {
  if (!BASE_PRICES[item]) return 0;
  return Math.round(BASE_PRICES[item] * BUY_MARKUP);
}

function getSellPrice(item) {
  if (!BASE_PRICES[item]) return 0;
  return Math.round(BASE_PRICES[item] * SELL_FACTOR);
}

module.exports = {
  BUY_MARKUP,
  SELL_FACTOR,
  BASE_PRICES,
  getBuyPrice,
  getSellPrice
};
