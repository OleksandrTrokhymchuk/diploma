import { prisma } from '../utils/prisma'
import { normalizeApiError } from '../utils/apiError'

export default defineEventHandler(async () => {
  try {
    const components = await prisma.component.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        stockHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    return {
      items: components,
      total: components.length,
    }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати список компонентів')
  }
})
