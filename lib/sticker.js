const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const fetch = require('node-fetch')
const { ffmpeg } = require('./converter')
const { spawn } = require('child_process')
const uploadFile = require('./uploadFile')
const { fromBuffer } = require('file-type')
const uploadImage = require('./uploadImage')

const tmp = path.join(__dirname, '../tmp')

/**
 * Image to Sticker (FFmpeg + GraphicsMagick/ImageMagick)
 * @param {Buffer} img Image Buffer
 * @param {String} url Image URL
 */
function sticker2(img, url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url) {
        let res = await fetch(url)
        if (res.status !== 200) throw await res.text()
        img = await res.buffer()
      }
      let inp = path.join(tmp, +new Date + '.jpeg')
      await fs.promises.writeFile(inp, img)
      let ff = spawn('ffmpeg', [
        '-y',
        '-i', inp,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1',
        '-f', 'png',
        '-'
      ])
      ff.on('error', reject)
      ff.on('close', async () => {
        await fs.promises.unlink(inp)
      })
      let bufs = []
      const [_spawnprocess, ..._spawnargs] = [...(module.exports.support.gm ? ['gm'] : module.exports.support.magick ? ['magick'] : []), 'convert', 'png:-', 'webp:-']
      let im = spawn(_spawnprocess, _spawnargs)
      im.on('error', e => reject(e))
      im.stdout.on('data', chunk => bufs.push(chunk))
      ff.stdout.pipe(im.stdin)
      im.on('exit', () => {
        resolve(Buffer.concat(bufs))
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Image/Video to Sticker (API XTeam)
 * @param {Buffer} img Image/Video Buffer
 * @param {String} url Image/Video URL
 * @param {String} packname EXIF Packname
 * @param {String} author EXIF Author
 */
async function sticker3(img, url, packname, author) {
  url = url ? url : await uploadFile(img)
  let res = await fetch('https://api.xteam.xyz/sticker/wm?' + new URLSearchParams(Object.entries({
    url,
    packname,
    author
  })))
  return await res.buffer()
}

/**
 * Image/Video to Sticker (FFmpeg WebP)
 * @param {Buffer} img Image/Video Buffer
 * @param {String} url Image/Video URL
 */
async function sticker4(img, url) {
  if (url) {
    let res = await fetch(url)
    if (res.status !== 200) throw await res.text()
    img = await res.buffer()
  }
  return await ffmpeg(img, [
    '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1'
  ], 'jpeg', 'webp')
}

/**
 * Add WhatsApp JSON Exif Metadata
 * Uses lib/exif.js for reliable WebP handling
 * @param {Buffer} webpSticker
 * @param {String} packname
 * @param {String} author
 * @param {String} categories
 * @param {Object} extra
 * @returns
 */
async function addExif(webpSticker, packname, author, categories = [''], extra = {}) {
  const { writeExifImg } = require('./exif')
  return await writeExifImg(webpSticker, { packname, author, categories })
}

module.exports = {
  /**
   * Image/Video to Sticker
   * @param {Buffer} img Image/Video Buffer
   * @param {String} url Image/Video URL
   * @param {...String}
   */
  async sticker(img, url, ...args) {
    let lastError
    for (let func of [
      sticker3,
      this.support.ffmpeg && this.support.ffmpegWebp && sticker4,
      this.support.ffmpeg && (this.support.convert || this.support.magick || this.support.gm) && sticker2,
    ].filter(f => f)) {
      try {
        let stiker = await func(img, url, ...args)
        if (stiker.includes('RIFF')) {
          try {
            return await addExif(stiker, ...args)
          } catch (e) {
            return stiker
          }
        }
        throw stiker.toString()
      } catch (err) {
        lastError = err
      }
    }
    return lastError
  },
  sticker2,
  sticker3,
  sticker4,
  addExif,
  support: {
    ffmpeg: true,
    ffprobe: true,
    ffmpegWebp: true,
    convert: true,
    magick: false,
    gm: false,
    find: false
  }
}
