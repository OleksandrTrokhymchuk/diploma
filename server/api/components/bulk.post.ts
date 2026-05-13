import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/requireAdmin'
import type { ComponentCategory } from '@prisma/client'
import { normalizeApiError } from '../../utils/apiError'

type ProductInput = {
  sku?: string
  name?: string
  category?: ComponentCategory
  manufacturer?: string
  model?: string
  description?: string
  imageUrl?: string | null
  unitPrice?: number
  minStockLevel?: number
  initialStock?: number
}

type NormalizedProduct = {
  sku: string
  name: string
  category: ComponentCategory
  manufacturer: string
  model: string
  description: string
  imageUrl: string | null
  unitPrice: number
  minStockLevel: number
  initialStock: number
}

const CATEGORY_SET = new Set<ComponentCategory>([
  'DISTANCE_SENSOR',
  'CAMERA',
  'SERVO_DRIVE',
  'MANIPULATOR',
])

function sanitizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidImageUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const body = await readBody<{ products?: ProductInput[] }>(event)
    const products = Array.isArray(body.products) ? body.products : []

    if (products.length < 1 || products.length > 10) {
      throw createError({ statusCode: 400, statusMessage: 'Масове додавання підтримує від 1 до 10 товарів' })
    }

    const rowErrors: Array<{ row: number; field: string; message: string }> = []

    const normalized: NormalizedProduct[] = products.map((item, index) => {
      const sku = sanitizeText(item.sku)
      const name = sanitizeText(item.name)
      const manufacturer = sanitizeText(item.manufacturer)
      const model = sanitizeText(item.model)
      const description = sanitizeText(item.description)
      const imageUrl = sanitizeText(item.imageUrl)
      const unitPrice = Number.parseFloat(String(item.unitPrice ?? ''))
      const minStockLevel = Number.parseInt(String(item.minStockLevel ?? ''), 10)
      const initialStock = Number.parseInt(String(item.initialStock ?? ''), 10)

      if (!sku || !name || !manufacturer || !model || !description) {
        rowErrors.push({ row: index, field: 'common', message: `Рядок ${index + 1}: заповніть усі обов'язкові поля` })
      }
      const validatedCategory = item.category && CATEGORY_SET.has(item.category) ? item.category : null
      if (!validatedCategory) {
        rowErrors.push({ row: index, field: 'category', message: `Рядок ${index + 1}: невірна категорія` })
      }
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        rowErrors.push({ row: index, field: 'unitPrice', message: `Рядок ${index + 1}: ціна має бути більшою за 0` })
      }
      if (!Number.isInteger(minStockLevel) || minStockLevel < 0) {
        rowErrors.push({ row: index, field: 'minStockLevel', message: `Рядок ${index + 1}: мінімальний залишок має бути цілим числом ≥ 0` })
      }
      if (!Number.isInteger(initialStock) || initialStock < 0) {
        rowErrors.push({ row: index, field: 'initialStock', message: `Рядок ${index + 1}: початковий залишок має бути цілим числом ≥ 0` })
      }
      if (imageUrl && !isValidImageUrl(imageUrl)) {
        rowErrors.push({ row: index, field: 'imageUrl', message: `Рядок ${index + 1}: посилання на зображення має бути коректною адресою` })
      }

      return {
        sku,
        name,
        category: (validatedCategory ?? 'DISTANCE_SENSOR') as ComponentCategory,
        manufacturer,
        model,
        description,
        imageUrl: imageUrl || null,
        unitPrice,
        minStockLevel,
        initialStock,
      }
    })

    if (rowErrors.length) {
      throw createError({
        statusCode: 400,
        statusMessage: rowErrors[0]!.message,
        data: { rowErrors },
      })
    }

    const duplicateSkuInPayload = Array.from(
      normalized.reduce((acc, item) => {
        const key = item.sku.toUpperCase()
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map<string, number>()),
    )
      .filter(([, count]) => count > 1)
      .map(([sku]) => sku)

    if (duplicateSkuInPayload.length) {
      throw createError({
        statusCode: 400,
        statusMessage: `Дублікати артикулів у запиті: ${duplicateSkuInPayload.join(', ')}`,
        data: { duplicateSkus: duplicateSkuInPayload },
      })
    }

    const existingSkuRows = await prisma.component.findMany({
      where: { sku: { in: normalized.map((x) => x.sku) } },
      select: { sku: true },
    })
    const duplicateSkus = existingSkuRows.map((x) => x.sku)
    if (duplicateSkus.length) {
      throw createError({
        statusCode: 400,
        statusMessage: `Артикули вже існують у базі: ${duplicateSkus.join(', ')}`,
        data: { duplicateSkus },
      })
    }

    const userId = event.context.user?.userId
    if (!userId) {
      throw createError({ statusCode: 401, statusMessage: 'Необхідна авторизація' })
    }

    const createdItems = await prisma.$transaction(async (tx) => {
      const created = []
      for (const item of normalized) {
        const component = await tx.component.create({
          data: {
            sku: item.sku,
            name: item.name,
            category: item.category,
            manufacturer: item.manufacturer,
            model: item.model,
            description: item.description,
            imageUrl: item.imageUrl,
            unitPrice: item.unitPrice.toFixed(2),
            minStockLevel: item.minStockLevel,
            quantityOnHand: item.initialStock,
          },
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            manufacturer: true,
            model: true,
            unitPrice: true,
            quantityOnHand: true,
          },
        })
        created.push(component)

        if (item.initialStock > 0) {
          await tx.stockHistory.create({
            data: {
              componentId: component.id,
              userId,
              changeAmount: item.initialStock,
              balanceAfter: item.initialStock,
              reason: 'REPLENISHMENT',
              reasonNote: 'Початковий залишок при масовому додаванні',
            },
          })
        }
      }
      return created
    })

    return { items: createdItems }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося виконати масове додавання товарів')
  }
})
