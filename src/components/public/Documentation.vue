<template>
  <v-container>
    <div class="flex min-h-screen w-full bg-slate-50">
      <main class="flex-1 p-4 sm:p-6 md:p-8">
        <div class="mx-auto max-w-5xl">
          <div class="space-y-12">
            <!-- Sección Hero -->
            <section class="text-center py-6">
              <h1 class="text-4xl font-extrabold mb-4 text-green-900 tracking-tight">Guía y Documentación de ConAgri</h1>
              <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
                Plataforma integral para la gestión agrícola inteligente, trazabilidad criptográfica y resiliencia offline.
              </p>
            </section>

            <!-- Funcionalidades Clave (6 Módulos Reales) -->
            <section>
              <h2 class="text-3xl font-bold mb-8 text-green-900 text-center">Funcionalidades Clave</h2>
              <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <!-- 1. Siembras/Proyectos -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-sprout</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Siembras y Proyectos</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Control absoluto de los ciclos de siembra, permitiendo el rastreo de etapas y estados fenológicos en sus lotes de cultivo de forma dinámica.
                    </p>
                  </div>
                </div>

                <!-- 2. Gestión Financiera -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-cash-multiple</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Gestión Financiera</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Clasifique y asocie costos fijos e insumos a proyectos específicos para calcular el Retorno de Inversión (ROI) real de su cosecha.
                    </p>
                  </div>
                </div>

                <!-- 3. Mapeo GIS Leaflet -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-map-marker-path</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Mapeo GIS Leaflet</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Herramientas de dibujo en mapa para definir visualmente las zonas de cultivo, lotes de terreno y áreas de amortiguamiento ecológico.
                    </p>
                  </div>
                </div>

                <!-- 4. Firma Criptográfica RSA -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-shield-check</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Firma Criptográfica RSA</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Garantice la inmutabilidad legal de sus bitácoras. Cada tarea completada en campo es sellada con firmas seguras RSA-PSS.
                    </p>
                  </div>
                </div>

                <!-- 5. Asistente IA Agronómico -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-robot</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Asistente IA Agronómico</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Consulte diagnósticos de plagas y fertilización. La IA genera "Action Cards" estructuradas para crear tareas en un solo clic.
                    </p>
                  </div>
                </div>

                <!-- 6. Resiliencia Offline-First -->
                <div class="rounded-xl border bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div class="flex items-center mb-3">
                      <v-icon color="success" class="mr-2">mdi-sync-off</v-icon>
                      <h3 class="text-lg font-bold text-green-900">Resiliencia Offline</h3>
                    </div>
                    <p class="text-muted-foreground text-xs leading-relaxed">
                      Almacene registros localmente en IndexedDB. Al recuperar internet, la cola atómica sincroniza todo automáticamente con PocketBase.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <!-- Guía de Uso por Sección -->
            <section class="mt-12">
              <h2 class="text-3xl font-bold mb-8 text-green-950 text-center">Guía de Uso por Sección</h2>
              <div class="space-y-8">
                
                <!-- Sección 1: Registro y Acceso -->
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center text-green-900">
                      <v-icon color="success" class="mr-2">mdi-account-key</v-icon>
                      Registro y Acceso
                    </h3>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-blue-900">📝 Registro de Cuenta</h4>
                      <ol class="list-decimal pl-5 space-y-1 text-xs text-blue-800">
                        <li>Presione "Crear Cuenta" en el portal de acceso.</li>
                        <li>Complete sus datos (nombre, email y contraseña).</li>
                        <li>Establezca la Hacienda inicial de trabajo.</li>
                        <li>Invite a colaboradores asignándoles roles de Auditor u Operador.</li>
                      </ol>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-green-900">🔑 Control de Acceso RBAC</h4>
                      <ul class="list-disc pl-5 space-y-1 text-xs text-green-800">
                        <li><strong>Administrador:</strong> Gestiona usuarios, haciendas y suscripciones de la plataforma.</li>
                        <li><strong>Operador:</strong> Registra labores diarias en campo y realiza firmas de actividades.</li>
                        <li><strong>Auditor:</strong> Visualización completa de bitácoras, reportes y validación de firmas RSA.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Sección 2: Siembras y Mapeo GIS -->
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center text-green-900">
                      <v-icon color="success" class="mr-2">mdi-sprout</v-icon>
                      Siembras y Mapeo GIS
                    </h3>
                    <v-btn
                      color="green-lighten-2"
                      @click="handleNavigation('/siembras')"
                      class="shadow-sm text-xs"
                      density="comfortable"
                    >
                      <v-icon left size="18">mdi-arrow-right</v-icon>
                      Ir a Siembras
                    </v-btn>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-green-900">🌱 Ciclo de Siembras</h4>
                      <ol class="list-decimal pl-5 space-y-1 text-xs text-green-800">
                        <li>Navegue a "Siembras" y presione el botón "+".</li>
                        <li>Defina variedad del cultivo, área en hectáreas y fecha estimada.</li>
                        <li>Asocie lotes de terreno delimitados en el mapa GIS.</li>
                        <li>Monitoree las etapas del cultivo (vegetativa, floración, cosecha).</li>
                      </ol>
                    </div>
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-blue-900">🗺️ Delimitación Leaflet</h4>
                      <ul class="list-disc pl-5 space-y-1 text-xs text-blue-800">
                        <li>Ingrese a "Zonas" para ver el mapa de la hacienda.</li>
                        <li>Use la barra de dibujo para trazar polígonos sobre sus lotes.</li>
                        <li>Clasifique las zonas (Producción, Conservación, Almacén).</li>
                        <li>Las coordenadas se guardan localmente para el uso offline.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <!-- Sección 3: Firma Criptográfica RSA (BPA) -->
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center text-green-900">
                      <v-icon color="success" class="mr-2">mdi-shield-check</v-icon>
                      Firma Criptográfica RSA
                    </h3>
                  </div>
                  <div class="bg-yellow-50 p-4 rounded-lg">
                    <h4 class="text-md font-bold mb-2 text-yellow-900">🔏 Flujo de Firma Digital RSA-PSS</h4>
                    <p class="text-xs text-yellow-800 leading-relaxed mb-3">
                      Para garantizar que las bitácoras cumplan con Buenas Prácticas Agrícolas y auditorías internacionales de trazabilidad, el sistema implementa firmas criptográficas asimétricas locales:
                    </p>
                    <ol class="list-decimal pl-5 space-y-2 text-xs text-yellow-800">
                      <li><strong>Generación de Llaves:</strong> En el primer acceso o al completar una tarea por primera vez, el sistema genera de forma transparente un par de llaves (pública y privada) seguras en el almacenamiento local del dispositivo.</li>
                      <li><strong>Firma Operativa:</strong> Al marcar una actividad como "Completada", el operador firma los datos (tarea, insumo, geolocalización) utilizando su llave privada mediante la API WebCrypto.</li>
                      <li><strong>Almacenamiento de Firma:</strong> La firma criptográfica en Base64 se guarda junto a la actividad en PocketBase de forma inmutable.</li>
                      <li><strong>Auditoría Inmediata:</strong> Los auditores pueden ingresar a la bitácora y verificar visualmente el sello digital verde, confirmando la autenticidad y no alteración de los registros.</li>
                    </ol>
                  </div>
                </div>

                <!-- Sección 4: Asistente IA Agronómico (Action Cards) -->
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center text-green-900">
                      <v-icon color="success" class="mr-2">mdi-robot</v-icon>
                      Asistente IA Agronómico
                    </h3>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-purple-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-purple-900">💬 Consultas de Campo</h4>
                      <p class="text-xs text-purple-800 leading-relaxed">
                        Abra la interfaz de chat de la IA para realizar preguntas como: *¿Qué dosis de sulfato de cobre debo aplicar para hongos en aguacates?* o *Genera un plan de riego para suelo arcilloso*. La IA procesará la consulta y responderá basándose en bibliografía agronómica certificada.
                      </p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-green-900">⚡ Action Cards</h4>
                      <p class="text-xs text-green-800 leading-relaxed">
                        Si la IA detecta que la respuesta incluye tareas específicas, generará una **Action Card** interactiva en el chat. Al hacer clic en "Crear Actividad", el sistema extraerá automáticamente el plan sugerido por la IA y creará la tarea en su bitácora pre-rellenada, ahorrándole tiempo operativo.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Sección 5: Operación Offline-First y Finanzas -->
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold flex items-center text-green-900">
                      <v-icon color="success" class="mr-2">mdi-sync-off</v-icon>
                      Offline & Finanzas
                    </h3>
                  </div>
                  <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-blue-900">📶 Sincronización Automática</h4>
                      <ul class="list-disc pl-5 space-y-1 text-xs text-blue-800">
                        <li>El sistema guarda todo de forma atómica en IndexedDB local ante la falta de señal.</li>
                        <li>Un procesador de cola monitorea la disponibilidad de red en tiempo real.</li>
                        <li>Al detectar cobertura, los registros pendientes son empujados ordenadamente hacia PocketBase.</li>
                      </ul>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                      <h4 class="text-md font-bold mb-2 text-green-900">💰 Control Financiero</h4>
                      <ul class="list-disc pl-5 space-y-1 text-xs text-green-800">
                        <li>Registre gastos de insumos, herramientas, jornales e ingresos de ventas.</li>
                        <li>Vincule cada movimiento financiero a una siembra específica.</li>
                        <li>Visualice el panel de análisis financiero para calcular el costo por hectárea y el ROI operativo.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            <!-- Arquitectura Técnica (Actualizada) -->
            <section class="mt-12">
              <h2 class="text-3xl font-bold mb-8 text-green-950 text-center">Arquitectura Técnica</h2>
              <div class="grid gap-6 md:grid-cols-2">
                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 class="text-xl font-bold mb-4 text-green-900 flex items-center">
                    <v-icon color="success" class="mr-2">mdi-layers</v-icon>
                    Stack Tecnológico
                  </h3>
                  <div class="space-y-4 text-xs text-muted-foreground">
                    <div class="flex items-center">
                      <v-icon color="success" class="mr-2" size="18">mdi-vuejs</v-icon>
                      <span><strong>Frontend:</strong> Vue.js 3 + Pinia + Vuetify 3 + Tailwind CSS</span>
                    </div>
                    <div class="flex items-center">
                      <v-icon color="success" class="mr-2" size="18">mdi-database</v-icon>
                      <span><strong>Backend:</strong> PocketBase (Base de datos SQLite embebida + JSVM Hooks)</span>
                    </div>
                    <div class="flex items-center">
                      <v-icon color="success" class="mr-2" size="18">mdi-cached</v-icon>
                      <span><strong>Almacenamiento Local:</strong> IndexedDB (Cola de sincronización)</span>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 class="text-xl font-bold mb-4 text-green-900 flex items-center">
                    <v-icon color="success" class="mr-2">mdi-lock-check</v-icon>
                    Seguridad y Resiliencia
                  </h3>
                  <ul class="list-disc pl-5 space-y-2 text-xs text-muted-foreground">
                    <li>Sesiones de usuario administradas de manera segura vía PocketBase JWT.</li>
                    <li>Firmas locales asimétricas usando la API WebCrypto integrada en navegadores modernos.</li>
                    <li>Cola atómica de sincronización offline con control de concurrencia y re-intentos automáticos.</li>
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

<style scoped>
.text-muted-foreground {
  color: #64748b;
}
</style>
