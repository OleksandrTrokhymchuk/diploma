<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import UiInput from '~/components/ui/UiInput.vue'
import type { PublicUser } from '~/shared/api/types'

const route = useRoute()
const { refresh } = useUserSession()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

function safeRedirectPath(redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/catalog'
  }
  return redirect
}

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await $fetch<{ user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await refresh()
    await navigateTo(safeRedirectPath(route.query.redirect))
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Помилка входу'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <UiInput
      id="login-email"
      v-model="email"
      label="Електронна пошта"
      type="email"
      autocomplete="email"
      placeholder="користувач@компанія.ua"
      required
    />
    <UiInput
      id="login-password"
      v-model="password"
      label="Пароль"
      type="password"
      autocomplete="current-password"
      required
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <UiButton type="submit" :loading="loading" block>Вхід</UiButton>
  </form>
</template>
