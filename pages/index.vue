<script setup lang="ts">
import StockSummaryWidget from '~/widgets/stock-summary/StockSummaryWidget.vue'

const { theme, toggleTheme } = useAppTheme()
const isDark = computed(() => theme.value === 'dark')
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
    <header
      class="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
      >
        <div>
          <h1 class="text-lg font-semibold tracking-tight sm:text-xl">РобоСклад</h1>
          <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Платформа управління складом компонентів робототехніки
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

    <main class="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-14">
      <section class="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-gradient-to-br dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/80 sm:p-12">
        <div class="max-w-3xl space-y-5">
          <h2 class="text-3xl font-bold tracking-tight sm:text-5xl">
            Єдине вікно для складу, закупівель і аналітики
          </h2>
          <p class="text-base text-zinc-600 dark:text-zinc-300 sm:text-lg">
            Контролюйте залишки промислових компонентів, отримуйте рекомендації щодо поповнення та швидко знаходьте потрібні позиції в каталозі.
          </p>
          <NuxtLink
            to="/catalog"
            class="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Перейти до каталогу
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-4">
        <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">Можливості платформи</h3>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
            <h4 class="text-base font-semibold">Розумний пошук</h4>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Знаходьте компоненти за описом задачі, категорією та виробником.
            </p>
          </article>
          <article class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
            <h4 class="text-base font-semibold">Прогнозування запасів</h4>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Автоматичний аналіз ризиків дефіциту та прогноз потреби в поповненні.
            </p>
          </article>
          <article class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
            <h4 class="text-base font-semibold">Контроль операцій</h4>
            <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Історія рухів залишків, ролі користувачів і централізоване управління каталогом.
            </p>
          </article>
        </div>
      </section>

      <section class="space-y-4">
        <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">Огляд показників</h3>
        <StockSummaryWidget />
      </section>

      <section class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 class="text-xl font-semibold tracking-tight sm:text-2xl">Аналітика Скаут</h3>
        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Скористайтеся плаваючою кнопкою в правому нижньому куті, щоб отримати контекстні відповіді про склад і залишки на будь-якій сторінці.
        </p>
      </section>
    </main>
  </div>
</template>
