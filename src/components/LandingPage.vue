<template>
  <v-container>
    <div class="flex flex-col min-h-dvh" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      
      <!-- HERO COMBINADO CON MISIÓN (Alto Impacto) -->
      <section class="w-full rounded-lg py-16 md:py-32 relative overflow-hidden bg-[#f8f9fb] dark:bg-[#121212]">
        <!-- Decoración de fondo abstracta -->
        <div class="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl mix-blend-multiply"></div>
        <div class="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl mix-blend-multiply"></div>

        <div class="container px-4 md:px-6 relative z-10">
          <div class="grid items-center gap-12 lg:grid-cols-2">
            <div class="flex flex-col justify-center space-y-8">
              <div class="space-y-4">
                <div class="flex flex-wrap gap-2 items-center">
                  <div class="inline-flex items-center rounded-full bg-primary/50 px-3 py-1 text-sm font-semibold text-white ring-1 ring-inset ring-green-600/20">
                    <v-icon size="small" class="mr-1">mdi-leaf</v-icon>
                    Plataforma Agrícola Inteligente
                  </div>
                  <div class="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-bold text-white ring-1 ring-inset ring-green-600/30">
                    <v-icon size="small" class="mr-1">mdi-tag-outline</v-icon>
                    Uso Gratuito
                  </div>
                </div>
                <h1 class="text-4xl md:text-6xl font-extrabold tracking-tight" style="background-image: linear-gradient(to right, #0a1929, #243b53, #16a34a); -webkit-background-clip: text; color: transparent; line-height: 1.1;">
                  Democratizando la trazabilidad en el campo
                </h1>
                <p class="max-w-[600px] text-muted-foreground text-lg md:text-xl leading-relaxed">
                  ConAgri empodera a productores al construir de forma automática el <strong>Libro Diario (Bitácora)</strong>, eliminando la vulnerabilidad del papel. Facilitamos el cumplimiento estricto de reportes BPA para acreditar su hacienda, a través de un ecosistema seguro y offline-first.
                </p>
              </div>
              <div class="flex flex-col sm:flex-row gap-4">
                <v-btn 
                  color="primary" 
                  size="x-large" 
                  rounded="lg" 
                  class="text-capitalize font-weight-bold hero-btn shadow-lg" 
                  elevation="0"
                  to="/dashboard"
                >
                  Comenzar ahora
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
                <v-btn 
                  variant="outlined" 
                  color="primary" 
                  size="x-large" 
                  rounded="lg" 
                  class="text-capitalize font-weight-bold" 
                  elevation="0"
                  @click="scrollToContact"
                >
                  Contactar Soporte
                </v-btn>
              </div>
              
              <!-- Social Proof / Indicadores rápidos -->
              <div class="flex items-center gap-6 pt-4 border-t border-green-100/50">
                <div>
                  <p class="text-3xl font-bold text-primary">100%</p>
                  <p class="text-xs font-semibold text-muted-foreground">Inmutable y Auditado</p>
                </div>
                <div class="w-px h-10 bg-primary"></div>
                <div>
                  <p class="text-3xl font-bold text-primary">RSA</p>
                  <p class="text-xs font-semibold text-muted-foreground">Firma Criptográfica</p>
                </div>
              </div>
            </div>
            
            <!-- Composición visual espectacular -->
            <div class="relative mx-auto w-full max-w-lg lg:max-w-none">
              <img 
                src="https://images.pexels.com/photos/1081915/pexels-photo-1081915.jpeg" 
                alt="Campo agrícola" 
                class="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-2xl shadow-green-900/20" 
              />
              <!-- Tarjeta Flotante superpuesta -->
              <div class="absolute -bottom-6 -left-6 rounded-lg bg-white/90 dark:bg-[#1e1e1e]/90 backdrop-blur-md p-6 shadow-xl border border-white/40 max-w-[250px] animate-bounce-slow">
                <div class="flex items-center gap-4 mb-2">
                  <div class="p-2 bg-primary rounded-lg text-white">
                    <v-icon>mdi-check-decagram</v-icon>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 dark:text-gray-100">Actividad Firmada</p>
                    <p class="text-xs text-primary">Hace 2 mins</p>
                  </div>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400">Sincronización confirmada a la nube mediante cola offline.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Pilares Base -->
      <section class="w-full py-16 md:py-24 bg-white dark:bg-[#1e1e1e] border-y border-gray-100 dark:border-[#333]">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h3 class="text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Pilares Base para el Campo
            </h3>
            <p class="max-w-[700px] text-muted-foreground md:text-lg">
              Funcionalidades esenciales incluidas en todos los planes para asegurar su operación productiva desde el primer día.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div class="feature-card flex flex-col items-center text-center space-y-4 p-8 bg-white dark:bg-[#1e1e1e]">
              <div class="p-4 bg-primary text-white rounded-lg">
                <v-icon size="40">mdi-shield-check</v-icon>
              </div>
              <h3 class="text-xl font-bold text-[#243b53] dark:text-gray-200">Trazabilidad Inmutable</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">Firmas criptográficas RSA locales para garantizar la integridad legal de sus bitácoras ante estrictas auditorías BPA.</p>
            </div>
            <div class="feature-card flex flex-col items-center text-center space-y-4 p-8 bg-white dark:bg-[#1e1e1e]">
              <div class="p-4 bg-primary text-white rounded-lg">
                <v-icon size="40">mdi-map-marker-path</v-icon>
              </div>
              <h3 class="text-xl font-bold text-[#243b53] dark:text-gray-200">Mapeo GIS</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">Delimitación precisa de lotes, almacenes y zonas ecológicas con integración nativa a mapas interactivos Leaflet.</p>
            </div>
            <div class="feature-card flex flex-col items-center text-center space-y-4 p-8 bg-white dark:bg-[#1e1e1e]">
              <div class="p-4 bg-primary text-white rounded-lg">
                <v-icon size="40">mdi-sync-off</v-icon>
              </div>
              <h3 class="text-xl font-bold text-[#243b53] dark:text-gray-200">Offline-First</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">Opere sin conexión en zonas remotas. Nuestro sistema IndexedDB garantiza una sincronización automática al recuperar cobertura.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Módulos Premium -->
      <section class="w-full py-16 md:py-24 bg-[#f8f9fb] dark:bg-[#121212]">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h3 class="text-3xl font-bold tracking-tighter sm:text-4xl text-primary">
              Módulos Especializados
            </h3>
            <p class="max-w-[700px] text-muted-foreground md:text-lg">
              Potencie el crecimiento y la inteligencia de su hacienda con herramientas avanzadas disponibles en planes premium.
            </p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div class="p-6 border border-[#d9e2ec] dark:border-[#333] rounded-lg bg-white dark:bg-[#1e1e1e] text-center shadow-sm hover:shadow-md transition-shadow">
              <div class="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white mb-4">
                <v-icon size="24">mdi-robot</v-icon>
              </div>
              <h4 class="font-bold text-[#243b53] dark:text-gray-200 mb-2">IA Agronómica</h4>
              <p class="text-xs text-muted-foreground">Diagnósticos de plagas y Action Cards ejecutables al instante.</p>
            </div>
            <div class="p-6 border border-[#d9e2ec] dark:border-[#333] rounded-lg bg-white dark:bg-[#1e1e1e] text-center shadow-sm hover:shadow-md transition-shadow">
              <div class="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white mb-4">
                <v-icon size="24">mdi-cash-multiple</v-icon>
              </div>
              <h4 class="font-bold text-[#243b53] dark:text-gray-200 mb-2">Costo por Hectárea</h4>
              <p class="text-xs text-muted-foreground">Control financiero y cálculo en tiempo real de rentabilidad (ROI).</p>
            </div>
            <div class="p-6 border border-[#d9e2ec] dark:border-[#333] rounded-lg bg-white dark:bg-[#1e1e1e] text-center shadow-sm hover:shadow-md transition-shadow">
              <div class="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white mb-4">
                <v-icon size="24">mdi-account-group</v-icon>
              </div>
              <h4 class="font-bold text-[#243b53] dark:text-gray-200 mb-2">Nómina Express</h4>
              <p class="text-xs text-muted-foreground">Gestión ágil de pagos, jornales, horas extras y destajos en campo.</p>
            </div>
            <div class="p-6 border border-[#d9e2ec] dark:border-[#333] rounded-lg bg-white dark:bg-[#1e1e1e] text-center shadow-sm hover:shadow-md transition-shadow">
              <div class="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white mb-4">
                <v-icon size="24">mdi-warehouse</v-icon>
              </div>
              <h4 class="font-bold text-[#243b53] dark:text-gray-200 mb-2">Bodega Kardex</h4>
              <p class="text-xs text-muted-foreground">Control estricto de lotes de insumos, stock y fechas de expiración.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Sección: Planes y Suscripción (Optimizada visualmente) -->
      <section class="w-full py-16 md:py-24 bg-white dark:bg-[#1e1e1e]">
        <div class="container px-6 md:px-8">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <h3 class="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0a1929] dark:text-white">Nuestros Planes</h3>
            <p class="text-muted-foreground md:text-lg">Elige la solución que mejor se adapte al tamaño de tu operación agrícola.</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-12 mx-auto">
            
            <!-- Plan Gratis -->
            <div class="pricing-card flex flex-col justify-between bg-white dark:bg-[#1e1e1e]">
              <div class="p-6 pb-4">
                <h3 class="text-xl font-bold text-[#243b53] dark:text-gray-200 mb-2">Gratis</h3>
                <p class="text-sm text-muted-foreground h-10">Productores individuales.</p>
                <div class="mt-4 mb-2">
                  <span class="text-3xl font-extrabold text-[#0a1929] dark:text-white">$0</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">/mes</span>
                </div>
              </div>
              <div class="px-6 pb-6">
                <ul class="space-y-3 mb-6">
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> 1 Usuario (Admin)
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> Libro Diario (Bitácora) y Firmas RSA
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> GIS, Finanzas Base y AI (BYOK)
                  </li>
                </ul>
                <v-btn variant="outlined" color="#243b53" class="w-full text-capitalize font-weight-bold btn-rounded" elevation="0" @click="openAuth">Registro Gratis</v-btn>
              </div>
            </div>

            <!-- Plan Intermedio (Destacado) -->
            <div class="pricing-card highlighted flex flex-col justify-between bg-white dark:bg-[#1e1e1e] relative">
              <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wide shadow-md">
                RECOMENDADO
              </div>
              <div class="p-6 pb-4">
                <h3 class="text-xl font-bold text-primary mb-2">Básico</h3>
                <p class="text-sm text-muted-foreground h-10">Equipos de campo pequeños.</p>
                <div class="mt-4 mb-2">
                  <span class="text-3xl font-extrabold text-[#0a1929] dark:text-white">$5</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">/mes</span>
                </div>
              </div>
              <div class="px-6 pb-6">
                <ul class="space-y-3 mb-6">
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> Hasta 3 Usuarios
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> Libro Diario (Bitácora) y Firmas RSA
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> GIS, Finanzas Base y AI (BYOK)
                  </li>
                </ul>
                <v-btn color="primary" class="w-full text-capitalize font-weight-bold btn-rounded shadow-md" elevation="0" @click="scrollToContact">Contactar Ventas</v-btn>
              </div>
            </div>

            <!-- Plan Premium -->
            <div class="pricing-card flex flex-col justify-between bg-white dark:bg-[#1e1e1e]">
              <div class="p-6 pb-4">
                <h3 class="text-xl font-bold text-[#243b53] dark:text-gray-200 mb-2">Premium</h3>
                <p class="text-sm text-muted-foreground h-10">Haciendas medianas.</p>
                <div class="mt-4 mb-2">
                  <span class="text-3xl font-extrabold text-[#0a1929] dark:text-white">$10</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">/mes</span>
                </div>
              </div>
              <div class="px-6 pb-6">
                <ul class="space-y-3 mb-6">
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> Hasta 9 Usuarios
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> Libro Diario (Bitácora) y Firmas RSA
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-check-circle</v-icon> GIS, Finanzas Base y AI (BYOK)
                  </li>
                </ul>
                <v-btn variant="outlined" color="#243b53" class="w-full text-capitalize font-weight-bold btn-rounded" elevation="0" @click="scrollToContact">Contactar Ventas</v-btn>
              </div>
            </div>

            <!-- Módulos Adicionales -->
            <div class="pricing-card flex flex-col justify-between bg-[#f8f9fb] dark:bg-[#121212] border-dashed border-2">
              <div class="p-6 pb-4">
                <h3 class="text-xl font-bold text-blue-900 mb-2">Módulos Extra</h3>
                <p class="text-sm text-muted-foreground h-10">Personaliza tu hacienda a medida.</p>
                <div class="mt-4 mb-2">
                  <span class="text-2xl font-extrabold text-[#0a1929] dark:text-white">$1-$5</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">/mes c/u</span>
                </div>
              </div>
              <div class="px-6 pb-6">
                <ul class="space-y-3 mb-6">
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-plus-circle</v-icon> Costo por Hectárea (ROI)
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-plus-circle</v-icon> Kardex de Bodega y Nómina
                  </li>
                  <li class="flex items-start text-sm text-gray-700 dark:text-gray-300">
                    <v-icon color="primary" size="18" class="mr-2 mt-0.5">mdi-plus-circle</v-icon> PDF Inmutable BPA y más
                  </li>
                </ul>
                <v-btn variant="tonal" color="primary" class="w-full text-capitalize font-weight-bold btn-rounded" elevation="0" to="/documentation">Ver Catálogo</v-btn>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Contact & Footer Section (ConEspacio styled) -->
      <section id="contact-section" class="w-full rounded-lg py-16 md:py-24 text-white relative overflow-hidden" style="background: radial-gradient(circle at 30% top, #1e293b, #0a1929);">
        <!-- Ruido visual sutil para el fondo oscuro (SVG de textura) -->
        <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E');"></div>
        
        <div class="container px-4 md:px-6 relative z-10">
          <div class="grid lg:grid-cols-2 gap-16 items-center">
            <div class="space-y-8">
              <h3 class="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-white">¿Listo para transformar su operación?</h3>
              <p class="text-gray-300 text-lg md:text-xl">Únase a cientos de agricultores que ya han digitalizado y asegurado sus bitácoras con la tecnología de ConAgri.</p>
              
              <div class="space-y-5 pt-4">
                <div class="flex items-center text-gray-200 bg-white/5 p-4 rounded-lg border border-white/10">
                  <v-icon color="primary" size="28" class="mr-4">mdi-email</v-icon>
                  <div>
                    <p class="text-xs text-gray-400 font-semibold text-uppercase">Correo Directo</p>
                    <p class="text-sm font-medium">contacto@conespacio.org</p>
                  </div>
                </div>
                <div class="flex items-center text-gray-200 bg-white/5 p-4 rounded-lg border border-white/10">
                  <v-icon color="primary" size="28" class="mr-4">mdi-headset</v-icon>
                  <div>
                    <p class="text-xs text-gray-400 font-semibold text-uppercase">Soporte Técnico</p>
                    <p class="text-sm font-medium">Asistencia prioritaria para integración</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Formulario -->
            <v-card class="elevation-12 rounded-lg overflow-hidden" style="background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15);">
              <div class="p-8">
                <h3 class="text-2xl font-bold mb-6 text-white">Envíenos un mensaje</h3>
                <v-form ref="form" v-model="valid">
                  <v-text-field
                    v-model="nombre"
                    label="Nombre Completo"
                    variant="solo-filled"
                    color="primary"
                    class="mb-2 text-white"
                    base-color="white"
                    :rules="[v => !!v || 'Requerido']"
                    required
                    flat
                  ></v-text-field>
                  <v-text-field
                    v-model="email"
                    label="Correo Electrónico"
                    variant="solo-filled"
                    color="primary"
                    class="mb-2 text-white"
                    base-color="white"
                    :rules="emailRules"
                    required
                    flat
                  ></v-text-field>
                  <v-textarea
                    v-model="mensaje"
                    label="¿En qué podemos ayudarle?"
                    variant="solo-filled"
                    color="primary"
                    class="mb-4 text-white"
                    base-color="white"
                    :rules="[v => !!v || 'Requerido']"
                    required
                    rows="3"
                    flat
                  ></v-textarea>
                  
                  <v-btn
                    color="primary"
                    size="x-large"
                    block
                    rounded="lg"
                    :disabled="!valid"
                    :loading="loading"
                    @click="submitForm"
                    class="text-capitalize font-weight-bold shadow-lg"
                    elevation="0"
                  >
                    Enviar Mensaje
                  </v-btn>
                </v-form>
              </div>
            </v-card>
          </div>

          <v-divider class="my-12 border-gray-700/50"></v-divider>

          <div class="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-gray-400">
            <div class="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <v-icon color="primary" size="20">mdi-leaf</v-icon>
              <span class="font-bold text-white">ConAgri</span>
              <span class="opacity-70">plataforma de</span>
              <span class="font-bold text-white tracking-wide">ConEspacio</span>
            </div>
            <p>© 2024 Grupo ConEspacio. Todos los derechos reservados.</p>
            <nav class="flex gap-6">
              <a class="hover:text-primary transition-colors" href="#">Términos legales</a>
              <a class="hover:text-primary transition-colors" href="#">Política de Privacidad</a>
            </nav>
          </div>
        </div>
      </section>

      <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
        {{ snackbarMsg }}
      </v-snackbar>
    </div>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'

const valid = ref(false)
const form = ref(null)
const nombre = ref('')
const email = ref('')
const mensaje = ref('')
const loading = ref(false)

const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref('success')

const emailRules = [
  v => !!v || 'El e-mail es requerido',
  v => /.+@.+\..+/.test(v) || 'El e-mail debe ser válido',
]

const submitForm = async () => {
  if (!valid.value) return
  loading.value = true

  try {
      if(typeof pb !== 'undefined') {
        await pb.send('/api/contact', {
            method: 'POST',
            body: {
                nombre: nombre.value,
                email: email.value,
                mensaje: mensaje.value
            }
        })
      } else {
        console.warn('Pocketbase instance not found. Form submission simulated.')
        await new Promise(r => setTimeout(r, 1000))
      }

      snackbarMsg.value = 'Mensaje enviado. Nos pondremos en contacto pronto.'
      snackbarColor.value = 'success'
      snackbar.value = true
      form.value.reset()
  } catch (error) {
      console.error(error)
      snackbarMsg.value = 'Error al enviar el mensaje. Intente más tarde.'
      snackbarColor.value = 'error'
      snackbar.value = true
  } finally {
      loading.value = false
  }
}

const scrollToContact = () => {
  const el = document.getElementById('contact-section')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const openAuth = () => {
  window.dispatchEvent(new CustomEvent('openAuthModal'))
}
</script>

<style scoped>
.text-muted-foreground {
  color: #64748b;
}

/* Aplicación de Manual de Marca: UI Flotante y Tarjetas */
.feature-card {
  border: 1px solid rgba(217, 226, 236, 0.5); /* Navy 100 at 50% opacity */
  border-radius: 1rem; /* rounded-lg for modern look */
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);
}

/* Botones genéricos de acuerdo al manual */
:deep(.v-btn.btn-rounded) {
  border-radius: 8px !important;
  text-transform: none;
  letter-spacing: 0;
}

:deep(.v-btn.hero-btn:hover) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.4) !important;
  transition: all 0.2s;
}

/* Tarjetas de Planes - Ajuste Visual */
.pricing-card {
  border: 1px solid rgba(217, 226, 236, 0.5);
  border-radius: 1.25rem;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  transition: all 0.3s ease;
}
.pricing-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 30px -5px rgba(0,0,0,0.08);
}
.pricing-card.highlighted {
  border: 2px solid #16a34a; /* Borde primario para destacar */
  transform: scale(1.02);
  box-shadow: 0 10px 25px -5px rgba(22, 163, 74, 0.15);
}
.pricing-card.highlighted:hover {
  transform: scale(1.02) translateY(-4px);
  box-shadow: 0 20px 35px -5px rgba(22, 163, 74, 0.2);
}

.animate-bounce-slow {
  animation: bounce 4s infinite ease-in-out;
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
