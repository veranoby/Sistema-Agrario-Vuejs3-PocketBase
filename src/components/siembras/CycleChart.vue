<template>
  <div class="cycle-chart">
    <div v-if="loading" class="d-flex align-center justify-center" style="height: 300px;">
      <v-progress-circular indeterminate color="success" />
    </div>

    <div v-else-if="siembras.length === 0" class="d-flex align-center justify-center" style="height: 300px;">
      <p class="text-medium-emphasis">No hay datos de ciclos de cultivo</p>
    </div>

    <div v-else ref="chartContainer" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO, differenceInDays, differenceInMonths } from 'date-fns'

const props = defineProps({
  siembras: {
    type: Array,
    default: () => []
  }
})

const loading = ref(true)
const chartContainer = ref(null)

// Procesar datos para el gráfico
const processedData = computed(() => {
  if (!props.siembras || props.siembras.length === 0) return []

  return props.siembras
    .filter(s => s.fecha_inicio && s.estado)
    .map(siembra => {
      const startDate = parseISO(siembra.fecha_inicio)
      const now = new Date()
      
      // Calcular fechas estimadas
      let endDate = null
      if (siembra.fecha_cosecha_estimada) {
        endDate = parseISO(siembra.fecha_cosecha_estimada)
      } else if (siembra.duracion_ciclo_dias) {
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + siembra.duracion_ciclo_dias)
      } else {
        // Duración por defecto según tipo de cultivo
        const duracionesDefault = {
          'maiz': 120,
          'soya': 100,
          'arroz': 150,
          'cafe': 365,
          'cacao': 180,
          'platano': 365,
          'yuca': 270
        }
        const duracion = duracionesDefault[siembra.tipo_cultivo?.toLowerCase()] || 180
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + duracion)
      }

      // Determinar estado actual
      const estado = siembra.estado
      const isCompleted = estado === 'finalizado' || estado === 'cosechado'
      const isCurrent = estado === 'activo' || estado === 'en_produccion' || estado === 'en_cosecha'
      
      // Calcular progreso si está activo
      let progress = 0
      if (isCurrent) {
        const totalDays = differenceInDays(endDate, startDate)
        const elapsedDays = differenceInDays(now, startDate)
        progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
      }

      return {
        id: siembra.id,
        nombre: siembra.nombre || `Siembra ${siembra.id?.slice(-6)}`,
        cultivo: siembra.tipo_cultivo || 'Sin especificar',
        zona: siembra.zona_nombre || 'Sin zona',
        startDate,
        endDate,
        estado,
        isCompleted,
        isCurrent,
        progress,
        area: siembra.area_total || 0,
        color: getEstadoColor(estado)
      }
    })
    .sort((a, b) => a.startDate - b.startDate)
})

// Renderizar gráfico de Gantt simplificado
function renderChart() {
  if (!chartContainer.value || processedData.value.length === 0) {
    loading.value = false
    return
  }

  const container = chartContainer.value
  container.innerHTML = ''

  const data = processedData.value
  const now = new Date()

  // Calcular rango de fechas
  const minDate = new Date(Math.min(...data.map(d => d.startDate.getTime())))
  const maxDate = new Date(Math.max(...data.map(d => d.endDate.getTime())))
  
  // Agregar márgenes
  minDate.setDate(minDate.getDate() - 30)
  maxDate.setDate(maxDate.getDate() + 30)

  const totalDays = differenceInDays(maxDate, minDate)
  const chartHeight = Math.max(200, data.length * 50 + 100)

  // Crear contenedor SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', chartHeight)
  svg.setAttribute('viewBox', `0 0 1000 ${chartHeight}`)
  svg.style.overflowX = 'auto'

  container.appendChild(svg)

  // Dibujar línea de "hoy"
  const todayX = ((differenceInDays(now, minDate) / totalDays) * 1000)
  const todayLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
  todayLine.setAttribute('x1', todayX)
  todayLine.setAttribute('y1', '40')
  todayLine.setAttribute('x2', todayX)
  todayLine.setAttribute('y2', chartHeight - 20)
  todayLine.setAttribute('stroke', '#f44336')
  todayLine.setAttribute('stroke-width', '2')
  todayLine.setAttribute('stroke-dasharray', '5,5')
  svg.appendChild(todayLine)

  // Etiqueta de "hoy"
  const todayLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  todayLabel.setAttribute('x', todayX + 5)
  todayLabel.setAttribute('y', '35')
  todayLabel.setAttribute('fill', '#f44336')
  todayLabel.setAttribute('font-size', '12')
  todayLabel.textContent = 'Hoy'
  svg.appendChild(todayLabel)

  // Dibujar barras de ciclo
  data.forEach((siembra, index) => {
    const y = 60 + index * 50
    const barStart = ((differenceInDays(siembra.startDate, minDate) / totalDays) * 1000)
    const barWidth = ((differenceInDays(siembra.endDate, siembra.startDate) / totalDays) * 1000)

    // Grupo para cada siembra
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svg.appendChild(g)

    // Barra de fondo (duración total)
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bgRect.setAttribute('x', barStart)
    bgRect.setAttribute('y', y)
    bgRect.setAttribute('width', Math.max(barWidth, 10))
    bgRect.setAttribute('height', '30')
    bgRect.setAttribute('rx', '4')
    bgRect.setAttribute('fill', siembra.color + '40') // 25% opacity
    bgRect.setAttribute('stroke', siembra.color)
    bgRect.setAttribute('stroke-width', '2')
    g.appendChild(bgRect)

    // Barra de progreso (si está activo)
    if (siembra.isCurrent && siembra.progress > 0) {
      const progressWidth = (barWidth * siembra.progress) / 100
      const progressRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      progressRect.setAttribute('x', barStart)
      progressRect.setAttribute('y', y)
      progressRect.setAttribute('width', Math.max(progressWidth, 5))
      progressRect.setAttribute('height', '30')
      progressRect.setAttribute('rx', '4')
      progressRect.setAttribute('fill', siembra.color)
      g.appendChild(progressRect)
    }

    // Texto con nombre
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', barStart + 5)
    text.setAttribute('y', y + 20)
    text.setAttribute('fill', '#333')
    text.setAttribute('font-size', '12')
    text.setAttribute('font-weight', '500')
    text.textContent = `${siembra.nombre} (${siembra.cultivo})`
    g.appendChild(text)

    // Tooltip con información
    g.addEventListener('mouseenter', (e) => {
      showTooltip(e, siembra)
    })
    g.addEventListener('mousemove', (e) => {
      moveTooltip(e)
    })
    g.addEventListener('mouseleave', hideTooltip)
  })

  // Dibujar eje de tiempo (meses)
  const monthsAxis = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  monthsAxis.setAttribute('transform', `translate(0, ${chartHeight - 30})`)
  svg.appendChild(monthsAxis)

  // Dibujar marcas de meses
  const numMonths = differenceInMonths(maxDate, minDate) + 1
  for (let i = 0; i <= numMonths; i++) {
    const monthDate = new Date(minDate)
    monthDate.setMonth(monthDate.getMonth() + i)
    const x = ((differenceInDays(monthDate, minDate) / totalDays) * 1000)

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.setAttribute('x1', x)
    line.setAttribute('y1', '0')
    line.setAttribute('x2', x)
    line.setAttribute('y2', '10')
    line.setAttribute('stroke', '#ccc')
    line.setAttribute('stroke-width', '1')
    monthsAxis.appendChild(line)

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', x + 5)
    text.setAttribute('y', '25')
    text.setAttribute('fill', '#666')
    text.setAttribute('font-size', '11')
    text.textContent = format(monthDate, 'MMM yy')
    monthsAxis.appendChild(text)
  }

  loading.value = false
}

// Tooltip
let tooltip = null

function showTooltip(event, siembra) {
  tooltip = document.createElement('div')
  tooltip.className = 'cycle-tooltip'
  tooltip.style.position = 'absolute'
  tooltip.style.background = 'white'
  tooltip.style.border = '1px solid #ddd'
  tooltip.style.borderRadius = '4px'
  tooltip.style.padding = '8px'
  tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
  tooltip.style.zIndex = '1000'
  tooltip.style.fontSize = '12px'
  tooltip.style.minWidth = '200px'

  tooltip.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${siembra.nombre}</div>
    <div style="color: #666; margin-bottom: 4px;">${siembra.cultivo} - ${siembra.zona}</div>
    <div style="margin-bottom: 4px;">
      <strong>Inicio:</strong> ${format(siembra.startDate, 'dd MMM yyyy')}
    </div>
    <div style="margin-bottom: 4px;">
      <strong>Fin est.:</strong> ${format(siembra.endDate, 'dd MMM yyyy')}
    </div>
    <div>
      <strong>Estado:</strong> <span style="color: ${siembra.color};">${siembra.estado}</span>
    </div>
    ${siembra.progress > 0 ? `<div><strong>Progreso:</strong> ${Math.round(siembra.progress)}%</div>` : ''}
    ${siembra.area > 0 ? `<div><strong>Área:</strong> ${siembra.area.toFixed(2)} ha</div>` : ''}
  `

  document.body.appendChild(tooltip)
  moveTooltip(event)
}

function moveTooltip(event) {
  if (!tooltip) return
  tooltip.style.left = (event.pageX + 15) + 'px'
  tooltip.style.top = (event.pageY + 15) + 'px'
}

function hideTooltip() {
  if (tooltip) {
    tooltip.remove()
    tooltip = null
  }
}

function getEstadoColor(estado) {
  const colors = {
    activo: '#4CAF50',
    en_produccion: '#4CAF50',
    planificado: '#2196F3',
    en_cosecha: '#FF9800',
    finalizado: '#9E9E9E',
    cosechado: '#9E9E9E',
    fallido: '#f44336'
  }
  return colors[estado] || '#9E9E9E'
}

// Re-renderizar cuando cambian los datos
watch(() => props.siembras, () => {
  if (chartContainer.value) {
    renderChart()
  }
}, { deep: true })

onMounted(() => {
  setTimeout(() => {
    renderChart()
  }, 100)
})
</script>

<style scoped>
.cycle-chart {
  width: 100%;
  overflow-x: auto;
}

.chart-container {
  min-height: 200px;
}

:deep(.cycle-tooltip) {
  pointer-events: none;
}
</style>
