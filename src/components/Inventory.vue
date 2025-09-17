<template>
  <v-container>
    <h1>Inventario</h1>
    <v-divider></v-divider>
    <v-row>
      <v-col cols="6">
        <h2>Productos no terminados</h2>
        <v-data-table :headers="headersNoTerminados" :items="productosNoTerminados" />
      </v-col>
      <v-col cols="6">
        <h2>Productos ya terminados</h2>
        <v-data-table :headers="headersTerminados" :items="productosTerminados" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { computed } from 'vue'
import { useStore } from '../store'

export default {
  name: 'InventoryComp',
  setup() {
    const store = useStore()
    const productosNoTerminados = computed(() => store.state.productosNoTerminados)
    const productosTerminados = computed(() => store.state.productosTerminados)

    return {
      productosNoTerminados,
      productosTerminados,
      headersNoTerminados: [
        { text: 'Producto', value: 'producto' },
        { text: 'Cantidad', value: 'cantidad' },
        { text: 'Unidad', value: 'unidad' },
        { text: 'Valor', value: 'valor' }
      ],
      headersTerminados: [
        { text: 'Producto', value: 'producto' },
        { text: 'Cantidad', value: 'cantidad' },
        { text: 'Unidad', value: 'unidad' },
        { text: 'Valor', value: 'valor' }
      ]
    }
  }
}
</script>
