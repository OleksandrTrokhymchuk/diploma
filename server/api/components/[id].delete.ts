import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../../utils/requireAdmin'
import { normalizeApiError } from '../../utils/apiError'

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id' })
    }

    const found = await prisma.component.findUnique({ where: { id }, select: { id: true } })
    if (!found) {
      throw createError({ statusCode: 404, statusMessage: 'Компонент не знайдено' })
    }
    await prisma.component.delete({ where: { id } })

    return { ok: true }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося видалити компонент')
  }
})
