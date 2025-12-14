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

export {
  MonsterAIService,
  selectMonsterAction,
  selectMonsterTarget,
  createCommand,
  type CommandOptions,
  type MonsterAIContext,
} from './core/MonsterAIService'

// Support Services
export {
  SurpriseService,
  rollSurprise,
  toSurpriseState,
  determineSurpriseState,
  type SurpriseResult,
  type SurpriseState,
} from './support/SurpriseService'

export {
  PartyFormationService,
  isIncapacitated,
  repositionPartyAfterCasualties,
  getBackRow,
  type PartyFormation,
  type RepositionResult,
} from './support/PartyFormationService'

export {
  PoisonService,
  applyPoisonDamage,
  type PoisonDamageResult,
} from './support/PoisonService'

export {
  RegenerationService,
  processMonsterRegeneration,
  type RegenerationResult,
} from './support/RegenerationService'

export {
  CharacterRecoveryService,
  processCharacterStatusRecovery,
  type CharacterRecoveryResult,
} from './support/CharacterRecoveryService'

export {
  CombatInitializationService,
  initiateCombat,
  calculateAveragePartyLevel,
  calculateMinPartyLevel,
  initializeGroupMageLevels,
  type InitiateCombatOptions,
} from './support/CombatInitializationService'

export {
  MonsterAdvancementService,
  checkAndAdvanceMonsters,
  getCurrentMonsterState,
  getMonsterGroup,
  hasAliveMonsters,
  type MonsterAdvancementResult,
} from './support/MonsterAdvancementService'

// Orchestration
export {
  CombatRoundOrchestrator,
  createRoundContext,
  createAuditContext,
  sortCommandsByInitiative,
  applySurpriseFilter,
  canActorAct,
  getSkipReason,
  checkCombatEnd,
  processFleeAttempt,
  mergeCommandResult,
  buildRoundResult,
  buildAudit,
  monsterGroupsChanged,
  executeRound,
  type RoundContext,
  type AuditContext,
  type CombatEndCheck,
} from './orchestration/CombatRoundOrchestrator'

export {
  CommandExecutor,
  executeCommand,
  hasHandler,
  expandAttackCommands,
  type ExecuteCommandOptions,
} from './orchestration/CommandExecutor'

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
import './actions/AdvanceAction'
import './actions/CallForHelpAction'
import './actions/MonsterFleeAction'
import './actions/BreathAction'
import './actions/DispelAction'
import './actions/CastSpellAction'

// Facade for backward compatibility
export { CombatServiceFacade } from './CombatServiceFacade'
