import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/requireAdmin'
import { normalizeApiError } from '../../../utils/apiError'

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    })

    return users
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати список користувачів')
  }
})
