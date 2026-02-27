const fetch = require('node-fetch')
const FormData = require('form-data')
const cheerio = require('cheerio')

async function webp2mp4(source) {
  let form = new FormData
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source)
  form.append('new-image-url', isUrl ? source : '')
  form.append('new-image', isUrl ? '' : source, { filename: 'image.webp', contentType: 'image/webp' })
  let res = await fetch('https://s6.ezgif.com/webp-to-mp4', {
    method: 'POST',
    body: form
  })
  let html = await res.text()
  let $ = cheerio.load(html)
  let form2 = new FormData
  let obj = {}
  $('form input[name]').each((i, el) => {
    let name = $(el).attr('name')
    let value = $(el).val()
    obj[name] = value
    form2.append(name, value)
  })
  let res2 = await fetch('https://ezgif.com/webp-to-mp4/' + obj.file, {
    method: 'POST',
    body: form2
  })
  let html2 = await res2.text()
  let $2 = cheerio.load(html2)
  let src = $2('div#output > p.outfile > video > source').attr('src')
  if (!src) throw new Error('Failed to convert webp to mp4')
  return new URL(src, res2.url).toString()
}

async function webp2png(source) {
  let form = new FormData
  let isUrl = typeof source === 'string' && /https?:\/\//.test(source)
  form.append('new-image-url', isUrl ? source : '')
  form.append('new-image', isUrl ? '' : source, { filename: 'image.webp', contentType: 'image/webp' })
  let res = await fetch('https://s6.ezgif.com/webp-to-png', {
    method: 'POST',
    body: form
  })
  let html = await res.text()
  let $ = cheerio.load(html)
  let form2 = new FormData
  let obj = {}
  $('form input[name]').each((i, el) => {
    let name = $(el).attr('name')
    let value = $(el).val()
    obj[name] = value
    form2.append(name, value)
  })
  let res2 = await fetch('https://ezgif.com/webp-to-png/' + obj.file, {
    method: 'POST',
    body: form2
  })
  let html2 = await res2.text()
  let $2 = cheerio.load(html2)
  let src = $2('div#output > p.outfile > img').attr('src')
  if (!src) throw new Error('Failed to convert webp to png')
  return new URL(src, res2.url).toString()
}

module.exports = { webp2mp4, webp2png }
