<script setup lang="ts">
import type { ChatApiBody, ChatApiResponse } from '~/shared/api/types'
import { simpleMarkdownToHtml } from '~/shared/lib/simpleMarkdownToHtml'

type SidebarMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type ChatNotice =
  | { kind: 'overload' }
  | { kind: 'generic'; text: string }

const route = useRoute()

const isOpen = useState<boolean>('scout-chat-open', () => false)
const messages = useState<SidebarMessage[]>('scout-chat-messages', () => [
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: 'Вітаю! Я Скаут — ваш помічник з аналізу запасів. Поставте запит про склад або дефіцит.',
  },
])

const input = ref('')
const loading = ref(false)
const chatNotice = ref<ChatNotice | null>(null)
const submitCooldown = ref(false)
let submitCooldownTimer: ReturnType<typeof setTimeout> | null = null
const SEND_DEBOUNCE_MS = 900

const listRef = ref<HTMLElement | null>(null)

const isProductPage = computed(() => /^\/catalog\/[^/]+$/.test(route.path))
const contextId = computed(() => (isProductPage.value ? String(route.params.id ?? '') : ''))

const renderedMessages = computed(() => messages.value.map((message) => ({
  ...message,
  html: message.role === 'assistant' ? simpleMarkdownToHtml(message.text) : '',
})))

watch(
  () => [messages.value.length, isOpen.value],
  async () => {
    await nextTick()
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  },
)

onUnmounted(() => {
  if (submitCooldownTimer) clearTimeout(submitCooldownTimer)
})

function toggleChat() {
  isOpen.value = !isOpen.value
}

function clearHistory() {
  messages.value = [
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'Історію очищено. Можете почати новий діалог.',
    },
  ]
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || loading.value || submitCooldown.value) return

  chatNotice.value = null
  messages.value.push({ id: crypto.randomUUID(), role: 'user', text })
  input.value = ''
  loading.value = true

  try {
    const body: ChatApiBody = {
      message: text,
      currentUrl: route.fullPath,
      contextId: contextId.value || undefined,
      _requestId: Date.now(),
    }
    const response = await $fetch<ChatApiResponse>('/api/ai/chat', {
      method: 'POST',
      body,
    })
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'assistant',
      text: response.reply?.trim() || 'Не вдалося отримати змістовну відповідь.',
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; status?: number; data?: { statusMessage?: string } }
    const status = err?.statusCode ?? err?.status
    const statusMessage = typeof err?.data?.statusMessage === 'string' ? err.data.statusMessage : ''
    const overload =
      status === 429
      || /перевантажен|quota|rate limit|resource_exhausted/i.test(statusMessage)
    if (overload) {
      chatNotice.value = { kind: 'overload' }
    } else {
      const text =
        statusMessage.trim() || 'Не вдалося зв’язатися зі Скаутом. Спробуйте ще раз пізніше.'
      chatNotice.value = { kind: 'generic', text: text.slice(0, 280) }
    }
  } finally {
    loading.value = false
    submitCooldown.value = true
    if (submitCooldownTimer) clearTimeout(submitCooldownTimer)
    submitCooldownTimer = setTimeout(() => {
      submitCooldown.value = false
      submitCooldownTimer = null
    }, SEND_DEBOUNCE_MS)
  }
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-x-6 opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-6 opacity-0"
    >
      <aside
        v-if="isOpen"
        class="mb-3 flex h-[70vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <header class="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div>
            <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Асистент Скаут</h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">Підтримка складу в реальному часі</p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="clearHistory"
          >
            Очистити історію
          </button>
        </header>

        <div ref="listRef" class="flex-1 space-y-3 overflow-y-auto bg-zinc-50/60 p-4 dark:bg-zinc-950/40">
          <article
            v-for="message in renderedMessages"
            :key="message.id"
            :class="message.role === 'user' ? 'ml-auto w-[88%] rounded-xl bg-emerald-600 p-3 text-sm text-white' : 'mr-auto w-[92%] rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'"
          >
            <p v-if="message.role === 'user'">{{ message.text }}</p>
            <div v-else class="analysis-markdown" v-html="message.html" />
          </article>
          <p v-if="loading" class="text-xs text-zinc-500 dark:text-zinc-400">Скаут аналізує дані…</p>
          <div
            v-if="chatNotice"
            role="status"
            class="rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm leading-snug text-amber-950 shadow-sm dark:border-amber-500/35 dark:bg-amber-950/50 dark:text-amber-100"
          >
            <template v-if="chatNotice.kind === 'overload'">
              🤖 Скаут відпочиває. Спробуйте ще раз за мить
            </template>
            <template v-else>
              {{ chatNotice.text }}
            </template>
          </div>
        </div>

        <form class="border-t border-zinc-200 p-3 dark:border-zinc-800" @submit.prevent="sendMessage">
          <div class="flex gap-2">
            <input
              v-model="input"
              type="text"
              class="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              placeholder="Запитайте про залишки, дефіцит або прогноз..."
              :disabled="loading || submitCooldown"
            >
            <button
              type="submit"
              class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              :disabled="loading || submitCooldown || !input.trim()"
            >
              Надіслати
            </button>
          </div>
        </form>
      </aside>
    </Transition>

    <button
      type="button"
      class="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 transition hover:scale-105 hover:bg-emerald-500"
      @click="toggleChat"
    >
      <span class="text-lg">{{ isOpen ? '×' : 'ШІ' }}</span>
    </button>
  </div>
</template>

<style scoped>
.analysis-markdown :deep(h2),
.analysis-markdown :deep(h3) {
  margin: 0.2rem 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
}

.analysis-markdown :deep(p) {
  margin: 0.15rem 0;
}

.analysis-markdown :deep(ul) {
  margin: 0.25rem 0 0.45rem 1rem;
  list-style: disc;
}
</style>
