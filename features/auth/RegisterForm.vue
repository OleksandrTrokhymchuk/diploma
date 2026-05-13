<script setup lang="ts">
import UiButton from '~/components/ui/UiButton.vue'
import UiInput from '~/components/ui/UiInput.vue'

const router = useRouter()
const { refresh } = useUserSession()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        firstName: firstName.value,
        lastName: lastName.value,
        email: email.value,
        password: password.value,
      },
    })
    await refresh()
    await router.replace('/catalog')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Помилка реєстрації'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <div class="grid gap-5 sm:grid-cols-2">
      <UiInput
        id="reg-first"
        v-model="firstName"
        label="Імʼя"
        autocomplete="given-name"
        required
      />
      <UiInput
        id="reg-last"
        v-model="lastName"
        label="Прізвище"
        autocomplete="family-name"
        required
      />
    </div>
    <UiInput
      id="reg-email"
      v-model="email"
      label="Електронна пошта"
      type="email"
      autocomplete="email"
      placeholder="користувач@компанія.ua"
      required
    />
    <UiInput
      id="reg-password"
      v-model="password"
      label="Пароль"
      type="password"
      autocomplete="new-password"
      placeholder="Мінімум 8 символів"
      required
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>

    <UiButton type="submit" :loading="loading" block>Створити обліковий запис</UiButton>
  </form>
</template>
