<script setup lang="ts">
import RegisterForm from '~/features/auth/RegisterForm.vue'

definePageMeta({ layout: false })
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <div class="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6">
      <div class="mb-8 space-y-1 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">Реєстрація</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">
          Нові користувачі отримують роль працівника складу
        </p>
      </div>
      <div class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <RegisterForm />
        <p class="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Вже є обліковий запис?
          <NuxtLink to="/login" class="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100">
            Увійти
          </NuxtLink>
        </p>
      </div>
      <NuxtLink
        to="/"
        class="mt-8 text-center text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← На головну
      </NuxtLink>
    </div>
  </div>
</template>
