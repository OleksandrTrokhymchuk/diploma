<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import UiInput from '~/components/ui/UiInput.vue'
import type { ProductDetails } from '~/shared/api/types'

const props = defineProps<{
  product: ProductDetails
}>()

const emit = defineEmits<{
  saved: []
  close: []
}>()

const name = ref(props.product.name)
const description = ref(props.product.description)
const unitPrice = ref(String(props.product.unitPrice))
const specRows = ref<{ key: string; value: string }[]>(
  props.product.specs
    ? Object.entries(props.product.specs).map(([key, value]) => ({ key, value }))
    : [{ key: '', value: '' }],
)

const saving = ref(false)
const error = ref('')

watch(
  () => props.product.id,
  () => {
    name.value = props.product.name
    description.value = props.product.description
    unitPrice.value = String(props.product.unitPrice)
    specRows.value = props.product.specs
      ? Object.entries(props.product.specs).map(([key, value]) => ({ key, value }))
      : [{ key: '', value: '' }]
  },
)

function addSpecRow() {
  specRows.value.push({ key: '', value: '' })
}

function removeSpecRow(index: number) {
  if (specRows.value.length <= 1) {
    specRows.value = [{ key: '', value: '' }]
    return
  }
  specRows.value.splice(index, 1)
}

function buildSpecsPayload(): Record<string, string> | null {
  const entries = specRows.value
    .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
    .filter((row) => row.key && row.value)
  return entries.length ? Object.fromEntries(entries.map((e) => [e.key, e.value])) : null
}

async function onSubmit() {
  error.value = ''
  const price = Number.parseFloat(unitPrice.value)
  if (!name.value.trim() || !description.value.trim()) {
    error.value = 'Заповніть назву та опис.'
    return
  }
  if (!Number.isFinite(price) || price <= 0) {
    error.value = 'Вкажіть коректну ціну.'
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/products/${props.product.id}`, {
      method: 'PATCH',
      body: {
        name: name.value.trim(),
        description: description.value.trim(),
        unitPrice: price,
        specs: buildSpecsPayload(),
      },
    })
    emit('saved')
    emit('close')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage ?? 'Не вдалося зберегти зміни.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="product-edit-title"
    @click.self="emit('close')"
  >
    <form
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
      @submit.prevent="onSubmit"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="product-edit-title" class="text-lg font-semibold">Редагувати дані</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ product.sku }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Закрити"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="space-y-4">
        <UiInput id="edit-name" v-model="name" label="Назва" required />
        <label class="block space-y-1 text-sm">
          <span class="text-slate-700 dark:text-slate-300">Опис</span>
          <textarea
            v-model="description"
            rows="4"
            required
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <UiInput id="edit-price" v-model="unitPrice" label="Ціна (USD)" type="number" min="0.01" step="0.01" required />

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Технічні характеристики</span>
            <UiButton type="button" variant="secondary" @click="addSpecRow">Додати рядок</UiButton>
          </div>
          <div
            v-for="(row, index) in specRows"
            :key="index"
            class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input v-model="row.key" placeholder="Параметр" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <input v-model="row.value" placeholder="Значення" class="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
            <UiButton type="button" variant="danger" @click="removeSpecRow(index)">×</UiButton>
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <UiButton type="button" variant="secondary" @click="emit('close')">Скасувати</UiButton>
          <UiButton type="submit" :loading="saving">Зберегти</UiButton>
        </div>
      </div>
    </form>
  </div>
</template>
