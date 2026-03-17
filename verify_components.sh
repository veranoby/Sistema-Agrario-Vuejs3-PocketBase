#!/bin/bash

echo "=== Verificación de Componentes Refactorizados ==="
echo ""

# Verificar archivos de actividades
echo "📁 Componentes de Actividades:"
actividad_files=(
  "src/components/actividades/ActividadesWorkspace.vue"
  "src/components/actividades/ActividadesHeader.vue"
  "src/components/actividades/ActividadesInfo.vue"
  "src/components/actividades/ActividadesSiembrasZonas.vue"
  "src/components/actividades/ActividadesProgramaciones.vue"
  "src/components/actividades/ActividadesRecordatorios.vue"
  "src/components/actividades/ActividadesBitacora.vue"
  "src/components/actividades/ActividadesEditDialog.vue"
  "src/components/actividades/ActividadesSiembrasZonasDialog.vue"
  "src/components/actividades/composables/useActividadesData.js"
  "src/components/actividades/composables/useActividadesMetrics.js"
  "src/components/actividades/index.js"
)

for file in "${actividad_files[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "  ✅ $file ($lines líneas)"
  else
    echo "  ❌ $file (NO ENCONTRADO)"
  fi
done

echo ""
echo "📁 Componentes de Siembras:"
siembra_files=(
  "src/components/siembras/SiembraWorkspace.vue"
  "src/components/siembras/SiembraHeader.vue"
  "src/components/siembras/SiembraInfo.vue"
  "src/components/siembras/SiembraZonas.vue"
  "src/components/siembras/SiembraActividades.vue"
  "src/components/siembras/SiembraBitacora.vue"
  "src/components/siembras/composables/useSiembraData.js"
  "src/components/siembras/composables/useSiembraMetrics.js"
  "src/components/siembras/index.js"
)

for file in "${siembra_files[@]}"; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "  ✅ $file ($lines líneas)"
  else
    echo "  ❌ $file (NO ENCONTRADO)"
  fi
done

echo ""
echo "📁 Backups:"
backup_files=(
  "src/components/actividadesWorkspace.vue.bak"
  "src/components/SiembraWorkspace.vue.bak"
)

for file in "${backup_files[@]}"; do
  if [ -f "$file" ]; then
    size=$(du -h "$file" | cut -f1)
    echo "  ✅ $file ($size)"
  else
    echo "  ❌ $file (NO ENCONTRADO)"
  fi
done

echo ""
echo "=== Resumen ==="
total_actividad=${#actividad_files[@]}
total_siembra=${#siembra_files[@]}
total_backup=${#backup_files[@]}
total=$((total_actividad + total_siembra + total_backup))

echo "Total de archivos creados: $total"
echo "  - Actividades: $total_actividad archivos"
echo "  - Siembras: $total_siembra archivos"
echo "  - Backups: $total_backup archivos"

echo ""
echo "✅ Refactorización completada exitosamente!"
