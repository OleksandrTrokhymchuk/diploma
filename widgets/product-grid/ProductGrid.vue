<script setup lang="ts">
import ProductCard from '~/entities/product/ProductCard.vue'
import ProductFilters from '~/features/product-filter/ProductFilters.vue'
import type { ProductSort, ProductsApiResponse } from '~/shared/api/types'

const { isAdmin } = useUserSession()

const page = ref(1)
const pageSize = 12

const filters = ref<{
  search: string
  category: string
  manufacturer: string
  sort: ProductSort
}>({
  search: '',
  category: '',
  manufacturer: '',
  sort: 'newest',
})

const query = computed(() => ({
  page: page.value,
  pageSize,
  search: filters.value.search || undefined,
  category: filters.value.category || undefined,
  manufacturer: filters.value.manufacturer || undefined,
  sort: filters.value.sort,
}))

const { data, status, error, refresh } = useFetch<ProductsApiResponse>('/api/products', {
  query,
  watch: [query],
  server: false,
})

const isLoading = computed(() => status.value === 'pending')
const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))
const canPrev = computed(() => page.value > 1 && !isLoading.value)
const canNext = computed(() => page.value < totalPages.value && !isLoading.value)

watch(
  () => [filters.value.search, filters.value.category, filters.value.manufacturer, filters.value.sort],
  () => {
    page.value = 1
  },
)

function prevPage() {
  if (canPrev.value) page.value -= 1
}

function nextPage() {
  if (canNext.value) page.value += 1
}
</script>

<template>
  <section class="space-y-5">
    <ProductFilters v-model="filters" :categories="data?.categories ?? []" :manufacturers="data?.manufacturers ?? []" />

    <div class="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
      <p>Знайдено: {{ total }}</p>
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        :disabled="isLoading"
        @click="refresh()"
      >
        Оновити
      </button>
    </div>

    <p v-if="error" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
      Помилка завантаження каталогу.
    </p>
    <p v-else-if="isLoading && !items.length" class="text-sm text-zinc-500 dark:text-zinc-400">Завантаження каталогу...</p>
    <p v-else-if="!items.length" class="text-sm text-zinc-500 dark:text-zinc-400">Нічого не знайдено за поточними фільтрами.</p>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <ProductCard
        v-for="(item, index) in items"
        :key="item.id"
        :product="item"
        :show-admin-actions="isAdmin"
        :image-priority="index < 6"
        @removed="refresh()"
      />
    </div>

    <div class="flex items-center justify-center gap-2">
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        :disabled="!canPrev"
        @click="prevPage"
      >
        Назад
      </button>
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Сторінка {{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        :disabled="!canNext"
        @click="nextPage"
      >
        Далі
      </button>
    </div>
  </section>
</template>
