<template>
  <div class="evidencias-upload">
    <div class="mb-4">
      <v-file-input
        :label="label"
        v-model="rawFiles"
        :accept="accept"
        :multiple="maxFiles > 1"
        :prepend-icon="icon"
        :error-messages="errorMessages"
        @update:model-value="handleFileSelect"
        variant="outlined"
        density="comfortable"
        :disabled="isOptimizing || currentFiles.length >= maxFiles"
        :hint="hintText"
        persistent-hint
      >
        <template v-slot:selection="{ fileNames }">
          <template v-for="fileName in fileNames" :key="fileName">
            <v-chip size="small" label color="primary" class="me-2">
              {{ fileName }}
            </v-chip>
          </template>
        </template>
      </v-file-input>
    </div>

    <!-- Progress -->
    <v-expand-transition>
      <div v-if="isOptimizing" class="mb-4">
        <div class="d-flex justify-space-between text-caption mb-1">
          <span>Optimizando imágenes...</span>
          <span>{{ optimizationProgress }}%</span>
        </div>
        <v-progress-linear
          :model-value="optimizationProgress"
          color="primary"
          height="6"
          rounded
        ></v-progress-linear>
      </div>
    </v-expand-transition>

    <!-- Previews Grid -->
    <v-row v-if="currentFiles.length > 0" dense class="mb-2">
      <v-col
        v-for="(file, index) in currentFiles"
        :key="index"
        cols="6"
        sm="4"
        md="3"
        lg="2"
      >
        <v-card class="position-relative h-100" variant="outlined">
          <v-img
            :src="getPreviewUrl(file)"
            height="120"
            cover
            class="bg-grey-lighten-2"
          >
            <template v-slot:placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular indeterminate color="grey-lighten-4"></v-progress-circular>
              </div>
            </template>
          </v-img>
          
          <v-btn
            icon="mdi-close"
            size="x-small"
            color="error"
            class="position-absolute bg-white"
            style="top: 4px; right: 4px;"
            @click.stop="removeFile(index)"
            elevation="2"
          ></v-btn>
          
          <div class="px-2 py-1 text-caption text-truncate d-flex justify-space-between bg-grey-lighten-4">
            <span class="text-truncate mr-2">{{ file.name }}</span>
            <span class="font-weight-bold">{{ formatSize(file.size) }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { ImageOptimizer } from '@/utils/imageOptimizer';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  maxFiles: {
    type: Number,
    default: 5
  },
  label: {
    type: String,
    default: 'Añadir fotos o evidencias'
  },
  icon: {
    type: String,
    default: 'mdi-camera'
  },
  accept: {
    type: String,
    default: 'image/jpeg, image/png, image/webp'
  },
  maxSizeMB: {
    type: Number,
    default: 0.2 // 200KB limit according to OWL plan
  }
});

const emit = defineEmits(['update:modelValue']);

const rawFiles = ref([]);
const currentFiles = ref([...props.modelValue]);
const isOptimizing = ref(false);
const optimizationProgress = ref(0);
const errorMessages = ref([]);

// Object URLs for preview
const previewUrls = new Map();

const hintText = computed(() => {
  const count = currentFiles.value.length;
  if (count >= props.maxFiles) return `Máximo de ${props.maxFiles} archivos alcanzado.`;
  return `${count} de ${props.maxFiles} archivos permitidos.`;
});

// Update current files if modelValue changes externally
watch(() => props.modelValue, (newVal) => {
  if (newVal !== currentFiles.value) {
    currentFiles.value = [...newVal];
  }
}, { deep: true });

const getPreviewUrl = (file) => {
  // If it's already a URL string (from backend), return it directly
  if (typeof file === 'string') return file;
  
  if (!previewUrls.has(file)) {
    previewUrls.set(file, URL.createObjectURL(file));
  }
  return previewUrls.get(file);
};

const formatSize = (bytes) => {
  if (bytes === undefined || typeof bytes !== 'number') return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileName = (file) => {
  if (typeof file === 'string') {
    return file.split('/').pop();
  }
  return file.name;
};

const removeFile = (index) => {
  const file = currentFiles.value[index];
  if (typeof file !== 'string' && previewUrls.has(file)) {
    URL.revokeObjectURL(previewUrls.get(file));
    previewUrls.delete(file);
  }
  
  currentFiles.value.splice(index, 1);
  emit('update:modelValue', currentFiles.value);
};

const handleFileSelect = async (files) => {
  if (!files || files.length === 0) return;
  
  errorMessages.value = [];
  
  // Calculate how many more files we can add
  const availableSlots = props.maxFiles - currentFiles.value.length;
  let filesToProcess = Array.isArray(files) ? files : [files];
  
  if (filesToProcess.length > availableSlots) {
    errorMessages.value.push(`Solo puedes añadir ${availableSlots} archivo(s) más.`);
    filesToProcess = filesToProcess.slice(0, availableSlots);
  }
  
  if (filesToProcess.length === 0) {
    rawFiles.value = [];
    return;
  }
  
  isOptimizing.value = true;
  optimizationProgress.value = 0;
  
  const optimizer = new ImageOptimizer({
    maxSizeMB: props.maxSizeMB,
    quality: 0.8
  });
  
  const processedFiles = [];
  const total = filesToProcess.length;
  
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    try {
      // Use compressToSize to enforce the limit iteratively
      const result = await optimizer.compressToSize(file, props.maxSizeMB);
      if (result && result.file) {
        processedFiles.push(result.file);
      } else {
        processedFiles.push(file); // fallback
      }
    } catch (error) {
      console.error(`Error comprimiendo ${file.name}:`, error);
      errorMessages.value.push(`Error al comprimir ${file.name}.`);
    }
    
    optimizationProgress.value = Math.round(((i + 1) / total) * 100);
  }
  
  currentFiles.value = [...currentFiles.value, ...processedFiles];
  emit('update:modelValue', currentFiles.value);
  
  // Clear the input so same files can be selected again if needed
  rawFiles.value = [];
  isOptimizing.value = false;
};

onBeforeUnmount(() => {
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  previewUrls.clear();
});
</script>
