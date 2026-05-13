<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import type { ReplenishmentRequestItem } from '~/shared/api/types'

const { data, status, error, refresh } = await useFetch<ReplenishmentRequestItem[]>('/api/replenishment-requests')

const items = computed(() => data.value ?? [])
const isLoading = computed(() => status.value === 'pending')
const expandedId = ref<string | null>(null)

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function authorLabel(row: ReplenishmentRequestItem) {
  if (!row.user) return 'Гість'
  return `${row.user.firstName} ${row.user.lastName} (${row.user.email})`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uk-UA')
}
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold">Журнал запитів на поповнення</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">Останні запити з кошика та їхній склад.</p>
      </div>
      <UiButton type="button" variant="secondary" :loading="isLoading" @click="refresh()">Оновити</UiButton>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">Не вдалося завантажити журнал запитів.</p>
    <p v-else-if="!isLoading && !items.length" class="text-sm text-zinc-500 dark:text-zinc-400">Запитів поки немає.</p>

    <div v-else class="space-y-3">
      <article
        v-for="row in items"
        :key="row.id"
        class="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      >
        <button
          type="button"
          class="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
          @click="toggleExpanded(row.id)"
        >
          <div>
            <p class="font-medium">{{ formatDate(row.createdAt) }}</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ authorLabel(row) }} · {{ row.lines.length }} поз.</p>
          </div>
          <span class="text-zinc-400">{{ expandedId === row.id ? '−' : '+' }}</span>
        </button>

        <div v-if="expandedId === row.id" class="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th class="pb-2 pr-3">SKU</th>
                  <th class="pb-2 pr-3">Назва</th>
                  <th class="pb-2 pr-3">К-сть</th>
                  <th class="pb-2 pr-3">Залишок</th>
                  <th class="pb-2">Рекоменд.</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
                <tr v-for="line in row.lines" :key="line.productId">
                  <td class="py-2 pr-3 font-mono text-xs">{{ line.sku }}</td>
                  <td class="py-2 pr-3">{{ line.name }}</td>
                  <td class="py-2 pr-3">{{ line.cartQuantity }}</td>
                  <td class="py-2 pr-3">{{ line.currentStock }} / min {{ line.minStockLevel }}</td>
                  <td class="py-2">{{ line.recommendedOrderQty }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
