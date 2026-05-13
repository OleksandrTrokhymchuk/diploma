import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/requireAdmin'
import { normalizeApiError } from '../../utils/apiError'
import { parsePage, parsePageSize } from '../../utils/queryParams'

function normalize(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const query = getQuery(event)
    const search = normalize(query.search)
    const page = parsePage(query.page)
    const pageSize = parsePageSize(query.pageSize, 20, 100)

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
            { model: { contains: search, mode: 'insensitive' as const } },
            { manufacturer: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined

    const [items, total] = await Promise.all([
      prisma.component.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          sku: true,
          name: true,
          minStockLevel: true,
          quantityOnHand: true,
          stockHistory: {
            orderBy: { createdAt: 'desc' },
            take: 7,
            select: { balanceAfter: true },
          },
        },
      }),
      prisma.component.count({ where }),
    ])

    return {
      items: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        currentStock: item.quantityOnHand,
        minStockLevel: item.minStockLevel,
        trendPoints: item.stockHistory.map((entry) => entry.balanceAfter).reverse(),
      })),
      total,
      page,
      pageSize,
    }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати дані інвентарю')
  }
})
