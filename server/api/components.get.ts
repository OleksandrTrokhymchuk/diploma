import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
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
})
