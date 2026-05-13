import type { StockReason } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { normalizeApiError } from '../../utils/apiError'
import { resolveCatalogImageUrl } from '../../../shared/lib/catalogImageUrl'

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

function normalizeSpecs(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v)
  }
  return Object.keys(out).length ? out : null
}

type HistoryRow = {
  createdAt: Date
  changeAmount: number
  balanceAfter: number
  reason: StockReason
  reasonNote: string | null
}

function buildStockTrend(
  quantityOnHand: number,
  inMonthAsc: HistoryRow[],
  since: Date,
  now: Date,
  priorBeforeMonth: HistoryRow | null,
): Array<{
  date: string
  balanceAfter: number
  reason: StockReason | 'BASELINE' | 'SNAPSHOT'
  reasonNote: string | null
}> {
  let openingBalance: number
  if (priorBeforeMonth) {
    openingBalance = priorBeforeMonth.balanceAfter
  } else if (inMonthAsc.length > 0) {
    openingBalance = inMonthAsc[0].balanceAfter - inMonthAsc[0].changeAmount
  } else {
    openingBalance = quantityOnHand
  }

  const points: Array<{
    date: string
    balanceAfter: number
    reason: StockReason | 'BASELINE' | 'SNAPSHOT'
    reasonNote: string | null
  }> = []

  points.push({
    date: since.toISOString(),
    balanceAfter: openingBalance,
    reason: 'BASELINE',
    reasonNote: 'Оціночний залишок на початок поточного місяця (UTC)',
  })

  for (const h of inMonthAsc) {
    points.push({
      date: h.createdAt.toISOString(),
      balanceAfter: h.balanceAfter,
      reason: h.reason,
      reasonNote: h.reasonNote,
    })
  }

  const last = points[points.length - 1]
  const lastTime = last ? new Date(last.date).getTime() : 0
  const shouldAppendNow =
    now.getTime() > lastTime + 30_000 || last?.balanceAfter !== quantityOnHand

  if (shouldAppendNow) {
    points.push({
      date: now.toISOString(),
      balanceAfter: quantityOnHand,
      reason: 'SNAPSHOT',
      reasonNote: 'Фактичний залишок у каталозі (зараз)',
    })
  }

  return points
}

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id товару' })
    }

    const since = startOfUtcMonth(new Date())
    const now = new Date()

    const item = await prisma.component.findUnique({
      where: { id },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        manufacturer: true,
        model: true,
        description: true,
        specs: true,
        imageUrl: true,
        unitPrice: true,
        minStockLevel: true,
        quantityOnHand: true,
        stockHistory: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            changeAmount: true,
            balanceAfter: true,
            reason: true,
            reasonNote: true,
            createdAt: true,
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!item) {
      throw createError({ statusCode: 404, statusMessage: 'Товар не знайдено' })
    }

    const priorBeforeMonth = await prisma.stockHistory.findFirst({
      where: { componentId: id, createdAt: { lt: since } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        changeAmount: true,
        balanceAfter: true,
        reason: true,
        reasonNote: true,
      },
    })

    const inMonthAsc = item.stockHistory.map((h) => ({
      createdAt: h.createdAt,
      changeAmount: h.changeAmount,
      balanceAfter: h.balanceAfter,
      reason: h.reason,
      reasonNote: h.reasonNote,
    }))

    const stockTrend = buildStockTrend(
      item.quantityOnHand,
      inMonthAsc,
      since,
      now,
      priorBeforeMonth,
    )

    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.model,
      description: item.description,
      specs: normalizeSpecs(item.specs),
      imageUrl: resolveCatalogImageUrl(item.imageUrl, item.sku, item.category),
      unitPrice: Number(item.unitPrice),
      minStockLevel: item.minStockLevel,
      currentStock: item.quantityOnHand,
      stockHistory: item.stockHistory.map((entry) => ({
        id: entry.id,
        changeAmount: entry.changeAmount,
        balanceAfter: entry.balanceAfter,
        reason: entry.reason,
        reasonNote: entry.reasonNote,
        createdAt: entry.createdAt.toISOString(),
        user: entry.user,
      })),
      stockTrend,
    }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати деталі товару')
  }
})
