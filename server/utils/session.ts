import { getIronSession } from 'iron-session'
import type { H3Event } from 'h3'
import type { UserRole } from '../../app/generated/prisma/client'

export type SessionUserRole = UserRole

export type UserSessionPayload = {
  userId?: string
  role?: SessionUserRole
}

function ironSessionPassword(event: H3Event): string {
  const config = useRuntimeConfig(event)
  const secret = config.sessionSecret
  if (!secret || String(secret).length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Секрет сесії налаштовано некоректно. Зверніться до адміністратора системи.',
    })
  }
  return String(secret)
}

export async function getAppSession(event: H3Event) {
  const cookieName = String(useRuntimeConfig(event).sessionCookieName || 'robotics_session')
  return getIronSession<UserSessionPayload>(event.node.req, event.node.res, {
    cookieName,
    password: ironSessionPassword(event),
    ttl: 60 * 60 * 24 * 14,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  })
}
