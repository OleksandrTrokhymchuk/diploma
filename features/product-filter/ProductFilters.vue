<script setup lang="ts">
import type { ProductCategory, ProductSort } from '~/shared/api/types'

const props = defineProps<{
  categories: ProductCategory[]
  manufacturers: string[]
  modelValue: {
    search: string
    category: string
    manufacturer: string
    sort: ProductSort
  }
}>()

const emit = defineEmits<{
  'update:modelValue': [
    value: {
      search: string
      category: string
      manufacturer: string
      sort: ProductSort
    },
  ]
}>()

function updateField<K extends keyof typeof props.modelValue>(field: K, value: (typeof props.modelValue)[K]) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}
</script>

<template>
  <div class="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2 lg:grid-cols-4">
    <label class="text-sm">
      <span class="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Пошук</span>
      <input
        :value="modelValue.search"
        type="text"
        class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        placeholder="Назва, SKU, опис..."
        @input="updateField('search', ($event.target as HTMLInputElement).value)"
      >
    </label>

    <label class="text-sm">
      <span class="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Категорія</span>
      <select
        :value="modelValue.category"
        class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        @change="updateField('category', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Усі категорії</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c.replaceAll('_', ' ') }}</option>
      </select>
    </label>

    <label class="text-sm">
      <span class="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Виробник</span>
      <select
        :value="modelValue.manufacturer"
        class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        @change="updateField('manufacturer', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Усі виробники</option>
        <option v-for="m in manufacturers" :key="m" :value="m">{{ m }}</option>
      </select>
    </label>

    <label class="text-sm">
      <span class="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">Сортування</span>
      <select
        :value="modelValue.sort"
        class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950"
        @change="updateField('sort', ($event.target as HTMLSelectElement).value as ProductSort)"
      >
        <option value="newest">Нові спочатку</option>
        <option value="price_asc">Ціна: зростання</option>
        <option value="price_desc">Ціна: спадання</option>
        <option value="stock_asc">Залишок: менше спочатку</option>
        <option value="stock_desc">Залишок: більше спочатку</option>
        <option value="name_asc">Назва: A-Z</option>
      </select>
    </label>
  </div>
</template>
