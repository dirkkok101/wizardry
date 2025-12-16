/**
 * Dungeon Services - Barrel export file
 *
 * Split from the original DungeonMovementService (853 lines) into focused services:
 * - DungeonCoreMovementService: Position calculations, forward/back/strafe movement
 * - DungeonRotationService: Turn left/right, direction rotation
 * - DungeonLevelService: Level transitions, enter dungeon, stairs handling
 * - SpecialTileEffectService: Teleporter, spinner, chute, pit, darkness zones
 */

// Core movement
export {
  DungeonCoreMovementService,
  isDungeonState,
  requireDungeon,
  tileHasType,
  getFacingDelta,
  getNextPosition,
  type MovementResult,
} from './DungeonCoreMovementService'

// Rotation
export {
  DungeonRotationService,
  rotateDirection,
  turnLeft,
  turnRight,
} from './DungeonRotationService'

// Level management
export {
  DungeonLevelService,
  enterDungeon,
  findTileOfType,
  enterLevel,
  handleStairsTransition,
} from './DungeonLevelService'

// Special tile effects
export {
  SpecialTileEffectService,
  handleSpecialTile,
  processLightState,
  handleTeleporter,
  handleSpinner,
  handleChute,
  handlePit,
  isEncounterComplete,
} from './SpecialTileEffectService'

// High-level movement operations (composes the above services)
export {
  DungeonMovementOps,
  moveForward,
  moveBackward,
  strafeLeft,
  strafeRight,
} from './DungeonMovementOps'
