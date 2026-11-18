import zlib from 'node:zlib'
import fs from 'node:fs'

function crc(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c ^= byte
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const sum = Buffer.alloc(4)
  sum.writeUInt32BE(crc(body))
  return Buffer.concat([length, body, sum])
}

function png(size) {
  const art = [
    '................',
    '......gggg......',
    '.....g....g.....',
    '.....g....g.....',
    '......g..g......',
    '.......gg.......',
    '.......gg.......',
    '......gggg......',
    '.....gggggg.....',
    '................',
    '......yyyy......',
    '.....yyyyyy.....',
    '................',
    '................',
    '................',
    '................',
  ]
  const raw = []
  const scale = size / 16
  for (let y = 0; y < size; y += 1) {
    raw.push(0)
    for (let x = 0; x < size; x += 1) {
      const cell = art[Math.floor(y / scale)][Math.floor(x / scale)]
      if (cell === 'g') raw.push(255, 215, 0)
      else if (cell === 'y') raw.push(16, 185, 129)
      else raw.push(10, 10, 26)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

fs.mkdirSync('public', { recursive: true })
fs.writeFileSync('public/icon-192.png', png(192))
fs.writeFileSync('public/icon-512.png', png(512))
