/**
 * Tile Handlers - Strategy pattern implementations for tile effects
 *
 * This module exports all tile handlers and the registry for use
 * in DungeonMovementService and MazeComponent.
 */

// Core types and interfaces
export {
  TileHandler,
  TileHandlerContext,
  TileHandlerResult,
  TILE_HANDLER_PRIORITY,
  createNoEffectResult,
  createStateUpdateResult
} from './TileHandler'

// Registry
export {
  TileHandlerRegistry,
  TileProcessingResult,
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
