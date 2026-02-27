const { axiosBufferWithPolicy, fetchJsonWithPolicy } = require('./networkResilience')

const getBuffer = async (url, options = {}) => {
  try {
    return await axiosBufferWithPolicy(url, options)
  } catch (error) {
    console.log(`Error getBuffer: ${error.message}`)
  }
}

const wait = async (media) => {
  const attachmentData = `data:image/jpeg;base64,${media.toString('base64')}`

  const result = await fetchJsonWithPolicy('https://api.trace.moe/search', {
    method: 'POST',
    body: JSON.stringify({ image: attachmentData }),
    headers: { 'Content-Type': 'application/json' },
    key: 'trace-moe'
  })

  const bestMatch = result?.result?.[0]
  if (!bestMatch) throw new Error('Gambar tidak ditemukan!')

  const {
    anilist,
    filename,
    episode,
    similarity,
    video,
    from
  } = bestMatch

  const title = anilist?.title || {}
  const belief = similarity < 0.89 ? 'Saya memiliki keyakinan rendah dalam hal ini : ' : ''

  return {
    video: video ? await getBuffer(video, { key: 'trace-moe-media' }) : await getBuffer(`https://media.trace.moe/video/${anilist.id}/${encodeURIComponent(filename)}?t=${from}`),
    teks: `${belief}
~> Ecchi : *${anilist?.isAdult ? 'Iya' : 'Tidak'}*
~> Judul Jepang : *${title.native || '-'}*
~> Ejaan Judul : *${title.romaji || '-'}*
~> Judul Inggris : *${title.english || '-'}*
~> Episode : *${episode || '-'}*`
  }
}

const simih = async () => {
  // Endpoint Simsumi di Heroku tidak stabil/tidak valid; fitur dimatikan untuk mencegah runtime error.
  return 'Fitur Simi sedang dinonaktifkan karena endpoint pihak ketiga sudah tidak valid.'
}

module.exports = {
  wait,
  simih,
  getBuffer
}
