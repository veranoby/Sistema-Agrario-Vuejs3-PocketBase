import { describe, it, expect } from 'vitest'
import {
  validateBitacoraEntry,
  getRequirementsForType
} from '@/utils/validators/bitacoraValidators'

describe('Bitacora Validators', () => {
  describe('validateBitacoraEntry', () => {
    it('debe validar una entrada de siembra correcta', () => {
      const data = {
        variedad: 'Maíz Híbrido',
        densidad: 80000,
        fecha_siembra: '2026-03-15',
        actividad_realizada: 'act1',
        fecha_ejecucion: '2026-03-15'
      }
      const result = validateBitacoraEntry(data, 'siembra')
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('debe rechazar una siembra sin un campo requerido (variedad)', () => {
      const data = {
        densidad: 80000,
        fecha_siembra: '2026-03-15',
        actividad_realizada: 'act1',
        fecha_ejecucion: '2026-03-15'
      }
      const result = validateBitacoraEntry(data, 'siembra')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Campo requerido faltante: variedad')
    })

    it('debe rechazar una siembra con un valor numérico inválido (densidad)', () => {
      const data = {
        variedad: 'Maíz Híbrido',
        densidad: -100, // Valor inválido
        fecha_siembra: '2026-03-15',
        actividad_realizada: 'act1',
        fecha_ejecucion: '2026-03-15'
      }
      const result = validateBitacoraEntry(data, 'siembra')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('La densidad debe ser mayor a 0')
    })

    it('debe validar una entrada de cosecha correcta', () => {
      const data = {
        rendimiento_kg: 5000,
        calidad: 'Buena',
        actividad_realizada: 'act2',
        fecha_ejecucion: '2026-08-20'
      }
      const result = validateBitacoraEntry(data, 'cosecha')
      expect(result.valid).toBe(true)
    })

    it('debe rechazar una cosecha sin rendimiento', () => {
      const data = {
        calidad: 'Buena',
        actividad_realizada: 'act2',
        fecha_ejecucion: '2026-08-20'
      }
      const result = validateBitacoraEntry(data, 'cosecha')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Campo requerido faltante: rendimiento_kg')
    })

    it('debe retornar una advertencia para un tipo de actividad sin validaciones específicas', () => {
      const data = {
        actividad_realizada: 'act3',
        fecha_ejecucion: '2026-08-20'
      }
      const result = validateBitacoraEntry(data, 'tipo_inventado')
      expect(result.valid).toBe(true)
      expect(result.warnings).toContain(
        'No hay validaciones específicas para este tipo de actividad'
      )
    })

    it('debe validar la estructura base de la bitácora', () => {
        const data = {
            // falta actividad_realizada y fecha_ejecucion
        }
        const result = validateBitacoraEntry(data, 'siembra');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Campo obligatorio de bitácora faltante: actividad_realizada');
        expect(result.errors).toContain('Campo obligatorio de bitácora faltante: fecha_ejecucion');
    });

    it('debe advertir sobre un estado de ejecución no estándar', () => {
        const data = {
            // Añadir campos requeridos para que la validación base pase
            variedad: 'Test',
            densidad: 1,
            fecha_siembra: '2026-03-15',
            actividad_realizada: 'act1',
            fecha_ejecucion: '2026-03-15',
            estado_ejecucion: 'en_revision' // estado no estándar
        }
        const result = validateBitacoraEntry(data, 'siembra');
        // Aún es válido (sin errores), pero con una advertencia
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);

        // Utilizamos un matcher de string para hacerlo más robusto
        expect(result.warnings.some(w => w.includes('no está en la lista de estados válidos'))).toBe(true);
    });
  })

  describe('getRequirementsForType', () => {
    it('debe retornar los requisitos para un tipo de actividad válido', () => {
      const requirements = getRequirementsForType('siembra')
      expect(requirements).not.toBeNull()
      expect(requirements.nombre).toBe('Siembra')
      expect(requirements.camposRequeridos).toEqual(['variedad', 'densidad', 'fecha_siembra'])
    })

    it('debe retornar null para un tipo de actividad inválido o desconocido', () => {
      const requirements = getRequirementsForType('tipo_inexistente')
      expect(requirements).toBeNull()
    })

    it('debe manejar diferentes capitalizaciones y normalizaciones', () => {
      const requirements = getRequirementsForType('  Fertilizacion  ')
      expect(requirements).not.toBeNull()
      expect(requirements.nombre).toBe('Fertilización')
    })
  })
})
