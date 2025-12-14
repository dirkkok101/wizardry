/**
 * Combat Services Module
 *
 * This module exports all combat-related services following clean architecture.
 * The combat system has been refactored from a single God Class into focused,
 * single-responsibility services.
 *
 * Usage:
 * ```typescript
 * import { InitiativeService, AttackResolutionService } from '@services/combat'
 * ```
 */

// Constants
export * from './CombatConstants'

// Context
export { CombatContext, type ICombatContext } from './CombatContext'

// Core Services
export {
  InitiativeService,
  calculateInitiative,
  calculateCharacterInitiative,
  calculateMonsterInitiative,
  getAgilityModifier,
  isMonsterCombatant,
} from './core/InitiativeService'

export {
  AttackResolutionService,
  calculateHitChance,
  getAttackBonus,
  getHitCalcMod,
  rollDamage,
  isHelplessTarget,
  calculateCriticalChance,
  monsterResistsCritical,
  getAttacksPerRound,
  resolveAttack,
  type AttackResolutionOptions,
} from './core/AttackResolutionService'

export {
  StatusEffectService,
  hasStatusEffect,
  getStatusEffects,
  getStatusDuration,
  applyStatusEffect,
  removeStatusEffect,
  setStatusDuration,
  removeStatusDuration,
  applyAsleepToMonster,
  applyParalyzedToMonster,
  wakeMonster,
  getAcModifier,
  applyAcBuff,
  clearAcModifier,
  tickStatusDurations,
  processMonsterStatusRecovery,
  applyCureStatus,
  type CureType,
} from './core/StatusEffectService'

export {
  DamageApplicationService,
  applyDamageToCharacter,
  applyHealingToCharacter,
  applyFullHealToCharacter,
  killCharacter,
  resurrectCharacter,
  applyDamageToMonster,
  applyInstantDeathToMonster,
  applyHealingToMonster,
  applyDamage,
  applyHealing,
  areAllMonstersDead,
  areAllCharactersDead,
  isCombatantDead,
  canCombatantAct,
  getAllMonsters,
  getAllAliveMonsters,
  getAllActingMonsters,
} from './core/DamageApplicationService'

export {
  FleeService,
  calculateDemoralization,
  calculateFleeChance,
  attemptFlee,
  executeFleeFailurePenalty,
  type FleeFailurePenaltyResult,
} from './core/FleeService'

// Actions (Command Pattern)
export {
  type ICombatAction,
  type ActionExecutionContext,
  BaseCombatAction,
  CombatActionRegistry,
  combatActionRegistry,
} from './actions/CombatAction'

// Import actions to register them
import './actions/AttackAction'
import './actions/ParryAction'
import './actions/FleeAction'

// Facade for backward compatibility
export { CombatServiceFacade } from './CombatServiceFacade'
