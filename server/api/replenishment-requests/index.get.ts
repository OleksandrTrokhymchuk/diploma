import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/requireAdmin'
import { normalizeApiError } from '../../utils/apiError'

type StoredLine = {
  productId?: string
  sku?: string
  name?: string
  cartQuantity?: number
  currentStock?: number
  minStockLevel?: number
  recommendedOrderQty?: number
}

function normalizeLines(raw: unknown): StoredLine[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item) => item && typeof item === 'object') as StoredLine[]
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const rows = await prisma.replenishmentRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        lines: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
      lines: normalizeLines(row.lines),
    }))
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати журнал запитів')
  }
})
