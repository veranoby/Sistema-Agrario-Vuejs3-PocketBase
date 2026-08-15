<template>
  <div class="universal-geo-selector">
    <v-row dense>
      <!-- Selector de País -->
      <v-col :cols="12" :md="showSubdivision ? (multiSubdivision ? 12 : 6) : 12">
        <v-autocomplete
          v-model="internalCountry"
          :items="countryItems"
          item-title="displayName"
          item-value="code"
          :label="countryLabel"
          :placeholder="countryPlaceholder"
          :variant="variant"
          :density="density"
          :disabled="disabled"
          :rules="countryRules"
          prepend-inner-icon="mdi-earth"
          clearable
          @update:model-value="onCountryChanged"
        >
          <template v-slot:item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :title="item.raw.displayName">
              <template v-slot:prepend>
                <span class="text-h6 mr-2">{{ item.raw.flag }}</span>
              </template>
            </v-list-item>
          </template>

          <template v-slot:selection="{ item }">
            <span class="d-flex align-center">
              <span class="mr-2">{{ item.raw.flag }}</span>
              <span>{{ item.raw.name }}</span>
            </span>
          </template>
        </v-autocomplete>
      </v-col>

      <!-- Selector de Estado/Provincia (Modo Simple) -->
      <v-col v-if="showSubdivision && !multiSubdivision" cols="12" md="6">
        <v-combobox
          v-model="internalSubdivision"
          :items="subdivisionItems"
          :label="subdivisionLabelComputed"
          :placeholder="subdivisionPlaceholder"
          :variant="variant"
          :density="density"
          :disabled="disabled || !internalCountry"
          :rules="subdivisionRules"
          prepend-inner-icon="mdi-map-marker"
          clearable
          @update:model-value="onSubdivisionChanged"
        />
      </v-col>

      <!-- Selector de Estados/Provincias (Modo Multi-Selección / Cobertura) -->
      <v-col v-if="showSubdivision && multiSubdivision" cols="12">
        <v-sheet border rounded class="pa-3 bg-surface-light">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-subtitle-2 font-weight-bold d-flex align-center">
              <v-icon icon="mdi-map-marker-multiple" size="18" class="mr-1" color="primary" />
              {{ subdivisionLabelComputed }} (Zonas de Cobertura)
            </span>
            <div class="d-flex ga-1">
              <v-btn
                size="x-small"
                variant="text"
                color="primary"
                :disabled="!subdivisionItems.length || disabled"
                @click="selectAllSubdivisions"
              >
                Seleccionar Todas
              </v-btn>
              <v-btn
                size="x-small"
                variant="text"
                color="grey"
                :disabled="!selectedMultiSubdivisions.length || disabled"
                @click="clearAllSubdivisions"
              >
                Limpiar
              </v-btn>
            </div>
          </div>

          <v-autocomplete
            v-model="selectedMultiSubdivisions"
            :items="subdivisionItems"
            multiple
            chips
            closable-chips
            :label="`Seleccione las ${subdivisionLabelComputed.toLowerCase()}s autorizadas`"
            :variant="variant"
            :density="density"
            :disabled="disabled || !internalCountry"
            prepend-inner-icon="mdi-check-all"
            @update:model-value="onMultiSubdivisionChanged"
          >
            <template v-slot:chip="{ props: chipProps, item }">
              <v-chip
                v-bind="chipProps"
                size="small"
                color="primary"
                variant="tonal"
                class="font-weight-medium"
              >
                {{ item.raw }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-sheet>
      </v-col>

      <!-- Selector de Ciudad / Cantón (Opcional) -->
      <v-col v-if="showCity && !multiSubdivision" cols="12">
        <v-text-field
          v-model="internalCity"
          :label="cityLabel"
          :placeholder="cityPlaceholder"
          :variant="variant"
          :density="density"
          :disabled="disabled || !internalCountry"
          :rules="cityRules"
          prepend-inner-icon="mdi-city"
          clearable
          @update:model-value="onCityChanged"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ISO_COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode } from '@/utils/geo/isoCountries'
import { getSubdivisionsByCountry, getSubdivisionLabelByCountry } from '@/utils/geo/isoSubdivisions'

const props = defineProps({
  country: {
    type: String,
    default: DEFAULT_COUNTRY_CODE
  },
  subdivision: {
    type: [String, Array],
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  showSubdivision: {
    type: Boolean,
    default: true
  },
  multiSubdivision: {
    type: Boolean,
    default: false
  },
  showCity: {
    type: Boolean,
    default: false
  },
  countryLabel: {
    type: String,
    default: 'País'
  },
  countryPlaceholder: {
    type: String,
    default: 'Seleccione un país'
  },
  subdivisionLabel: {
    type: String,
    default: ''
  },
  subdivisionPlaceholder: {
    type: String,
    default: 'Seleccione provincia o estado'
  },
  cityLabel: {
    type: String,
    default: 'Ciudad / Cantón / Municipio'
  },
  cityPlaceholder: {
    type: String,
    default: 'Ej: Guayaquil, Medellín, Arequipa...'
  },
  variant: {
    type: String,
    default: 'outlined'
  },
  density: {
    type: String,
    default: 'comfortable'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  countryRules: {
    type: Array,
    default: () => []
  },
  subdivisionRules: {
    type: Array,
    default: () => []
  },
  cityRules: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:country',
  'update:subdivision',
  'update:city',
  'change'
])

const internalCountry = ref(props.country || DEFAULT_COUNTRY_CODE)
const internalSubdivision = ref(Array.isArray(props.subdivision) ? '' : (props.subdivision || ''))
const selectedMultiSubdivisions = ref(Array.isArray(props.subdivision) ? [...props.subdivision] : (props.subdivision ? [props.subdivision] : []))
const internalCity = ref(props.city || '')

const countryItems = computed(() => {
  return ISO_COUNTRIES.map(c => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
    displayName: `${c.flag} ${c.name}`
  }))
})

const subdivisionItems = computed(() => {
  return getSubdivisionsByCountry(internalCountry.value)
})

const subdivisionLabelComputed = computed(() => {
  if (props.subdivisionLabel) return props.subdivisionLabel
  return getSubdivisionLabelByCountry(internalCountry.value)
})

watch(() => props.country, (newVal) => {
  if (newVal !== internalCountry.value) {
    internalCountry.value = newVal || DEFAULT_COUNTRY_CODE
  }
})

watch(() => props.subdivision, (newVal) => {
  if (props.multiSubdivision) {
    selectedMultiSubdivisions.value = Array.isArray(newVal) ? [...newVal] : (newVal ? [newVal] : [])
  } else {
    internalSubdivision.value = typeof newVal === 'string' ? newVal : ''
  }
})

watch(() => props.city, (newVal) => {
  internalCity.value = newVal || ''
})

function onCountryChanged(val) {
  internalCountry.value = val || ''
  // Resetear subdivisiones dependientes al cambiar país
  if (props.multiSubdivision) {
    selectedMultiSubdivisions.value = []
    emit('update:subdivision', [])
  } else {
    internalSubdivision.value = ''
    emit('update:subdivision', '')
  }
  emit('update:country', internalCountry.value)
  emitChange()
}

function onSubdivisionChanged(val) {
  internalSubdivision.value = val || ''
  emit('update:subdivision', internalSubdivision.value)
  emitChange()
}

function onMultiSubdivisionChanged(val) {
  selectedMultiSubdivisions.value = val || []
  emit('update:subdivision', selectedMultiSubdivisions.value)
  emitChange()
}

function selectAllSubdivisions() {
  selectedMultiSubdivisions.value = [...subdivisionItems.value]
  emit('update:subdivision', selectedMultiSubdivisions.value)
  emitChange()
}

function clearAllSubdivisions() {
  selectedMultiSubdivisions.value = []
  emit('update:subdivision', [])
  emitChange()
}

function onCityChanged(val) {
  internalCity.value = val || ''
  emit('update:city', internalCity.value)
  emitChange()
}

function emitChange() {
  emit('change', {
    country: internalCountry.value,
    subdivision: props.multiSubdivision ? selectedMultiSubdivisions.value : internalSubdivision.value,
    city: internalCity.value
  })
}
</script>
