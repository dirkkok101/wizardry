/**
 * Trap Services - Barrel export
 *
 * Provides clean imports for all trap-related services:
 * - TrapEffectService: Damage, status effects, triggering
 * - TrapInspectionService: Inspection mechanics and chance calculation
 * - TrapDisarmService: Disarm mechanics and name matching
 * - TrapPuzzleService: Scrambled letter puzzle UI
 * - CalfoSpellService: CALFO spell detection
 */

export * from './TrapEffectService'
export * from './TrapInspectionService'
export * from './TrapDisarmService'
export * from './TrapPuzzleService'
export * from './CalfoSpellService'

// Re-export service objects for named access
export { TrapEffectService } from './TrapEffectService'
export { TrapInspectionService } from './TrapInspectionService'
export { TrapDisarmService } from './TrapDisarmService'
export { TrapPuzzleService } from './TrapPuzzleService'
export { CalfoSpellService } from './CalfoSpellService'
