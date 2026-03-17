# Plan de Implementación Mejorado - Fase 8/9 Restante - Sistema Agri

> **Enhanced with**: Optimal Skills, Agents, and Commands
> **Activaciones Explícitas**: Obligatorias por fase/actividad
> **Fecha**: 2026-03-15

---

## 🚀 ACTIVACIONES INICIALES (OBLIGATORIAS)

### Antes de Iniciar Cualquier Implementación

```bash
# 1. Activar modo óptimo de desarrollo
/skills:activate optimal-dev

# 2. Activar Sequential Thinking (opcional pero recomendado)
/mcp__sequential__sequentialthinking

# 3. Activar Context7 para documentación (opcional)
/mcp__context7__resolve-library-id  # Para queries de librerías
/mcp__context7__query-docs

# 4. Activar Unified Qwen Commands
/uq:help  # Verificar comandos disponibles
```

### Skills Activados por Defecto en Todo el Proyecto
- ✅ **simplify**: Code review automático después de cada implementación
- ✅ **frontend-patterns**: Patrones React/Vue para componentes
- ✅ **vercel-react-best-practices**: Optimización de rendimiento
- ✅ **tdd-workflow**: Tests comprehensivos (80%+ coverage)

---

## 📋 ORDEN DE IMPLEMENTACIÓN (Menor a Mayor Riesgo)

| Orden | Tarea | Duración | Riesgo | Agent Recomendado |
|-------|-------|----------|--------|-------------------|
| 1 | **T8-A11Y-01** - Accesibilidad manual | 3 días | Bajo | frontend-architect |
| 2 | **T9-FEAT-01** - Servicio de alertas email | 1 semana | Medio | backend-architect |
| 3 | **T9-FEAT-02** - Dashboard Super Admin | 2 semanas | Medio | frontend-architect |
| 4 | **T9-FEAT-03** - Reportes programables | 1 semana | Medio | backend-architect |

---

## 📍 T8-A11Y-01: Mejorar Accesibilidad Manual

**Duración**: 3 días | **Prioridad**: P2 | **Sin Playwright (manual)**

### 🎯 Activaciones para esta Fase

```bash
# Activar agente especializado
/task:frontend-architect "Accesibilidad WCAG en componentes Vue"

# Comandos UQ recomendados
/uq:analyze "Componentes Vue para accesibilidad"
/uq:validate "WCAG 2.1 AA compliance"
```

### Componentes a Modificar

#### 1. Login.vue
- **Archivo**: `src/components/Login.vue`
- **Skill Requerido**: `frontend-design` (accesibilidad)
- **Comando**: `/skill:frontend-design`

```vue
<!-- Agregar aria-labels -->
<v-text-field
  v-model="loginForm.username"
  aria-label="Nombre de usuario"
  label="Usuario"
/>

<v-text-field
  v-model="loginForm.password"
  aria-label="Contraseña"
  type="password"
  label="Contraseña"
/>

<!-- Keyboard navigation -->
<v-btn
  type="submit"
  @click.enter="login"
>
  Iniciar Sesión
</v-btn>
```

#### 2. Dashboard.vue
- **Archivo**: `src/components/Dashboard.vue`
- **Skill Requerido**: `frontend-patterns` (semantic HTML)

```vue
<!-- Semantic HTML5 -->
<header role="banner">
  <h1>Dashboard</h1>
</header>

<main role="main">
  <nav aria-label="Navegación principal">
    <!-- navigation items -->
  </nav>
</main>
```

#### 3. ActividadesWorkspace.vue
- **Archivo**: `src/components/actividades/ActividadesWorkspace.vue`
- **Skill Requerido**: `frontend-architect` (focus management)

```vue
<!-- Focus management -->
<v-dialog
  v-model="dialog"
  @keydown.esc="closeDialog"
  aria-modal="true"
  role="dialog"
  aria-labelledby="dialog-title"
>
  <h2 id="dialog-title">Editar Actividad</h2>
</v-dialog>
```

### ✅ Checklist de Verificación

```bash
# 1. Buscar imágenes sin alt
grep -r "<img" src/components/ | grep -v "alt="

# 2. Buscar inputs sin label
grep -r "<v-text-field\|<v-select" src/components/ | grep -v "label="

# 3. Build verification (OBLIGATORIO)
npm run build

# 4. Type checking
npx tsc --noEmit

# 5. Lint
npm run lint
```

### 🏁 Cierre de Fase

```bash
# Ejecutar simplify para code review
/simplify

# Validar accesibilidad con UQ
/uq:validate "Accesibilidad manual completada"
```

---

## 📍 T9-FEAT-01: Servicio de Alertas por Email

**Duración**: 1 semana | **Prioridad**: P1 | **Dependencia**: Resend

### 🎯 Activaciones para esta Fase

```bash
# Activar agente backend
/task:backend-architect "Servicio de email con Resend API"

# Activar Context7 para Resend docs
/mcp__context7__resolve-library-id
  libraryName: "resend"
  query: "send email API Node.js"

# Comandos UQ
/uq:design "Arquitectura de servicio de notificaciones"
/uq:build "Build de servicio email"
```

### Archivos a Crear

#### 1. src/services/emailAlertService.js
- **Agent**: `backend-architect`
- **Pattern**: Service layer pattern
- **Skill**: `backend-patterns`

```javascript
import { logger } from '@/utils/logger'

export const alertTypes = {
  ACTIVIDAD_CRITICA: 'actividad_critica',
  BPA_VENCIDO: 'bpa_vencido',
  RECORDATORIO: 'recordatorio',
  ACTIVIDAD_ASIGNADA: 'actividad_asignada',
  ZONA_REQUIERE_ATENCION: 'zona_atencion'
}

export async function sendAlert(params) {
  const { type, recipients, data, hacienda } = params

  try {
    // Llamar a backend endpoint que usa Resend
    const response = await fetch('/api/alerts/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ type, recipients, data, hacienda })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    logger.info('[ALERT] Enviada exitosamente', { type, to: recipients.length })
    return result
  } catch (error) {
    logger.error('[ALERT] Error enviando alerta', error)
    throw error
  }
}

export async function configureAlertPreferences(haciendaId, preferences) {
  const { enabledTypes, recipients, frequency } = preferences

  try {
    const response = await fetch(`/api/haciendas/${haciendaId}/alerts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ enabledTypes, recipients, frequency })
    })

    return await response.json()
  } catch (error) {
    logger.error('[ALERT] Error configurando preferencias', error)
    throw error
  }
}
```

#### 2. src/stores/alertStore.js
- **Agent**: `backend-architect`
- **Pattern**: Pinia store pattern
- **Skill**: `frontend-patterns`

```javascript
import { defineStore } from 'pinia'
import { sendAlert, configureAlertPreferences, alertTypes } from '@/services/emailAlertService'
import { logger } from '@/utils/logger'

export const useAlertStore = defineStore('alerts', {
  state: () => ({
    preferences: {
      enabledTypes: [],
      recipients: [],
      frequency: 'immediate'
    },
    loading: false,
    error: null
  }),

  getters: {
    isEnabled: (state) => (type) => state.preferences.enabledTypes.includes(type),
    hasRecipients: (state) => state.preferences.recipients.length > 0
  },

  actions: {
    async triggerCriticalActivityAlert(activity) {
      if (!this.isEnabled(alertTypes.ACTIVIDAD_CRITICA)) return

      try {
        this.loading = true
        await sendAlert({
          type: alertTypes.ACTIVIDAD_CRITICA,
          recipients: this.preferences.recipients,
          data: {
            actividadNombre: activity.nombre,
            descripcion: activity.descripcion,
            prioridad: activity.prioridad,
            fechaVencimiento: activity.fecha_vencimiento
          },
          hacienda: activity.hacienda
        })
        logger.info('[ALERT_STORE] Alerta crítica enviada', { activityId: activity.id })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta crítica', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async triggerBPAExpiredAlert(zona) {
      if (!this.isEnabled(alertTypes.BPA_VENCIDO)) return

      try {
        this.loading = true
        await sendAlert({
          type: alertTypes.BPA_VENCIDO,
          recipients: this.preferences.recipients,
          data: {
            zonaNombre: zona.nombre,
            bpaEstado: zona.bpa_estado,
            cultivo: zona.cultivo
          },
          hacienda: zona.hacienda
        })
      } catch (error) {
        logger.error('[ALERT_STORE] Error enviando alerta BPA', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updatePreferences(haciendaId, newPreferences) {
      try {
        this.loading = true
        await configureAlertPreferences(haciendaId, newPreferences)
        this.preferences = newPreferences
        logger.info('[ALERT_STORE] Preferencias actualizadas', { haciendaId })
      } catch (error) {
        logger.error('[ALERT_STORE] Error actualizando preferencias', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})
```

#### 3. src/components/admin/AlertConfig.vue
- **Agent**: `frontend-architect`
- **Pattern**: Admin configuration component

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { useAlertStore } from '@/stores/alertStore'
import { useHaciendaStore } from '@/stores/haciendaStore'
import { alertTypes } from '@/services/emailAlertService'
import { logger } from '@/utils/logger'

const alertStore = useAlertStore()
const haciendaStore = useHaciendaStore()

const loading = ref(false)
const form = ref({
  enabledTypes: [],
  recipients: '',
  frequency: 'immediate'
})

const availableAlertTypes = [
  { value: alertTypes.ACTIVIDAD_CRITICA, label: 'Actividad Crítica', icon: '⚠️' },
  { value: alertTypes.BPA_VENCIDO, label: 'BPA Vencido', icon: '🔴' },
  { value: alertTypes.RECORDATORIO, label: 'Recordatorio', icon: '📋' },
  { value: alertTypes.ACTIVIDAD_ASIGNADA, label: 'Actividad Asignada', icon: '✅' },
  { value: alertTypes.ZONA_REQUIERE_ATENCION, label: 'Zona Requiere Atención', icon: '🎯' }
]

onMounted(() => {
  loadPreferences()
})

async function loadPreferences() {
  loading.value = true
  try {
    const prefs = alertStore.preferences
    form.value = {
      enabledTypes: prefs.enabledTypes || [],
      recipients: prefs.recipients?.join(', ') || '',
      frequency: prefs.frequency || 'immediate'
    }
  } catch (error) {
    logger.error('[ALERT_CONFIG] Error cargando preferencias', error)
  } finally {
    loading.value = false
  }
}

async function savePreferences() {
  loading.value = true
  try {
    const recipients = form.value.recipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)

    await alertStore.updatePreferences(haciendaStore.mi_hacienda?.id, {
      enabledTypes: form.value.enabledTypes,
      recipients,
      frequency: form.value.frequency
    })

    logger.info('[ALERT_CONFIG] Preferencias guardadas exitosamente')
  } catch (error) {
    logger.error('[ALERT_CONFIG] Error guardando preferencias', error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card>
    <v-card-title>Configuración de Alertas por Email</v-card-title>
    <v-card-text>
      <v-form>
        <v-checkbox-group v-model="form.enabledTypes" label="Tipos de Alerta">
          <v-checkbox
            v-for="type in availableAlertTypes"
            :key="type.value"
            :value="type.value"
            :label="`${type.icon} ${type.label}`"
          />
        </v-checkbox-group>

        <v-text-field
          v-model="form.recipients"
          label="Destinatarios (emails separados por coma)"
          placeholder="admin@example.com, manager@example.com"
          class="mt-4"
        />

        <v-select
          v-model="form.frequency"
          :items="[
            { value: 'immediate', label: 'Inmediato' },
            { value: 'hourly', label: 'Resumen por hora' },
            { value: 'daily', label: 'Resumen diario' }
          ]"
          label="Frecuencia de Envío"
          class="mt-4"
        />
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" :loading="loading" @click="savePreferences">
        Guardar Configuración
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
```

#### 4. pocketbase/pb_hooks/api/alerts.send.js
- **Agent**: `backend-architect`
- **Pattern**: PocketBase hook
- **Skill**: `backend-patterns`

```javascript
/// $argon2 fail
((*) => void) => hooks.onFetch((e) => {
  const url = e.request.url.split('/').filter(Boolean)

  if (url[0] === 'api' && url[1] === 'alerts' && url[2] === 'send') {
    if (e.request.method !== 'POST') {
      throw new ApiError(405, 'Method not allowed')
    }

    try {
      const body = JSON.parse(e.request.body)
      const { type, recipients, data, hacienda } = body

      // Enviar email usando Resend
      const resend = require('resend')(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: 'Sistema Agri <noreply@sistemaagri.com>',
        to: recipients,
        subject: getSubject(type, data),
        html: getHTML(type, data, hacienda)
      })

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      throw new ApiError(500, error.message)
    }
  }
})

function getSubject(type, data) {
  const subjects = {
    actividad_critica: `⚠️ Actividad Crítica: ${data.actividadNombre}`,
    bpa_vencido: `🔴 Alerta BPA: ${data.zonaNombre}`,
    recordatorio: `📋 Recordatorio: ${data.titulo}`
  }
  return subjects[type] || 'Alerta Sistema Agri'
}

function getHTML(type, data, hacienda) {
  return `
    <div style="font-family: Arial, sans-serif;">
      <h2>Sistema Agri - Alerta</h2>
      <p>Hacienda: ${hacienda}</p>
      <hr/>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  `
}
```

### 🔗 Integración con actividadesStore

**Archivo**: `src/stores/actividadesStore.js`

```javascript
// En método crearActividad
async function crearActividad(actividadData) {
  // ... código existente ...

  // Trigger alerta si es crítica
  if (actividadData.prioridad === 'alta') {
    const alertStore = useAlertStore()
    await alertStore.triggerCriticalActivityAlert(nuevaActividad)
  }
}
```

### ✅ Criterios de Aceptación

- [ ] emailAlertService.js creado con todos los métodos
- [ ] alertStore.js creado con getters y actions
- [ ] AlertConfig.vue creado y funcional
- [ ] Integración con actividadesStore agregada
- [ ] Backend endpoint creado (o documentado)
- [ ] `npm run build` sin errores

### 🏁 Cierre de Fase

```bash
# 1. Build verification
npm run build

# 2. Type checking
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Code review obligatorio
/simplify

# 5. UQ validation
/uq:validate "Servicio de email completado"
```

---

## 📍 T9-FEAT-02: Dashboard Super Admin Mejorado

**Duración**: 2 semanas | **Prioridad**: P2

### 🎯 Activaciones para esta Fase

```bash
# Activar agente frontend especializado
/task:frontend-architect "Dashboard analytics con charts y export CSV"

# Activar skill de diseño frontend
/skill:frontend-design

# Comandos UQ
/uq:design "Componentes de dashboard admin"
/uq:build "Build de componentes admin"
```

### Archivos a Crear

#### 1. src/components/admin/SuperAdminAnalytics.vue
- **Agent**: `frontend-architect`
- **Skill**: `frontend-design`, `frontend-patterns`
- **Lines**: ~500

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { pb } from '@/utils/pocketbase'
import { logger } from '@/utils/logger'

const loading = ref(false)
const users = ref([])
const haciendas = ref([])
const stats = ref({
  totalUsers: 0,
  totalHaciendas: 0,
  activeUsers: 0,
  growthRate: 0
})

// User Growth Chart data
const userGrowthData = ref([])
const timeRange = ref('30d') // 7d, 30d, 90d, 1y

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    // Cargar usuarios
    const usersList = await pb.collection('users').getList(1, 500, {
      sort: '-created'
    })
    users.value = usersList.items

    // Cargar haciendas
    const haciendasList = await pb.collection('Haciendas').getList(1, 100)
    haciendas.value = haciendasList.items

    // Calcular stats
    stats.value = {
      totalUsers: usersList.totalItems,
      totalHaciendas: haciendasList.totalItems,
      activeUsers: users.value.filter(u => {
        const lastLogin = u.updated || u.created
        const daysSinceLogin = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceLogin <= 30
      }).length,
      growthRate: calculateGrowthRate(users.value)
    }

    // Preparar datos para gráfico
    userGrowthData.value = prepareUserGrowthData(users.value)
  } catch (error) {
    logger.error('[ANALYTICS] Error cargando datos', error)
  } finally {
    loading.value = false
  }
}

function calculateGrowthRate(users) {
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const usersThisMonth = users.filter(u => new Date(u.created) >= lastMonth).length
  const usersBeforeMonth = users.length - usersThisMonth

  return usersBeforeMonth > 0 ? ((usersThisMonth / usersBeforeMonth) * 100).toFixed(1) : 0
}

function prepareUserGrowthData(users) {
  const grouped = {}

  users.forEach(user => {
    const date = new Date(user.created).toISOString().split('T')[0]
    grouped[date] = (grouped[date] || 0) + 1
  })

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

async function exportToCSV() {
  const headers = ['ID', 'Username', 'Email', 'Role', 'Hacienda', 'Created', 'Last Login']
  const rows = users.value.map(u => [
    u.id,
    u.username,
    u.email,
    u.role,
    u.hacienda || 'N/A',
    u.created,
    u.updated || 'N/A'
  ])

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}
</script>

<template>
  <v-container>
    <h1>Dashboard Super Admin</h1>

    <!-- Stats Cards -->
    <v-row>
      <v-col cols="12" sm="3">
        <v-card>
          <v-card-text>
            <div class="text-h4">{{ stats.totalUsers }}</div>
            <div class="text-subtitle2">Total Usuarios</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="3">
        <v-card>
          <v-card-text>
            <div class="text-h4">{{ stats.totalHaciendas }}</div>
            <div class="text-subtitle2">Total Haciendas</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="3">
        <v-card>
          <v-card-text>
            <div class="text-h4">{{ stats.activeUsers }}</div>
            <div class="text-subtitle2">Usuarios Activos</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="3">
        <v-card>
          <v-card-text>
            <div class="text-h4">{{ stats.growthRate }}%</div>
            <div class="text-subtitle2">Crecimiento Mensual</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Chart -->
    <v-card class="mt-4">
      <v-card-title>Crecimiento de Usuarios</v-card-title>
      <v-card-text>
        <v-btn-group>
          <v-btn :variant="timeRange === '7d' ? 'elevated' : 'tonal'" @click="timeRange = '7d'">
            7 días
          </v-btn>
          <v-btn :variant="timeRange === '30d' ? 'elevated' : 'tonal'" @click="timeRange = '30d'">
            30 días
          </v-btn>
          <v-btn :variant="timeRange === '90d' ? 'elevated' : 'tonal'" @click="timeRange = '90d'">
            90 días
          </v-btn>
        </v-btn-group>

        <div class="mt-4" style="height: 300px;">
          <v-table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nuevos Usuarios</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in userGrowthData" :key="item.date">
                <td>{{ item.date }}</td>
                <td>{{ item.count }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </v-card-text>
    </v-card>

    <!-- Export -->
    <v-card class="mt-4">
      <v-card-title>Exportar Datos</v-card-title>
      <v-card-text>
        <v-btn color="primary" @click="exportToCSV">
          <v-icon left>mdi-download</v-icon>
          Exportar Usuarios a CSV
        </v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>
```

#### 2. src/components/admin/UsageMetrics.vue
- **Agent**: `frontend-architect`
- **Lines**: ~250

#### 3. src/components/admin/DataMiningTools.vue
- **Agent**: `backend-architect`
- **Lines**: ~300

### Router Setup

**Archivo**: `src/router/index.js`

```javascript
{
  path: '/admin/analytics',
  name: 'SuperAdminAnalytics',
  component: () => import('@/components/admin/SuperAdminAnalytics.vue'),
  meta: { requiresRole: 'superadmin' }
}
```

### ✅ Criterios de Aceptación

- [ ] 3 componentes creados
- [ ] Stats cards funcionales
- [ ] Gráfico de crecimiento (o tabla mientras se implementa gráfico real)
- [ ] Export CSV funcional
- [ ] Query builder con filtros
- [ ] Router agregado
- [ ] Solo accesible por superadmin

### 🏁 Cierre de Fase

```bash
# Build & validation
npm run build && npx tsc --noEmit && npm run lint

# Code review obligatorio
/simplify

# UQ validation
/uq:validate "Dashboard Super Admin completado"
```

---

## 📍 T9-FEAT-03: Reportes Automatizados Programables

**Duración**: 1 semana | **Prioridad**: P2

### 🎯 Activaciones para esta Fase

```bash
# Activar agente backend para reportes
/task:backend-architect "Sistema de reportes programables con scheduling"

# Activar Context7 para librerías de scheduling (opcional)
/mcp__context7__query-docs
  libraryId: "/node-cron/node-cron"
  query: "schedule recurring tasks Node.js"

# Comandos UQ
/uq:design "Arquitectura de reportes automatizados"
/uq:build "Build de sistema de reportes"
```

### Archivos a Crear

#### 1. src/stores/reportStore.js
- **Agent**: `backend-architect`
- **Skill**: `backend-patterns`
- **Lines**: ~400

#### 2. src/components/reports/ReportScheduler.vue
- **Agent**: `frontend-architect`
- **Skill**: `frontend-patterns`

#### 3. src/components/reports/ScheduledReportsList.vue
- **Agent**: `frontend-architect`

### Router Setup

**Archivo**: `src/router/index.js`

```javascript
{
  path: '/reports',
  name: 'Reports',
  component: () => import('@/components/reports/ReportsView.vue'),
  meta: { requiresAuth: true }
}
```

### Backend: PocketBase Collection

Crear colección `report_schedules` en PocketBase:

```json
{
  "id": "generated_id",
  "templateId": "actividades_semanal",
  "frequency": "weekly",
  "recipients": ["email@example.com"],
  "haciendaId": "hacienda_123",
  "nextRun": "2026-03-22T09:00:00.000Z",
  "active": true,
  "created": "2026-03-15T10:00:00.000Z"
}
```

### ✅ Criterios de Aceptación

- [ ] reportStore.js creado con todos los templates
- [ ] 4 métodos de generación de reporte implementados
- [ ] ReportScheduler.vue creado y funcional
- [ ] ScheduledReportsList.vue creado y funcional
- [ ] Router configurado
- [ ] Colección PocketBase creada
- [ ] `npm run build` sin errores

### 🏁 Cierre de Fase

```bash
# Build & validation
npm run build && npx tsc --noEmit && npm run lint

# Code review obligatorio
/simplify

# UQ validation
/uq:validate "Sistema de reportes completado"
```

---

## ✅ CHECKLIST FINAL DE IMPLEMENTACIÓN

### Verificación Post-Implementación

```bash
# 1. Verificar archivos creados
ls -la src/services/emailAlertService.js
ls -la src/stores/alertStore.js
ls -la src/components/admin/AlertConfig.vue
ls -la src/components/admin/SuperAdminAnalytics.vue
ls -la src/components/admin/UsageMetrics.vue
ls -la src/components/admin/DataMiningTools.vue
ls -la src/stores/reportStore.js
ls -la src/components/reports/ReportScheduler.vue
ls -la src/components/reports/ScheduledReportsList.vue

# 2. Build principal
npm run build

# 3. Type checking
npx tsc --noEmit

# 4. Lint
npm run lint

# 5. Code review final (MANDATORIO)
/simplify

# 6. UQ final validation
/uq:validate "Implementación Fase 8/9 completada"
```

### Checklist de Archivos

- [ ] **T9-FEAT-01**: 4 archivos creados
  - [ ] src/services/emailAlertService.js
  - [ ] src/stores/alertStore.js
  - [ ] src/components/admin/AlertConfig.vue
  - [ ] pocketbase/pb_hooks/api/alerts.send.js

- [ ] **T9-FEAT-02**: 3 componentes creados
  - [ ] src/components/admin/SuperAdminAnalytics.vue
  - [ ] src/components/admin/UsageMetrics.vue
  - [ ] src/components/admin/DataMiningTools.vue

- [ ] **T9-FEAT-03**: 3 archivos creados
  - [ ] src/stores/reportStore.js
  - [ ] src/components/reports/ReportScheduler.vue
  - [ ] src/components/reports/ScheduledReportsList.vue

- [ ] **T8-A11Y-01**: 3 componentes modificados
  - [ ] src/components/Login.vue
  - [ ] src/components/Dashboard.vue
  - [ ] src/components/actividades/ActividadesWorkspace.vue

### Verificación Final

- [ ] `npm run build` exitoso
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run lint` sin errores críticos
- [ ] `/simplify` ejecutado después de cada implementación
- [ ] Documentación actualizada (si aplica)

---

## 📚 COMANDOS UQ DISPONIBLES

### Comandos Principales

| Comando | Descripción | Uso en este Plan |
|---------|-------------|------------------|
| `/uq:implement` | Implementación con Fresh Context Loops | Implementar cada archivo |
| `/uq:analyze` | Análisis comprehensivo | Analizar componentes existentes |
| `/uq:design` | Diseño de arquitectura | Diseñar estructura de componentes |
| `/uq:build` | Build y compilación | Verificar build después de cambios |
| `/uq:validate` | Validación de calidad | Validar cada fase completada |
| `/uq:troubleshoot` | Diagnóstico de errores | Si hay errores de build |

### Comandos de Meta-Orquestación

| Comando | Descripción | Uso en este Plan |
|---------|-------------|------------------|
| `/uq:auto` | Task Router automático | Seleccionar mejor herramienta |
| `/uq:discovery` | Clarificar requisitos | Si hay ambigüedad en el plan |
| `/uq:plan` | Planning Mode | Crear sub-planes por fase |

---

## 🧠 MCP TOOLS DISPONIBLES

### Context7 (Documentación)

```bash
# Resolver librería
/mcp__context7__resolve-library-id
  libraryName: "resend"
  query: "send email API"

# Query documentación
/mcp__context7__query-docs
  libraryId: "/resend/resend"
  query: "send email with attachments"
```

### Sequential Thinking (Razonamiento)

```bash
# Activar para problemas complejos
/mcp__sequential__sequentialthinking
  thought: "Analizar arquitectura de reportes programables"
  nextThoughtNeeded: true
  thoughtNumber: 1
  totalThoughts: 5
```

### Serena (Gestión de Código)

```bash
# Buscar símbolos
/mcp__serena__find_symbol
  name_path_pattern: "useAlertStore"

# Leer archivo
/mcp__serena__read_file
  relative_path: "src/stores/alertStore.js"

# Reemplazar contenido
/mcp__serena__replace_content
  relative_path: "src/stores/actividadesStore.js"
  needle: "async function crearActividad.*?}"
  repl: "nuevo código"
  mode: "regex"
```

---

## 📋 PROTOCOLO DE IMPLEMENTACIÓN POR FASE

### Para CADA Fase/Actividad Atómica:

1. **Pre-Implementación**
   ```bash
   # Activar agente especializado
   /task:<agent-type> "<descripción de tarea>"

   # Activar skills relevantes
   /skill:<skill-name>

   # Leer archivos existentes (Context First)
   /uq:analyze "Archivos relacionados con <tarea>"
   ```

2. **Implementación**
   ```bash
   # Implementar siguiendo patrones existentes
   /uq:implement "<archivo específico>"

   # Verificar patrones del proyecto
   # Mimicar estructura, imports, estilo
   ```

3. **Post-Implementación**
   ```bash
   # Build verification (OBLIGATORIO)
   npm run build

   # Type checking
   npx tsc --noEmit

   # Lint
   npm run lint

   # Code review (MANDATORIO)
   /simplify

   # UQ validation
   /uq:validate "<fase completada>"
   ```

4. **Reporte**
   ```markdown
   - **Status**: ✅ Completado / ❌ Fallido
   - **Files Modified**: Lista de archivos
   - **Verification**: Output del build/test
   - **Notes**: Observaciones relevantes
   ```

---

## ⚠️ ANTI-PATRONES PROHIBIDOS

| Anti-patrón | Descripción | Prevención |
|-------------|-------------|------------|
| **Hallucinated Imports** | Importar módulos no existentes | Verificar archivo existe ANTES de importar |
| **Blind Fixes** | Aplicar fix sin leer error/código | Leer error → Leer código → Hipótesis → Fix |
| **Config Drift** | Cambiar configs sin permiso | Siempre pedir confirmación para cambios de config |
| **Console Log Debugging** | Dejar debug prints en producción | Usar logger, nunca console.log |
| **Plan Implementation Gap** | Plan detallado pero implementación incompleta | Verificar cada feature del plan existe en código |
| **Type Any Quick Fix** | Usar 'as any' para evitar type errors | Agregar propiedades a interfaces, NO castear |
| **Skip Simplify** | No ejecutar /simplify después de implementar | **MANDATORIO**: /simplify después de cada implementación |

---

## 🎯 GOLDEN RULES (RECORDATORIO)

1. **Context First**: Leer archivos relacionados ANTES de escribir
2. **Evidence Based**: Mostrar output de build como evidencia
3. **Atomic Integrity**: Cambios pequeños, verificar con build entre pasos
4. **Pattern Matching**: Imitar patrones existentes del proyecto
5. **Defensive Coding**: Manejar null, undefined, arrays vacíos

---

**Fecha de creación**: 2026-03-15
**Versión**: Enhanced con Skills, Agents y Comandos Óptimos
**Skill mandatorio**: `/simplify` (después de cada implementación)
**Activaciones iniciales**: `optimal-dev`, `sequential-thinking`, `context7` (opcional)
