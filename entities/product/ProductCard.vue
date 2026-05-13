<script setup lang="ts">
import type { Component } from 'vue'
import { Bot, Box, Camera, Cog, RadioTower } from 'lucide-vue-next'
import UiButton from '~/components/ui/UiButton.vue'
import { formatProductCategory, formatUsdPrice } from '~/shared/lib/displayLabels'
import type { ProductCategory, ProductListItem } from '~/shared/api/types'

const CATEGORY_ICON_MAP: Record<ProductCategory, Component> = {
  MANIPULATOR: Bot,
  CAMERA: Camera,
  SERVO_DRIVE: Cog,
  DISTANCE_SENSOR: RadioTower,
}

const props = withDefaults(
  defineProps<{
    product: ProductListItem
    showAdminActions?: boolean
    /** Лише для перших карток у сітці: швидший LCP, не вмикати для усіх. */
    imagePriority?: boolean
  }>(),
  { imagePriority: false },
)

const emit = defineEmits<{ removed: [] }>()

const imageLoadFailed = ref(false)

const photoUrl = computed(() => props.product.imageUrl?.trim() ?? '')

const showPhoto = computed(() => Boolean(photoUrl.value) && !imageLoadFailed.value)

const categoryIcon = computed(
  () => CATEGORY_ICON_MAP[props.product.category] ?? Box,
)

watch(
  () => props.product.id,
  () => {
    imageLoadFailed.value = false
  },
)

watch(photoUrl, () => {
  imageLoadFailed.value = false
})

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

const categoryLabel = computed(() => formatProductCategory(props.product.category))

function onImageError() {
  if (!imageLoadFailed.value) {
    imageLoadFailed.value = true
  }
}

const deleting = ref(false)

async function onDelete() {
  if (!props.showAdminActions || deleting.value) return
  if (!confirm(`Видалити «${props.product.name}» з каталогу?`)) return
  deleting.value = true
  try {
    await $fetch(`/api/components/${props.product.id}`, { method: 'DELETE' })
    emit('removed')
  } catch {
    alert('Не вдалося видалити компонент. Перевірте права та зʼєднання.')
  } finally {
    deleting.value = false
  }
}

function goEdit() {
  navigateTo({ path: '/catalog/manage', query: { id: props.product.id } })
}
</script>

<template>
  <article
    class="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div
      class="relative aspect-video w-full overflow-hidden rounded-t-2xl border-b border-zinc-200 bg-slate-900/50 dark:border-zinc-800"
    >
      <img
        v-if="showPhoto"
        :key="`${product.id}:${photoUrl}`"
        :src="photoUrl"
        :alt="product.name"
        width="640"
        height="360"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        :loading="imagePriority ? 'eager' : 'lazy'"
        decoding="async"
        :fetchpriority="imagePriority ? 'high' : 'low'"
        referrerpolicy="strict-origin-when-cross-origin"
        @error="onImageError"
      />
      <div
        v-else
        class="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <component
          :is="categoryIcon"
          class="h-14 w-14 shrink-0 text-gray-500 dark:text-gray-600"
          :stroke-width="1.35"
        />
      </div>

      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
        aria-hidden="true"
      />
      <p
        class="absolute bottom-0 left-0 right-0 z-[2] line-clamp-2 px-3 pb-2.5 pt-8 text-sm font-semibold leading-snug text-white drop-shadow-md"
      >
        {{ product.name }}
      </p>
    </div>

    <div class="space-y-2 p-4">
      <p class="text-xs text-zinc-500 dark:text-zinc-400">Артикул: {{ product.sku }}</p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">{{ categoryLabel }} · {{ product.manufacturer }}</p>
      <p class="text-base font-semibold text-zinc-900 dark:text-zinc-100">{{ formatUsdPrice(product.unitPrice) }}</p>

      <div class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1" :class="stockTone">
        <span>{{ stockLabel }}</span>
        <span>({{ product.currentStock }})</span>
      </div>

      <NuxtLink
        :to="`/catalog/${product.id}`"
        class="block pt-1 text-sm font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
      >
        Деталі товару
      </NuxtLink>

      <div v-if="showAdminActions" class="flex flex-wrap gap-2 pt-2">
        <UiButton type="button" variant="secondary" class="flex-1 sm:flex-none" @click="goEdit">
          Редагувати
        </UiButton>
        <UiButton
          type="button"
          variant="danger"
          class="flex-1 sm:flex-none"
          :loading="deleting"
          @click="onDelete"
        >
          Видалити
        </UiButton>
      </div>
    </div>
  </article>
</template>
