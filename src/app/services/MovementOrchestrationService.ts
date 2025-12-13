/**
 * MovementOrchestrationService - Orchestrates dungeon movement operations
 *
 * Replaces the 200+ line executeMovement() method in MazeComponent.
 * Coordinates:
 * - Movement validation
 * - Position updates
 * - Special tile effects (via TileHandlerRegistry)
 * - Light state transitions
 * - Poison damage
 * - Encounter checking
 *
 * Returns a result object that the component can act upon,
 * keeping the component focused on UI concerns.
 */

import { Injectable } from '@angular/core'
import { GameState } from '@models/GameState'
import { DungeonState, Position, Direction, TileData, ConditionResult, Destination, MessageStyle } from '@models/Dungeon'
import { DungeonService } from '@services/DungeonService'
import { DungeonMovementService, MovementResult } from '@services/DungeonMovementService'
import { PoisonService } from '@services/PoisonService'
import { EncounterTriggerService, EncounterContext, EncounterCheckResult, FixedEncounterConfig } from '@services/EncounterTriggerService'
import { FightMapService } from '@services/FightMapService'
import { tileHandlerRegistry, TileProcessingResult } from '@services/tile-handlers'

/**
 * Direction types for movement
 */
export type MovementDirection = 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT' | 'TURN_LEFT' | 'TURN_RIGHT'

/**
 * Types of UI actions that can result from movement
 */
export type MovementUIActionType =
  | 'none'
  | 'show_tile_message'
  | 'show_condition_fail'
  | 'show_condition_success'
  | 'trigger_encounter'
  | 'show_elevator'
  | 'return_to_castle'

/**
 * UI action to be performed by the component
 */
export interface MovementUIAction {
  type: MovementUIActionType
  // Tile message data
  message?: string
  messageStyle?: MessageStyle
  autoDismiss?: boolean
  // Condition data
  conditionResult?: ConditionResult
  previousPosition?: Position
  // Encounter data
  encounterConfig?: FixedEncounterConfig
  encounterReason?: 'random' | 'door_kick' | 'treasure_room' | 'alarm' | 'fixed'
  canFlee?: boolean
  // Elevator data
  destinations?: Destination[]
}

/**
 * Light state change information for messaging
 */
export interface LightStateChange {
  type: 'entered_darkness' | 'exited_darkness' | 'light_expired' | 'light_fading' | 'none'
  hadLight?: boolean
  spellType?: string
  remainingDuration?: number
}

/**
 * Result from movement orchestration
 */
export interface MovementOrchestrationResult {
  /** Whether movement was successful */
  success: boolean
  /** Reason if movement failed */
  failReason?: string
  /** Updated game state */
  state: GameState
  /** Messages to display in log */
  messages: string[]
  /** UI action to perform (show dialog, trigger encounter, etc.) */
  uiAction: MovementUIAction
  /** Whether to render the view */
  shouldRender: boolean
  /** Whether this was a door kick (for encounter mechanics) */
  wasDoorKick: boolean
  /** Light state change information */
  lightStateChange: LightStateChange
  /** Whether poison damage was applied */
  poisonDamageApplied: boolean
}

@Injectable({
  providedIn: 'root'
})
export class MovementOrchestrationService {
  /**
   * Execute a movement in the given direction
   */
  executeMovement(
    direction: MovementDirection,
    state: GameState,
    options: {
      encountersEnabled?: boolean
    } = {}
  ): MovementOrchestrationResult {
    const dungeon = state.dungeon as DungeonState

    if (!dungeon) {
      return this.createFailResult(state, 'Not in dungeon')
    }

    // Handle turn commands (no movement validation needed)
    if (direction === 'TURN_LEFT' || direction === 'TURN_RIGHT') {
      return this.executeTurn(direction, state, dungeon)
    }

    // Validate movement
    const validation = this.validateMovement(direction, state, dungeon)
    if (!validation.allowed) {
      return this.createFailResult(state, validation.reason!)
    }

    // Capture pre-movement state for light comparison
    const preMoveState = this.captureLightState(dungeon)

    // Execute the movement
    const movementResult = this.getMovementFunction(direction)(state)
    let newState = movementResult.state

    // Check for door kick
    const wasDoorKick = this.checkDoorKick(state, dungeon, direction)

    // Handle special tile effects
    const tileResult = this.handleTileEffects(newState, movementResult, dungeon.position)

    // If tile handling returns a UI action, return early
    if (tileResult.uiAction.type !== 'none') {
      return {
        success: true,
        state: tileResult.state,
        messages: tileResult.messages,
        uiAction: tileResult.uiAction,
        shouldRender: true,
        wasDoorKick,
        lightStateChange: this.detectLightChange(preMoveState, tileResult.state.dungeon as DungeonState),
        poisonDamageApplied: false
      }
    }

    newState = tileResult.state

    // Apply poison damage
    const poisonResult = this.applyPoisonDamage(newState)
    newState = poisonResult.state
    const allMessages = [...tileResult.messages, ...poisonResult.messages]

    // Detect light state changes
    const lightStateChange = this.detectLightChange(preMoveState, newState.dungeon as DungeonState)
    allMessages.push(...this.getLightChangeMessages(lightStateChange))

    // Check for encounters
    const encounterResult = this.checkForEncounter(
      newState,
      wasDoorKick,
      options.encountersEnabled ?? true
    )

    if (encounterResult.trigger) {
      return {
        success: true,
        state: newState,
        messages: allMessages,
        uiAction: {
          type: 'trigger_encounter',
          encounterConfig: encounterResult.fixedEncounterConfig,
          encounterReason: encounterResult.reason,
          canFlee: !encounterResult.guaranteedFight
        },
        shouldRender: true,
        wasDoorKick,
        lightStateChange,
        poisonDamageApplied: poisonResult.damageApplied
      }
    }

    return {
      success: true,
      state: newState,
      messages: allMessages,
      uiAction: { type: 'none' },
      shouldRender: true,
      wasDoorKick,
      lightStateChange,
      poisonDamageApplied: poisonResult.damageApplied
    }
  }

  /**
   * Execute a turn (left or right)
   */
  private executeTurn(
    direction: 'TURN_LEFT' | 'TURN_RIGHT',
    state: GameState,
    dungeon: DungeonState
  ): MovementOrchestrationResult {
    const turnFn = direction === 'TURN_LEFT'
      ? DungeonMovementService.turnLeft
      : DungeonMovementService.turnRight

    const newState = turnFn.call(DungeonMovementService, state)

    return {
      success: true,
      state: newState,
      messages: [],
      uiAction: { type: 'none' },
      shouldRender: true,
      wasDoorKick: false,
      lightStateChange: { type: 'none' },
      poisonDamageApplied: false
    }
  }

  /**
   * Validate movement in the given direction
   */
  private validateMovement(
    direction: MovementDirection,
    state: GameState,
    dungeon: DungeonState
  ): { allowed: boolean; reason?: string } {
    const level = DungeonService.loadLevel(dungeon.currentLevel)
    const position = dungeon.position

    // Map direction to movement type
    const moveType = direction as 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT'

    return DungeonService.canMove(
      level,
      position,
      moveType,
      dungeon.openDoors,
      dungeon.currentLevel
    )
  }

  /**
   * Get the movement function for a direction
   */
  private getMovementFunction(direction: MovementDirection): (state: GameState) => MovementResult {
    switch (direction) {
      case 'FORWARD':
        return (s) => DungeonMovementService.moveForward(s)
      case 'BACKWARD':
        return (s) => DungeonMovementService.moveBackward(s)
      case 'STRAFE_LEFT':
        return (s) => DungeonMovementService.strafeLeft(s)
      case 'STRAFE_RIGHT':
        return (s) => DungeonMovementService.strafeRight(s)
      default:
        return (s) => ({ state: s })
    }
  }

  /**
   * Check if movement was through a door (door-kick mechanic)
   */
  private checkDoorKick(
    state: GameState,
    dungeon: DungeonState,
    direction: MovementDirection
  ): boolean {
    if (direction !== 'FORWARD') return false

    const level = DungeonService.loadLevel(dungeon.currentLevel)
    const tile = DungeonService.getTile(level, dungeon.position.x, dungeon.position.y)
    const wallDirection = DungeonService.getWallDirectionForMovement(dungeon.position.facing, 'FORWARD')
    const wallType = tile.walls[wallDirection]

    return wallType === 'door'
  }

  /**
   * Handle tile effects after movement
   */
  private handleTileEffects(
    state: GameState,
    movementResult: MovementResult,
    previousPosition: Position
  ): {
    state: GameState
    messages: string[]
    uiAction: MovementUIAction
  } {
    const dungeon = state.dungeon as DungeonState
    if (!dungeon) {
      return { state, messages: [], uiAction: { type: 'none' } }
    }

    // Check for condition result from DungeonMovementService
    if (movementResult.specialTileResult?.conditionResult) {
      const conditionResult = movementResult.specialTileResult.conditionResult

      if (conditionResult.status === 'fail') {
        return {
          state,
          messages: [],
          uiAction: {
            type: 'show_condition_fail',
            conditionResult,
            previousPosition,
            message: conditionResult.entryMessage
          }
        }
      }

      if (conditionResult.status === 'success' &&
        (conditionResult.entryMessage || conditionResult.message || conditionResult.encounterId)) {
        return {
          state: movementResult.state,
          messages: [],
          uiAction: {
            type: 'show_condition_success',
            conditionResult,
            message: conditionResult.entryMessage || conditionResult.message
          }
        }
      }
    }

    // Check for entry message (non-conditional tiles)
    if (movementResult.specialTileResult?.entryMessage &&
      !movementResult.specialTileResult?.conditionResult) {
      return {
        state: movementResult.state,
        messages: [],
        uiAction: {
          type: 'show_tile_message',
          message: movementResult.specialTileResult.entryMessage,
          messageStyle: 'letterbox'
        }
      }
    }

    // Get messages from special tile effects
    const messages = movementResult.specialTileResult?.messages ?? []

    // Check for elevator
    const level = DungeonService.loadLevel(dungeon.currentLevel)
    const newPos = (movementResult.state.dungeon as DungeonState)?.position
    if (newPos) {
      const tile = DungeonService.getTile(level, newPos.x, newPos.y)
      if (tile.types?.includes('elevator') && tile.destinations) {
        return {
          state: movementResult.state,
          messages,
          uiAction: {
            type: 'show_elevator',
            destinations: tile.destinations
          }
        }
      }
    }

    // Check for return to castle (stairs up on level 1 or dungeon cleared)
    if (!movementResult.state.dungeon) {
      return {
        state: movementResult.state,
        messages,
        uiAction: { type: 'return_to_castle' }
      }
    }

    return {
      state: movementResult.state,
      messages,
      uiAction: { type: 'none' }
    }
  }

  /**
   * Apply poison damage to party members
   */
  private applyPoisonDamage(state: GameState): {
    state: GameState
    messages: string[]
    damageApplied: boolean
  } {
    const result = PoisonService.applyPoisonDamage(state)

    if (result.damageTaken.size > 0) {
      const messages: string[] = []
      for (const [charId, damage] of result.damageTaken) {
        const char = result.state.roster.get(charId)
        if (char) {
          messages.push(`${char.name} takes ${damage} poison damage!`)
        }
      }
      return {
        state: result.state,
        messages,
        damageApplied: true
      }
    }

    return {
      state: result.state,
      messages: [],
      damageApplied: false
    }
  }

  /**
   * Check for random encounters
   */
  private checkForEncounter(
    state: GameState,
    isDoorKick: boolean,
    encountersEnabled: boolean
  ): EncounterCheckResult {
    if (!encountersEnabled) {
      return { trigger: false }
    }

    const dungeon = state.dungeon as DungeonState
    if (!dungeon) {
      return { trigger: false }
    }

    const level = DungeonService.loadLevel(dungeon.currentLevel)
    const pos = dungeon.position

    // Get fixed encounter config if present
    const fixedEncounterConfig = FightMapService.getFixedEncounterConfig(
      dungeon.currentLevel,
      pos.x,
      pos.y
    )

    // Build encounter context
    const context: EncounterContext = {
      level: dungeon.currentLevel,
      x: pos.x,
      y: pos.y,
      isDoorKick,
      chestAlarmActive: false,
      isRoomTile: DungeonService.isRoomTile(level, pos.x, pos.y),
      fixedEncounterConfig
    }

    return EncounterTriggerService.checkForEncounter(context)
  }

  /**
   * Capture light state before movement
   */
  private captureLightState(dungeon: DungeonState): {
    lightActive: boolean
    inDarknessZone: boolean
    lightDurationRemaining: number | undefined
    lightSpellType: string | undefined
  } {
    return {
      lightActive: dungeon.lightActive,
      inDarknessZone: dungeon.inDarknessZone,
      lightDurationRemaining: dungeon.lightDurationRemaining,
      lightSpellType: dungeon.lightSpellType
    }
  }

  /**
   * Detect light state changes
   */
  private detectLightChange(
    before: ReturnType<typeof this.captureLightState>,
    after: DungeonState | undefined
  ): LightStateChange {
    if (!after) {
      return { type: 'none' }
    }

    // Entered darkness zone
    if (!before.inDarknessZone && after.inDarknessZone) {
      return {
        type: 'entered_darkness',
        hadLight: before.lightActive
      }
    }

    // Exited darkness zone
    if (before.inDarknessZone && !after.inDarknessZone) {
      return { type: 'exited_darkness' }
    }

    // Light expired
    if (before.lightActive && !after.lightActive && !after.inDarknessZone) {
      return { type: 'light_expired' }
    }

    // Light fading warning
    if (after.lightActive && after.lightDurationRemaining === 5) {
      return {
        type: 'light_fading',
        spellType: after.lightSpellType,
        remainingDuration: 5
      }
    }

    return { type: 'none' }
  }

  /**
   * Get messages for light state changes
   */
  private getLightChangeMessages(change: LightStateChange): string[] {
    switch (change.type) {
      case 'entered_darkness':
        return change.hadLight
          ? ['An unnatural darkness engulfs you! Your light spell is extinguished!']
          : ['You enter an area of impenetrable darkness.']
      case 'exited_darkness':
        return ['You emerge from the darkness.']
      case 'light_expired':
        return ['Your light spell has expired! Darkness surrounds you.']
      case 'light_fading':
        return [`Your ${change.spellType} spell is fading... (${change.remainingDuration} steps remaining)`]
      default:
        return []
    }
  }

  /**
   * Create a failed movement result
   */
  private createFailResult(state: GameState, reason: string): MovementOrchestrationResult {
    return {
      success: false,
      failReason: reason,
      state,
      messages: [reason],
      uiAction: { type: 'none' },
      shouldRender: false,
      wasDoorKick: false,
      lightStateChange: { type: 'none' },
      poisonDamageApplied: false
    }
  }
}
