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
          <span class="sr-only">Agro Assist</span>
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
                  Bienvenido a Agro Assist
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
      <section class="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">
                Confiado por las principales agroempresas
              </h2>
              <p
                class="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Nuestro equipo de expertos agrícolas cuenta con décadas de experiencia en la
                industria, ayudando a agricultores y agroempresas a optimizar sus operaciones e
                impulsar un crecimiento sostenible.
              </p>
            </div>
            <div
              class="grid w-full grid-cols-2 lg:grid-cols-5 items-center justify-center gap-8 lg:gap-12 [&amp;>img]:mx-auto"
            >
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmVq-OmHL5H_5P8b1k306pFddOe3049-il2A&s"
                width="140"
                height="70"
                alt="Logo"
                style=""
                class="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmVq-OmHL5H_5P8b1k306pFddOe3049-il2A&s"
                width="140"
                height="70"
                alt="Logo"
                style=""
                class="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmVq-OmHL5H_5P8b1k306pFddOe3049-il2A&s"
                width="140"
                height="70"
                alt="Logo"
                class="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmVq-OmHL5H_5P8b1k306pFddOe3049-il2A&s"
                width="140"
                height="70"
                alt="Logo"
                class="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              />
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmVq-OmHL5H_5P8b1k306pFddOe3049-il2A&s"
                width="140"
                height="70"
                style=""
                alt="Logo"
                class="aspect-[2/1] overflow-hidden rounded-lg object-contain object-center"
              />
            </div>
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">
                Supera los desafíos de la agricultura moderna
              </h2>
              <p
                class="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Los agricultores y las agroempresas se enfrentan a una miríada de desafíos
                complejos, desde la optimización de la asignación de recursos y la mejora de los
                rendimientos hasta el cumplimiento normativo y la mejora de la sostenibilidad.
                Nuestra plataforma está diseñada para abordar estos problemas y desbloquear nuevos
                niveles de eficiencia y rentabilidad.
              </p>
            </div>
            <div class="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <img
                src="https://images.pexels.com/photos/1595108/pexels-photo-1595108.jpeg"
                width="550"
                height="310"
                alt="Problema"
                style=""
                class="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
              />
              <div class="flex flex-col justify-center space-y-4">
                <ul class="grid gap-6">
                  <li>
                    <div class="grid gap-1">
                      <h3 class="text-xl font-bold">Optimizar la asignación de recursos</h3>
                      <p class="text-muted-foreground">
                        Aproveche los insights basados en datos para tomar decisiones informadas
                        sobre la asignación de recursos, maximizando la productividad y la
                        rentabilidad.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div class="grid gap-1">
                      <h3 class="text-xl font-bold">Mejorar el rendimiento y la calidad</h3>
                      <p class="text-muted-foreground">
                        Utilice análisis avanzados y técnicas de agricultura de precisión para
                        mejorar los rendimientos de los cultivos, la calidad de los productos y
                        minimizar los desperdicios.
                      </p>
                    </div>
                  </li>
                  <li>
                    <div class="grid gap-1">
                      <h3 class="text-xl font-bold">Garantizar el cumplimiento normativo</h3>
                      <p class="text-muted-foreground">
                        Manténgase al día con las regulaciones y directrices de la industria en
                        evolución con nuestras herramientas integrales de gestión del cumplimiento.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">
                Desbloquea el poder de nuestra plataforma
              </h2>
              <p
                class="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Nuestra completa plataforma SaaS ofrece una suite de funciones y herramientas
                avanzadas para agilizar tus operaciones agrícolas, mejorar la toma de decisiones e
                impulsar un crecimiento sostenible.
              </p>
            </div>
            <div
              class="mx-auto grid max-w-5xl items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3"
            >
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Agricultura de precisión</h3>
                <p class="text-sm text-muted-foreground">
                  Aproveche los datos avanzados de sensores, imágenes por satélite y aprendizaje
                  automático para optimizar la asignación de recursos, mejorar los rendimientos y
                  aumentar la sostenibilidad.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Optimización de la cadena de suministro</h3>
                <p class="text-sm text-muted-foreground">
                  Agiliza las operaciones de tu cadena de suministro, desde la gestión de
                  inventarios hasta la logística, para garantizar una entrega oportuna y minimizar
                  los desperdicios.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Cumplimiento normativo</h3>
                <p class="text-sm text-muted-foreground">
                  Manténte al día con las últimas regulaciones y directrices de la industria, y
                  automatiza los informes de cumplimiento para evitar costosas sanciones.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Análisis predictivo</h3>
                <p class="text-sm text-muted-foreground">
                  Aproveche los análisis avanzados y el aprendizaje automático para pronosticar
                  tendencias del mercado, optimizar la producción y tomar decisiones basadas en
                  datos.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Seguimiento de la sostenibilidad</h3>
                <p class="text-sm text-muted-foreground">
                  Monitorea e informa sobre tu impacto ambiental, ayudándote a cumplir con los
                  objetivos de sostenibilidad y atraer a consumidores conscientes del medio
                  ambiente.
                </p>
              </div>
              <div class="grid gap-1">
                <h3 class="text-lg font-bold">Mercado integrado</h3>
                <p class="text-sm text-muted-foreground">
                  Conéctate con una red de proveedores, compradores y proveedores de servicios de
                  confianza para agilizar tus operaciones y acceder a nuevas fuentes de ingresos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-4 md:px-6">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">
                Resultados medibles para tu negocio
              </h2>
              <p
                class="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed"
              >
                Nuestra plataforma ha ayudado a nuestros clientes a lograr mejoras significativas en
                métricas clave de desempeño, impulsando un crecimiento y una rentabilidad
                sostenibles.
              </p>
            </div>
            <div class="grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">25%</h3>
                <p class="text-muted-foreground">Aumento en los rendimientos de los cultivos</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">18%</h3>
                <p class="text-muted-foreground">Reducción de desperdicios de recursos</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">32%</h3>
                <p class="text-muted-foreground">Mejora en la eficiencia operativa</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">$1.2M</h3>
                <p class="text-muted-foreground">Ahorro de costos anuales</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">95%</h3>
                <p class="text-muted-foreground">Tasa de satisfacción del cliente</p>
              </div>
              <div class="flex flex-col items-center justify-center space-y-2">
                <h3 class="text-4xl font-bold text-green">15%</h3>
                <p class="text-muted-foreground">Aumento de los ingresos</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="w-full py-12 md:py-24 lg:py-32">
        <div class="container px-6 md:px-8">
          <div class="flex flex-col items-center justify-center space-y-4 text-center">
            <div class="space-y-2">
              <h2 class="text-3xl font-bold tracking-tighter sm:text-5xl">Nuestros Planes</h2>
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

      <footer
        class="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t"
      >
        <p class="text-xs text-muted-foreground">
          © 2024 Agro Assist. Todos los derechos reservados
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
