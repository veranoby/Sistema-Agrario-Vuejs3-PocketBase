<template>
  <v-container>
    <div class="flex min-h-screen w-full bg-slate-50" style="font-family: 'Plus Jakarta Sans', sans-serif;">
      <main class="flex-1 p-4 sm:p-6 md:p-8">
        <div class="mx-auto max-w-4xl">
          <v-btn
            variant="text"
            color="success"
            prepend-icon="mdi-arrow-left"
            class="mb-6"
            @click="$router.push('/documentation')"
          >
            Volver a Documentación
          </v-btn>

          <v-card class="pa-6 pa-md-10 rounded-lg shadow-sm border border-green-100">
            <div v-if="loading" class="d-flex justify-center my-10">
              <v-progress-circular indeterminate color="success"></v-progress-circular>
            </div>
            
            <div v-else-if="error" class="text-center my-10">
              <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
              <h3 class="text-xl font-bold text-gray-800">No se pudo cargar el manual</h3>
              <p class="text-gray-600 mt-2">El archivo solicitado no existe o hubo un error al leerlo.</p>
            </div>

            <div v-else class="markdown-body" v-html="parsedMarkdown"></div>
          </v-card>
        </div>
      </main>
    </div>
  </v-container>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';

const route = useRoute();
const parsedMarkdown = ref('');
const loading = ref(true);
const error = ref(false);

const loadManual = async () => {
  loading.value = true;
  error.value = false;
  try {
    const manualId = route.params.id;
    // Hacemos fetch al archivo .md dentro de /public/manuales/
    const response = await fetch(`/manuales/${manualId}.md`);
    
    if (!response.ok) {
      throw new Error('Manual no encontrado');
    }
    
    const text = await response.text();
    parsedMarkdown.value = marked(text);
  } catch (err) {
    console.error("Error al cargar manual:", err);
    error.value = true;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadManual();
});

watch(() => route.params.id, () => {
  loadManual();
});
</script>

<style>
/* Estilos básicos para que el markdown se vea profesional dentro de la tarjeta */
.markdown-body {
  color: #333;
  line-height: 1.6;
}
.markdown-body h1 {
  font-size: 2.25rem;
  font-weight: 800;
  color: #14532d; /* green-900 */
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #dcfce7;
  padding-bottom: 0.5rem;
}
.markdown-body h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #166534; /* green-800 */
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.markdown-body h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-body p {
  margin-bottom: 1rem;
}
.markdown-body ul, .markdown-body ol {
  padding-left: 2rem;
  margin-bottom: 1.5rem;
}
.markdown-body li {
  margin-bottom: 0.5rem;
}
.markdown-body strong {
  font-weight: 700;
}
</style>
