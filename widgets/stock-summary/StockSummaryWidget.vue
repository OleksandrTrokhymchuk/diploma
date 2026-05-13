<script setup lang="ts">
import { formatUsdPrice } from '~/shared/lib/displayLabels'

type StockSummary = {
  totalItems: number
  deficitItems: number
  totalStockUnits: number
  totalStockValue: number
}

const { data, pending, error, refresh } = useFetch<StockSummary>('/api/stock/summary', {
  server: false,
})

const summary = computed(() => data.value)
</script>

<template>
  <section class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-base font-semibold">Глобальна аналітика складу</h2>
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        :disabled="pending"
        @click="refresh()"
      >
        Оновити
      </button>
    </div>
    <p v-if="pending" class="text-sm text-zinc-500 dark:text-zinc-400">Завантаження статистики...</p>
    <p v-else-if="error || !summary" class="text-sm text-red-600 dark:text-red-400">Не вдалося завантажити статистику складу.</p>
    <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <article class="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
        <p class="text-xs text-zinc-500 dark:text-zinc-400">Всього товарів</p>
        <p class="mt-1 text-xl font-semibold">{{ summary.totalItems }}</p>
      </article>
      <article class="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
        <p class="text-xs text-zinc-500 dark:text-zinc-400">В дефіциті</p>
        <p class="mt-1 text-xl font-semibold">{{ summary.deficitItems }}</p>
      </article>
      <article class="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
        <p class="text-xs text-zinc-500 dark:text-zinc-400">Загальна вартість складу</p>
        <p class="mt-1 text-xl font-semibold">{{ formatUsdPrice(summary.totalStockValue) }}</p>
      </article>
    </div>
  </section>
</template>
