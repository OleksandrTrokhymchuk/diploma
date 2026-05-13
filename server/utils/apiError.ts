import { Prisma } from '../../app/generated/prisma/client'

export function normalizeApiError(error: unknown, fallbackMessage: string) {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Запис не знайдено' })
    }
    if (error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Такий запис уже існує' })
    }
  }

  const message = error instanceof Error && error.message ? error.message : fallbackMessage
  throw createError({
    statusCode: 500,
    statusMessage: message,
  })
}
