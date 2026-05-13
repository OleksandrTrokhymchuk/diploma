<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import type { AdminUserListItem, UserRole } from '~/shared/api/types'
import { formatUserRole } from '~/shared/lib/displayLabels'

definePageMeta({ middleware: 'admin-only' })

const { data, refresh, pending, error } = await useFetch<AdminUserListItem[]>('/api/admin/users')
const { user: sessionUser, refresh: refreshSession } = useUserSession()
const users = computed(() => data.value ?? [])
const changingRoleId = ref<string | null>(null)
const roleChangeError = ref<string | null>(null)

async function toggleRole(user: AdminUserListItem) {
  changingRoleId.value = user.id
  roleChangeError.value = null
  try {
    const nextRole: UserRole = user.role === 'ADMIN' ? 'WORKER' : 'ADMIN'
    await $fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: { role: nextRole },
    })
    await refresh()
    if (sessionUser.value?.id === user.id) {
      await refreshSession()
    }
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    roleChangeError.value = err.data?.statusMessage ?? 'Не вдалося змінити роль.'
  } finally {
    changingRoleId.value = null
  }
}
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div>
          <h1 class="text-lg font-semibold">Адміністрування користувачів</h1>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Доступ лише для адміністраторів</p>
        </div>
        <NuxtLink to="/catalog" class="rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
          До каталогу
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
      <div class="flex justify-end">
        <UiButton type="button" variant="secondary" :loading="pending" @click="refresh()">Оновити</UiButton>
      </div>

      <p v-if="roleChangeError" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
        {{ roleChangeError }}
      </p>

      <p v-if="error" class="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
        Не вдалося завантажити користувачів.
      </p>

      <div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table class="min-w-full text-sm">
          <thead class="bg-zinc-100 text-left dark:bg-zinc-800/80">
            <tr>
              <th class="px-4 py-3 font-medium">Ім'я</th>
              <th class="px-4 py-3 font-medium">Електронна пошта</th>
              <th class="px-4 py-3 font-medium">Роль</th>
              <th class="px-4 py-3 font-medium">Дія</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-t border-zinc-200 dark:border-zinc-800">
              <td class="px-4 py-3">{{ user.firstName }} {{ user.lastName }}</td>
              <td class="px-4 py-3">{{ user.email }}</td>
              <td class="px-4 py-3">{{ formatUserRole(user.role) }}</td>
              <td class="px-4 py-3">
                <UiButton
                  type="button"
                  variant="secondary"
                  :loading="changingRoleId === user.id"
                  @click="toggleRole(user)"
                >
                  {{ user.role === 'ADMIN' ? 'Зробити робітником' : 'Зробити адміністратором' }}
                </UiButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
