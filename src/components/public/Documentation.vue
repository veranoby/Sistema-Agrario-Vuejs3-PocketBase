<template>
  <v-container>
    <div class="flex min-h-screen w-full bg-slate-50 dark:bg-[#121212]" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <main class="flex-1 p-4 sm:p-6 md:p-8">
        <div class="mx-auto max-w-5xl">
          <div class="space-y-12">
            
            <section class="text-center py-6">
              <h1 class="text-4xl font-extrabold mb-4 text-primary tracking-tight">Centro de Ayuda y Documentación</h1>
              <p class="text-lg text-muted-foreground dark:text-gray-300 max-w-3xl mx-auto">
                Todo lo que necesita saber para dominar ConAgri. Aprenda a mantener su <strong>Libro Diario (Bitácora)</strong> siempre al día, cumpliendo sin esfuerzo los requerimientos para auditorías y certificaciones BPA.
              </p>
            </section>

            <!-- Manuales Especializados -->
            <section>
              <h3 class="text-2xl font-bold mb-6 text-primary flex items-center">
                <v-icon color="primary" class="mr-2">mdi-book-open-page-variant</v-icon>
                Manuales Especializados
              </h3>
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <router-link to="/manuales/ai_assistant_premium" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-robot</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Asistente IA Premium</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Guía de prompts y action cards</span>
                  </div>
                </router-link>
                <router-link to="/manuales/costo_por_hectarea" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-cash-multiple</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Costo por Hectárea</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Cálculo de ROI y reportes</span>
                  </div>
                </router-link>
                <router-link to="/manuales/kardex_bodega" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-warehouse</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Kardex de Bodega</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Inventario y lotes</span>
                  </div>
                </router-link>
                <router-link to="/manuales/nomina_express" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-account-group</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Nómina Express</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Gestión de jornales y pagos</span>
                  </div>
                </router-link>
                <router-link to="/manuales/pdf_bpa" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-file-pdf-box</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Reportes BPA</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Generación para auditorías</span>
                  </div>
                </router-link>
                <router-link to="/manuales/tarjas_campo" target="_blank" class="flex items-center p-4 border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="primary" class="mr-3" size="32">mdi-clipboard-list-outline</v-icon>
                  <div>
                    <h4 class="font-bold text-primary text-sm">Tarjas de Campo</h4>
                    <span class="text-xs text-muted-foreground dark:text-gray-300">Ingreso rápido de labores</span>
                  </div>
                </router-link>
              </div>
            </section>

            <!-- Guía Rápida de Uso -->
            <section class="mt-12">
              <h3 class="text-2xl font-bold mb-6 text-primary flex items-center">
                <v-icon color="primary" class="mr-2">mdi-lightning-bolt</v-icon>
                Guía Rápida: Flujo de Trabajo
              </h3>
              <div class="grid md:grid-cols-2 gap-6">
                <!-- Fase 1 -->
                <div class="rounded-lg border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] p-6 shadow-sm relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <h3 class="text-lg font-bold text-primary mb-2">Fase 1: Siembras</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground dark:text-gray-300 mb-4">
                    <li>El primer paso indispensable en ConAgri es crear la <strong>Siembra</strong> o proyecto agrícola principal.</li>
                    <li>Este paso define el <em>"qué"</em> se va a cultivar o gestionar, estableciendo la base para la trazabilidad de toda la operación.</li>
                  </ul>
                </div>

                <!-- Fase 2 -->
                <div class="rounded-lg border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] p-6 shadow-sm relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                  <h3 class="text-lg font-bold text-primary mb-2">Fase 2: Zonas y Actividades</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground dark:text-gray-300 mb-4">
                    <li>Con la siembra creada, dibuje los lotes en <strong>Zonas</strong> (el <em>"dónde"</em>).</li>
                    <li>Luego registre las <strong>Actividades</strong> estandarizadas (el <em>"cómo"</em>, ej. fertilización, poda).</li>
                    <li>Asocie las zonas y actividades a su siembra inicial para armar la estructura operativa.</li>
                  </ul>
                  <router-link to="/manuales/operacion_diaria" target="_blank" class="text-sm font-bold text-primary hover:underline flex items-center"><v-icon size="16" class="mr-1">mdi-book-open</v-icon> Manual de Operación Diaria</router-link>
                </div>

                <!-- Fase 3 -->
                <div class="rounded-lg border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] p-6 shadow-sm relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
                  <h3 class="text-lg font-bold text-primary mb-2">Fase 3: Control y Bitácora</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground dark:text-gray-300 mb-4">
                    <li>Cree <strong>Programaciones</strong> definiendo el <em>"cuándo"</em> ejecutar las actividades planeadas sobre las zonas de la siembra.</li>
                    <li>Al reportar una programación ejecutada, se firmará criptográficamente y pasará de forma inmutable a su <strong>Libro Diario (Bitácora)</strong>.</li>
                  </ul>
                  <router-link to="/manuales/programaciones_bitacora" target="_blank" class="text-sm font-bold text-primary hover:underline flex items-center"><v-icon size="16" class="mr-1">mdi-book-open</v-icon> Manual de Control</router-link>
                </div>

                <!-- Extras -->
                <div class="rounded-lg border border-green-100 dark:border-[#333] bg-white dark:bg-[#1e1e1e] p-6 shadow-sm relative overflow-hidden">
                  <div class="absolute top-0 left-0 w-1 h-full bg-blue-grey-500"></div>
                  <h3 class="text-lg font-bold text-primary mb-2">Métricas y Finanzas</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground dark:text-gray-300 mb-4">
                    <li>Con la Bitácora alimentándose sola, acceda a <strong>Métricas</strong> para analizar eficiencia y rendimientos.</li>
                    <li>Use <strong>Finanzas</strong> para registrar los costos operativos de su hacienda.</li>
                    <li>Genere reportes de control global listos para BPA.</li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- FAQ Integrado -->
            <section class="mt-12">
              <h3 class="text-2xl font-bold mb-6 text-primary flex items-center">
                <v-icon color="primary" class="mr-2">mdi-frequently-asked-questions</v-icon>
                Preguntas Frecuentes
              </h3>
              
              <v-expansion-panels variant="accordion" class="rounded-lg overflow-hidden border border-green-100 dark:border-[#333]">
                <v-expansion-panel
                  title="¿Cómo garantiza ConAgri el cumplimiento BPA (Buenas Prácticas Agrícolas)?"
                  text="Validamos obligatoriamente fecha, geolocalización, insumos, y firma digital RSA en cada registro, garantizando inmutabilidad y transparencia requerida por GlobalG.A.P. y otros sellos."
                ></v-expansion-panel>
                
                <v-expansion-panel
                  title="¿Puedo registrar actividades en zonas sin cobertura de internet?"
                  text="Sí, nuestra arquitectura Offline-First almacena todo en el dispositivo localmente (IndexedDB). Al recuperar la conexión a internet, se sincroniza automáticamente a la nube de manera segura mediante una cola atómica."
                ></v-expansion-panel>

                <v-expansion-panel
                  title="¿Qué son las Action Cards generadas por la IA?"
                  text="Son recomendaciones agronómicas ejecutables. Si le pregunta al asistente IA sobre control de plagas o riego, este no solo responde, sino que genera una tarjeta desde la cual puede crear la tarea correspondiente con un solo clic."
                ></v-expansion-panel>

                <v-expansion-panel
                  title="¿Para qué sirve el Mapeo GIS y cómo funciona?"
                  text="Permite dibujar polígonos interactivos en el mapa para delimitar con exactitud sus lotes productivos o zonas de conservación. Estas coordenadas se guardan en formato estandarizado GeoJSON y están disponibles offline."
                ></v-expansion-panel>

                <v-expansion-panel
                  title="¿Cuáles son los roles del sistema y qué puede hacer cada uno?"
                  text="El Administrador tiene control total y acceso a métricas y facturación. El Auditor tiene permiso de lectura de bitácoras y validación de firmas (ideal para entes certificadores). El Operador tiene permiso exclusivo para registrar y firmar tareas asignadas en campo."
                ></v-expansion-panel>
              </v-expansion-panels>
            </section>
            
          </div>
        </div>
      </main>
    </div>
  </v-container>
</template>

<script setup>
</script>

<style scoped>
.text-muted-foreground dark:text-gray-300 {
  color: #64748b;
}
</style>
