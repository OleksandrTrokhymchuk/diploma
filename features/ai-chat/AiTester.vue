<script setup lang="ts">
import type { ChatApiBody, ChatApiResponse, ComponentsApiResponse } from '~/shared/api/types'
import { simpleMarkdownToHtml } from '~/shared/lib/simpleMarkdownToHtml'

const input = ref('')
const nonce = ref(0)

const body = computed<ChatApiBody>(() => ({
  message: input.value.trim(),
  _requestId: nonce.value,
}))

const { data, error, status, execute } = useFetch<ChatApiResponse>('/api/ai/chat', {
  method: 'POST',
  body,
  immediate: false,
  watch: false,
})

const isLoading = computed(() => status.value === 'pending')

const {
  data: componentsData,
  status: componentsStatus,
  error: componentsError,
  refresh: refreshComponents,
} = useFetch<ComponentsApiResponse>('/api/components', {
  method: 'GET',
  server: false,
})

const isComponentsLoading = computed(() => componentsStatus.value === 'pending')
const components = computed(() => componentsData.value?.items ?? [])

const replyMarkdown = computed(() => {
  const r = data.value?.reply
  return r ? r.trim() : ''
})

const replyHtml = computed(() => {
  return replyMarkdown.value ? simpleMarkdownToHtml(replyMarkdown.value) : ''
})

const errorText = computed(() => {
  const err = error.value as
    | (Error & { statusMessage?: string; data?: { message?: string; statusMessage?: string } })
    | null
  if (!err) return ''
  return (
    err.data?.statusMessage
    || err.data?.message
    || err.statusMessage
    || err.message
    || 'Помилка запиту'
  )
})

async function send() {
  const text = input.value.trim()
  if (!text || isLoading.value) return
  nonce.value += 1
  await nextTick()
  await execute()
}
</script>

<template>
  <section
    class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6"
  >
    <h2 class="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      Тест асистента (Gemini)
    </h2>
    <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
      Запит обробляється на сервері; ключ не потрапляє у браузер.
    </p>

    <form class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="send">
      <label class="block min-w-0 flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <span class="mb-1.5 block">Повідомлення</span>
        <input
          v-model="input"
          type="text"
          autocomplete="off"
          placeholder="Наприклад: порівняй DC-редукторний мотор і кроковий для CNC"
          class="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 transition placeholder:text-zinc-400 focus:border-emerald-500/50 focus:bg-white focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-950"
          :disabled="isLoading"
        />
      </label>
      <button
        type="submit"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        :disabled="isLoading || !input.trim()"
      >
        <span
          v-if="isLoading"
          class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
          aria-hidden="true"
        />
        <span>{{ isLoading ? 'Чекаємо…' : 'Надіслати' }}</span>
      </button>
    </form>

    <div
      class="mt-5 min-h-[120px] rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-200"
    >
      <p v-if="isLoading" class="text-zinc-500 dark:text-zinc-400">Генерується відповідь…</p>
      <p v-else-if="error" class="text-red-600 dark:text-red-400">
        {{ errorText }}
      </p>
      <div
        v-else-if="replyHtml"
        class="analysis-markdown"
        v-html="replyHtml"
      />
      <p v-else class="text-zinc-500 dark:text-zinc-400">Відповідь зʼявиться тут.</p>
    </div>

    <div class="mt-6">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Дані з бази (компоненти)
        </h3>
        <button
          type="button"
          class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          :disabled="isComponentsLoading"
          @click="refreshComponents()"
        >
          {{ isComponentsLoading ? 'Оновлюється…' : 'Оновити' }}
        </button>
      </div>

      <div
        class="max-h-80 overflow-auto rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/50"
      >
        <p v-if="isComponentsLoading" class="text-sm text-zinc-500 dark:text-zinc-400">
          Завантаження компонентів з БД…
        </p>
        <p v-else-if="componentsError" class="text-sm text-red-600 dark:text-red-400">
          Не вдалося завантажити дані з БД.
        </p>
        <div v-else-if="components.length" class="space-y-2">
          <div
            v-for="item in components"
            :key="item.id"
            class="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p class="font-medium text-zinc-900 dark:text-zinc-100">
              {{ item.name }} ({{ item.model }})
            </p>
            <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              SKU: {{ item.sku }} · {{ item.manufacturer }} · Залишок: {{ item.quantityOnHand }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-zinc-500 dark:text-zinc-400">
          У базі ще немає компонентів.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.analysis-markdown :deep(h2) {
  margin: 0.25rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}

.analysis-markdown :deep(h3) {
  margin: 0.25rem 0 0.4rem;
  font-size: 0.95rem;
  font-weight: 600;
}

.analysis-markdown :deep(p) {
  margin: 0.2rem 0;
}

.analysis-markdown :deep(ul) {
  margin: 0.3rem 0 0.5rem 1.1rem;
  list-style: disc;
}

.analysis-markdown :deep(li) {
  margin: 0.15rem 0;
}

.analysis-markdown :deep(code) {
  border-radius: 0.25rem;
  padding: 0.1rem 0.35rem;
  background: rgba(113, 113, 122, 0.2);
  font-size: 0.85em;
}
</style>
