<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import BulkAddAccordion from '~/features/product-management/BulkAddAccordion.vue'
import InventoryTable from '~/widgets/inventory-table/InventoryTable.vue'
import ReplenishmentJournal from '~/widgets/replenishment-journal/ReplenishmentJournal.vue'
import type { InventoryListResponse } from '~/shared/api/types'

definePageMeta({ middleware: 'admin-only' })

const route = useRoute()

type ManageTab = 'stock' | 'inventory' | 'requests'
const activeTab = ref<ManageTab>('stock')

const STOCK_REASONS = [
  { value: 'REPLENISHMENT', label: 'Поповнення' },
  { value: 'ORDER', label: 'Замовлення' },
  { value: 'WRITE_OFF', label: 'Списання' },
] as const

const TABS: { id: ManageTab; label: string }[] = [
  { id: 'stock', label: 'Оновлення запасів' },
  { id: 'inventory', label: 'Інвентар і додавання' },
  { id: 'requests', label: 'Журнал запитів' },
]

const updating = ref(false)
const stockError = ref('')
const success = ref('')
const search = ref('')
const page = ref(1)
const pageSize = 20

const selectedId = ref('')
const changeAmount = ref('')
const reason = ref<(typeof STOCK_REASONS)[number]['value'] | ''>('')
const reasonNote = ref('')

const editProductId = computed(() =>
  typeof route.query.id === 'string' ? route.query.id : '',
)

const query = computed(() => ({
  search: search.value || undefined,
  page: page.value,
  pageSize,
}))

const { data, status, error: fetchError, refresh } = await useFetch<InventoryListResponse>('/api/admin/inventory', {
  query,
})

const items = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1))
const isLoading = computed(() => status.value === 'pending')
const selectedItem = computed(() => items.value.find((item) => item.id === selectedId.value) ?? null)

async function ensureEditProductVisible() {
  const id = editProductId.value
  if (!id || items.value.some((item) => item.id === id)) return
  try {
    const product = await $fetch<{ sku: string }>(`/api/products/${id}`)
    search.value = product.sku
    page.value = 1
    activeTab.value = 'stock'
  } catch {
    /* товар не знайдено */
  }
}

watch(editProductId, (id) => {
  if (id) {
    selectedId.value = id
    activeTab.value = 'stock'
  }
}, { immediate: true })

watch(
  items,
  (list) => {
    if (editProductId.value) {
      if (list.some((item) => item.id === editProductId.value)) {
        selectedId.value = editProductId.value
      }
      return
    }
    if (!selectedId.value && list.length) {
      selectedId.value = list[0]!.id
    } else if (selectedId.value && !list.some((item) => item.id === selectedId.value)) {
      selectedId.value = list[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(editProductId, () => {
  void ensureEditProductVisible()
}, { immediate: true })

watch(search, () => {
  page.value = 1
})

function prevPage() {
  if (page.value > 1) page.value -= 1
}

function nextPage() {
  if (page.value < totalPages.value) page.value += 1
}

async function updateStock() {
  stockError.value = ''
  success.value = ''
  const numericChange = Number(changeAmount.value)

  if (!selectedId.value) {
    stockError.value = 'Оберіть товар.'
    return
  }
  if (!Number.isInteger(numericChange) || numericChange === 0) {
    stockError.value = 'Вкажіть цілу зміну залишку (не 0).'
    return
  }
  if (!reason.value) {
    stockError.value = 'Оберіть причину зміни залишку.'
    return
  }

  updating.value = true
  try {
    await $fetch(`/api/components/${selectedId.value}/stock`, {
      method: 'PATCH',
      body: {
        changeAmount: numericChange,
        reason: reason.value,
        reasonNote: reasonNote.value.trim() || undefined,
      },
    })
    success.value = 'Залишок успішно оновлено.'
    changeAmount.value = ''
    reason.value = ''
    reasonNote.value = ''
    await refresh()
  } catch (e: any) {
    stockError.value = e?.data?.statusMessage ?? 'Помилка оновлення залишку.'
  } finally {
    updating.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <h1 class="text-lg font-semibold">Управління каталогом</h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Доступ лише для адміністраторів</p>
        </div>
        <NuxtLink
          to="/catalog"
          class="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          До каталогу
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <nav class="flex flex-wrap gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          type="button"
          class="rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="activeTab === tab.id
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section v-show="activeTab === 'stock'" class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 class="text-base font-semibold">Оновлення запасів</h2>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">Кожна зміна фіксується в журналі рухів з ідентифікатором користувача та причиною операції.</p>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label class="space-y-1 text-sm md:col-span-2">
            <span>Пошук товару</span>
            <input
              v-model="search"
              type="text"
              placeholder="Назва, артикул, модель або виробник"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
          </label>
          <div class="flex items-end justify-end gap-2">
            <UiButton type="button" variant="secondary" :disabled="page <= 1 || isLoading" @click="prevPage">Назад</UiButton>
            <UiButton type="button" variant="secondary" :disabled="page >= totalPages || isLoading" @click="nextPage">Далі</UiButton>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span>Товар</span>
            <select v-model="selectedId" class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <option v-for="item in items" :key="item.id" :value="item.id">
                {{ item.sku }} — {{ item.name }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span>Зміна залишку (може бути від'ємною)</span>
            <input v-model="changeAmount" type="number" step="1" class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
          </label>
          <label class="space-y-1 text-sm">
            <span>Причина (обов'язково)</span>
            <select v-model="reason" class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="">Оберіть причину</option>
              <option v-for="item in STOCK_REASONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>
          <label class="space-y-1 text-sm">
            <span>Коментар</span>
            <input v-model="reasonNote" type="text" class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
          </label>
        </div>

        <p v-if="selectedItem" class="text-sm text-zinc-500 dark:text-zinc-400">
          Поточний залишок: <span class="font-medium text-zinc-800 dark:text-zinc-200">{{ selectedItem.currentStock }}</span>
        </p>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">Сторінка {{ page }} / {{ totalPages }} · Всього позицій: {{ total }}</p>
        <p v-if="fetchError" class="text-sm text-red-600 dark:text-red-400">Не вдалося завантажити інвентар.</p>
        <p v-if="stockError" class="text-sm text-red-600 dark:text-red-400">{{ stockError }}</p>
        <p v-if="success" class="text-sm text-emerald-600 dark:text-emerald-400">{{ success }}</p>

        <div class="flex justify-end">
          <UiButton type="button" :loading="updating" @click="updateStock">Оновити залишок</UiButton>
        </div>
      </section>

      <section v-show="activeTab === 'inventory'" class="space-y-6">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold">Інвентар (динаміка залишків)</h2>
            <UiButton type="button" variant="secondary" :loading="isLoading" @click="refresh()">Оновити</UiButton>
          </div>
          <InventoryTable :items="items" />
        </section>
        <BulkAddAccordion @created="refresh()" />
      </section>

      <section v-show="activeTab === 'requests'" class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ReplenishmentJournal />
      </section>
    </main>
  </div>
</template>