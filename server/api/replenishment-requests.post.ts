import { prisma } from '../utils/prisma'
import { normalizeApiError } from '../utils/apiError'

type LineInput = {
  productId?: string
  sku?: string
  name?: string
  cartQuantity?: number
  currentStock?: number
  minStockLevel?: number
  recommendedOrderQty?: number
}

type SanitizedLine = {
  productId: string
  sku: string
  name: string
  cartQuantity: number
  currentStock: number
  minStockLevel: number
  recommendedOrderQty: number
}

function sanitizeLine(raw: unknown, index: number): { ok: true; line: SanitizedLine } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: `Рядок ${index + 1}: некоректний об'єкт` }
  }
  const o = raw as LineInput
  const productId = typeof o.productId === 'string' ? o.productId.trim() : ''
  const sku = typeof o.sku === 'string' ? o.sku.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const cartQuantity = Number(o.cartQuantity)
  const currentStock = Number(o.currentStock)
  const minStockLevel = Number(o.minStockLevel)
  const recommendedOrderQty = Number(o.recommendedOrderQty)

  if (!productId || !sku || !name) {
    return { ok: false, error: `Рядок ${index + 1}: потрібні productId, sku та name` }
  }
  if (!Number.isFinite(cartQuantity) || cartQuantity < 1) {
    return { ok: false, error: `Рядок ${index + 1}: cartQuantity має бути ≥ 1` }
  }
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    return { ok: false, error: `Рядок ${index + 1}: некоректний currentStock` }
  }
  if (!Number.isFinite(minStockLevel) || minStockLevel < 0) {
    return { ok: false, error: `Рядок ${index + 1}: некоректний minStockLevel` }
  }
  if (!Number.isFinite(recommendedOrderQty) || recommendedOrderQty < 0) {
    return { ok: false, error: `Рядок ${index + 1}: некоректний recommendedOrderQty` }
  }

  return {
    ok: true,
    line: {
      productId,
      sku,
      name,
      cartQuantity: Math.floor(cartQuantity),
      currentStock: Math.floor(currentStock),
      minStockLevel: Math.floor(minStockLevel),
      recommendedOrderQty: Math.floor(recommendedOrderQty),
    },
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event).catch(() => null)) as { lines?: unknown } | null
    const rawLines = body?.lines
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Передайте непустий список позицій',
      })
    }
    if (rawLines.length > 50) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Занадто багато позицій у запиті (макс. 50)',
      })
    }

    const lines: SanitizedLine[] = []
    for (let i = 0; i < rawLines.length; i += 1) {
      const parsed = sanitizeLine(rawLines[i], i)
      if (!parsed.ok) {
        throw createError({ statusCode: 400, statusMessage: parsed.error })
      }
      lines.push(parsed.line)
    }

    const user = event.context.user
    const userId = user?.userId ?? null

    const ids = [...new Set(lines.map((l) => l.productId))]
    const existing = await prisma.component.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })
    if (existing.length !== ids.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Деякі товари зі списку не знайдені в каталозі',
      })
    }

    const row = await prisma.replenishmentRequest.create({
      data: {
        userId,
        lines,
      },
      select: { id: true },
    })

    return { ok: true as const, id: row.id }
  } catch (error: unknown) {
    normalizeApiError(error, 'Не вдалося зберегти запит на поповнення')
  }
})
