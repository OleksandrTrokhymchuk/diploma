import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '../../utils/prisma'

const BASE_SYSTEM_INSTRUCTION = `Ти експертний AI-аналітик запасів компонентів робототехніки.
Твоє завдання: на основі даних складу оцінити ризик дефіциту і дати рекомендацію щодо замовлення.
Відповідай виключно українською мовою.
Формат відповіді: Markdown з емодзі-статусами.
Структура:
## Зведення
- 🟢/🟡/🔴 Рівень ризику: ...
- Короткий висновок: ...

## Аналіз по товарах
- **[Назва]** (SKU: ...)
  - Поточний залишок і поріг
  - Що видно з останніх операцій
  - Рекомендація: замовляти чи ні

## Рекомендації дій
- 2-4 практичні кроки.

Не вигадуй дані, яких немає у контексті.`

function formatReason(reason: 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'): string {
  if (reason === 'REPLENISHMENT') return 'Поповнення'
  if (reason === 'ORDER') return 'Замовлення'
  return 'Списання'
}

function extractSearchTerms(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((x) => x.length >= 3)
    .slice(0, 8)
}

async function loadRelevantComponents(userMessage: string) {
  const terms = extractSearchTerms(userMessage)

  if (terms.length > 0) {
    const matched = await prisma.component.findMany({
      where: {
        OR: terms.flatMap((term) => ([
          { name: { contains: term, mode: 'insensitive' } },
          { model: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { manufacturer: { contains: term, mode: 'insensitive' } },
        ])),
      },
      orderBy: { quantityOnHand: 'asc' },
      take: 5,
      include: {
        stockHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    })

    if (matched.length > 0) return matched
  }

  return prisma.component.findMany({
    orderBy: [
      { quantityOnHand: 'asc' },
      { minStockLevel: 'desc' },
    ],
    take: 5,
    include: {
      stockHistory: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })
}

function buildInventoryContext(
  components: Array<{
    name: string
    sku: string
    model: string
    quantityOnHand: number
    minStockLevel: number
    stockHistory: Array<{
      createdAt: Date
      changeAmount: number
      balanceAfter: number
      reason: 'REPLENISHMENT' | 'ORDER' | 'WRITE_OFF'
      reasonNote: string | null
    }>
  }>,
): string {
  if (components.length === 0) {
    return 'У базі немає товарів для аналізу.'
  }

  return components.map((item, index) => {
    const historyText = item.stockHistory.length
      ? item.stockHistory.map((h) => {
        const sign = h.changeAmount > 0 ? '+' : ''
        const date = new Date(h.createdAt).toISOString().slice(0, 10)
        return `${date}: ${formatReason(h.reason)} (${sign}${h.changeAmount}), баланс після: ${h.balanceAfter}${h.reasonNote ? `, примітка: ${h.reasonNote}` : ''}`
      }).join('; ')
      : 'Історія відсутня'

    return `${index + 1}. Товар: ${item.name} (${item.model}), SKU: ${item.sku}. Залишок: ${item.quantityOnHand}, Поріг: ${item.minStockLevel}. Історія: ${historyText}.`
  }).join('\n')
}

function resolveGeminiApiKey(): string {
  const config = useRuntimeConfig()
  const fromConfig =
    typeof config.geminiApiKey === 'string' ? config.geminiApiKey.trim() : ''
  if (fromConfig) return fromConfig
  return (
    process.env.NUXT_GEMINI_API_KEY?.trim()
    || process.env.GEMINI_API_KEY?.trim()
    || ''
  )
}

function resolveGeminiModel(): string {
  const config = useRuntimeConfig()
  const fromConfig =
    typeof config.geminiModel === 'string' ? config.geminiModel.trim() : ''
  if (fromConfig) return fromConfig
  return process.env.NUXT_GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
}

export default defineEventHandler(async (event) => {
  const apiKey = resolveGeminiApiKey()
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Ключ Gemini не знайдено. Додайте NUXT_GEMINI_API_KEY у файл .env у корені проєкту і перезапустіть dev-сервер (npm run dev).',
    })
  }

  const body = (await readBody(event).catch(() => null)) as { message?: string } | null
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Поле message обовʼязкове',
    })
  }

  const relevantComponents = await loadRelevantComponents(message)
  const inventoryContext = buildInventoryContext(relevantComponents)
  const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\nКонтекст складу для аналізу:\n${inventoryContext}`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: resolveGeminiModel(),
    systemInstruction,
  })

  try {
    const prompt = `Запит користувача: ${message}

Зроби інтелектуальний аналіз запасів для наведених товарів: оцінка ризику дефіциту та рекомендація щодо замовлення.`
    const result = await model.generateContent(prompt)
    const reply = result.response.text()
    return { reply }
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : 'Помилка Gemini'
    throw createError({
      statusCode: 502,
      statusMessage: errMsg,
    })
  }
})
