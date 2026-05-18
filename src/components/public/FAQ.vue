<template>
  <v-container>
    <div class="w-full max-w-4xl mx-auto py-12 md:py-16 px-4 md:px-6">
      <h1 class="text-3xl font-bold mb-8 text-center text-green-900">Preguntas Frecuentes - ConAgri</h1>

      <!-- Grupo 1: Cumplimiento y Certificación (BPA) -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Cumplimiento y Certificación (BPA)
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Cómo garantiza ConAgri el cumplimiento de las Buenas Prácticas Agrícolas (BPA)?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              ConAgri estructura la bitácora de campo en base a las normativas internacionales de certificación como GlobalG.A.P. La plataforma valida obligatoriamente que cada registro operativo cuente con fecha, área geolocalizada, dosis/insumo utilizado, y la firma digital del operario responsable, eliminando la manipulación de registros y facilitando las auditorías físicas.
            </p>
          </div>
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Cómo funciona la Firma Criptográfica RSA en las bitácoras?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Al realizar una actividad, el dispositivo del operador utiliza la API WebCrypto del navegador para generar firmas digitales con el algoritmo RSA-PSS. Los datos de la bitácora se cifran y sellan criptográficamente con una clave privada local, y la firma en Base64 se almacena de forma inmutable en PocketBase. Los auditores pueden verificar la autenticidad del registro al instante.
            </p>
          </div>
        </div>
      </details>

      <!-- Grupo 2: Resiliencia Offline-First -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Tecnología Offline y Sincronización
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Puedo registrar mis actividades en zonas sin cobertura de internet?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Sí. ConAgri funciona bajo el paradigma "Offline-First". La aplicación almacena de forma segura las actividades y cambios geográficos en una base de datos IndexedDB local. Cuando el dispositivo detecta conexión a internet, el procesador de cola (`queueProcessor.js`) sincroniza los datos de forma atómica y ordenada en PocketBase, evitando duplicados o pérdidas.
            </p>
          </div>
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Qué pasa si hay un conflicto de concurrencia durante la sincronización?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              El sistema utiliza bloqueos de estado concurrentes (`isProcessing`) en los almacenes Pinia y marcas de tiempo criptográficas para asegurar que el último cambio confirmado localmente se guarde con integridad sin sobreescribir auditorías previas.
            </p>
          </div>
        </div>
      </details>

      <!-- Grupo 3: Asistente IA Agronómico -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Asistente IA Agronómico
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Qué es el Asistente IA y cómo ayuda al agricultor?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Es un asistente experto en agronomía integrado que utiliza modelos avanzados a través de un proxy seguro de OpenRouter. Permite consultar diagnósticos de plagas, recomendaciones de fertilización según tipo de suelo y planes de riego.
            </p>
          </div>
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Qué son las "Action Cards" generadas por la IA?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              Cuando realiza una pregunta sobre planificación, la IA no solo responde con texto, sino que genera recomendaciones estructuradas en formato JSON. Estas se renderizan como "Action Cards", permitiéndole presionar un botón para crear automáticamente una actividad o recordatorio en el sistema con un solo clic (Human-in-the-loop).
            </p>
          </div>
        </div>
      </details>

      <!-- Grupo 4: Mapeo y Zonas GIS -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Mapeo y Zonas GIS Leaflet
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Cómo funciona el módulo de dibujo y zonas GIS?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              ConAgri integra un mapa dinámico potenciado por Leaflet. Permite dibujar de forma manual polígonos sobre el terreno para delimitar lotes de cultivo y zonas protegidas. Estas coordenadas se guardan como objetos GeoJSON en PocketBase y se pre-cargan en la memoria local para su disponibilidad offline.
            </p>
          </div>
        </div>
      </details>

      <!-- Grupo 5: Gestión Financiera -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Módulo de Finanzas y Costos
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Qué tipo de control financiero puedo llevar en mis cultivos?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              El módulo de finanzas le permite asociar costos fijos (insumos, herramientas) y costos variables (jornales, servicios) a cada siembra/proyecto específico. Esto facilita el cálculo automático del Retorno de Inversión (ROI) por hectárea y prepara los reportes estructurados listos para ser exportados.
            </p>
          </div>
        </div>
      </details>

      <!-- Grupo 6: Roles y Licenciamiento -->
      <details class="w-full bg-white border border-lightgray cursor-pointer mb-3 p-3 rounded-lg shadow-sm">
        <summary class="w-full bg-white text-green-800 flex justify-between px-4 py-3 text-lg font-semibold after:content-['+']">
          Seguridad, Roles y Suscripciones
        </summary>
        <div class="px-4 pb-4 space-y-4">
          <div>
            <h3 class="text-md font-bold text-gray-800">¿Cuáles son los roles definidos en la plataforma y qué permisos tienen?</h3>
            <p class="text-sm text-muted-foreground mt-1">
              La plataforma maneja un control estricto de accesos (RBAC):
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Administrador:</strong> Control total de la configuración de la hacienda, invitar usuarios, modificar planes e integraciones.</li>
                <li><strong>Auditor:</strong> Permiso de lectura completa y descarga de informes de trazabilidad, exportación de bitácoras y verificación de firmas RSA.</li>
                <li><strong>Operador:</strong> Permiso de registro y firma de actividades diarias asignadas en campo.</li>
              </ul>
            </p>
          </div>
        </div>
      </details>
    </div>
  </v-container>
</template>

<script>
export default {
  name: 'FAQ'
}
</script>

<style>
details summary::-webkit-details-marker {
  display: none;
}

details[open] summary::after {
  content: '-';
}

details[open] summary ~ * {
  animation: slideDown 0.3s ease-in-out;
}

details[open] summary p {
  opacity: 0;
  animation-name: showContent;
  animation-duration: 0.6s;
  animation-delay: 0.6s;
  animation-fill-mode: forwards;
  margin: 0;
}

@keyframes showContent {
  from {
    opacity: 0;
    height: 0;
  }
  to {
    opacity: 1;
    height: auto;
  }
}
@keyframes slideDown {
  from {
    opacity: 0;
    height: 0;
    padding: 0;
  }

  to {
    opacity: 1;
    height: auto;
  }
}
</style>
