<script setup lang="ts">
import ProductGrid from '~/widgets/product-grid/ProductGrid.vue'

const { user, isAdmin, refresh, logout } = useUserSession()
await refresh()
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <h1 class="text-lg font-semibold sm:text-xl">Каталог компонентів робототехніки</h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Моніторинг запасів і закупівель для промислової автоматизації</p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <NuxtLink
            v-if="isAdmin"
            to="/catalog/manage"
            class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Управління
          </NuxtLink>
          <NuxtLink
            v-if="isAdmin"
            to="/admin/users"
            class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Користувачі
          </NuxtLink>
          <template v-if="user">
            <span class="hidden text-sm text-zinc-500 sm:inline dark:text-zinc-400">
              {{ user.firstName }} · {{ user.email }}
            </span>
            <button
              type="button"
              class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              @click="logout()"
            >
              Вийти
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Увійти
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Реєстрація
            </NuxtLink>
          </template>
          <NuxtLink
            to="/cart"
            class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Кошик
          </NuxtLink>
          <NuxtLink
            to="/"
            class="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Головна
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <ProductGrid />
    </main>
  </div>
</template>
