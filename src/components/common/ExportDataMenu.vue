<template>
  <v-menu>
    <template v-slot:activator="{ props }">
      <div v-bind="props">
        <slot name="trigger">
          <v-btn color="secondary" prepend-icon="mdi-export">
            Exportar
          </v-btn>
        </slot>
      </div>
    </template>

    <v-list density="compact">
      <v-list-item
        v-for="(exporter, index) in exporters"
        :key="index"
        @click="exporter.action"
      >
        <template v-slot:prepend v-if="exporter.icon">
          <v-icon :icon="exporter.icon" size="small" class="mr-2"></v-icon>
        </template>
        <v-list-item-title>{{ exporter.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
const props = defineProps({
  /**
   * Array of exporters
   * @type {Array<{ label: string, action: function, icon?: string }>}
   */
  exporters: {
    type: Array,
    required: true,
    default: () => []
  }
})
</script>

<style scoped>
</style>
