<template>
  <header class="w-100 bg-background shadow-sm p-0 mb-4">
    <div class="profile-container mt-0 mx-0 w-100">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
        <!-- Bloque Izquierdo: Título y Chips -->
        <div class="w-full sm:flex-grow">
          <h3 class="profile-title text-sm sm:text-lg mb-2 sm:mb-0 d-flex align-center flex-wrap gap-2">
            <v-btn
              v-if="showBack"
              icon="mdi-arrow-left"
              variant="text"
              color="primary"
              size="small"
              class="mr-1"
              @click="$emit('back')"
            ></v-btn>
            {{ title }}
            <!-- Slot para que la vista inyecte sus chips -->
            <slot name="chips"></slot>
          </h3>
        </div>
        
        <!-- Bloque Derecho: Botones y Acciones -->
        <div class="actions-wrapper z-10 w-full sm:w-auto d-flex flex-wrap gap-2 justify-start sm:justify-end mt-3 sm:mt-0">
          <slot name="actions"></slot>
        </div>
      </div>

      <!-- Imagen de fondo difuminada -->
      <div class="avatar-container" v-if="bgImage">
        <img :src="bgImage" alt="Header Background" class="avatar-image" />
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  bgImage: {
    type: String,
    default: ''
  },
  showBack: {
    type: Boolean,
    default: false
  }
})

defineEmits(['back'])
</script>

<style scoped>
/* Las clases .profile-container, .profile-title y .avatar-container ya están definidas globalmente en main.css */
</style>
