import { prisma } from '../../utils/prisma'
import { normalizeApiError } from '../../utils/apiError'

export default defineEventHandler(async () => {
  try {
    const [totals, allItems] = await Promise.all([
      prisma.component.aggregate({
        _count: { id: true },
        _sum: { quantityOnHand: true },
      }),
      prisma.component.findMany({
        select: { quantityOnHand: true, minStockLevel: true, unitPrice: true },
      }),
    ])

    const deficitCount = allItems.filter((item) => item.quantityOnHand < item.minStockLevel).length
    const totalValue = allItems.reduce((acc, item) => acc + Number(item.unitPrice) * item.quantityOnHand, 0)

    return {
      totalItems: totals._count.id ?? 0,
      deficitItems: deficitCount,
      totalStockUnits: totals._sum.quantityOnHand ?? 0,
      totalStockValue: Number(totalValue.toFixed(2)),
    }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати глобальну статистику складу')
  }
})
