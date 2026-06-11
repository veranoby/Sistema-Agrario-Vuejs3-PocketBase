<template>
  <v-container class="fill-height">
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" class="text-center">
        <v-icon color="warning" size="100">mdi-alert-circle-outline</v-icon>
        <h1 class="text-h4 mt-4">Acceso Denegado</h1>
        <p class="  mt-4 text-grey-darken-1">
          El plan de suscripción de su hacienda ha expirado o se encuentra en una versión gratuita.
          Actualmente, solo el administrador de la hacienda tiene acceso al sistema bajo este plan.
        </p>
        <p class="  mt-2 text-grey-darken-1">
          Por favor, comuníquese con el administrador para restablecer el acceso.
        </p>
        <v-btn color="primary" class="mt-6" to="/" rounded="pill">
          Volver al Inicio
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
</script>
