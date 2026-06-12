<template>
  <div class="bitacora-calendar-container">
    <div class="calendar-grid">
      <!-- Headers -->
      <div v-for="dayName in weekDaysNames" :key="dayName" class="calendar-header-cell text-center text-xs font-weight-bold grey--text">
        {{ dayName }}
      </div>

      <!-- Days -->
      <div 
        v-for="day in calendarDays" 
        :key="day.dateStr" 
        class="calendar-day-cell"
        :class="{
          'is-not-current-month': !day.isCurrentMonth,
          'is-today': day.isToday
        }"
        @click="$emit('day-click', day.date)"
      >
        <div class="day-number text-xs" :class="{ 'font-weight-bold text-primary': day.isToday }">
          {{ day.dayNumber }}
        </div>
        
        <div class="entries-container mt-1">
          <v-chip
            v-for="entry in day.entries"
            :key="entry.id"
            :color="getActividadColor(entry)"
            variant="flat"
            size="x-small"
            class="mb-1 w-100 px-1 d-flex justify-start text-truncate text-white"
            @click.stop="$emit('entry-click', entry)"
          >
            <span class="text-truncate" style="max-width: 100%;">{{ getActividadNombre(entry) }}</span>
          </v-chip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';

const props = defineProps({
  currentDate: {
    type: Date,
    required: true
  },
  entries: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['day-click', 'entry-click']);

const weekDaysNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const calendarDays = computed(() => {
  const monthStart = startOfMonth(props.currentDate);
  const monthEnd = endOfMonth(monthStart);
  
  // Get start of the first week (Sunday) and end of the last week (Saturday)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 0 = Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map(date => {
    // Filter entries for this day
    const dayEntries = props.entries.filter(entry => {
      if (!entry.fecha_ejecucion) return false;
      const entryDate = new Date(entry.fecha_ejecucion);
      return isSameDay(entryDate, date);
    });

    return {
      date,
      dateStr: format(date, 'yyyy-MM-dd'),
      dayNumber: format(date, 'd'),
      isCurrentMonth: isSameMonth(date, props.currentDate),
      isToday: isToday(date),
      entries: dayEntries
    };
  });
});

const getSafe = (fn, defaultValue = '') => {
  try {
    const value = fn();
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0 && defaultValue === '') return defaultValue;
    return value === undefined || value === null ? defaultValue : value;
  } catch (e) {
    return defaultValue;
  }
};

const getActividadNombre = (entry) => {
  return getSafe(() => entry.expand.actividad_realizada.nombre, 'Actividad Desconocida');
};

const colorPalette = [
  'red-darken-1', 'pink-darken-1', 'purple-darken-1', 'deep-purple-darken-1',
  'indigo-darken-1', 'blue-darken-1', 'light-blue-darken-1', 'cyan-darken-1',
  'teal-darken-1', 'green-darken-1', 'light-green-darken-1', 'lime-darken-2',
  'amber-darken-3', 'orange-darken-3', 'deep-orange-darken-1', 'brown-darken-1'
];

const getActividadColor = (entry) => {
  const name = getActividadNombre(entry);
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};
</script>

<style scoped>
.bitacora-calendar-container {
  width: 100%;
  overflow-x: auto;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 4px;
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 4px;
}

.calendar-header-cell {
  background-color: #ffffff;
  padding: 8px;
  border-radius: 4px;
}

.calendar-day-cell {
  background-color: #ffffff;
  min-height: 100px;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.calendar-day-cell:hover {
  background-color: #f8f9fa;
}

.calendar-day-cell.is-not-current-month {
  background-color: #fcfcfc;
  opacity: 0.6;
}

.calendar-day-cell.is-today {
  background-color: #e3f2fd;
  border: 1px solid #90caf9;
}

.entries-container {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Custom scrollbar for entries container if many entries */
.entries-container::-webkit-scrollbar {
  width: 4px;
}
.entries-container::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}
</style>
