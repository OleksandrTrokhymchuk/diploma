/**
 * Завантажує фото категорій з Wikimedia Commons і зберігає оптимізовані WebP у public/catalog/photos/.
 * Запуск: node scripts/fetch-catalog-photos.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../public/catalog/photos')

/** Джерела (CC / вільні на Commons). */
const SOURCES = {
  manipulator: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/KUKA_Industrial_Robots_IR.jpg',
  camera: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Industrial_Line_Scan_Camera.jpg',
  'distance-sensor': 'https://upload.wikimedia.org/wikipedia/commons/9/99/SparkFun_HC-SR04_Ultrasonic-Sensor_13959-01a.jpg',
  'servo-drive': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Yeskawa_Servo_Drive_%26_Motor.jpg',
}

const UA = 'RoboSklad/1.0 (catalog seed; educational project)'

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function optimize(name, buffer) {
  const webp = await sharp(buffer)
    .rotate()
    .resize(640, 360, { fit: 'cover', position: 'centre' })
    .webp({ quality: 78, effort: 4 })
    .toBuffer()

  const jpg = await sharp(buffer)
    .rotate()
    .resize(640, 360, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  await writeFile(path.join(OUT_DIR, `${name}.webp`), webp)
  await writeFile(path.join(OUT_DIR, `${name}.jpg`), jpg)
  return { webp: webp.length, jpg: jpg.length }
}

await mkdir(OUT_DIR, { recursive: true })

for (const [name, url] of Object.entries(SOURCES)) {
  process.stdout.write(`→ ${name}… `)
  await sleep(2500)
  const raw = await download(url)
  const sizes = await optimize(name, raw)
  console.log(`webp ${(sizes.webp / 1024).toFixed(1)} KiB, jpg ${(sizes.jpg / 1024).toFixed(1)} KiB`)
}

console.log('Готово:', OUT_DIR)
