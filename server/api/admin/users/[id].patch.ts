import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/requireAdmin'
import { normalizeApiError } from '../../../utils/apiError'
import { getAppSession } from '../../../utils/session'

type Body = {
  role?: 'ADMIN' | 'WORKER'
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id користувача' })
    }

    const body = await readBody<Body>(event)
    if (body.role !== 'ADMIN' && body.role !== 'WORKER') {
      throw createError({ statusCode: 400, statusMessage: 'Невірна роль' })
    }

    const current = event.context.user
    if (current?.userId === id && body.role !== 'ADMIN') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Адміністратор не може знизити власну роль',
      })
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    })

    if (current?.userId === id) {
      const session = await getAppSession(event)
      session.role = body.role
      await session.save()
      event.context.user = { userId: id, role: body.role }
    }

    return updated
  } catch (error) {
    normalizeApiError(error, 'Не вдалося оновити роль користувача')
  }
})
