<template>
  <v-container>
    <!--
// v0 by Vercel.
// https://v0.dev/t/thAreLk0PdJ
-->

    <div class="flex min-h-screen w-full">
      <main class="flex-1 p-4 sm:p-6 md:p-8">
        <div class="mx-auto max-w-5xl">
          <div class="space-y-12">
            <!-- Sección Hero -->
            <section class="text-center">
              <h1 class="text-4xl font-bold mb-4">Guía de Agro Assist</h1>
              <p class="text-xl text-muted-foreground max-w-3xl mx-auto">
                Plataforma integral para la gestión agrícola inteligente
              </p>
            </section>

            <!-- Funcionalidades Clave (Ahora primero) -->
            <section>
              <h2 class="text-3xl font-bold mb-8">Funcionalidades Clave</h2>
              <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <!-- Siembras/Proyectos -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center mb-4">
                    <v-icon color="green" class="mr-2">mdi-sprout</v-icon>
                    <h3 class="text-xl font-semibold">Siembras y Proyectos</h3>
                  </div>
                  <p class="text-muted-foreground mb-4">
                    Centro de control para la gestión integral de tus cultivos:
                  </p>
                  <ul class="list-disc pl-5 space-y-2">
                    <li>Organización por ciclos de cultivo</li>
                    <li>Seguimiento de estados y progreso</li>
                    <li>Vinculación con zonas y actividades</li>
                    <li>Métricas específicas por siembra</li>
                  </ul>
                </div>

                <!-- Zonas -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center mb-4">
                    <v-icon color="green" class="mr-2">mdi-map</v-icon>
                    <h3 class="text-xl font-semibold">Zonas de Cultivo</h3>
                  </div>
                  <p class="text-muted-foreground mb-4">
                    Gestión espacial de tus áreas productivas:
                  </p>
                  <ul class="list-disc pl-5 space-y-2">
                    <li>Definición de áreas de trabajo</li>
                    <li>Clasificación por tipos de zona</li>
                    <li>Control de áreas activas</li>
                    <li>Asociación con siembras</li>
                  </ul>
                </div>

                <!-- Actividades -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center mb-4">
                    <v-icon color="green" class="mr-2">mdi-calendar-check</v-icon>
                    <h3 class="text-xl font-semibold">Actividades</h3>
                  </div>
                  <p class="text-muted-foreground mb-4">Planificación y seguimiento operativo:</p>
                  <ul class="list-disc pl-5 space-y-2">
                    <li>Creación de tareas específicas</li>
                    <li>Asignación a zonas y siembras</li>
                    <li>Estados de progreso</li>
                    <li>Historial de actividades</li>
                  </ul>
                </div>

                <!-- Recordatorios -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center mb-4">
                    <v-icon color="green" class="mr-2">mdi-bell</v-icon>
                    <h3 class="text-xl font-semibold">Recordatorios</h3>
                  </div>
                  <p class="text-muted-foreground mb-4">Sistema de alertas y seguimiento:</p>
                  <ul class="list-disc pl-5 space-y-2">
                    <li>Notificaciones por actividad</li>
                    <li>Priorización de tareas</li>
                    <li>Estados de completitud</li>
                    <li>Vinculación con calendario</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Guía de Uso por Sección - Versión Mejorada -->
            <section class="mt-12">
              <h2 class="text-3xl font-bold mb-8">Guía de Uso por Sección</h2>
              <div class="space-y-8">
                <!-- Nueva Sección: Registro y Acceso -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-semibold flex items-center">
                      <v-icon color="green" class="mr-2">mdi-account-key</v-icon>
                      Registro y Acceso
                    </h3>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-blue-800">
                        📝 Registro de Usuario
                      </h4>
                      <ol class="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Haz clic en "Crear Cuenta"</li>
                        <li>Completa el formulario con tus datos</li>
                        <li>Verifica tu correo electrónico</li>
                        <li>Selecciona tu rol (Agricultor/Técnico)</li>
                      </ol>
                      <v-btn
                        color="primary"
                        @click="handleNavigation('/registro', true)"
                        :disabled="authStore.isLoggedIn"
                        class="mt-4 w-full"
                      >
                        <v-icon left>mdi-account-plus</v-icon>
                        Crear Cuenta
                      </v-btn>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-green-800">
                        🔑 Acceso a la Plataforma
                      </h4>
                      <ul class="list-decimal pl-5 space-y-2 text-green-700">
                        <li>Usa tu correo y contraseña</li>
                        <li>Recuperación de contraseña integrada</li>
                        <li>Autenticación en dos pasos opcional</li>
                        <li>Roles y permisos configurables</li>
                      </ul>
                      <v-btn
                        color="success"
                        @click="handleNavigation('/login', true)"
                        :disabled="authStore.isLoggedIn"
                        class="mt-4 w-full"
                      >
                        <v-icon left>mdi-login</v-icon>
                        Iniciar Sesión
                      </v-btn>
                    </div>
                  </div>
                </div>

                <!-- Siembras/Proyectos -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-semibold flex items-center">
                      <v-icon color="green" class="mr-2">mdi-sprout</v-icon>
                      Siembras y Proyectos
                    </h3>
                    <v-btn
                      color="green-lighten-2"
                      @click="handleNavigation('/siembras')"
                      class="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <v-icon left>mdi-arrow-right</v-icon>
                      Ir a Siembras
                    </v-btn>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-green-800">Cómo empezar</h4>
                      <ol class="list-decimal pl-5 space-y-2 text-green-700">
                        <li>Crear nueva siembra desde el botón "+"</li>
                        <li>Definir tipo de cultivo y fechas clave</li>
                        <li>Asignar zonas de cultivo relacionadas</li>
                        <li>Configurar métricas específicas</li>
                      </ol>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-blue-800">
                        ⚙️ Funcionalidades Clave
                      </h4>
                      <ul class="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Seguimiento de ciclo de vida completo</li>
                        <li>Visualización de progreso en timeline</li>
                        <li>Reportes de productividad</li>
                        <li>Integración con actividades</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Zonas -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-semibold flex items-center">
                      <v-icon color="green" class="mr-2">mdi-map</v-icon>
                      Zonas de Cultivo
                    </h3>
                    <v-btn
                      color="green-lighten-2"
                      @click="handleNavigation('/zonas')"
                      class="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <v-icon left>mdi-arrow-right</v-icon>
                      Ir a Zonas
                    </v-btn>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-green-800">
                        📍 Configuración Inicial
                      </h4>
                      <ol class="list-decimal pl-5 space-y-2 text-green-700">
                        <li>Definir límites geográficos</li>
                        <li>Clasificar por tipo de zona</li>
                        <li>Establecer características del suelo</li>
                        <li>Asignar responsable</li>
                      </ol>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-blue-800">📊 Gestión Avanzada</h4>
                      <ul class="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Mapa interactivo de zonas</li>
                        <li>Historial de uso del terreno</li>
                        <li>Capacidad de carga animal/vegetal</li>
                        <li>Alertas de mantenimiento</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Actividades -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-semibold flex items-center">
                      <v-icon color="green" class="mr-2">mdi-calendar-check</v-icon>
                      Gestión de Actividades
                    </h3>
                    <v-btn
                      color="green-lighten-2"
                      @click="handleNavigation('/actividades')"
                      class="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <v-icon left>mdi-arrow-right</v-icon>
                      Ir a Actividades
                    </v-btn>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-green-800">📅 Planificación</h4>
                      <ol class="list-decimal pl-5 space-y-2 text-green-700">
                        <li>Crear nueva actividad</li>
                        <li>Asignar recursos y personal</li>
                        <li>Establecer fechas límite</li>
                        <li>Priorizar tareas</li>
                      </ol>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-blue-800">✅ Ejecución</h4>
                      <ul class="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Seguimiento en tiempo real</li>
                        <li>Registro de avances</li>
                        <li>Notificaciones de estado</li>
                        <li>Generación de reportes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Recordatorios -->
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-2xl font-semibold flex items-center">
                      <v-icon color="green" class="mr-2">mdi-bell</v-icon>
                      Sistema de Recordatorios
                    </h3>
                    <v-btn
                      color="green-lighten-2"
                      @click="handleNavigation('/recordatorios')"
                      class="shadow-md hover:shadow-lg transition-shadow"
                    >
                      <v-icon left>mdi-arrow-right</v-icon>
                      Ir a Recordatorios
                    </v-btn>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-green-800">🔔 Configuración</h4>
                      <ol class="list-decimal pl-5 space-y-2 text-green-700">
                        <li>Crear nuevo recordatorio</li>
                        <li>Establecer prioridad</li>
                        <li>Vincular a actividad/zona</li>
                        <li>Programar notificaciones</li>
                      </ol>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-lg font-semibold mb-3 text-blue-800">📈 Seguimiento</h4>
                      <ul class="list-disc pl-5 space-y-2 text-blue-700">
                        <li>Historial completo</li>
                        <li>Estados (pendiente/completado)</li>
                        <li>Integración con calendario</li>
                        <li>Alertas escalables</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Arquitectura Técnica (Actualizada) -->
            <section>
              <h2 class="text-3xl font-bold mb-6">Arquitectura Técnica</h2>
              <div class="grid gap-6 md:grid-cols-2">
                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <h3 class="text-xl font-semibold mb-4">Stack Tecnológico</h3>
                  <div class="space-y-4">
                    <div class="flex items-center">
                      <v-icon color="green" class="mr-2">mdi-vuejs</v-icon>
                      <span>Vue.js 3 + Vuetify</span>
                    </div>
                    <div class="flex items-center">
                      <v-icon color="green" class="mr-2">mdi-database</v-icon>
                      <span>PocketBase Backend</span>
                    </div>
                    <div class="flex items-center">
                      <v-icon color="green" class="mr-2">mdi-state-machine</v-icon>
                      <span>Gestor de Estado Pinia</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border bg-background p-6 shadow-lg">
                  <h3 class="text-xl font-semibold mb-4">Características Técnicas</h3>
                  <ul class="list-disc pl-5 space-y-2">
                    <li>Modo offline con sincronización posterior</li>
                    <li>Persistencia de datos local</li>
                    <li>Gestión de estados con Pinia</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  </v-container>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()

const handleNavigation = (routePath, isAuthButton = false) => {
  console.log('handleNavigation called:', {
    routePath,
    isAuthButton,
    isLoggedIn: authStore.isLoggedIn
  })

  // Si es botón de auth y está logueado, no hacemos nada
  if (isAuthButton && authStore.isLoggedIn) {
    console.log('Auth button clicked while logged in - no action')
    return
  }

  // Si no está logueado, mostramos el modal de login
  if (!authStore.isLoggedIn) {
    console.log('User not logged in - showing login dialog')
    authStore.showLoginDialog = true
    return
  }

  // Si está logueado y no es botón de auth, navegamos
  if (!isAuthButton) {
    console.log('Navigating to:', routePath)
    router.push(routePath)
  }
}
</script>
