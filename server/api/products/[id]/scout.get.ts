import { prisma } from '../../../utils/prisma'
import {
  GEMINI_OVERLOADED_MESSAGE,
  GeminiServiceExhaustedError,
  generateGeminiContent,
  resolveGeminiApiKey,
  resolveGeminiModel,
} from '../../../utils/gemini'

function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

function formatReason(reason: 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'): string {
  if (reason === 'REPLENISHMENT') return 'Поповнення'
  if (reason === 'ORDER') return 'Замовлення'
  return 'Списання'
}

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, statusMessage: 'Не вказано id товару' })
    }

    const apiKey = resolveGeminiApiKey(event)
    if (!apiKey) {
      return {
        available: false as const,
        insight:
          'Розширений прогноз Скаут тимчасово недоступний. Зверніться до адміністратора системи.',
      }
    }

    const since = startOfUtcMonth(new Date())

    const item = await prisma.component.findUnique({
      where: { id },
      select: {
        name: true,
        sku: true,
        model: true,
        manufacturer: true,
        category: true,
        description: true,
        minStockLevel: true,
        quantityOnHand: true,
        unitPrice: true,
        stockHistory: {
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'asc' },
          select: {
            changeAmount: true,
            balanceAfter: true,
            reason: true,
            reasonNote: true,
            createdAt: true,
          },
        },
      },
    })

    if (!item) {
      throw createError({ statusCode: 404, statusMessage: 'Товар не знайдено' })
    }

    const historyLines = item.stockHistory.length
      ? item.stockHistory
        .map((h) => {
          const d = new Date(h.createdAt).toISOString().slice(0, 10)
          return `${d}: ${formatReason(h.reason)} ${h.changeAmount > 0 ? '+' : ''}${h.changeAmount} → баланс ${h.balanceAfter}${h.reasonNote ? ` (${h.reasonNote})` : ''}`
        })
        .join('\n')
      : 'За поточний місяць рухів залишку не було.'

    const context = `Товар: ${item.name} (SKU ${item.sku})
Модель: ${item.model}, виробник: ${item.manufacturer}, категорія: ${item.category}
Опис: ${item.description}
Поточний залишок: ${item.quantityOnHand} шт., мінімальний поріг складу: ${item.minStockLevel} шт.
Ціна за одиницю: ${Number(item.unitPrice).toFixed(2)} USD

Історія рухів за поточний місяць:
${historyLines}`

    const systemInstruction = `Ти Scout — компактний аналітик складу для одного SKU робототехніки.
Відповідь виключно українською, 2–4 речення, без вступу «я проаналізував».
Оціни темп витрати запасу за наведеними датами (середнє зняття на день або тиждень, якщо даних мало — обережно).
Дай прогноз: орієнтовно через скільки днів залишок може впасти до нуля або нижче min, якщо тренд збережеться.
Запропонуй конкретну кількість для замовлення (ціле число шт.), якщо доречно.
Якщо даних замало для прогнозу — скажи це чесно і дай загальну рекомендацію з урахуванням порогу min.
Не вигадуй цифри, яких немає в контексті.`

    let insight: string
    try {
      insight = (await generateGeminiContent({
        apiKey,
        model: resolveGeminiModel(event),
        systemInstruction,
        prompt: `Проаналізуй цей товар і склад:\n\n${context}`,
      })).trim()
    } catch (error: unknown) {
      if (error instanceof GeminiServiceExhaustedError) {
        return {
          available: false as const,
          insight: GEMINI_OVERLOADED_MESSAGE,
        }
      }
      throw error
    }

    return {
      available: true as const,
      insight: insight || 'Скаут не повернув текст відповіді.',
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('[scout]', error)
    return {
      available: false as const,
      insight:
        'Скаут не зміг сформувати прогноз через перевантаження сервісу. Спробуйте кнопку «Оновити» пізніше.',
    }
  }
})
