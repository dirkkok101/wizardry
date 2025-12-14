/**
 * Tile Handlers - Strategy pattern implementations for tile effects
 *
 * This module exports all tile handlers and the registry for use
 * in DungeonMovementService and MazeComponent.
 */

// Core types and interfaces
export type {
  TileHandler,
  TileHandlerContext,
  TileHandlerResult
} from './TileHandler'

export {
  TILE_HANDLER_PRIORITY,
  createNoEffectResult,
  createStateUpdateResult
} from './TileHandler'

// Registry
export type {
  TileProcessingResult
} from './TileHandlerRegistry'

export {
  TileHandlerRegistry,
  tileHandlerRegistry
} from './TileHandlerRegistry'

// Individual handlers
export { TeleporterHandler } from './TeleporterHandler'
export { SpinnerHandler } from './SpinnerHandler'
export { ChuteHandler } from './ChuteHandler'
export { PitHandler } from './PitHandler'
export { StairsUpHandler, StairsDownHandler } from './StairsHandler'
export { ElevatorHandler } from './ElevatorHandler'
export { DarknessZoneStartHandler, DarknessHandler, LightStateProcessor } from './DarknessHandler'
