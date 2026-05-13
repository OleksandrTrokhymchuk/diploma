import { Prisma } from '../../../app/generated/prisma/client'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/requireAdmin'
import { normalizeApiError } from '../../utils/apiError'
import { resolveCatalogImageUrl } from '../../../shared/lib/catalogImageUrl'

type Body = {
  name?: string
  description?: string
  unitPrice?: number
  specs?: Record<string, string> | null
}

function normalizeSpecs(raw: unknown): Record<string, string> | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Некоректний формат specs' })
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const label = key.trim()
    if (!label) continue
    if (typeof value !== 'string' || !value.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: `Характеристика «${label}» має непусте текстове значення`,
      })
    }
    out[label] = value.trim()
  }
  return Object.keys(out).length ? out : null
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id товару' })
    }

    const body = await readBody<Body>(event)
    const data: {
      name?: string
      description?: string
      unitPrice?: Prisma.Decimal
      specs?: Prisma.InputJsonValue | typeof Prisma.DbNull
    } = {}

    if (body.name !== undefined) {
      const name = body.name.trim()
      if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'Назва не може бути порожньою' })
      }
      data.name = name
    }

    if (body.description !== undefined) {
      const description = body.description.trim()
      if (!description) {
        throw createError({ statusCode: 400, statusMessage: 'Опис не може бути порожнім' })
      }
      data.description = description
    }

    if (body.unitPrice !== undefined) {
      const unitPrice = Number(body.unitPrice)
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw createError({ statusCode: 400, statusMessage: 'Ціна має бути додатним числом' })
      }
      data.unitPrice = new Prisma.Decimal(unitPrice.toFixed(2))
    }

    const specs = normalizeSpecs(body.specs)
    if (specs !== undefined) {
      data.specs = specs === null ? Prisma.DbNull : specs
    }

    if (!Object.keys(data).length) {
      throw createError({ statusCode: 400, statusMessage: 'Немає полів для оновлення' })
    }

    const updated = await prisma.component.update({
      where: { id },
      data,
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        description: true,
        specs: true,
        imageUrl: true,
        unitPrice: true,
        minStockLevel: true,
        quantityOnHand: true,
      },
    })

    const specsOut: Record<string, string> | null = updated.specs && typeof updated.specs === 'object' && !Array.isArray(updated.specs)
      ? Object.fromEntries(
        Object.entries(updated.specs as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string')
          .map(([k, v]) => [k, v as string]),
      )
      : null

    return {
      id: updated.id,
      sku: updated.sku,
      name: updated.name,
      category: updated.category,
      description: updated.description,
      specs: specsOut && Object.keys(specsOut).length ? specsOut : null,
      imageUrl: resolveCatalogImageUrl(updated.imageUrl, updated.sku, updated.category),
      unitPrice: Number(updated.unitPrice),
      minStockLevel: updated.minStockLevel,
      currentStock: updated.quantityOnHand,
    }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося оновити товар')
  }
})
