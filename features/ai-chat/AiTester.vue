<script setup lang="ts">
import type { ChatApiBody, ChatApiResponse } from '~/shared/api/types'
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
    class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-7"
  >
    <h2 class="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
      Інтелектуальний асистент Скаут
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
          placeholder="Наприклад: порівняй сервоприводи для маніпулятора"
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

    <div class="mt-6 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/50">
      <p class="text-sm text-zinc-600 dark:text-zinc-300">
        Потрібен повний перегляд позицій та залишків?
      </p>
      <NuxtLink
        to="/catalog"
        class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Відкрити каталог
      </NuxtLink>
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
