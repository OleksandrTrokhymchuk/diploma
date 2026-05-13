import 'dotenv/config'
import { prisma } from '../server/utils/prisma'

const map = {
  MANIPULATOR: '/catalog/photos/manipulator.webp',
  CAMERA: '/catalog/photos/camera.webp',
  SERVO_DRIVE: '/catalog/photos/servo-drive.webp',
  DISTANCE_SENSOR: '/catalog/photos/distance-sensor.webp',
} as const

async function main() {
  for (const [category, imageUrl] of Object.entries(map)) {
    const result = await prisma.component.updateMany({
      where: { category: category as keyof typeof map },
      data: { imageUrl },
    })
    console.info(`${category}: оновлено ${result.count} позицій → ${imageUrl}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
