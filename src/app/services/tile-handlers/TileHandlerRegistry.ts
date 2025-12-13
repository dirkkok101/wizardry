/**
 * TileHandlerRegistry - Manages and coordinates tile effect handlers
 *
 * Central registry for all tile handlers. Provides a single entry point
 * for processing tile effects using the Strategy pattern.
 *
 * Benefits:
 * - Open/Closed Principle: Add handlers without modifying this class
 * - Single point of coordination for all tile effects
 * - Consistent handling across all tile types
 */

import { TileHandler, TileHandlerContext, TileHandlerResult, createNoEffectResult } from './TileHandler'
import { TileData, TileType, DungeonState, ConditionResult, Position } from '@models/Dungeon'
import { GameState } from '@models/GameState'
import { TileConditionService } from '@services/TileConditionService'
import { LightStateProcessor } from './DarknessHandler'

// Import all handlers
import { TeleporterHandler } from './TeleporterHandler'
import { SpinnerHandler } from './SpinnerHandler'
import { ChuteHandler } from './ChuteHandler'
import { PitHandler } from './PitHandler'
import { StairsUpHandler, StairsDownHandler } from './StairsHandler'
import { ElevatorHandler } from './ElevatorHandler'
import { DarknessZoneStartHandler, DarknessHandler } from './DarknessHandler'

/**
 * Result from processing all tile effects
 */
export interface TileProcessingResult {
  /** Final state after all tile effects */
  state: GameState
  /** All messages collected from handlers */
  messages: string[]
  /** Entry message for letterbox display */
  entryMessage?: string
  /** Condition result if tile had conditional access */
  conditionResult?: ConditionResult
  /** Whether UI interaction is required */
  requiresUIInteraction?: boolean
  /** Type of UI interaction needed */
  uiInteractionType?: 'elevator' | 'stairs_choice'
  /** Available destinations for UI selection */
  destinations?: any[]
}

export class TileHandlerRegistry {
  private handlers: TileHandler[] = []

  constructor() {
    // Register all handlers in priority order
    this.registerDefaultHandlers()
  }

  /**
   * Register default tile handlers
   */
  private registerDefaultHandlers(): void {
    // Transportation effects (highest priority)
    this.register(new TeleporterHandler())
    this.register(new ChuteHandler())
    this.register(new PitHandler())
    this.register(new StairsUpHandler())
    this.register(new StairsDownHandler())
    this.register(new ElevatorHandler())

    // Orientation effects
    this.register(new SpinnerHandler())

    // Environmental effects
    this.register(new DarknessZoneStartHandler())
    this.register(new DarknessHandler())
  }

  /**
   * Register a tile handler
   */
  register(handler: TileHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Process a tile, applying all applicable handlers
   */
  handleTile(
    state: GameState,
    tile: TileData,
    previousPosition: Position
  ): TileProcessingResult {
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return {
        state,
        messages: []
      }
    }

    // First, check for conditions (must pass before other effects)
    const conditionResult = this.checkCondition(state, tile, previousPosition)
    if (conditionResult) {
      // Condition was checked - return the result
      if (conditionResult.status === 'fail' || conditionResult.status === 'success') {
        return {
          state,
          messages: [],
          conditionResult,
          entryMessage: tile.message
        }
      }
      // 'already_completed' status - continue with normal tile processing
    }

    // Build context for handlers
    const context: TileHandlerContext = {
      state,
      tile,
      previousPosition,
      currentLevel: dungeon.currentLevel
    }

    // Collect all applicable handlers
    const applicableHandlers = this.handlers.filter(h => h.canHandle(tile))

    // If no special handlers, just process light state
    if (applicableHandlers.length === 0) {
      const lightProcessedState = LightStateProcessor.processLightState(state, tile.types)
      return {
        state: lightProcessedState,
        messages: [],
        entryMessage: tile.message
      }
    }

    // Apply handlers in order
    let currentState = state
    const allMessages: string[] = []
    let finalResult: TileHandlerResult | null = null

    for (const handler of applicableHandlers) {
      const result = handler.handle({
        ...context,
        state: currentState
      })

      currentState = result.state
      allMessages.push(...result.messages)
      finalResult = result

      // Stop if handler says not to continue
      if (!result.continueProcessing) {
        break
      }
    }

    // Process light state for the final position
    currentState = LightStateProcessor.processLightState(currentState, tile.types)

    return {
      state: currentState,
      messages: allMessages,
      entryMessage: finalResult?.entryMessage ?? tile.message,
      requiresUIInteraction: finalResult?.requiresUIInteraction,
      uiInteractionType: finalResult?.uiInteractionType,
      destinations: finalResult?.destinations
    }
  }

  /**
   * Check tile condition if present
   */
  private checkCondition(
    state: GameState,
    tile: TileData,
    previousPosition: Position
  ): ConditionResult | null {
    if (!tile.condition) {
      return null
    }

    const dungeon = state.dungeon as DungeonState
    if (!dungeon) return null

    const tileKey = `${dungeon.currentLevel}_${tile.x}_${tile.y}`

    // Check if already completed
    if (dungeon.completedConditionTiles?.has(tileKey)) {
      return { status: 'already_completed' }
    }

    // Check if encounter already defeated
    if (tile.encounterId && dungeon.defeatedEncounters.includes(tile.encounterId)) {
      return { status: 'already_completed' }
    }

    // Check the condition
    const conditionMet = TileConditionService.checkCondition(tile.condition, state)

    if (!conditionMet && tile.onConditionFail) {
      // Condition FAILED
      const fail = tile.onConditionFail
      return {
        status: 'fail',
        message: fail.message,
        messageStyle: fail.messageStyle ?? 'letterbox',
        entryMessage: tile.message,
        failAction: fail.action,
        failDestination: fail.destination,
        previousPosition
      }
    }

    if (conditionMet) {
      // Condition PASSED
      const success = tile.onConditionSuccess
      return {
        status: 'success',
        message: success?.message,
        messageStyle: success?.messageStyle ?? 'letterbox',
        entryMessage: tile.message,
        encounterId: tile.encounterId
      }
    }

    // Condition exists but not explicitly handled
    return null
  }

  /**
   * Get all registered handlers (for debugging/testing)
   */
  getHandlers(): readonly TileHandler[] {
    return this.handlers
  }

  /**
   * Find handler for a specific tile type
   */
  getHandlerForType(tileType: TileType): TileHandler | undefined {
    return this.handlers.find(h => h.tileType === tileType)
  }
}

// Singleton instance for use throughout the application
export const tileHandlerRegistry = new TileHandlerRegistry()
