import bcrypt from 'bcrypt'
import { prisma } from '../../utils/prisma'
import { getAppSession } from '../../utils/session'
import { normalizeApiError } from '../../utils/apiError'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<{
      email?: string
      password?: string
      firstName?: string
      lastName?: string
    }>(event)

    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const firstName = body.firstName?.trim()
    const lastName = body.lastName?.trim()

    if (!email || !EMAIL_RE.test(email)) {
      throw createError({ statusCode: 400, statusMessage: 'Невірна електронна пошта' })
    }
    if (!password || password.length < 8) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Пароль має містити принаймні 8 символів',
      })
    }
    if (!firstName || !lastName) {
      throw createError({ statusCode: 400, statusMessage: 'Вкажіть імʼя та прізвище' })
    }

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) {
      throw createError({ statusCode: 409, statusMessage: 'Цю електронну пошту вже зареєстровано' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'WORKER',
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    const session = await getAppSession(event)
    session.userId = user.id
    session.role = user.role
    await session.save()

    return { user }
  } catch (error) {
    normalizeApiError(error, 'Не вдалося зареєструвати користувача')
  }
})
