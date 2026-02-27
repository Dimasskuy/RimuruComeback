const cheerio = require('cheerio');
const fs = require('fs')
const path = require('path')
const cp = require('child_process')

const src = path.join(__dirname, '..', 'src')
let _svg = ''
try {
    _svg = fs.readFileSync(path.join(src, 'welcome.svg'), 'utf-8')
} catch (e) {
    // console.error('welcome.svg not found')
}

// Simple barcode placeholder (replaced jsbarcode + xmldom)
const barcode = data => {
    // Return a simple SVG rectangle as barcode placeholder
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
      <rect width="200" height="50" fill="#000"/>
    </svg>`;
}

const genSVG = async ({
    wid = '',
    pp = path.join(src, 'avatar_contact.png'),
    title = '',
    name = '',
    text = '',
    background = ''
} = {}) => {
    if (!_svg) return ''
    const $ = cheerio.load(_svg, { xmlMode: true })

    const barcodeData = toBase64(await toImg(barcode(wid.replace(/[^0-9]/g, '')), 'png'), 'image/png')

    $('#_1661899539392 > g:nth-child(6) > image').attr('xlink:href', barcodeData)
    $('#_1661899539392 > g:nth-child(3) > image').attr('xlink:href', pp)
    $('#_1661899539392 > text.fil1.fnt0').text(text)
    $('#_1661899539392 > text.fil2.fnt1').text(title)
    $('#_1661899539392 > text.fil2.fnt2').text(name)
    $('#_1661899539392 > g:nth-child(2) > image').attr('xlink:href', background)

    return $.xml()
}

const toImg = (svg, format = 'png') => new Promise((resolve, reject) => {
    if (!svg) return resolve(Buffer.alloc(0))
    let bufs = []
    let im = cp.spawn('magick', ['convert', 'svg:-', format + ':-'])
    im.on('error', e => reject(e))
    im.stdout.on('data', chunk => bufs.push(chunk))
    im.stdin.write(Buffer.from(svg))
    im.stdin.end()
    im.on('close', code => {
        if (code !== 0) reject(code)
        resolve(Buffer.concat(bufs))
    })
})

const toBase64 = (buffer, mime) => `data:${mime};base64,${buffer.toString('base64')}`

const render = async ({
    wid = '',
    pp = '',
    name = '',
    title = '',
    text = '',
    background = '',
} = {}, format = 'png') => {
    try {
        if (!pp) pp = toBase64(fs.readFileSync(path.join(src, 'avatar_contact.png')), 'image/png')
        if (!background) background = toBase64(fs.readFileSync(path.join(src, 'Aesthetic', 'Aesthetic_000.jpeg')), 'image/jpeg')

        let svg = await genSVG({
            wid, pp, name, text, background, title
        })
        return await toImg(svg, format)
    } catch (e) {
        return Buffer.alloc(0)
    }
}

module.exports = render
