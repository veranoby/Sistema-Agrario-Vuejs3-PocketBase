# Guía de Uso de Componentes Refactorizados

## Índice
1. [Migración desde Componentes Originales](#migración)
2. [Uso de Componentes Individuales](#uso-individual)
3. [Composables](#composables)
4. [Ejemplos Prácticos](#ejemplos)
5. [Solución de Problemas](#troubleshooting)

## Migración desde Componentes Originales

### Opción 1: Reemplazo Directo (Recomendado)

Los nuevos componentes principales (`ActividadesWorkspace.vue` y `SiembraWorkspace.vue`) son **drop-in replacements** de los originales. Puedes reemplazarlos directamente en tus rutas:

```javascript
// Antes (router)
{
  path: '/Actividades/:id',
  component: () => import('@/components/actividadesWorkspace.vue')
}

// Después (router)
{
  path: '/Actividades/:id',
  component: () => import('@/components/actividades/ActividadesWorkspace.vue')
}
```

### Opción 2: Uso de Subcomponentes

Si necesitas usar solo partes específicas, puedes importar subcomponentes:

```vue
<script setup>
import { ActividadesHeader, ActividadesInfo } from '@/components/actividades'
</script>

<template>
  <ActividadesHeader :actividadInfo="actividad" ... />
  <ActividadesInfo :actividadInfo="actividad" ... />
</template>
```

## Uso de Componentes Individuales

### Actividades

#### ActividadesHeader
```vue
<ActividadesHeader
  :actividadInfo="actividadInfo"
  :avatarUrl="avatarUrl"
  :avatarHaciendaUrl="avatarHaciendaUrl"
  :mi_hacienda="mi_hacienda"
  :userRole="userRole"
  :actividadAvatarUrl="actividadAvatarUrl"
  :colorBpaEstado="colorBpaEstado"
/>
```

#### ActividadesInfo
```vue
<ActividadesInfo
  :actividadInfo="actividadInfo"
  @open-edit-dialog="handleEdit"
/>
```

#### ActividadesProgramaciones
```vue
<ActividadesProgramaciones
  :programaciones="programacionesList"
  @abrir-nueva-programacion="crearProgramacion"
  @editar-programacion="editarProgramacion"
  @request-single-execution="ejecutarProgramacion"
/>
```

### Siembras

#### SiembraHeader
```vue
<SiembraHeader
  :siembraInfo="siembraInfo"
  :avatarUrl="avatarUrl"
  :avatarHaciendaUrl="avatarHaciendaUrl"
  :mi_hacienda="mi_hacienda"
  :userRole="userRole"
  :siembraAvatarUrl="siembraAvatarUrl"
/>
```

#### SiembraZonas
```vue
<SiembraZonas
  :siembraInfo="siembraInfo"
  :totalArea="totalArea"
  :areaUnit="areaUnit"
  :zonasfiltradas="zonasList"
  :headers="tableHeaders"
  :expanded="expandedRows"
  :zonas="allZonas"
  @open-add-zona="handleAddZona"
  @edit-zona="handleEditZona"
  @delete-zona="handleDeleteZona"
/>
```

## Composables

### useActividadesData

```javascript
import { useActividadesData } from '@/components/actividades/composables/useActividadesData'

// En setup()
const actividadId = ref(route.params.id)

const {
  // State
  actividadInfo,
  editedActividad,
  isLoading,
  editActividadDialog,

  // Computed
  userRole,
  tipoActividadActual,
  colorBpaEstado,
  programacionesActividad,

  // Methods
  loadInitialData,
  openEditDialog,
  saveSelection
} = useActividadesData(actividadId)
```

### useSiembraData

```javascript
import { useSiembraData } from '@/components/siembras/composables/useSiembraData'

// En setup()
const siembraId = ref(route.params.id)

const {
  // State
  siembraInfo,
  isLoading,
  editSiembraDialog,
  zonasfiltradas,
  actividadesfiltradas,

  // Computed
  totalArea,
  siembraAvatarUrl,

  // Methods
  loadInitialData,
  openEditDialog,
  saveSiembraEdit
} = useSiembraData(siembraId)
```

## Ejemplos Prácticos

### Ejemplo 1: Crear una Vista Personalizada

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { ActividadesHeader, ActividadesInfo } from '@/components/actividades'
import { useActividadesData } from '@/components/actividades/composables/useActividadesData'
import { useRoute } from 'vue-router'

const route = useRoute()
const actividadId = ref(route.params.id)

const {
  actividadInfo,
  avatarUrl,
  mi_hacienda,
  userRole,
  actividadAvatarUrl,
  colorBpaEstado,
  loadInitialData
} = useActividadesData(actividadId)

onMounted(async () => {
  await loadInitialData()
})
</script>

<template>
  <div>
    <ActividadesHeader
      :actividadInfo="actividadInfo"
      :avatarUrl="avatarUrl"
      :mi_hacienda="mi_hacienda"
      :userRole="userRole"
      :actividadAvatarUrl="actividadAvatarUrl"
      :colorBpaEstado="colorBpaEstado"
    />

    <div class="my-custom-content">
      <ActividadesInfo :actividadInfo="actividadInfo" />
    </div>
  </div>
</template>
```

### Ejemplo 2: Combinar con Lógica Personalizada

```vue
<script setup>
import { ref, computed } from 'vue'
import { useSiembraData } from '@/components/siembras/composables/useSiembraData'
import { useSiembraMetrics } from '@/components/siembras/composables/useSiembraMetrics'

const siembraId = ref('some-id')

// Usar composables
const {
  siembraInfo,
  totalArea,
  zonasfiltradas
} = useSiembraData(siembraId)

const {
  headers,
  expanded
} = useSiembraMetrics()

// Agregar lógica personalizada
const customComputed = computed(() => {
  return totalArea.value > 100 ? 'Large' : 'Small'
})
</script>
```

## Solución de Problemas

### Problema: Importaciones no encontradas

**Solución**: Asegúrate de que las rutas de importación sean correctas:

```javascript
// ❌ Incorrecto
import ActividadesWorkspace from '@/components/actividadesWorkspace.vue'

// ✅ Correcto
import ActividadesWorkspace from '@/components/actividades/ActividadesWorkspace.vue'

// ✅ O usando el index
import { ActividadesWorkspace } from '@/components/actividades'
```

### Problema: Props faltantes

**Solución**: Verifica que todos los props requeridos estén siendo pasados:

```vue
<!-- Revisa las props en el componente -->
<script setup>
defineProps({
  siembraInfo: { type: Object, required: true },
  // ... más props
})
</script>
```

### Problema: Eventos no funcionando

**Solución**: Asegúrate de estar escuchando los eventos correctamente:

```vue
<!-- ✅ Correcto -->
<SiembraZonas
  @open-add-zona="handleAddZona"
  @edit-zona="handleEditZona"
  @delete-zona="handleDeleteZona"
/>

<!-- ❌ Incorrecto -->
<SiembraZonas
  @onOpenAddZona="handleAddZona"
  @onEditZona="handleEditZona"
  @onDeleteZona="handleDeleteZona"
/>
```

### Problema: Stores no disponibles

**Solución**: Los composables importan los stores internamente, pero necesitas asegurarte de que estén disponibles:

```javascript
// En tu setup principal o main.js
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia())
```

## Actualización desde Versiones Anteriores

Si vienes de los componentes monolíticos originales:

1. **Lee el resumen completo**: `REFACTORING_RESUMEN.md`
2. **Verifica los backups**: Los archivos `.bak` contienen las versiones originales
3. **Prueba gradualmente**: Empieza con un componente a la vez
4. **Usa el script de verificación**: `./verify_components.sh`

## Soporte

Si encuentras problemas o necesitas ayuda:

1. Revisa este documento de guía
2. Consulta el resumen de refactorización
3. Verifica los archivos originales en los backups
4. Revisa la implementación en los archivos de componentes

## Créditos

Refactorización completada el 2026-03-14
Archivos creados: 23
Líneas de código: ~2,646
