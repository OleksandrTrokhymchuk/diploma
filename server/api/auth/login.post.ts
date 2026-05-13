import bcrypt from 'bcrypt'
import { prisma } from '../../utils/prisma'
import { getAppSession } from '../../utils/session'
import { normalizeApiError } from '../../utils/apiError'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{ email?: string; password?: string }>(event)
    const email = body.email?.trim().toLowerCase()
    const password = body.password

    if (!email || !password) {
      throw createError({ statusCode: 400, statusMessage: 'Електронна пошта і пароль обовʼязкові' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, passwordHash: true },
    })

    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Невірна електронна пошта або пароль' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      throw createError({ statusCode: 401, statusMessage: 'Невірна електронна пошта або пароль' })
    }

    const session = await getAppSession(event)
    session.userId = user.id
    session.role = user.role
    await session.save()

    const { passwordHash: _p, ...publicUser } = user
    return { user: publicUser }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося виконати вхід')
  }
})
