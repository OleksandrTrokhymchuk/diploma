import type { H3Event } from 'h3'

export function requireAdmin(event: H3Event) {
  const u = event.context.user
  if (!u) {
    throw createError({ statusCode: 401, statusMessage: 'Увійдіть в обліковий запис' })
  }
  if (u.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Потрібні права адміністратора' })
  }
}
