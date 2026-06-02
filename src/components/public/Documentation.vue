<template>
  <v-container>
    <div class="flex min-h-screen w-full bg-slate-50" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <main class="flex-1 p-4 sm:p-6 md:p-8">
        <div class="mx-auto max-w-5xl">
          <div class="space-y-12">
            
            <section class="text-center py-6">
              <h1 class="text-4xl font-extrabold mb-4 text-green-900 tracking-tight">Centro de Ayuda y Documentación</h1>
              <p class="text-lg text-muted-foreground max-w-3xl mx-auto">
                Todo lo que necesita saber para dominar ConAgri. Aprenda a mantener su <strong>Libro Diario (Bitácora)</strong> siempre al día, cumpliendo sin esfuerzo los requerimientos para auditorías y certificaciones BPA.
              </p>
            </section>

            <!-- Manuales Especializados -->
            <section>
              <h2 class="text-2xl font-bold mb-6 text-green-900 flex items-center">
                <v-icon color="success" class="mr-2">mdi-book-open-page-variant</v-icon>
                Manuales Especializados
              </h2>
              <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <router-link to="/manuales/ai_assistant_premium" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-robot</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Asistente IA Premium</h4>
                    <span class="text-xs text-muted-foreground">Guía de prompts y action cards</span>
                  </div>
                </router-link>
                <router-link to="/manuales/costo_por_hectarea" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-cash-multiple</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Costo por Hectárea</h4>
                    <span class="text-xs text-muted-foreground">Cálculo de ROI y reportes</span>
                  </div>
                </router-link>
                <router-link to="/manuales/kardex_bodega" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-warehouse</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Kardex de Bodega</h4>
                    <span class="text-xs text-muted-foreground">Inventario y lotes</span>
                  </div>
                </router-link>
                <router-link to="/manuales/nomina_express" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-account-group</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Nómina Express</h4>
                    <span class="text-xs text-muted-foreground">Gestión de jornales y pagos</span>
                  </div>
                </router-link>
                <router-link to="/manuales/pdf_bpa" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-file-pdf-box</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Reportes BPA</h4>
                    <span class="text-xs text-muted-foreground">Generación para auditorías</span>
                  </div>
                </router-link>
                <router-link to="/manuales/tarjas_campo" target="_blank" class="flex items-center p-4 border border-green-100 bg-white rounded-xl shadow-sm hover:-translate-y-1 hover:shadow-md transition-all text-decoration-none">
                  <v-icon color="success" class="mr-3" size="32">mdi-clipboard-list-outline</v-icon>
                  <div>
                    <h4 class="font-bold text-green-900 text-sm">Tarjas de Campo</h4>
                    <span class="text-xs text-muted-foreground">Ingreso rápido de labores</span>
                  </div>
                </router-link>
              </div>
            </section>

            <!-- Guía Rápida de Uso -->
            <section class="mt-12">
              <h2 class="text-2xl font-bold mb-6 text-green-900 flex items-center">
                <v-icon color="success" class="mr-2">mdi-lightning-bolt</v-icon>
                Guía Rápida de Uso
              </h2>
              <div class="grid md:grid-cols-2 gap-6">
                <div class="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
                  <h3 class="text-lg font-bold text-green-800 mb-2">1. Configuración Inicial</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                    <li>Registre su cuenta y acceda al panel.</li>
                    <li>Navegue a <strong>Zonas</strong> y dibuje los lotes de su hacienda en el mapa Leaflet.</li>
                    <li>Invite colaboradores asignando roles: <em>Operador</em> o <em>Auditor</em>.</li>
                  </ul>
                </div>
                <div class="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
                  <h3 class="text-lg font-bold text-green-800 mb-2">2. Operación Diaria</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                    <li>Cree <strong>Siembras</strong> vinculadas a los lotes dibujados.</li>
                    <li>Registre <strong>Actividades</strong> finalizadas por sus operadores.</li>
                    <li>Firme criptográficamente (RSA) cada registro para el Libro Diario.</li>
                  </ul>
                  <router-link to="/manuales/operacion_diaria" target="_blank" class="text-sm font-bold text-green-700 hover:underline flex items-center"><v-icon size="16" class="mr-1">mdi-book-open</v-icon> Ver Manual</router-link>
                </div>
                <div class="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
                  <h3 class="text-lg font-bold text-green-800 mb-2">3. Programaciones y Bitácora</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                    <li>Agende aplicaciones y labores futuras en <strong>Programaciones</strong>.</li>
                    <li>Al ejecutarlas, estas alimentan automáticamente su <strong>Libro Diario (Bitácora)</strong>.</li>
                    <li>La Bitácora es su respaldo inmutable para cumplir con reportes BPA.</li>
                  </ul>
                  <router-link to="/manuales/programaciones_bitacora" target="_blank" class="text-sm font-bold text-green-700 hover:underline flex items-center"><v-icon size="16" class="mr-1">mdi-book-open</v-icon> Ver Manual</router-link>
                </div>
                <div class="rounded-xl border border-green-100 bg-white p-6 shadow-sm">
                  <h3 class="text-lg font-bold text-green-800 mb-2">4. Finanzas Básicas</h3>
                  <ul class="list-disc pl-5 space-y-2 text-sm text-muted-foreground mb-4">
                    <li>Acceda a <strong>Finanzas</strong> para registrar gastos operativos diarios.</li>
                    <li>Genere reportes básicos para entender dónde se concentra el gasto.</li>
                    <li>Conozca la salud financiera básica de su campaña agrícola.</li>
                  </ul>
                  <router-link to="/manuales/finanzas_basicas" target="_blank" class="text-sm font-bold text-green-700 hover:underline flex items-center"><v-icon size="16" class="mr-1">mdi-book-open</v-icon> Ver Manual</router-link>
                </div>
              </div>
            </section>

            <!-- FAQ Integrado -->
            <section class="mt-12">
              <h2 class="text-2xl font-bold mb-6 text-green-900 flex items-center">
                <v-icon color="success" class="mr-2">mdi-frequently-asked-questions</v-icon>
                Preguntas Frecuentes
              </h2>
              
              <v-expansion-panels variant="accordion" class="rounded-xl overflow-hidden border border-green-100">
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
.text-muted-foreground {
  color: #64748b;
}
</style>
