import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcrypt'
import { PrismaClient, type ComponentCategory, type StockReason } from '@prisma/client'

/** Локальні фото категорій (оптимізовані WebP у public/catalog/photos/). */
const CATALOG_IMAGES = {
  kukaManipulator: '/catalog/photos/manipulator.webp',
  camera: '/catalog/photos/camera.webp',
  distanceSensor: '/catalog/photos/distance-sensor.webp',
  servoDrive: '/catalog/photos/servo-drive.webp',
} as const

const SPECS = {
  hcSr04: {
    'Діапазон вимірювання': '2 см – 4 м (типово, залежить від умов)',
    'Напруга живлення': '5 В DC',
    'Споживання струму': '15 мА (активний режим)',
    'Кут огляду': '≈ 15°',
    'Інтерфейс': 'Trigger / Echo (TTL)',
    'Робоча температура': '−15…+70 °C',
  },
  vl53: {
    'Технологія': 'ToF (940 нм VCSEL)',
    'Дальність': 'до 2 м (типово, залежить від цілі та освітлення)',
    'Точність': '±3 % (орієнтовно в діапазоні до 1 м)',
    'Напруга живлення': '2.8 В DC',
    'Інтерфейс': 'I²C (до 400 кГц)',
    'Розмір (орієнтовно)': '12.4 × 2.4 мм (модуль)',
  },
  lidar: {
    'Тип': '2D лазерний сканер (обертання)',
    'Дальність': 'до 18 м (залежно від поверхні та освітлення)',
    'Частота сканування': '5–10 Гц (залежно від моделі серії A2)',
    'Живлення': '5 В DC (USB / окремий адаптер)',
    'Інтерфейс': 'UART / USB (залежить від комплектації)',
    'Маса': '≈ 300 г (без кабелю)',
  },
  camUsb: {
    'Роздільність': 'до 1920×1080 @ 30 fps',
    'Об\'єктив': 'Фіксований, автофокус',
    'Інтерфейс': 'USB 2.0',
    'Кут огляду': 'діагональ ≈ 78°',
    'Живлення': 'через USB',
    'Кріплення': '1/4" гайка (типово для штативів)',
  },
  camRgbd: {
    'Сенсори': 'Stereo depth + RGB',
    'Дальність глибини': '0.3–10 м (залежить від сцени)',
    'Роздільність RGB': 'до 1920×1080',
    'Інтерфейс': 'USB 3.1 Gen1',
    'IMU': '6-осьовий (акселерометр + гіроскоп)',
    'Живлення': 'через USB-C (типово)',
  },
  camIndustrial: {
    'Сенсор': 'CMOS global shutter (промисловий клас)',
    'Інтерфейс': 'USB3 Vision / GigE Vision (залежить від підтипу)',
    'Роздільність': 'до 5 MP (залежить від конфігурації Blackfly S)',
    'Частота кадрів': 'до сотень fps (залежить від ROI та інтерфейсу)',
    'Живлення': 'PoE / зовнішнє 12–24 В DC (залежить від модифікації)',
    'Монтаж': 'C-mount / CS-mount',
  },
  fanucServo: {
    'Живлення шини': '200–240 В AC (±10 %)',
    'Номінальна потужність': '1.5–5.5 кВ·А (залежить від типорозміру alpha i / beta i)',
    'Інтерфейс керування': 'FANUC digital servo bus',
    'Маса': '≈ 6.2 кг',
    'Охолодження': 'Примусове повітряне (вбудований вентилятор)',
    'Монтаж': 'Шафовий (IP20), орієнтація за інструкцією OEM',
  },
  kukaKr6: {
    'Кінематика': '6 осей (вертикально-жолобкова)',
    'Номінальне навантаження': '6 кг',
    'Досяжність': 'до ≈ 901 мм (KR 6 R900 — орієнтовно)',
    'Повторюваність': '±0,03 мм (типово для серії)',
    'Маса робота': '≈ 52 кг',
    'Живлення': '3×400 В AC + PE (через шафу керування KRC)',
  },
  kukaKr10: {
    'Кінематика': '6 осей',
    'Номінальне навантаження': '10 кг',
    'Досяжність': 'до ≈ 1101 мм (KR 10 R1100 — орієнтовно)',
    'Повторюваність': '±0,03 мм (типово для серії)',
    'Маса робота': '≈ 64 кг',
    'Живлення': '3×400 В AC + PE',
  },
  kukaKr16: {
    'Кінематика': '6 осей (подовжена L-кінематика)',
    'Номінальне навантаження': '16 кг',
    'Досяжність': 'до ≈ 1613 мм (KR 16 L6-2 — орієнтовно)',
    'Повторюваність': '±0,05 мм (залежить від навантаження/режиму)',
    'Маса робота': '≈ 238 кг',
    'Живлення': '3×400 В AC + PE',
  },
} as const

type HistoryInput = {
  dayOffset: number
  changeAmount: number
  reason: StockReason
  reasonNote: string
}

type ComponentSeed = {
  sku: string
  name: string
  category: ComponentCategory
  manufacturer: string
  model: string
  description: string
  imageUrl?: string
  specs?: Record<string, string>
  unitPrice: string
  minStockLevel: number
  history: HistoryInput[]
}

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Add it to .env before running seed.')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const now = new Date()
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

const components: ComponentSeed[] = [
  {
    sku: 'SENS-HCSR04-001',
    name: 'Ультразвуковий датчик відстані',
    category: 'DISTANCE_SENSOR',
    manufacturer: 'Elecfreaks',
    model: 'HC-SR04',
    description: 'Бюджетний датчик для мобільних платформ та навчальних стендів.',
    imageUrl: CATALOG_IMAGES.distanceSensor,
    specs: { ...SPECS.hcSr04 },
    unitPrice: '3.90',
    minStockLevel: 20,
    history: [
      { dayOffset: 70, changeAmount: 120, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: стартова партія' },
      { dayOffset: 61, changeAmount: -18, reason: 'ORDER', reasonNote: 'Замовлення: лабораторний стенд №1' },
      { dayOffset: 44, changeAmount: -22, reason: 'ORDER', reasonNote: 'Замовлення: курсова група МЕ-31' },
      { dayOffset: 25, changeAmount: 60, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: планова закупівля' },
      { dayOffset: 8, changeAmount: -6, reason: 'WRITE_OFF', reasonNote: 'Списання: механічні пошкодження' },
    ],
  },
  {
    sku: 'SENS-VL53L0X-002',
    name: 'ToF датчик дистанції',
    category: 'DISTANCE_SENSOR',
    manufacturer: 'STMicroelectronics',
    model: 'VL53L0X',
    description: 'Лазерний ToF модуль для точної ближньої навігації.',
    imageUrl: CATALOG_IMAGES.distanceSensor,
    specs: { ...SPECS.vl53 },
    unitPrice: '10.50',
    minStockLevel: 10,
    history: [
      { dayOffset: 64, changeAmount: 70, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: квартальна закупівля' },
      { dayOffset: 51, changeAmount: -15, reason: 'ORDER', reasonNote: 'Замовлення: модуль AGV' },
      { dayOffset: 37, changeAmount: -8, reason: 'WRITE_OFF', reasonNote: 'Списання: брак пайки' },
      { dayOffset: 19, changeAmount: 35, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: добір під проєкт' },
      { dayOffset: 6, changeAmount: -12, reason: 'ORDER', reasonNote: 'Замовлення: тестовий полігон' },
    ],
  },
  {
    sku: 'SENS-LIDAR-A2-003',
    name: 'Лідар 2D для навігації',
    category: 'DISTANCE_SENSOR',
    manufacturer: 'Slamtec',
    model: 'RPLIDAR A2',
    description: 'Лідар для SLAM та побудови карти в приміщенні.',
    imageUrl: CATALOG_IMAGES.distanceSensor,
    specs: { ...SPECS.lidar },
    unitPrice: '189.00',
    minStockLevel: 4,
    history: [
      { dayOffset: 90, changeAmount: 16, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: базова поставка' },
      { dayOffset: 72, changeAmount: -3, reason: 'ORDER', reasonNote: 'Замовлення: прототип AMR' },
      { dayOffset: 50, changeAmount: -2, reason: 'WRITE_OFF', reasonNote: 'Списання: пошкодження під час калібрування' },
      { dayOffset: 29, changeAmount: 6, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: додаткова партія' },
      { dayOffset: 11, changeAmount: -4, reason: 'ORDER', reasonNote: 'Замовлення: дослідницька лабораторія' },
    ],
  },
  {
    sku: 'CAM-LOGI-C920-004',
    name: 'USB камера Full HD',
    category: 'CAMERA',
    manufacturer: 'Logitech',
    model: 'C920',
    description: 'Камера компютерного зору для захоплення потокового відео.',
    imageUrl: CATALOG_IMAGES.camera,
    specs: { ...SPECS.camUsb },
    unitPrice: '69.00',
    minStockLevel: 6,
    history: [
      { dayOffset: 75, changeAmount: 26, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: поставка від дистрибютора' },
      { dayOffset: 62, changeAmount: -5, reason: 'ORDER', reasonNote: 'Замовлення: лінія візуального контролю' },
      { dayOffset: 46, changeAmount: -3, reason: 'WRITE_OFF', reasonNote: 'Списання: дефект автофокусу' },
      { dayOffset: 31, changeAmount: 10, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: контрактний проєкт' },
      { dayOffset: 9, changeAmount: -7, reason: 'ORDER', reasonNote: 'Замовлення: вузол компютерного зору' },
    ],
  },
  {
    sku: 'CAM-INTEL-D435I-005',
    name: 'RGB-D камера глибини',
    category: 'CAMERA',
    manufacturer: 'Intel',
    model: 'RealSense D435i',
    description: 'Камера глибини з IMU для маніпуляції та 3D-сприйняття.',
    imageUrl: CATALOG_IMAGES.camera,
    specs: { ...SPECS.camRgbd },
    unitPrice: '329.00',
    minStockLevel: 3,
    history: [
      { dayOffset: 84, changeAmount: 12, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: стартове постачання' },
      { dayOffset: 58, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: станція бін-пікінгу' },
      { dayOffset: 41, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: некоректна робота IMU' },
      { dayOffset: 23, changeAmount: 5, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: добір до RnD' },
      { dayOffset: 7, changeAmount: -3, reason: 'ORDER', reasonNote: 'Замовлення: клітинка сортування' },
    ],
  },
  {
    sku: 'CAM-BFLY-S-U3-006',
    name: 'Промислова камера GigE',
    category: 'CAMERA',
    manufacturer: 'FLIR',
    model: 'Blackfly S',
    description: 'Промислова камера високої частоти кадрів для QA-систем.',
    imageUrl: CATALOG_IMAGES.camera,
    specs: { ...SPECS.camIndustrial },
    unitPrice: '510.00',
    minStockLevel: 2,
    history: [
      { dayOffset: 88, changeAmount: 8, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: імпортна поставка' },
      { dayOffset: 63, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: візуальна інспекція' },
      { dayOffset: 47, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: несправний інтерфейс' },
      { dayOffset: 28, changeAmount: 4, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: додаткова партія' },
      { dayOffset: 13, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: лабораторія машинного зору' },
    ],
  },
  {
    sku: 'DRV-FANUC-A06B-007',
    name: 'Сервопривід FANUC alpha iSV 20',
    category: 'SERVO_DRIVE',
    manufacturer: 'FANUC',
    model: 'A06B-6096-H205',
    description: 'Сервопідсилювач для осей промислових роботів FANUC.',
    imageUrl: CATALOG_IMAGES.servoDrive,
    specs: { ...SPECS.fanucServo },
    unitPrice: '1480.00',
    minStockLevel: 2,
    history: [
      { dayOffset: 93, changeAmount: 10, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: сервісний склад' },
      { dayOffset: 71, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: модернізація лінії' },
      { dayOffset: 53, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: перегрів силового модуля' },
      { dayOffset: 34, changeAmount: 5, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: страхова партія' },
      { dayOffset: 12, changeAmount: -3, reason: 'ORDER', reasonNote: 'Замовлення: резерв під ТО' },
    ],
  },
  {
    sku: 'DRV-FANUC-BETAI-008',
    name: 'Сервопривід FANUC beta iSV 40',
    category: 'SERVO_DRIVE',
    manufacturer: 'FANUC',
    model: 'A06B-6114-H209',
    description: 'Потужний привід для важких осей та позиціонерів.',
    imageUrl: CATALOG_IMAGES.servoDrive,
    specs: { ...SPECS.fanucServo },
    unitPrice: '1960.00',
    minStockLevel: 1,
    history: [
      { dayOffset: 96, changeAmount: 7, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: імпортна поставка' },
      { dayOffset: 76, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: клієнт OEM' },
      { dayOffset: 57, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: збій силової плати' },
      { dayOffset: 35, changeAmount: 3, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: термінове замовлення' },
      { dayOffset: 16, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: сервісний центр' },
    ],
  },
  {
    sku: 'DRV-FANUC-ALPHAI-009',
    name: 'Сервопривід FANUC alpha iSV 80',
    category: 'SERVO_DRIVE',
    manufacturer: 'FANUC',
    model: 'A06B-6117-H211',
    description: 'Високопотужний сервопривід для осей великої інерції.',
    imageUrl: CATALOG_IMAGES.servoDrive,
    specs: { ...SPECS.fanucServo },
    unitPrice: '2780.00',
    minStockLevel: 1,
    history: [
      { dayOffset: 98, changeAmount: 6, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: довгостроковий контракт' },
      { dayOffset: 80, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: проєкт зварювання' },
      { dayOffset: 60, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: аварійне відключення' },
      { dayOffset: 33, changeAmount: 2, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: сервісний запас' },
      { dayOffset: 14, changeAmount: -2, reason: 'ORDER', reasonNote: 'Замовлення: нова роботизована клітинка' },
    ],
  },
  {
    sku: 'ARM-KUKA-KR6R900-010',
    name: 'Маніпулятор KUKA KR 6 R900',
    category: 'MANIPULATOR',
    manufacturer: 'KUKA',
    model: 'KR 6 R900 sixx',
    description: '6-осьовий маніпулятор для високоточної збірки.',
    imageUrl: CATALOG_IMAGES.kukaManipulator,
    specs: { ...SPECS.kukaKr6 },
    unitPrice: '23900.00',
    minStockLevel: 1,
    history: [
      { dayOffset: 110, changeAmount: 4, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: контрактна партія' },
      { dayOffset: 87, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: автомобільний стенд' },
      { dayOffset: 65, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: пошкодження при транспортуванні' },
      { dayOffset: 40, changeAmount: 2, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: компенсація постачальника' },
      { dayOffset: 18, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: навчальна лабораторія' },
    ],
  },
  {
    sku: 'ARM-KUKA-KR10R1100-011',
    name: 'Маніпулятор KUKA KR 10 R1100',
    category: 'MANIPULATOR',
    manufacturer: 'KUKA',
    model: 'KR 10 R1100',
    description: 'Універсальний 6-осьовий маніпулятор для пакування.',
    imageUrl: CATALOG_IMAGES.kukaManipulator,
    specs: { ...SPECS.kukaKr10 },
    unitPrice: '27400.00',
    minStockLevel: 1,
    history: [
      { dayOffset: 104, changeAmount: 5, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: річний тендер' },
      { dayOffset: 82, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: харчова лінія' },
      { dayOffset: 59, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: дефект редуктора' },
      { dayOffset: 36, changeAmount: 2, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: заміна гарантійного вузла' },
      { dayOffset: 10, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: проєкт палетизації' },
    ],
  },
  {
    sku: 'ARM-KUKA-KR16L6-012',
    name: 'Маніпулятор KUKA KR 16 L6',
    category: 'MANIPULATOR',
    manufacturer: 'KUKA',
    model: 'KR 16 L6-2',
    description: 'Подовжена кінематика для обслуговування конвеєрів.',
    imageUrl: CATALOG_IMAGES.kukaManipulator,
    specs: { ...SPECS.kukaKr16 },
    unitPrice: '31200.00',
    minStockLevel: 1,
    history: [
      { dayOffset: 108, changeAmount: 4, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: виробнича квота' },
      { dayOffset: 86, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: фарбувальна дільниця' },
      { dayOffset: 67, changeAmount: -1, reason: 'WRITE_OFF', reasonNote: 'Списання: критичний люфт осі' },
      { dayOffset: 43, changeAmount: 2, reason: 'REPLENISHMENT', reasonNote: 'Поповнення: резервний склад' },
      { dayOffset: 15, changeAmount: -1, reason: 'ORDER', reasonNote: 'Замовлення: лінія зварювання' },
    ],
  },
]

async function main() {
  const adminPassword = 'Admin123!'
  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.local' },
    update: {
      passwordHash,
      firstName: 'Адмін',
      lastName: 'Тестовий',
      role: 'ADMIN',
    },
    create: {
      email: 'admin@example.local',
      passwordHash,
      firstName: 'Адмін',
      lastName: 'Тестовий',
      role: 'ADMIN',
    },
    select: { id: true, email: true },
  })

  await prisma.stockHistory.deleteMany()
  await prisma.component.deleteMany()

  let totalHistoryRows = 0

  for (const item of components) {
    const created = await prisma.component.create({
      data: {
        sku: item.sku,
        name: item.name,
        category: item.category,
        manufacturer: item.manufacturer,
        model: item.model,
        description: item.description,
        specs: item.specs ?? undefined,
        imageUrl: item.imageUrl ?? null,
        unitPrice: item.unitPrice,
        minStockLevel: item.minStockLevel,
      },
      select: { id: true },
    })

    let balance = 0
    for (const h of item.history) {
      balance += h.changeAmount
      await prisma.stockHistory.create({
        data: {
          componentId: created.id,
          userId: admin.id,
          changeAmount: h.changeAmount,
          balanceAfter: balance,
          reason: h.reason,
          reasonNote: h.reasonNote,
          createdAt: daysAgo(h.dayOffset),
        },
      })
      totalHistoryRows += 1
    }

    await prisma.component.update({
      where: { id: created.id },
      data: { quantityOnHand: balance },
    })
  }

  console.info(`Seed complete: ${components.length} components, ${totalHistoryRows} stock history rows.`)
  console.info(`Тестовий адмін: ${admin.email} / пароль: ${adminPassword}`)
}

main()
  .catch(async (error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
