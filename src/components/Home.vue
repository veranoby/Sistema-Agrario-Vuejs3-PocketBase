<template>
  <div class="flex flex-col min-h-[100dvh]">
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
        <span class="sr-only">Agro Assist</span>
      </a>
    </header>
    <main class="flex-1">
      <section class="w-full py-12 md:py-24 lg:py-32 xl:py-48">
        <div class="container px-4 md:px-6">
          <div class="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div class="flex flex-col justify-center space-y-4">
              <div class="space-y-2">
                <h1 class="text-3xl tracking-tighter sm:text-5xl xl:text-6xl/none">
                  Revoluciona tus operaciones agrícolas
                </h1>
                <p class="max-w-[600px] text-muted-foreground md:text-xl">
                  Agro Assist es una poderosa plataforma SaaS que empodera a los agricultores y las
                  empresas agrícolas para racionalizar sus operaciones, optimizar los recursos y
                  impulsar un crecimiento sostenible.
                </p>
              </div>
              <div class="flex flex-col gap-2 min-[400px]:flex-row">
                <a
                  href="#"
                  class="inline-flex h-10 items-center justify-center rounded-md bg-success px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Solicitar una demostración
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
              alt="Hero"
              class="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
            />
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div class="flex flex-col items-center text-center space-y-4">
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
                class="h-8 w-8 text-green-500"
              >
                <path d="M8 2v4"></path>
                <path d="M16 2v4"></path>
                <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                <path d="M3 10h18"></path>
              </svg>
              <h3 class="text-xl font-bold text-green-700">Planificación de cultivos</h3>
              <p class="text-muted-foreground">
                Simplifica la planificación de tus cultivos con nuestras herramientas intuitivas,
                ayudándote a tomar decisiones informadas para obtener rendimientos óptimos.ultivos
                con nuestras
              </p>
            </div>
            <div class="flex flex-col items-center text-center space-y-4">
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
                class="h-8 w-8 text-green-500"
              >
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
              </svg>
              <h3 class="text-xl font-bold text-green-700">Monitoreo del clima</h3>
              <p class="text-muted-foreground">
                Mantente al tanto del clima con datos y pronósticos en tiempo real, lo que te
                permitirá planificar tus operaciones en consecuencia.
              </p>
            </div>
            <div class="flex flex-col items-center text-center space-y-4">
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
                class="h-8 w-8 text-green-500"
              >
                <line x1="12" x2="12" y1="20" y2="10"></line>
                <line x1="18" x2="18" y1="20" y2="4"></line>
                <line x1="6" x2="6" y1="20" y2="16"></line>
              </svg>
              <h3 class="text-xl font-bold text-green-700">Análisis de mercado</h3>
              <p class="text-muted-foreground">
                Obtén valiosos insights sobre las tendencias y los precios del mercado para tomar
                decisiones informadas sobre tus cultivos y ventas.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        style="background: #c9c9c940"
        class="w-full py-12 md:py-24 lg:py-32 border shadow-lg rounded-lg"
      >
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl text-green-700">
                Desbloquea el máximo potencial de tu granja
              </h2>
              <p
                class="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Agro Assist ofrece un conjunto integral de herramientas para simplificar tus
                operaciones agrícolas, desde la planificación hasta el análisis de mercado.egral de
                herramientas
              </p>
            </div>
            <div class="flex flex-col gap-2 min-[400px]:flex-row">
              <a
                href="#"
                class="inline-flex h-10 items-center justify-center rounded-md bg-success px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Inicia tu prueba gratuita
              </a>
              <a
                href="#"
                class="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Contactar a ventas
              </a>
            </div>
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-6 md:px-8">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl text-green-700">
                Nuestros Planes
              </h2>
              <p
                class="text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Elige el plan que mejor se adapte a tus necesidades.
              </p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
              <div
                class="border text-card-foreground bg-white shadow-lg rounded-lg"
                data-v0-t="card"
              >
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3
                    class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700"
                  >
                    Gratis
                  </h3>
                  <p class="text-xs text-muted-foreground">1 usuario con limitaciones</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-left justify-between">
                      <span>Usuarios:</span>
                      <span class="text-xs">1</span>
                    </div>
                    <div class="flex items-right justify-between">
                      <span>Roles:</span>
                      <span class="text-xs">Admin</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6">
                  <button
                    class="inline-flex h-10 items-center justify-center rounded-md bg-success px-8 text-xs text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Registrarse
                  </button>
                </div>
              </div>
              <div
                class="border text-card-foreground bg-white shadow-lg rounded-lg"
                data-v0-t="card"
              >
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3
                    class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700"
                  >
                    Básico
                  </h3>
                  <p class="text-xs text-muted-foreground">3 usuarios con 3 roles</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between">
                      <span>Usuarios:</span>
                      <span class="text-xs">3</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Roles:</span>
                      <span class="text-xs">Admin, Supervisor, Operador</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6">
                  <button
                    class="inline-flex h-10 items-center justify-center rounded-md bg-success px-8 text-xs text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Registrarse
                  </button>
                </div>
              </div>
              <div
                class="border text-card-foreground bg-white shadow-lg rounded-lg"
                data-v0-t="card"
              >
                <div class="flex flex-col space-y-1.5 p-6">
                  <h3
                    class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight text-green-700"
                  >
                    Premium
                  </h3>
                  <p class="text-xs text-muted-foreground">10 usuarios con 3 roles</p>
                </div>
                <div class="p-6">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between">
                      <span>Usuarios:</span>
                      <span class="text-xs">10</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Roles:</span>
                      <span class="text-xs">Admin, Supervisor(3), Operador(6)</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center p-6">
                  <button
                    class="inline-flex h-10 items-center justify-center rounded-md bg-success px-8 text-xs text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Registrarse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer
      class="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t"
    >
      <p class="text-xs text-muted-foreground">© 2024 Agro Assist. Todos los derec</p>
      <nav class="sm:ml-auto flex gap-4 sm:gap-6">
        <a class="text-xs hover:underline underline-offset-4 text-green-500" href="#">
          Términos de servicio
        </a>
      </nav>
    </footer>
  </div>
</template>

<script setup>
defineOptions({
  name: 'HomeComp'
})
</script>

<style scoped></style>
