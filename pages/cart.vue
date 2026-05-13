<script setup lang="ts">
import { ClipboardList, ShoppingCart } from 'lucide-vue-next'
import type { ProductListItem, ProductsApiResponse } from '~/shared/api/types'

type CartLine = {
  product: ProductListItem
  quantity: number
}

const { data, pending, error } = await useAsyncData('cart-products', async () => {
  const pageSize = 48
  let page = 1
  let total = Infinity
  const items: ProductListItem[] = []

  while (items.length < total) {
    const response = await $fetch<ProductsApiResponse>('/api/products', {
      query: { page, pageSize },
    })
    items.push(...response.items)
    total = response.total
    page += 1
  }

  return items
})

const allProducts = computed(() => data.value ?? [])
const cartLines = ref<CartLine[]>([])

const replenishNotice = ref<string | null>(null)
const replenishError = ref<string | null>(null)
const replenishSubmitting = ref(false)
let replenishNoticeTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (replenishNoticeTimer) clearTimeout(replenishNoticeTimer)
})

function addToCart(product: ProductListItem) {
  const existing = cartLines.value.find((line) => line.product.id === product.id)
  if (existing) {
    existing.quantity += 1
    return
  }
  cartLines.value.push({ product, quantity: 1 })
}

function removeFromCart(productId: string) {
  cartLines.value = cartLines.value.filter((line) => line.product.id !== productId)
}

function recommendedOrderQty(product: ProductListItem) {
  const safetyTarget = product.minStockLevel * 2
  return Math.max(safetyTarget - product.currentStock, 0)
}

function recommendationText(product: ProductListItem) {
  const qty = recommendedOrderQty(product)
  if (qty <= 0) {
    return 'Запас у межах норми. Дозамовлення не обовʼязкове.'
  }
  return `Рекомендовано замовити щонайменше ${qty} шт., щоб перекрити мінімум і сформувати буфер.`
}

/** AI/логіка рекомендує дозамовлення */
function aiRecommendsOrder(product: ProductListItem) {
  return recommendedOrderQty(product) > 0
}

/** Критичний дефіцит: на складі не більше порогу min */
function isStockCritical(product: ProductListItem) {
  return product.currentStock <= product.minStockLevel
}

function cartCardClasses(product: ProductListItem) {
  const base =
    'rounded-xl border p-3 transition-[box-shadow,border-color,background-color] duration-200 dark:bg-zinc-900/40'
  if (!aiRecommendsOrder(product)) {
    return `${base} border-zinc-200 dark:border-zinc-700`
  }
  if (isStockCritical(product)) {
    return `${base} border-2 border-red-500/85 bg-red-50/60 shadow-sm shadow-red-500/10 ring-1 ring-red-500/25 dark:border-red-500/70 dark:bg-red-950/25 dark:ring-red-500/20`
  }
  return `${base} border-2 border-amber-400/90 bg-amber-50/50 shadow-sm shadow-amber-500/10 ring-1 ring-amber-400/25 dark:border-amber-500/70 dark:bg-amber-950/20 dark:ring-amber-500/15`
}

async function submitReplenishmentRequest() {
  replenishError.value = null
  if (replenishNoticeTimer) {
    clearTimeout(replenishNoticeTimer)
    replenishNoticeTimer = null
  }

  const invalidLine = cartLines.value.find(
    (line) => !Number.isInteger(line.quantity) || line.quantity < 1,
  )
  if (invalidLine) {
    replenishError.value = 'Кількість у кожному рядку має бути цілим числом не менше 1.'
    return
  }

  replenishSubmitting.value = true
  try {
    await $fetch('/api/replenishment-requests', {
      method: 'POST',
      body: {
        lines: cartLines.value.map((line) => ({
          productId: line.product.id,
          sku: line.product.sku,
          name: line.product.name,
          cartQuantity: line.quantity,
          currentStock: line.product.currentStock,
          minStockLevel: line.product.minStockLevel,
          recommendedOrderQty: recommendedOrderQty(line.product),
        })),
      },
    })
    replenishNotice.value = 'Запит на поповнення збережено в системі.'
    replenishNoticeTimer = setTimeout(() => {
      replenishNotice.value = null
      replenishNoticeTimer = null
    }, 8000)
  } catch (e: unknown) {
    let msg = 'Не вдалося надіслати запит. Спробуйте пізніше.'
    if (e && typeof e === 'object' && 'data' in e) {
      const data = (e as { data?: { statusMessage?: string; message?: string } }).data
      if (data?.statusMessage) msg = data.statusMessage
      else if (data?.message) msg = String(data.message)
    }
    replenishError.value = msg
  } finally {
    replenishSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <h1 class="text-lg font-semibold">Кошик</h1>
        <NuxtLink to="/catalog" class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          До каталогу
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:items-start">
      <section class="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 class="text-base font-semibold">Додати в кошик</h2>
        <p v-if="pending" class="text-sm text-zinc-500 dark:text-zinc-400">Завантаження товарів...</p>
        <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">Не вдалося отримати товари.</p>
        <div v-else class="space-y-2">
          <button
            v-for="product in allProducts"
            :key="product.id"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            @click="addToCart(product)"
          >
            <span>{{ product.name }}</span>
            <span class="text-zinc-500 dark:text-zinc-400">+ Додати</span>
          </button>
        </div>
      </section>

      <section
        class="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:min-h-[min(70vh,36rem)]"
      >
        <div class="mb-3 flex items-start gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800"
            aria-hidden="true"
          >
            <ClipboardList class="h-5 w-5 text-zinc-600 dark:text-zinc-400" :stroke-width="1.75" />
          </div>
          <div>
            <h2 class="text-base font-semibold leading-snug">Мій список та аналіз замовлення</h2>
            <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Рекомендації з урахуванням залишку та мінімального порогу на складі
            </p>
          </div>
        </div>

        <div v-if="!cartLines.length" class="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/50"
            aria-hidden="true"
          >
            <ShoppingCart class="h-9 w-9 text-zinc-400 dark:text-zinc-500" :stroke-width="1.25" />
          </div>
          <p class="max-w-xs text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Ваш список замовлень порожній. Оберіть компоненти зліва для аналізу.
          </p>
        </div>

        <template v-else>
          <div class="flex-1 space-y-3 overflow-y-auto pr-0.5">
            <article v-for="line in cartLines" :key="line.product.id" :class="cartCardClasses(line.product)">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium leading-snug">{{ line.product.name }}</p>
                    <span
                      v-if="aiRecommendsOrder(line.product)"
                      class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      :class="
                        isStockCritical(line.product)
                          ? 'bg-red-500/15 text-red-700 ring-1 ring-red-500/30 dark:text-red-300'
                          : 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/35 dark:text-amber-200'
                      "
                    >
                      {{ isStockCritical(line.product) ? 'Дефіцит' : 'Поповнити буфер' }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Залишок: {{ line.product.currentStock }} · Мін. поріг: {{ line.product.minStockLevel }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                  @click="removeFromCart(line.product.id)"
                >
                  Видалити
                </button>
              </div>

              <label class="mt-3 block text-sm">
                <span class="text-zinc-600 dark:text-zinc-400">Кількість у кошику</span>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  min="1"
                  class="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
                >
              </label>

              <p class="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {{ recommendationText(line.product) }}
              </p>
            </article>
          </div>

          <div class="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p
              v-if="replenishError"
              class="rounded-xl border border-red-500/40 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-100"
              role="alert"
            >
              {{ replenishError }}
            </p>
            <p
              v-if="replenishNotice"
              class="rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100"
              role="status"
            >
              {{ replenishNotice }}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300/90">
              Увага: при перезавантаженні сторінки кошик буде очищено.
            </p>
            <button
              type="button"
              class="w-full rounded-xl bg-zinc-900 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:disabled:opacity-50"
              :disabled="replenishSubmitting"
              @click="submitReplenishmentRequest"
            >
              {{ replenishSubmitting ? 'Надсилання…' : 'Створити запит на поповнення' }}
            </button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>
