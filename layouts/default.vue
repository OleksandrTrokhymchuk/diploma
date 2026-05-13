<script setup lang="ts">
import ChatSidebar from '~/widgets/chat-sidebar/ChatSidebar.vue'

const route = useRoute()
const hiddenOnRoutes = ['/login', '/register']
const showChat = computed(() => !hiddenOnRoutes.includes(route.path))
</script>

<template>
  <div>
    <slot />
    <ChatSidebar v-if="showChat" />
  </div>
</template>
