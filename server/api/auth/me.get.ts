import { prisma } from '../../utils/prisma'
import { normalizeApiError } from '../../utils/apiError'

export default defineEventHandler(async (event) => {
  try {
    const ctx = event.context.user
    if (!ctx) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    return user
  } catch (error) {
    normalizeApiError(error, 'Не вдалося отримати поточного користувача')
  }
})
