<script setup lang="ts">
import AiTester from '~/features/ai-chat/AiTester.vue'

const isDark = ref(false)

function applyDarkClass(dark: boolean) {
  if (import.meta.client) {
    document.documentElement.classList.toggle('dark', dark)
  }
}

onMounted(() => {
  const stored = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = stored === 'dark' || (stored !== 'light' && prefersDark)
  applyDarkClass(isDark.value)
})

watch(isDark, (value) => {
  applyDarkClass(value)
  if (import.meta.client) {
    localStorage.setItem('theme', value ? 'dark' : 'light')
  }
})

function toggleTheme() {
  isDark.value = !isDark.value
}
</script>

<template>
  <div
    class="min-h-dvh bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100"
  >
    <header
      class="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
    >
      <div
        class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <div>
          <h1 class="text-lg font-semibold tracking-tight sm:text-xl">
            Робототехніка: семантичний пошук
          </h1>
          <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Дипломний проєкт · тест Gemini
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/catalog"
            class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Каталог
          </NuxtLink>
          <button
            type="button"
            class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            :aria-pressed="isDark"
            @click="toggleTheme"
          >
            {{ isDark ? 'Світла' : 'Темна' }}
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <AiTester />
    </main>
  </div>
</template>
