<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'

const { theme, toggleTheme } = useAppTheme()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white/95 text-slate-800 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/95 dark:text-amber-100 dark:ring-white/10 dark:hover:bg-slate-800"
    :aria-label="theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'"
    :title="theme === 'dark' ? 'Світла тема' : 'Темна тема'"
    @click="toggleTheme"
  >
    <Sun v-if="theme === 'dark'" class="h-5 w-5" :stroke-width="1.75" aria-hidden="true" />
    <Moon v-else class="h-5 w-5" :stroke-width="1.75" aria-hidden="true" />
  </button>
</template>
