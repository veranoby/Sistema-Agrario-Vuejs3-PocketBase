<template>
  <v-container>
    <div class="flex flex-col min-h-dvh">
      <header class="px-4 lg:px-6 h-14 flex items-center">
        <a class="flex items-center justify-center" href="#">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-6 w-6 text-green-500"
          >
            <path
              d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
            ></path>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
          </svg>
          <span class="sr-only">ConAgri</span>
        </a>
      </header>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
          <div
            class="grid items-center gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]"
          >
            <div class="flex flex-col justify-center space-y-4">
              <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tighter sm:text-5xl">
                  ¡Hola! Bienvenido a ConAgri
                </h1>
                <p
                  class="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
                >
                  Nuestra plataforma SaaS de vanguardia empodera a agricultores, agrónomos y
                  agroempresas para optimizar la productividad, agilizar las operaciones y impulsar
                  un crecimiento sostenible.
                </p>
              </div>
              <div class="flex flex-col gap-2 min-[400px]:flex-row">
                <a
                  href="#"
                  class="inline-flex h-10 items-center justify-center rounded-md bg-green px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Empezar
                </a>
                <a
                  href="#"
                  class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Más información
                </a>
              </div>
            </div>
            <img
              src="https://images.pexels.com/photos/1081915/pexels-photo-1081915.jpeg"
              width="550"
              height="310"
              style=""
              alt="Posicionamiento"
              class="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
            />
          </div>
        </div>
      </section>
      <!-- Sección: Pilares Tecnológicos de ConAgri (Unificados) -->
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl text-green-900">
                Tres pilares diseñados para el campo
              </h2>
              <p class="max-w-[900px] text-muted-foreground md:text-xl">
                Unificamos la tecnología de encriptación legal, geolocalización avanzada y persistencia offline para que tu operación esté siempre lista para auditorías de certificación.
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Pilar 1: Firma Digital RSA -->
            <div class="flex flex-col items-center text-center space-y-3 p-6 border rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
              <div class="p-3 bg-green-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-green-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 11 2 2 4-4"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-green-800">Firma Criptográfica RSA</h3>
              <p class="text-sm text-muted-foreground">
                Garantice la inmutabilidad de su bitácora digital. Cada actividad realizada es sellada criptográficamente en el dispositivo del operario, ofreciendo plena validez legal ante auditores de GlobalG.A.P.
              </p>
            </div>

            <!-- Pilar 2: Mapeo GIS Leaflet -->
            <div class="flex flex-col items-center text-center space-y-3 p-6 border rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
              <div class="p-3 bg-green-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-green-600">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                  <line x1="9" y1="3" x2="9" y2="18"/>
                  <line x1="15" y1="6" x2="15" y2="21"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-green-800">Zonas GIS Interactivas</h3>
              <p class="text-sm text-muted-foreground">
                Visualice y delimite con precisión absoluta sus áreas de cultivo, lotes y zonas de impacto ecológico mediante mapas Leaflet inteligentes. Ideal para el control espacial y ambiental.
              </p>
            </div>

            <!-- Pilar 3: Operación Offline-First -->
            <div class="flex flex-col items-center text-center space-y-3 p-6 border rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow">
              <div class="p-3 bg-green-50 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-green-600">
                  <path d="M1 1v22h22"/>
                  <path d="M16.7 8a3 3 0 0 0-2.7-2 3 3 0 0 0-2.9 2.5 4.5 4.5 0 0 0-4.1 4.5 4.5 4.5 0 0 0 4.1 4.5h6a3.5 3.5 0 0 0 2.5-6h-.9"/>
                </svg>
              </div>
              <h3 class="text-xl font-bold text-green-800">Resiliencia Offline</h3>
              <p class="text-sm text-muted-foreground">
                El campo no siempre tiene señal. Trabaje con absoluta normalidad en zonas remotas gracias a nuestra persistencia local con IndexedDB; la sincronización es automatizada al reconectarse.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Sección: Nuestro Propósito (Integración de Quiénes Somos) -->
      <section class="w-full py-12 md:py-24 lg:py-32 bg-[#f9fafb] border-y">
        <div class="container px-4 md:px-6">
          <div class="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
            <div class="space-y-4">
              <div class="inline-block bg-green-100 text-green-800 px-3 py-1 text-sm font-semibold rounded-full">
                Nuestra Misión
              </div>
              <h2 class="text-3xl font-bold tracking-tighter sm:text-4xl text-green-900">
                Democratizando la confianza y trazabilidad en el sector agrícola
              </h2>
              <p class="text-muted-foreground md:text-lg">
                ConAgri nace del firme compromiso de facilitar la transición digital en el campo. Nos enfocamos en dotar a pequeños y grandes productores de las herramientas necesarias para cumplir rigurosamente con las Buenas Prácticas Agrícolas (BPA).
              </p>
              <p class="text-muted-foreground md:text-lg">
                Eliminamos la ineficiencia y vulnerabilidad de las bitácoras físicas a través de un ecosistema seguro, auditable y descentralizado, respaldando el trabajo diario de agricultores, auditores y operadores con integridad legal y técnica.
              </p>
            </div>
            <img
              src="https://images.pexels.com/photos/2255866/pexels-photo-2255866.jpeg"
              width="550"
              height="350"
              alt="Misión del Campo"
              class="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
            />
          </div>
        </div>
      </section>
      <!-- Sección: Beneficios de la Digitalización (Cualitativos) -->
      <section class="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl text-green-900">
                Beneficios de la Digitalización Real
              </h2>
              <p class="max-w-[900px] text-muted-foreground md:text-xl">
                Nuestra plataforma elimina los cuellos de botella administrativos y asegura que su producción esté siempre lista para auditorías de certificación.
              </p>
            </div>
            <div class="grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 w-full mt-8">
              <div class="flex flex-col items-center justify-center space-y-2 p-6 border rounded-xl bg-white shadow-sm">
                <h3 class="text-4xl font-bold text-green-700">100%</h3>
                <p class="font-semibold text-gray-700">Trazabilidad Inmutable</p>
                <p class="text-xs text-muted-foreground text-center">Registro seguro desde la siembra hasta la cosecha</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2 p-6 border rounded-xl bg-white shadow-sm">
                <h3 class="text-4xl font-bold text-green-700">Offline</h3>
                <p class="font-semibold text-gray-700">Persistencia de Campo</p>
                <p class="text-xs text-muted-foreground text-center">Sincronización robusta y libre de pérdida de datos</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2 p-6 border rounded-xl bg-white shadow-sm">
                <h3 class="text-4xl font-bold text-green-700">RSA</h3>
                <p class="font-semibold text-gray-700">Seguridad en Firmas</p>
                <p class="text-xs text-muted-foreground text-center">Integridad legal verificable para sus bitácoras</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Sección: Planes y Suscripción -->
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-6 md:px-8">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl text-green-900">Nuestros Planes</h2>
              <p class="text-muted-foreground md:text-xl">
                Elige el plan que mejor se adapte a tus necesidades de roles y equipo.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 w-full max-w-5xl mt-8">
              <!-- Plan Gratis -->
              <div class="border text-card-foreground bg-white shadow-lg rounded-xl flex flex-col justify-between" data-v0-t="card">
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700">
                    Gratis
                  </h3>
                  <p class="text-xs text-muted-foreground">1 usuario administrador para control básico</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Usuarios:</span>
                      <span class="text-sm font-semibold">1</span>
                    </div>
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Roles admitidos:</span>
                      <span class="text-sm font-semibold">Administrador</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6 mt-auto">
                  <button class="inline-flex h-10 w-full items-center justify-center rounded-md bg-success text-white px-8 text-xs font-semibold shadow hover:bg-success/90 transition-colors">
                    Registrarse
                  </button>
                </div>
              </div>

              <!-- Plan Básico -->
              <div class="border text-card-foreground bg-white shadow-lg rounded-xl flex flex-col justify-between" data-v0-t="card">
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700">
                    Básico
                  </h3>
                  <p class="text-xs text-muted-foreground">Roles colaborativos para equipos pequeños</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Usuarios:</span>
                      <span class="text-sm font-semibold">3</span>
                    </div>
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Roles admitidos:</span>
                      <span class="text-sm font-semibold text-right">Admin(1), Auditor(1), Operador(1)</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6 mt-auto">
                  <button class="inline-flex h-10 w-full items-center justify-center rounded-md bg-success text-white px-8 text-xs font-semibold shadow hover:bg-success/90 transition-colors">
                    Registrarse
                  </button>
                </div>
              </div>

              <!-- Plan Premium -->
              <div class="border text-card-foreground bg-white shadow-lg rounded-xl flex flex-col justify-between" data-v0-t="card">
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700">
                    Premium
                  </h3>
                  <p class="text-xs text-muted-foreground">Completa trazabilidad para agroempresas consolidadas</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Usuarios:</span>
                      <span class="text-sm font-semibold">9</span>
                    </div>
                    <div class="flex items-center justify-between border-b pb-2">
                      <span>Roles admitidos:</span>
                      <span class="text-sm font-semibold text-right">Admin(1), Auditor(2), Operador(6)</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6 mt-auto">
                  <button class="inline-flex h-10 w-full items-center justify-center rounded-md bg-success text-white px-8 text-xs font-semibold shadow hover:bg-success/90 transition-colors">
                    Registrarse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <footer
        class="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t"
      >
        <p class="text-xs text-muted-foreground">
          © 2024 ConAgri. Todos los derechos reservados
        </p>
        <nav class="sm:ml-auto flex gap-4 sm:gap-6">
          <a class="text-xs hover:underline underline-offset-4 text-green" href="#">
            Términos de servicio
          </a>
        </nav>
      </footer>
    </div>
  </v-container>
</template>

<script setup>
defineOptions({
  name: 'HomeComp'
})
</script>

<style scoped></style>
