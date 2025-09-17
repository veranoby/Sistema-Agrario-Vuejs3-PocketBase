<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-toolbar color="orange-darken-1" dark>
        <v-toolbar-title>Ejecutar Programaciones Pendientes</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon @click="closeDialog"><v-icon>mdi-close</v-icon></v-btn>
      </v-toolbar>

      <v-card-subtitle class="pt-4">
        Para: {{ programacion.descripcion }}
      </v-card-subtitle>
      <v-card-subtitle>
        (Total pendientes reportadas: {{ programacion.ejecucionesPendientes }})
      </v-card-subtitle>


      <v-card-text>
        <p v-if="!missedDates.length && !isLoading" class="text-center">
          No hay fechas pendientes calculadas o la programación está al día.
        </p>
        <v-list v-if="missedDates.length && !isLoading" dense>
          <v-list-item v-for="(item, index) in missedDates" :key="index">
            <v-checkbox
              v-model="item.selected"
              :label="item.formattedDate"
              density="compact"
            ></v-checkbox>
          </v-list-item>
        </v-list>
        <div v-if="isLoading && !missedDates.length" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p>Calculando fechas pendientes...</p>
        </div>
         <div v-if="isLoading && missedDates.length" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p>Procesando ejecuciones...</p>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="toggleSelectAll(true)" v-if="missedDates.length && !isLoading">Seleccionar Todo</v-btn>
        <v-btn variant="text" @click="toggleSelectAll(false)" v-if="missedDates.length && !isLoading">Deseleccionar Todo</v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="closeDialog" :disabled="isLoading">Cancelar</v-btn>
        <v-btn
          color="orange-darken-1"
          variant="flat"
          @click="handleSubmit"
          :loading="isLoading"
          :disabled="!hasSelectedDates"
        >
          Ejecutar Seleccionadas
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useProgramacionesStore } from '@/stores/programacionesStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { 
  format, parseISO, 
  subDays, subWeeks, subMonths, subYears,
  isBefore, isValid, startOfDay, isSameDay
} from 'date-fns'; // Added isSameDay
import { handleError } from '@/utils/errorHandler';


const props = defineProps({
  modelValue: Boolean, // for v-model
  programacion: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const programacionesStore = useProgramacionesStore();
const snackbarStore = useSnackbarStore();

const missedDates = ref([]); // Array of { date: Date, formattedDate: string, selected: boolean }
const isLoading = ref(false);

// Helper to add a date to the list if it's not already there (for fecha_especifica mainly)
const addDateIfUnique = (dateObj, targetArray) => {
  if (!targetArray.some(d => isSameDay(d.date, dateObj))) {
    targetArray.push({
      date: dateObj,
      formattedDate: format(dateObj, 'yyyy-MM-dd (EEEE)'), // EEEE for full day name
      selected: true,
    });
  }
};


const calculateMissedDates = () => {
  console.log("[Dialog] Calculating missed dates for:", props.programacion.descripcion);
  isLoading.value = true;
  missedDates.value = [];
  
  if (!props.programacion || props.programacion.ejecucionesPendientes <= 0) {
    console.log("[Dialog] No programacion data or no pendientes.");
    isLoading.value = false;
    return;
  }

  const {
    ultima_ejecucion, // Can be null
    created, // Should always exist
    frecuencia,
    frecuencia_personalizada,
    ejecucionesPendientes,
    proxima_ejecucion // This is the *next* scheduled date if it were on track
  } = props.programacion;

  // Determine the starting point for working backwards.
  // If proxima_ejecucion is valid, use it. Otherwise, fallback to today.
  let baseDateForCalculation = proxima_ejecucion ? parseISO(proxima_ejecucion) : new Date();
  if (!isValid(baseDateForCalculation)) {
    baseDateForCalculation = new Date(); // Fallback
  }
  baseDateForCalculation = startOfDay(baseDateForCalculation);

  const calculatedDatesLocal = [];
  let iterations = 0; // Safety break

  // For 'fecha_especifica', ejecucionesPendientes should be 1 if missed.
  if (frecuencia === 'fecha_especifica') {
    if (frecuencia_personalizada && frecuencia_personalizada.fecha) {
      const specificDate = startOfDay(parseISO(frecuencia_personalizada.fecha));
      if (isValid(specificDate) && isBefore(specificDate, startOfDay(new Date()))) {
        addDateIfUnique(specificDate, calculatedDatesLocal);
      }
    }
  } else {
    // For other frequencies, iterate backwards from the day *before* baseDateForCalculation
    let cursorDate = baseDateForCalculation;
    for (let i = 0; i < ejecucionesPendientes && iterations < 500; i++) { // Max 500 iterations for safety
      iterations++;
      let previousDueDate;

      // Calculate the i-th previous due date from cursorDate
      switch (frecuencia) {
        case 'diaria':
          previousDueDate = subDays(cursorDate, 1);
          break;
        case 'semanal':
          previousDueDate = subWeeks(cursorDate, 1);
          break;
        case 'quincenal':
          previousDueDate = subDays(cursorDate, 15); // Or subWeeks(X, 2) if more precise
          break;
        case 'mensual':
          previousDueDate = subMonths(cursorDate, 1);
          break;
        case 'personalizada':
          if (frecuencia_personalizada && frecuencia_personalizada.cantidad && frecuencia_personalizada.tipo) {
            const { cantidad, tipo } = frecuencia_personalizada;
            if (tipo === 'dias') previousDueDate = subDays(cursorDate, cantidad);
            else if (tipo === 'semanas') previousDueDate = subWeeks(cursorDate, cantidad);
            else if (tipo === 'meses') previousDueDate = subMonths(cursorDate, cantidad);
            else if (tipo === 'años') previousDueDate = subYears(cursorDate, cantidad);
          }
          break;
        default:
          console.warn(`[Dialog] Frecuencia desconocida: ${frecuencia}`);
          iterations = 500; // break loop
          continue;
      }

      if (previousDueDate && isValid(previousDueDate)) {
        // Check against ultima_ejecucion or created date
        // The missed date should not be before the schedule was last executed or created.
        const referenceDateStr = ultima_ejecucion || created;
        const referenceDate = startOfDay(parseISO(referenceDateStr));

        if (isBefore(previousDueDate, referenceDate) && !isSameDay(previousDueDate, referenceDate)) {
           // If calculated date is strictly before the reference, it might be an over-calculation or complex scenario.
           // For now, we'll stop for this iteration path if it goes too far back.
           // console.log(`[Dialog] Calculated date ${format(previousDueDate, 'yyyy-MM-dd')} is before reference ${format(referenceDate, 'yyyy-MM-dd')}. Stopping this path.`);
           // iterations = 500; // Potentially stop all calculations if one path goes too far
           // continue;
           // Or, simply don't add it if it's before the earliest possible start (created date)
           if (isBefore(previousDueDate, startOfDay(parseISO(created)))) {
               console.log(`[Dialog] Calculated date ${format(previousDueDate, 'yyyy-MM-dd')} is before creation date ${format(startOfDay(parseISO(created)), 'yyyy-MM-dd')}. Skipping.`);
               cursorDate = previousDueDate; // Still update cursor to continue calculation correctly for next step
               continue;
           }
        }
        addDateIfUnique(previousDueDate, calculatedDatesLocal);
        cursorDate = previousDueDate; // Update cursor for the next iteration
      } else {
        // If a calculation results in an invalid date, stop this path.
        console.warn("[Dialog] Invalid date calculated, stopping this path.");
        iterations = 500;
      }
    }
  }
  
  // Sort dates from oldest to newest
  missedDates.value = calculatedDatesLocal.sort((a,b) => a.date.getTime() - b.date.getTime());
  
  if (iterations >= 500) {
      console.warn("[Dialog] Max iterations reached. Results might be incomplete or review logic.");
  }
  console.log("[Dialog] Calculated missed dates:", missedDates.value.map(d => d.formattedDate));
  isLoading.value = false;
};


onMounted(() => {
  if (props.modelValue && props.programacion) {
    calculateMissedDates();
  }
});

watch(() => props.modelValue, (newVal) => {
  if (newVal && props.programacion) {
    calculateMissedDates();
  } else if (!newVal) {
    missedDates.value = []; 
  }
});

// Watch programacion prop directly for changes if dialog stays open and programacion changes
watch(() => props.programacion, (newProg, oldProg) => {
  if (props.modelValue && newProg && newProg.id !== oldProg?.id) {
    calculateMissedDates();
  } else if (props.modelValue && newProg && newProg.ejecucionesPendientes !== oldProg?.ejecucionesPendientes) {
    // If only ejecucionesPendientes changes, recalculate
    calculateMissedDates();
  }
}, { deep: true });


const toggleSelectAll = (select) => {
  missedDates.value.forEach(item => item.selected = select);
};

const hasSelectedDates = computed(() => {
  return missedDates.value.some(item => item.selected);
});

const handleSubmit = async () => {
  if (!hasSelectedDates.value) {
    snackbarStore.showSnackbar('Por favor, seleccione al menos una fecha.', 'warning');
    return;
  }

  isLoading.value = true;
  const selectedDates = missedDates.value
    .filter(item => item.selected)
    .map(item => format(item.date, 'yyyy-MM-dd')); // Ensure YYYY-MM-DD

  try {
    // This store action needs to be created:
    await programacionesStore.ejecutarProgramacionesBatch({
      programacionId: props.programacion.id,
      fechasEjecucion: selectedDates,
    });
    snackbarStore.showSnackbar('Programaciones pendientes seleccionadas procesadas.', 'success');
    emit('update:modelValue', false); // Close dialog
    // Parent component (ProgramacionesList) should refresh its data or programacionesStore should update reactively
  } catch (error) {
    // Error should be handled by the store action and snackbar shown there or by global handleError
    console.error("[Dialog] Error en handleSubmit:", error);
    // snackbarStore.showSnackbar('Error procesando programaciones pendientes.', 'error'); // Already handled by store/global
  } finally {
    isLoading.value = false;
  }
};

const closeDialog = () => {
  emit('update:modelValue', false);
};

</script>
