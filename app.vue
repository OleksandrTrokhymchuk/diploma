<template>
  <div class="relative min-h-dvh">
    <div class="pointer-events-none fixed right-3 top-3 z-[200] sm:right-4 sm:top-4">
      <div class="pointer-events-auto">
        <AppThemeToggle />
      </div>
    </div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
