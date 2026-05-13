<script setup lang="ts">
import {
  Barcode,
  Boxes,
  ClipboardList,
  Cpu,
  Factory,
  Layers,
  Package,
  Sparkles,
  Wallet,
} from 'lucide-vue-next'
import StockTrendChart from '~/entities/product/StockTrendChart.vue'
import ProductEditModal from '~/features/product-management/ProductEditModal.vue'
import { catalogCategoryFallbackImage } from '~/shared/lib/catalogImageUrl'
import { formatProductCategory, formatStockReason, formatUsdPrice } from '~/shared/lib/displayLabels'
import type { ProductDetails, ProductScoutResponse } from '~/shared/api/types'

const route = useRoute()
const { isAdmin, refresh: refreshSession } = useUserSession()
await refreshSession()
const id = computed(() => String(route.params.id ?? ''))

const { data, pending, error, refresh } = await useFetch<ProductDetails>(() => `/api/products/${id.value}`, {
  watch: [id],
})

const {
  data: scout,
  pending: scoutPending,
  error: scoutError,
  refresh: refreshScout,
} = await useFetch<ProductScoutResponse>(() => `/api/products/${id.value}/scout`, {
  watch: [id],
  server: false,
  lazy: true,
})

const imageFailed = ref(false)

watch(
  () => data.value?.id,
  () => {
    imageFailed.value = false
  },
)

const heroSrc = computed(() => {
  const d = data.value
  if (!d) return ''
  if (imageFailed.value) return catalogCategoryFallbackImage(d.category)
  return d.imageUrl || catalogCategoryFallbackImage(d.category)
})

function onHeroImgError() {
  if (!data.value || imageFailed.value) return
  imageFailed.value = true
}

const categoryUa = computed(() => {
  const c = data.value?.category
  return c ? formatProductCategory(c) : ''
})

const stockBadge = computed(() => {
  const p = data.value
  if (!p) return null as null | { label: string; class: string }
  if (p.currentStock <= 0) {
    return {
      label: 'Дефіцит',
      class:
        'bg-red-500/15 text-red-800 ring-red-500/35 dark:text-red-300',
    }
  }
  if (p.currentStock <= p.minStockLevel) {
    return {
      label: 'Мало',
      class:
        'bg-amber-500/15 text-amber-900 ring-amber-500/40 dark:text-amber-200',
    }
  }
  return {
    label: 'В наявності',
    class:
      'bg-emerald-500/15 text-emerald-900 ring-emerald-500/35 dark:text-emerald-200',
  }
})

const specRows = computed(() => {
  const p = data.value
  if (!p) return [] as { label: string; value: string }[]
  if (p.specs && Object.keys(p.specs).length > 0) {
    return Object.entries(p.specs).map(([label, value]) => ({ label, value }))
  }
  return [{ label: 'Опис / примітка', value: p.description }]
})

async function onRefresh() {
  await refresh()
  await refreshScout()
}

const showEditModal = ref(false)
</script>

<template>
  <div class="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <header
      class="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div class="min-w-0 pr-14 sm:pr-0">
          <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400/90">
            Картка компонента
          </p>
          <h1 class="truncate text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {{ data?.name ?? 'Завантаження…' }}
          </h1>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            v-if="isAdmin && data"
            type="button"
            class="rounded-lg border border-teal-600/40 bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-900/50 sm:text-sm"
            @click="showEditModal = true"
          >
            Редагувати дані
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
            @click="onRefresh"
          >
            Оновити
          </button>
          <NuxtLink
            to="/catalog"
            class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm"
          >
            Каталог
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <p v-if="pending" class="text-sm text-slate-500 dark:text-slate-400">Завантаження даних…</p>
      <p v-else-if="error || !data" class="text-sm text-red-600 dark:text-red-400">Не вдалося завантажити товар.</p>

      <template v-else>
        <section class="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <div
            class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
          >
            <div class="aspect-video w-full bg-slate-100 dark:bg-slate-900">
              <img
                :key="`${data.id}:${heroSrc}`"
                :src="heroSrc"
                :alt="data.name"
                width="960"
                height="540"
                class="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                referrerpolicy="strict-origin-when-cross-origin"
                @error="onHeroImgError"
              >
            </div>
            <div class="absolute left-3 top-3 flex flex-wrap gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-teal-500/35 backdrop-blur dark:bg-slate-950/80 dark:text-teal-300 dark:ring-teal-500/40"
              >
                <Layers class="h-3.5 w-3.5" aria-hidden="true" />
                {{ categoryUa }}
              </span>
              <span
                v-if="stockBadge"
                class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 backdrop-blur"
                :class="stockBadge.class"
              >
                {{ stockBadge.label }}
              </span>
            </div>
          </div>

          <div
            class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-3"
          >
            <div class="space-y-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {{ data.name }}
                  </h2>
                  <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">{{ data.model }}</p>
                </div>
              </div>

              <dl class="grid gap-3 sm:grid-cols-2">
                <div
                  class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/40"
                >
                  <Barcode class="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <div>
                    <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Артикул</dt>
                    <dd class="font-mono text-sm text-slate-900 dark:text-slate-100">{{ data.sku }}</dd>
                  </div>
                </div>
                <div
                  class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/40"
                >
                  <Factory class="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <div>
                    <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Виробник</dt>
                    <dd class="text-sm text-slate-900 dark:text-slate-100">{{ data.manufacturer }}</dd>
                  </div>
                </div>
                <div
                  class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/40"
                >
                  <Wallet class="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <div>
                    <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Ціна</dt>
                    <dd class="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {{ formatUsdPrice(data.unitPrice) }}
                    </dd>
                  </div>
                </div>
                <div
                  class="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/40"
                >
                  <Package class="mt-0.5 h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <div>
                    <dt class="text-[11px] font-medium uppercase tracking-wide text-slate-500">Залишок / мін.</dt>
                    <dd class="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {{ data.currentStock }}
                      <span class="text-sm font-normal text-slate-500 dark:text-slate-500">/ {{ data.minStockLevel }} шт.</span>
                    </dd>
                  </div>
                </div>
              </dl>
            </div>

            <p
              class="mt-4 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400"
            >
              {{ data.description }}
            </p>
          </div>
        </section>

        <section
          class="rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/50"
        >
          <div class="mb-4 flex items-center gap-2">
            <Cpu class="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">Технічні характеристики</h3>
          </div>
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full min-w-[28rem] text-left text-sm">
              <thead
                class="bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/80 dark:text-slate-500"
              >
                <tr>
                  <th class="px-4 py-3">Параметр</th>
                  <th class="px-4 py-3">Значення</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                <tr
                  v-for="row in specRows"
                  :key="row.label"
                  class="bg-white/60 hover:bg-slate-50 dark:bg-slate-900/30 dark:hover:bg-slate-800/40"
                >
                  <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                    {{ row.label }}
                  </td>
                  <td class="px-4 py-3 text-slate-900 dark:text-slate-100">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="grid gap-6 xl:grid-cols-3">
          <div class="space-y-4 xl:col-span-2">
            <StockTrendChart :points="data.stockTrend" />
          </div>

          <aside
            class="rounded-2xl border border-teal-500/30 bg-gradient-to-b from-teal-50/90 to-white p-5 ring-1 ring-teal-500/20 dark:border-teal-500/25 dark:from-teal-950/40 dark:to-slate-950 dark:ring-teal-500/20"
          >
            <div class="flex items-center gap-2 border-b border-teal-200 pb-3 dark:border-teal-500/20">
              <Sparkles class="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Аналітика Скаут</h3>
            </div>
            <p v-if="scoutPending" class="mt-3 text-sm text-slate-600 dark:text-slate-400">Скаут аналізує рух залишків…</p>
            <p v-else-if="scoutError" class="mt-3 text-sm text-red-600 dark:text-red-400">Не вдалося отримати прогноз Скаут.</p>
            <p v-else-if="scout && !scout.available" class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {{ scout.insight || 'Розширений прогноз тимчасово недоступний.' }}
            </p>
            <p v-else class="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {{ scout?.insight || 'Скаут не повернув текст відповіді.' }}
            </p>
            <div class="mt-4 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-500">
              <ClipboardList class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Прогноз з урахуванням історії за поточний місяць.</span>
            </div>
          </aside>
        </div>

        <section
          v-if="data.stockHistory.length"
          class="rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/40"
        >
          <div class="mb-3 flex items-center gap-2">
            <Boxes class="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Останні операції (місяць)</h3>
          </div>
          <ul class="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <li
              v-for="h in [...data.stockHistory].reverse().slice(0, 8)"
              :key="h.id"
              class="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
            >
              <span class="text-slate-500 dark:text-slate-400">{{ new Date(h.createdAt).toLocaleString('uk-UA') }}</span>
              <span class="font-mono text-slate-800 dark:text-slate-200">
                {{ h.changeAmount > 0 ? '+' : '' }}{{ h.changeAmount }}
                → {{ h.balanceAfter }} шт.
              </span>
              <span class="w-full text-xs text-slate-500 dark:text-slate-500 sm:w-auto">{{ h.reasonNote ?? formatStockReason(h.reason) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </main>

    <ProductEditModal
      v-if="showEditModal && data"
      :product="data"
      @close="showEditModal = false"
      @saved="onRefresh"
    />
  </div>
</template>
