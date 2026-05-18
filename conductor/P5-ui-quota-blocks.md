# Plan: Implementación de P5 (Bloqueos de Cuota UI)

## Problema Identificado (Catch-22 UI Bug)

En `src/components/hacienda/HaciendaUserManagement.vue`, los botones para agregar `auditores` y `operadores` actualmente dependen de una lógica circular:

```javascript
const canAddAuditor = computed(() => {
  // limitCheck.value empieza en null.
  // userTypeToCreate empieza vacío.
  // Por lo tanto, canAddAuditor es falso al cargar la página y el botón no se renderiza.
  return limitCheck.value?.canAdd !== false && userTypeToCreate.value === 'auditor'
})
```

La comprobación real de la cuota (`useSubscriptionLimits().canAddUser`) solo se dispara cuando el usuario **hace clic** en el botón de agregar. Como el botón está oculto por defecto, el usuario nunca puede hacer clic. Adicionalmente, si la UI se "rompe" y el botón es visible, el recálculo tras añadir o eliminar un usuario no está implementado de forma reactiva en `onMounted` o tras mutaciones de estado.

## Propuesta de Solución

1. **Evaluación de Estado Inicial en `onMounted`:**
   En `HaciendaUserManagement.vue`, modificaremos la inicialización para que evalúe activamente si la hacienda aún tiene cupo en el momento de cargar los usuarios.

2. **Refactorización de las Variables Reactivas:**
   Sustituiremos `canAddAuditor` y `canAddOperador` para que dependan de dos verificaciones independientes y asincrónicas en lugar de un `limitCheck` global ligado al click del botón.

3. **Re-validación Post-Acción:**
   Al crear (`createUser`) o eliminar (`deleteUser`) un usuario, re-evaluaremos inmediatamente la cuota para que los botones desaparezcan/aparezcan reactivamente.

4. **Preservación de Lógica Existente:**
   Mantendremos la protección en el backend/composable `useSubscriptionLimits.js` como la barrera final. Este cambio es netamente de UI/UX para prevenir la evasión del pago o la mala experiencia de intentar crear usuarios sin cupo.

## Archivos Afectados

- `src/components/hacienda/HaciendaUserManagement.vue`
