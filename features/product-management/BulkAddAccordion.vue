<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import type { ProductCategory } from '~/shared/api/types'
import { formatProductCategory } from '~/shared/lib/displayLabels'

type DraftProduct = {
  sku: string
  name: string
  category: ProductCategory
  manufacturer: string
  model: string
  description: string
  imageUrl: string
  unitPrice: string
  minStockLevel: string
  initialStock: string
}
type DraftField = keyof DraftProduct | 'common'

const emit = defineEmits<{ created: [] }>()

const CATEGORY_OPTIONS: ProductCategory[] = ['DISTANCE_SENSOR', 'CAMERA', 'SERVO_DRIVE', 'MANIPULATOR']

const loading = ref(false)
const error = ref('')
const success = ref('')
const activeIndex = ref(0)
const fieldErrors = ref<Record<number, Partial<Record<DraftField, string>>>>({})

function emptyDraft(idx: number): DraftProduct {
  return {
    sku: '',
    name: '',
    category: CATEGORY_OPTIONS[idx % CATEGORY_OPTIONS.length],
    manufacturer: '',
    model: '',
    description: '',
    imageUrl: '',
    unitPrice: '',
    minStockLevel: '0',
    initialStock: '0',
  }
}

const drafts = ref<DraftProduct[]>([emptyDraft(0)])

function categoryLabel(value: ProductCategory) {
  return formatProductCategory(value)
}

function resetDrafts() {
  drafts.value = [emptyDraft(0)]
  fieldErrors.value = {}
  activeIndex.value = 0
}

function addDraft() {
  if (drafts.value.length >= 10) return
  drafts.value.push(emptyDraft(drafts.value.length))
  activeIndex.value = drafts.value.length - 1
}

function removeDraft(index: number) {
  if (drafts.value.length <= 1) return
  drafts.value.splice(index, 1)
  const nextErrors: Record<number, Partial<Record<DraftField, string>>> = {}
  Object.entries(fieldErrors.value).forEach(([k, v]) => {
    const i = Number(k)
    if (i < index) nextErrors[i] = v
    if (i > index) nextErrors[i - 1] = v
  })
  fieldErrors.value = nextErrors
  if (activeIndex.value >= drafts.value.length) {
    activeIndex.value = drafts.value.length - 1
  }
}

function setFieldError(index: number, field: DraftField, message: string) {
  if (!fieldErrors.value[index]) fieldErrors.value[index] = {}
  fieldErrors.value[index]![field] = message
}

function inputClass(index: number, field: DraftField) {
  return fieldErrors.value[index]?.[field]
    ? 'border-red-500 ring-1 ring-red-500/20'
    : 'border-zinc-300 dark:border-zinc-700'
}

async function submitBulkCreate() {
  error.value = ''
  success.value = ''
  fieldErrors.value = {}
  loading.value = true
  try {
    await $fetch('/api/components/bulk', {
      method: 'POST',
      body: {
        products: drafts.value.map((item) => ({
          sku: item.sku.trim(),
          name: item.name.trim(),
          category: item.category,
          manufacturer: item.manufacturer.trim(),
          model: item.model.trim(),
          description: item.description.trim(),
          imageUrl: item.imageUrl.trim() || null,
          unitPrice: Number.parseFloat(item.unitPrice),
          minStockLevel: Number.parseInt(item.minStockLevel, 10),
          initialStock: Number.parseInt(item.initialStock, 10),
        })),
      },
    })
    success.value = 'Товари успішно створено.'
    resetDrafts()
    emit('created')
  } catch (e: any) {
    const rowErrors = e?.data?.data?.rowErrors as Array<{ row: number; field: DraftField; message: string }> | undefined
    const duplicateSkus = e?.data?.data?.duplicateSkus as string[] | undefined
    if (rowErrors?.length) {
      rowErrors.forEach((rowError) => {
        setFieldError(rowError.row, rowError.field, rowError.message)
      })
    }
    if (duplicateSkus?.length) {
      drafts.value.forEach((draft, index) => {
        if (duplicateSkus.includes(draft.sku.trim())) {
          setFieldError(index, 'sku', 'Артикул уже зайнятий')
        }
      })
    }
    error.value = e?.data?.statusMessage ?? 'Не вдалося виконати масове додавання.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold">Масове додавання товарів</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">Акордеон: редагується одна форма, решта згорнуті.</p>
      </div>
      <UiButton type="button" variant="secondary" :disabled="drafts.length >= 10" @click="addDraft">
        Додати ще один товар
      </UiButton>
    </div>

    <div class="space-y-2">
      <article v-for="(draft, idx) in drafts" :key="idx" class="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
          @click="activeIndex = idx"
        >
          <span>Товар #{{ idx + 1 }} — {{ draft.name || 'Новий запис' }}</span>
          <span>{{ activeIndex === idx ? '−' : '+' }}</span>
        </button>
        <div v-if="activeIndex === idx" class="grid grid-cols-1 gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800 md:grid-cols-2">
          <input v-model="draft.sku" placeholder="Артикул" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'sku')">
          <input v-model="draft.name" placeholder="Назва" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'name')">
          <select v-model="draft.category" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'category')">
            <option v-for="category in CATEGORY_OPTIONS" :key="category" :value="category">
              {{ categoryLabel(category) }}
            </option>
          </select>
          <input v-model="draft.manufacturer" placeholder="Виробник" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'manufacturer')">
          <input v-model="draft.model" placeholder="Модель" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'model')">
          <input v-model="draft.imageUrl" placeholder="Посилання на зображення (необовʼязково)" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'imageUrl')">
          <input v-model="draft.unitPrice" type="number" min="0.01" step="0.01" placeholder="Ціна" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'unitPrice')">
          <input v-model="draft.minStockLevel" type="number" min="0" step="1" placeholder="Мін. залишок" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'minStockLevel')">
          <input v-model="draft.initialStock" type="number" min="0" step="1" placeholder="Початковий залишок" class="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'initialStock')">
          <textarea v-model="draft.description" rows="3" placeholder="Опис" class="md:col-span-2 rounded-lg bg-white px-3 py-2 dark:bg-zinc-950" :class="inputClass(idx, 'description')" />
          <div class="md:col-span-2 flex justify-end">
            <UiButton type="button" variant="danger" :disabled="drafts.length <= 1" @click="removeDraft(idx)">
              Видалити цей
            </UiButton>
          </div>
        </div>
      </article>
    </div>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-if="success" class="text-sm text-emerald-600 dark:text-emerald-400">{{ success }}</p>

    <div class="flex justify-end">
      <UiButton type="button" :loading="loading" @click="submitBulkCreate">Зберегти пакет</UiButton>
    </div>
  </section>
</template>
