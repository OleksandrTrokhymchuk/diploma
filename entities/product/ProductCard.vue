<script setup lang="ts">
import type { ProductListItem } from '~/shared/api/types'

const props = defineProps<{
  product: ProductListItem
}>()

const PLACEHOLDER_IMAGE = 'https://placehold.co/800x600/27272a/a1a1aa?text=No+Image'

const stockTone = computed(() => {
  if (props.product.currentStock <= 0) {
    return 'bg-red-500/15 text-red-600 ring-red-500/30 dark:text-red-400'
  }
  if (props.product.currentStock <= props.product.minStockLevel) {
    return 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400'
  }
  return 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-400'
})

const stockLabel = computed(() => {
  if (props.product.currentStock <= 0) return 'Немає в наявності'
  if (props.product.currentStock <= props.product.minStockLevel) return 'Мало на складі'
  return 'В наявності'
})

const categoryLabel = computed(() => props.product.category.replaceAll('_', ' '))

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img) return
  if (img.src !== PLACEHOLDER_IMAGE) {
    img.src = PLACEHOLDER_IMAGE
  }
}
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div
      class="flex aspect-[4/3] items-center justify-center border-b border-zinc-200 bg-zinc-100 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400"
    >
      <img
        :src="product.imageUrl || PLACEHOLDER_IMAGE"
        :alt="product.name"
        class="h-full w-full object-cover"
        loading="lazy"
        @error="onImageError"
      >
    </div>

    <div class="space-y-2 p-4">
      <p class="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ product.name }}</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">SKU: {{ product.sku }}</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ categoryLabel }} · {{ product.manufacturer }}</p>
      <p class="text-base font-semibold text-zinc-900 dark:text-zinc-100">{{ product.unitPrice.toFixed(2) }} $</p>

      <div class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1" :class="stockTone">
        <span>{{ stockLabel }}</span>
        <span>({{ product.currentStock }})</span>
      </div>
    </div>
  </article>
</template>
