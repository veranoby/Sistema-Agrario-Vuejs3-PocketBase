# Smart Deletion Procedure for Siembras

Implementation of a granular deletion system that analyzes dependencies (Zones, Activities, Schedules, Reminders) before removing a Sowing record.

## User Review Required

> [!IMPORTANT]
> **Data Integrity**: The deletion process will be multi-step. First, it analyzes dependencies, then presents a summary to the user.
> **Shared Items**: Items shared with other sowings will default to "Detach" instead of "Delete".

## Proposed Changes

### [Component: Siembras]

#### [NEW] [SiembraDeleteModal.vue](file:///home/veranoby/sistema-agri/src/components/siembras/SiembraDeleteModal.vue)
- Create a new modal component that:
  - Receives `siembraId`.
  - Performs a `fetch` for all related items in `zonas`, `actividades`, `programaciones`, and `recordatorios`.
  - Classifies items into "Exclusive" and "Shared".
  - Displays two lists with checkboxes for user confirmation.
  - Executes the deletion/update logic in batch.

#### [MODIFY] [SiembrasDashboard.vue](file:///home/veranoby/sistema-agri/src/components/siembras/SiembrasDashboard.vue)
- Add a "kebab" menu (`v-menu` with `v-list`) to the siembra cards.
- Add an "Eliminar" option that triggers the `SiembraDeleteModal`.

#### [MODIFY] [siembrasStore.js](file:///home/veranoby/sistema-agri/src/stores/siembrasStore.js)
- Add an advanced deletion action that handles the cleanup of related items if needed, or simply integrates with the new modal logic.

## Deletion Logic Details

### 1. Analysis Phase
For a given `targetId`:
- **Zones**: `pb.collection('zonas').getFullList({ filter: 'siembra = "' + targetId + '"' })`
- **Activities**: `pb.collection('actividades').getFullList({ filter: 'siembras ~ "' + targetId + '"' })`
- **Schedules**: `pb.collection('programaciones').getFullList({ filter: 'siembras ~ "' + targetId + '"' })`
- **Reminders**: `pb.collection('recordatorios').getFullList({ filter: 'siembras ~ "' + targetId + '"' })`

### 2. Classification
- **Exclusive**: `item.siembras.length === 1` (or only linked to targetId).
- **Shared**: `item.siembras.length > 1`.

### 3. Final Actions
- **Delete Record**: `pb.collection(c).delete(id)`
- **Cleanup Relation**: `pb.collection(c).update(id, { siembras: item.siembras.filter(s => s !== targetId) })`

## Verification Plan

### Manual Verification
- Create a test Sowing with:
  - 1 exclusive Zone.
  - 1 exclusive Activity.
  - 1 Activity shared with another Sowing.
- Trigger the deletion from the Dashboard.
- Verify the modal correctly identifies each item.
- Process the deletion and verify:
  - The Sowing is gone.
  - The exclusive Zone and Activity are deleted.
  - The shared Activity still exists but no longer points to the deleted Sowing.
