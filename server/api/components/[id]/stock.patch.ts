import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/requireAdmin'
import { normalizeApiError } from '../../../utils/apiError'

type Body = {
  changeAmount?: number
  reason?: 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'
  reasonNote?: string
}

export default defineEventHandler(async (event) => {
  try {
    requireAdmin(event)

    const componentId = getRouterParam(event, 'id')
    if (!componentId) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id компонента' })
    }

    const body = await readBody<Body>(event)
    const changeAmount = Number(body.changeAmount)
    const reason = body.reason
    const reasonNote = body.reasonNote?.trim() || null

    if (!Number.isInteger(changeAmount) || changeAmount === 0) {
      throw createError({ statusCode: 400, statusMessage: 'Зміна залишку має бути цілим числом і не дорівнювати 0' })
    }
    if (reason !== 'REPLENISHMENT' && reason !== 'ORDER' && reason !== 'WRITE_OFF') {
      throw createError({ statusCode: 400, statusMessage: 'Оберіть причину зміни залишку' })
    }

    const userId = event.context.user?.userId
    if (!userId) {
      throw createError({ statusCode: 401, statusMessage: 'Необхідна авторизація' })
    }

    const result = await prisma.$transaction(async (tx) => {
      const component = await tx.component.findUnique({
        where: { id: componentId },
        select: { id: true, quantityOnHand: true },
      })
      if (!component) {
        throw createError({ statusCode: 404, statusMessage: 'Компонент не знайдено' })
      }

      const nextBalance = component.quantityOnHand + changeAmount
      if (nextBalance < 0) {
        throw createError({ statusCode: 400, statusMessage: 'Недостатньо товару на складі для списання' })
      }

      const history = await tx.stockHistory.create({
        data: {
          componentId: component.id,
          userId,
          changeAmount,
          balanceAfter: nextBalance,
          reason,
          reasonNote,
        },
      })

      const updated = await tx.component.update({
        where: { id: component.id },
        data: { quantityOnHand: nextBalance },
        select: { id: true, quantityOnHand: true },
      })

      return { updated, history }
    })

    return result
  } catch (error) {
    normalizeApiError(error, 'Не вдалося оновити залишок товару')
  }
})
