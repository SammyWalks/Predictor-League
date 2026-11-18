import fs from 'node:fs'
import zlib from 'node:zlib'
import path from 'node:path'

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

function encodePng(width, height, rgba) {
  const raw = []
  for (let y = 0; y < height; y += 1) {
    raw.push(0)
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      raw.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePng(file) {
  const buf = fs.readFileSync(file)
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat = []
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset)
    const type = buf.toString('ascii', offset + 4, offset + 8)
    const data = buf.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'IEND') break
    offset += 12 + length
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG ${bitDepth}/${colorType}`)
  }
  const channels = colorType === 6 ? 4 : 3
  const inflated = zlib.inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const rows = []
  let pos = 0
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[pos]
    pos += 1
    const row = Buffer.from(inflated.subarray(pos, pos + stride))
    pos += stride
    const prev = rows[y - 1]
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? row[i - channels] : 0
      const up = prev ? prev[i] : 0
      const upLeft = prev && i >= channels ? prev[i - channels] : 0
      if (filter === 1) row[i] = (row[i] + left) & 255
      else if (filter === 2) row[i] = (row[i] + up) & 255
      else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255
      else if (filter === 4) row[i] = (row[i] + paeth(left, up, upLeft)) & 255
    }
    rows.push(row)
  }
  const rgba = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = x * channels
      const dst = (y * width + x) * 4
      rgba[dst] = rows[y][src]
      rgba[dst + 1] = rows[y][src + 1]
      rgba[dst + 2] = rows[y][src + 2]
      rgba[dst + 3] = channels === 4 ? rows[y][src + 3] : 255
    }
  }
  return { width, height, rgba }
}

function nearWhite(r, g, b) {
  return r > 245 && g > 245 && b > 245
}

function cropTransparent(width, height, rgba) {
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      if (rgba[i + 3] === 0) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const outW = maxX - minX + 1
  const outH = maxY - minY + 1
  const out = Buffer.alloc(outW * outH * 4)
  for (let y = 0; y < outH; y += 1) {
    for (let x = 0; x < outW; x += 1) {
      const src = ((y + minY) * width + (x + minX)) * 4
      const dst = (y * outW + x) * 4
      out[dst] = rgba[src]
      out[dst + 1] = rgba[src + 1]
      out[dst + 2] = rgba[src + 2]
      out[dst + 3] = rgba[src + 3]
    }
  }
  return { width: outW, height: outH, rgba: out }
}

function iconFromBall(src, size) {
  const out = Buffer.alloc(size * size * 4, 0)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 10
    out[i + 1] = 10
    out[i + 2] = 26
    out[i + 3] = 255
  }
  const draw = Math.round(size * 0.8)
  const origin = Math.floor((size - draw) / 2)
  for (let y = 0; y < draw; y += 1) {
    const sy = Math.min(src.height - 1, Math.floor(y * src.height / draw))
    for (let x = 0; x < draw; x += 1) {
      const sx = Math.min(src.width - 1, Math.floor(x * src.width / draw))
      const from = (sy * src.width + sx) * 4
      if (src.rgba[from + 3] === 0) continue
      const to = ((origin + y) * size + origin + x) * 4
      out[to] = src.rgba[from]
      out[to + 1] = src.rgba[from + 1]
      out[to + 2] = src.rgba[from + 2]
      out[to + 3] = 255
    }
  }
  return out
}

const source = process.argv[2]
const decoded = decodePng(source)
let whites = 0
for (let i = 0; i < decoded.rgba.length; i += 4) {
  if (nearWhite(decoded.rgba[i], decoded.rgba[i + 1], decoded.rgba[i + 2])) {
    decoded.rgba[i + 3] = 0
    whites += 1
  }
}
const cropped = cropTransparent(decoded.width, decoded.height, decoded.rgba)
const outDir = path.resolve('public/img')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'ball.png'), encodePng(cropped.width, cropped.height, cropped.rgba))
for (const size of [32, 192, 512]) {
  const scaled = iconFromBall(cropped, size)
  const name = size === 32 ? 'favicon-32.png' : `icon-${size}.png`
  fs.writeFileSync(path.join('public', name), encodePng(size, size, scaled))
}
const sample = (img, x, y) => {
  const i = (y * img.width + x) * 4
  return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2], img.rgba[i + 3]]
}
console.log(JSON.stringify({
  decoded: { width: decoded.width, height: decoded.height },
  whites,
  cropped: { width: cropped.width, height: cropped.height },
  center: sample(cropped, Math.floor(cropped.width / 2), Math.floor(cropped.height / 2)),
  corner: sample(decoded, 10, 10),
}))
