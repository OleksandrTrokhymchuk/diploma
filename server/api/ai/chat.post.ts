import { prisma } from '../../utils/prisma'
import { normalizeApiError } from '../../utils/apiError'
import {
  GeminiServiceExhaustedError,
  GEMINI_OVERLOADED_MESSAGE,
  generateGeminiContent,
  resolveGeminiApiKey,
  resolveGeminiModel,
} from '../../utils/gemini'

const BASE_SYSTEM_INSTRUCTION = `Ти експертний AI-асистент з компонентів робототехніки та запасів на складі.
Відповідай виключно українською мовою.
Заборонені вступні фрази: "Згідно з вашим запитом...", "Я перевірив базу даних...", "Ось результати аналізу...".
Тільки по суті, без зайвих мета-коментарів.
Використовуй емодзі-статуси та жирний шрифт лише для цифр та статусів, де це доречно.

Порівняння двох або більше товарів:
- Якщо користувач порівнює два або більше товарів, спочатку проаналізуй їхні назви, поле model та поле description з наданого контексту. Виділи ключові технічні відмінності (наприклад вантажопідйомність, виліт, потужність, тип сенсора, інтерфейс).
- Інформацію про наявність на складі (залишки, поріг minStockLevel) додавай лише ПІСЛЯ технічного порівняння.
- Формат відповіді при порівнянні (три чітко розділені блоки, кожен коротко):
  1) Технічна різниця.
  2) Порівняння залишків.
  3) Рекомендація.
- Для таких відповідей дозволено до 6–8 речень загалом (замість обмеження 2–3 речення).

Загальні знання про робототехніку:
- Можеш опиратися на загальні відомості про маркування та типові характеристики серій (наприклад у KUKA «KR 6» часто асоціюється з номінальною вантажопідйомністю порядку 6 кг), якщо це допомагає відповісти на питання.
- Якщо така інтерпретація не випливає безпосередньо з полів контексту БД, обов’язково познач це явно короткою приміткою на кшталт: «Загальні дані моделі / типова специфікація, не з нашої бази».

Запити без порівняння (один товар або загальний огляд складу):
- На основі даних складу оціни ризик дефіциту та дай рекомендацію щодо замовлення.
- Максимальна довжина — 2–3 речення.
- Починай відповідь відразу з фактів або цифр.

Для загального запиту про склад використовуй тільки формат:
"Загальний стан: [емодзі+статус]. Дефіцит: [кількість]. Критичні позиції: [2-3 товари]".
Якщо товар не знайдено: "Товар не знайдено. Уточніть назву або перевірити весь склад?".
Не вигадуй конкретні числа залишків, SKU чи описів, яких немає у контексті; загальні знання про серії — лише з обов’язковою приміткою, що це не з бази.`

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

function normalizeSearchToken(token: string): string {
  let t = token.toLowerCase()
  if (t.endsWith('ів') || t.endsWith('їв')) t = t.slice(0, -2)
  else if (t.endsWith('и') || t.endsWith('і') || t.endsWith('а') || t.endsWith('у')) t = t.slice(0, -1)
  return t
}

const INVENTORY_KEYWORDS = [
  'склад',
  'запас',
  'залишок',
  'товар',
  'компонент',
  'маніпулятор',
  'камера',
  'серво',
  'привід',
  'датчик',
  'sku',
  'дефіцит',
  'замов',
  'поповнен',
  'списан',
  'істор',
  'модель',
  'виробник',
]

const GLOBAL_QUERY_KEYWORDS = [
  'найменше',
  'статус',
  'закінчується',
  'дефіцит',
  'багато',
  'весь склад',
  'перевір весь склад',
  'всі товари',
  'усі товари',
  'в наявності',
]

function shouldAskClarification(message: string, terms: string[]) {
  if (resolveCategoryFromQuery(message)) return false
  if (message.length < 14 || terms.length < 2) return true
  const lowered = message.toLowerCase()
  return !INVENTORY_KEYWORDS.some((keyword) => lowered.includes(keyword))
}

function isGlobalInventoryQuery(message: string, terms: string[]) {
  if (terms.length === 0) return true
  const lowered = message.toLowerCase()
  if (GLOBAL_QUERY_KEYWORDS.some((keyword) => lowered.includes(keyword))) return true
  if (lowered.includes('весь') && lowered.includes('склад')) return true
  if ((lowered.includes('всі') || lowered.includes('усі')) && lowered.includes('товар')) return true

  /** Огляд усього складу українською (без конкретної назви товару в запиті). */
  const mentionsWarehouse =
    lowered.includes('склад') || lowered.includes('складі') || lowered.includes('на складі')
  if (mentionsWarehouse) {
    if (
      lowered.includes('товар')
      || lowered.includes('залиш')
      || lowered.includes('наявн')
      || lowered.includes('докуп')
      || lowered.includes('достатн')
      || lowered.includes('інформацію')
      || lowered.includes('стан')
      || lowered.includes('аналіз')
    ) {
      return true
    }
  }

  return false
}

function buildClarificationReply(message: string): string {
  if (message.length < 14) {
    return 'Уточніть запит: назва товару або перевірити весь склад?'
  }
  return 'Товар не знайдено. Уточніть назву або перевірити весь склад?'
}

async function loadRelevantComponents(userMessage: string) {
  const terms = extractSearchTerms(userMessage)

  if (terms.length === 0) return []
  const expandedTerms = Array.from(
    new Set(
      terms.flatMap((term) => {
        const normalized = normalizeSearchToken(term)
        return normalized && normalized !== term ? [term, normalized] : [term]
      }),
    ),
  ).slice(0, 16)

  const primary = await prisma.component.findMany({
    where: {
      OR: expandedTerms.flatMap((term) => ([
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
  if (primary.length > 0) return primary

  // Fallback for merged tokens like "fanucalpha" -> "fanuc alpha".
  const normalizedTerms = expandedTerms
    .map((term) => term.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((term) => term.length >= 3)

  if (!normalizedTerms.length) return []

  const fallbackPool = await prisma.component.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      model: true,
      manufacturer: true,
      category: true,
      description: true,
      quantityOnHand: true,
      minStockLevel: true,
      stockHistory: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    take: 150,
  })

  return fallbackPool
    .filter((item) => {
      const normalizedHaystack = `${item.name} ${item.sku} ${item.model} ${item.manufacturer}`
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
      return normalizedTerms.some((term) => normalizedHaystack.includes(term))
    })
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      stockHistory: item.stockHistory,
    }))
}

function resolveCategoryFromQuery(message: string) {
  const q = message.toLowerCase()
  if (q.includes('маніпулятор')) return 'MANIPULATOR' as const
  if (q.includes('камер')) return 'CAMERA' as const
  if (q.includes('серво') || q.includes('привід')) return 'SERVO_DRIVE' as const
  if (q.includes('датчик') || q.includes('сенсор') || q.includes('distance')) return 'DISTANCE_SENSOR' as const
  return null
}

async function loadCategoryFallbackComponents(message: string) {
  const category = resolveCategoryFromQuery(message)
  if (!category) return []
  return prisma.component.findMany({
    where: { category },
    orderBy: { quantityOnHand: 'asc' },
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
    manufacturer: string
    category: string
    description: string
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

    return `${index + 1}. Товар: ${item.name} | Модель: ${item.model} | Виробник: ${item.manufacturer} | Категорія: ${item.category} | SKU: ${item.sku}. Опис: ${item.description}. Залишок: ${item.quantityOnHand}, Поріг: ${item.minStockLevel}. Історія: ${historyText}.`
  }).join('\n')
}

async function loadGlobalInventoryStatus() {
  const [allItems, totalPositions] = await Promise.all([
    prisma.component.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        quantityOnHand: true,
        minStockLevel: true,
      },
      orderBy: { quantityOnHand: 'asc' },
    }),
    prisma.component.count(),
  ])

  const deficitItems = allItems.filter((item) => item.quantityOnHand <= item.minStockLevel)
  const lowestStockTop5 = allItems
    .slice()
    .sort((a, b) => a.quantityOnHand - b.quantityOnHand)
    .slice(0, 5)

  return {
    deficitItems,
    lowestStockTop5,
    totalPositions,
  }
}

function buildGlobalInventoryStatusContext(status: {
  deficitItems: Array<{ name: string; sku: string; quantityOnHand: number; minStockLevel: number }>
  lowestStockTop5: Array<{ name: string; sku: string; quantityOnHand: number; minStockLevel: number }>
  totalPositions: number
}) {
  const deficitText = status.deficitItems.length
    ? status.deficitItems
      .map((item) => `- ${item.name} (SKU: ${item.sku}) — залишок: ${item.quantityOnHand}, поріг: ${item.minStockLevel}`)
      .join('\n')
    : '- Дефіцитних позицій не виявлено'

  const top5Text = status.lowestStockTop5.length
    ? status.lowestStockTop5
      .map((item) => `- ${item.name} (SKU: ${item.sku}) — залишок: ${item.quantityOnHand}`)
      .join('\n')
    : '- Дані відсутні'

  return `GLOBAL INVENTORY STATUS
Загальна кількість позицій на складі: ${status.totalPositions}

Дефіцитні позиції (currentStock <= minStockLevel):
${deficitText}

Топ-5 товарів із найменшим залишком:
${top5Text}`
}

function buildGlobalShortReply(status: {
  deficitItems: Array<{ name: string; sku: string; quantityOnHand: number; minStockLevel: number }>
  lowestStockTop5: Array<{ name: string; quantityOnHand: number }>
}) {
  const deficitCount = status.deficitItems.length
  const overall = deficitCount === 0 ? '🟢 **Стабільний**' : deficitCount <= 3 ? '🟡 **Увага**' : '🔴 **Критичний**'
  const deficitNames = status.deficitItems
    .slice(0, 5)
    .map((item) => `${item.name} (**${item.quantityOnHand}** шт., min ${item.minStockLevel})`)
    .join('; ')
  const deficitHint = deficitCount > 0 ? deficitNames : 'немає'
  const critical = status.lowestStockTop5
    .slice(0, 3)
    .map((item) => `${item.name} (**${item.quantityOnHand}** шт.)`)
    .join(', ')
  return `Загальний стан: ${overall}. Дефіцит: **${deficitCount}** (${deficitHint}). Найнижчі залишки: ${critical || '—'}.`
}

async function buildGlobalSummaryContext() {
  const items = await prisma.component.findMany({
    select: { quantityOnHand: true, minStockLevel: true, unitPrice: true },
  })
  const totalItems = items.length
  const deficitItems = items.filter((x) => x.quantityOnHand <= x.minStockLevel).length
  const totalStockValue = items.reduce((acc, x) => acc + Number(x.unitPrice) * x.quantityOnHand, 0)

  return `Глобальна статистика складу:
- Всього товарів: ${totalItems}
- У дефіциті (залишок ≤ minStockLevel): ${deficitItems}
- Загальна вартість складу: ${totalStockValue.toFixed(2)} USD`
}

function resolveContextProductId(currentUrl?: string, contextId?: string) {
  if (contextId && contextId.trim()) return contextId.trim()
  if (!currentUrl) return ''
  const matched = currentUrl.match(/\/catalog\/([^/?#]+)/)
  return matched?.[1] ?? ''
}

async function loadContextProduct(contextProductId: string) {
  if (!contextProductId) return null
  return prisma.component.findUnique({
    where: { id: contextProductId },
    select: {
      id: true,
      name: true,
      sku: true,
      quantityOnHand: true,
      minStockLevel: true,
      model: true,
      manufacturer: true,
      category: true,
      description: true,
      stockHistory: {
        orderBy: { createdAt: 'desc' },
        take: 7,
        select: {
          createdAt: true,
          changeAmount: true,
          balanceAfter: true,
          reason: true,
          reasonNote: true,
        },
      },
    },
  })
}

function buildContextProductSummary(product: Awaited<ReturnType<typeof loadContextProduct>>) {
  if (!product) return ''
  const history = product.stockHistory.length
    ? product.stockHistory
      .map((h) => `${new Date(h.createdAt).toISOString().slice(0, 10)}: ${formatReason(h.reason)} (${h.changeAmount > 0 ? '+' : ''}${h.changeAmount}), баланс ${h.balanceAfter}`)
      .join('; ')
    : 'Історія відсутня'
  return `Контекст поточної сторінки товару:
Назва: ${product.name}
SKU: ${product.sku}
Модель: ${product.model}
Виробник: ${product.manufacturer}
Категорія: ${product.category}
Опис: ${product.description}
Поточний залишок: ${product.quantityOnHand}
Поріг minStockLevel: ${product.minStockLevel}
Останні операції: ${history}`
}

export default defineEventHandler(async (event) => {
  try {
    const apiKey = resolveGeminiApiKey(event)
    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage:
          'Сервіс аналітики тимчасово недоступний. Зверніться до адміністратора системи.',
      })
    }

    const body = (await readBody(event).catch(() => null)) as {
      message?: string
      currentUrl?: string
      contextId?: string
    } | null
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) {
      throw createError({ statusCode: 400, statusMessage: 'Поле повідомлення обовʼязкове' })
    }

    const terms = extractSearchTerms(message)
    const globalQuery = isGlobalInventoryQuery(message, terms)
    if (!globalQuery && shouldAskClarification(message, terms)) {
      return { reply: buildClarificationReply(message) }
    }

    const contextProductId = resolveContextProductId(body?.currentUrl, body?.contextId)
    const [relevantComponentsInitial, globalSummaryContext, contextProduct, globalInventoryStatus] = await Promise.all([
      globalQuery ? [] : loadRelevantComponents(message),
      buildGlobalSummaryContext(),
      loadContextProduct(contextProductId),
      globalQuery ? loadGlobalInventoryStatus() : null,
    ])
    const relevantComponents = !globalQuery && relevantComponentsInitial.length === 0
      ? await loadCategoryFallbackComponents(message)
      : relevantComponentsInitial
    const inventoryContext = globalQuery
      ? buildGlobalInventoryStatusContext(globalInventoryStatus!)
      : buildInventoryContext(relevantComponents)
    if (!globalQuery && !contextProduct && relevantComponents.length === 0) {
      return { reply: 'Товар не знайдено. Уточніть назву або перевірити весь склад?' }
    }
    const contextProductSummary = buildContextProductSummary(contextProduct)
    const systemInstruction = `${BASE_SYSTEM_INSTRUCTION}\n\n${globalSummaryContext}\n\n${contextProductSummary}\n\nКонтекст складу для аналізу:\n${inventoryContext}`

    if (globalQuery && globalInventoryStatus) {
      return { reply: buildGlobalShortReply(globalInventoryStatus) }
    }

    const prompt = `Запит користувача: ${message}

Якщо в запиті порівнюються два або більше товарів — дотримуйся системної інструкції: спочатку технічна різниця (назва, model, description), потім залишки, потім рекомендація.
Інакше зроби аналіз запасів для наведених товарів: ризик дефіциту та рекомендація щодо замовлення (коротко).`

    let reply: string
    try {
      reply = await generateGeminiContent({
        apiKey,
        model: resolveGeminiModel(event),
        systemInstruction,
        prompt,
      })
    } catch (geminiError: unknown) {
      if (geminiError instanceof GeminiServiceExhaustedError) {
        throw createError({
          statusCode: 429,
          statusMessage: GEMINI_OVERLOADED_MESSAGE,
        })
      }
      throw geminiError
    }
    return { reply }
  } catch (error: unknown) {
    normalizeApiError(error, 'Помилка під час аналізу складу')
  }
})
