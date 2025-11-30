// src/services/CombatService.ts
import { Combatant, CombatState, CombatCommand, CombatActionType, AttackResult, MonsterInstance, MonsterGroup, ENCOUNTER_CONFIG, CombatRoundEvent, CombatRoundResult, CharacterUpdate, CommandExecutionResult, CombatantStatus } from '@models/Combat'
import { Character } from '@models/Character'
import { MonsterService } from './MonsterService'
import { MonsterDataLoader } from './MonsterDataLoader'
import { CharacterStatus } from '@models/CharacterStatus'
import { SpellCastingService } from './SpellCastingService'
import { EncounterService } from './EncounterService'
import { RandomService } from './RandomService'
import { ResistanceService } from './ResistanceService'
import { v4 as uuidv4 } from 'uuid'

export class CombatService {
  /**
   * Debug flag to toggle verbose combat logging.
   * Set to true to enable detailed console output for debugging attack frequency issues.
   * TODO: Remove or set to false after debugging is complete.
   */
  static DEBUG_COMBAT = true

  /**
   * Calculate initiative for combatant
   * Authentic Wizardry 1 formula: random(1-10) + AGI_modifier (minimum 1)
   */
  static calculateInitiative(combatant: Combatant): number {
    const agi = combatant.agility || 10
    const agiMod = Math.floor((agi - 10) / 2)
    const roll = RandomService.random(1, 10)  // 1-10 (authentic Wizardry 1)

    return Math.max(1, roll + agiMod)
  }

  /**
   * Initiate combat encounter with 1-4 monster groups
   * @param dungeonLevel - Current dungeon level (1-10)
   * @param party - Array of characters in the party
   * @param canFlee - Whether the party can flee from this encounter
   * @returns Initial combat state with monster groups
   */
  static initiateCombat(
    dungeonLevel: number,
    party: Character[],
    canFlee: boolean
  ): CombatState {
    // Generate 1-4 monster groups based on dungeon level
    const monsterGroups = EncounterService.generateEncounter(dungeonLevel)

    return {
      monsterGroups,
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee,
      statusEffects: new Map(),  // Initialize empty status effects
      acModifiers: new Map(),    // Initialize empty AC modifiers
      statusDurations: new Map() // Initialize empty status durations
    }
  }

  static createCommand(
    actor: Combatant,
    actionType: CombatActionType,
    target?: Combatant | Combatant[],
    data?: any
  ): CombatCommand {
    // Extract targetGroupId from data if present (for DISPEL and group spells)
    const targetGroupId = data?.groupId

    return {
      id: uuidv4(),
      actor,
      type: actionType,
      initiative: this.calculateInitiative(actor),
      target,
      targetGroupId,
      data
    }
  }

  /**
   * Calculate hit chance percentage
   * Formula: (attackBonus + defenderAC + 10) × 5% + (3 × victimPosition)
   * Clamped between 5% and 95%
   *
   * @param defenderAcModifier - AC modifier (e.g., -2 for PARRY). Lower AC = better defense
   * @param attackerPenalty - Attack penalty (e.g., -4 for BLIND)
   * @param victimPosition - Position in monster group (0-indexed). Authentic Wizardry 1: +3% per position
   */
  static calculateHitChance(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0,
    victimPosition: number = 0
  ): number {
    const attackBonus = this.getAttackBonus(attacker) + attackerPenalty
    const effectiveAc = defender.ac + defenderAcModifier

    // Base chance formula
    let rawChance = (attackBonus + effectiveAc + 10) * 5

    // Authentic Wizardry 1: +3% per victim position (monsters in back are easier to hit)
    // This represents the front monsters providing cover for those behind
    rawChance += 3 * victimPosition

    return Math.max(5, Math.min(95, rawChance))
  }

  /**
   * Strong combat classes for hit calculation
   * These classes use the formula: 2 + floor(Level/3)
   */
  private static readonly STRONG_COMBAT_CLASSES = ['FIGHTER', 'PRIEST', 'SAMURAI', 'LORD', 'NINJA']

  /**
   * Calculate class-based hit modifier (HPCALCMD) - Authentic Wizardry 1
   *
   * Formula from Thomas William Ewers' reverse-engineered Apple II source:
   * - Fighter/Priest/Samurai/Lord/Ninja: 2 + floor(Level/3)
   * - Mage/Thief/Bishop: floor(Level/5)
   *
   * This creates a level-scaling hit bonus that differs by class archetype.
   */
  private static getHitCalcMod(combatant: Combatant): number {
    const level = combatant.level || 1

    // Check if this is a character with a class
    if ('class' in combatant && combatant.class) {
      if (this.STRONG_COMBAT_CLASSES.includes(combatant.class)) {
        // Strong classes: 2 + floor(Level/3)
        return 2 + Math.floor(level / 3)
      }
      // Weak classes (Mage/Thief/Bishop): floor(Level/5)
      return Math.floor(level / 5)
    }

    // Monsters use their level directly
    return level
  }

  private static getAttackBonus(combatant: Combatant): number {
    // Authentic Wizardry 1: HitCalcMod + STR modifier
    const hitCalcMod = this.getHitCalcMod(combatant)

    // For characters: add STR modifier
    if ('class' in combatant && combatant.class) {
      const strMod = Math.floor((combatant.strength - 10) / 2)
      return hitCalcMod + strMod
    }

    // For monsters: just HitCalcMod (which is their level)
    return hitCalcMod
  }

  static resolveAttack(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0,
    victimPosition: number = 0
  ): AttackResult {
    const hitChance = this.calculateHitChance(attacker, defender, defenderAcModifier, attackerPenalty, victimPosition)
    const hitRoll = RandomService.randomFloat(0, 100)

    if (hitRoll >= hitChance) {
      return {
        hit: false,
        damage: 0,
        critical: false,
        message: 'Miss!'
      }
    }

    // Roll damage
    const baseDamage = this.rollDamage(attacker)
    const strMod = this.getStrengthModifier(attacker)
    let damage = Math.max(1, baseDamage + strMod)

    // Critical hit: (2 × Level)% chance, max 50%
    // Authentic Wizardry 1: Boss/unique monsters resist critical hits
    const attackerLevel = attacker.level || 1
    const critChance = Math.min(50, attackerLevel * 2)
    let critical = RandomService.chance(critChance)

    // Check if defender is a monster that resists critical hits
    if (critical && 'monsterId' in defender) {
      const template = MonsterDataLoader.getMonster(defender.monsterId)
      if (template && (template.isBoss || template.isUnique)) {
        critical = false  // Boss/unique monsters resist decapitation/criticals
      }
    }

    if (critical) {
      damage *= 2
    }

    // Helpless target multiplier: sleeping/paralyzed targets take 2× damage
    // Research: Per Wizardry 1 mechanics, helpless targets are automatically hit
    // and take double damage from physical attacks
    const isHelpless = this.isHelplessTarget(defender)
    if (isHelpless) {
      damage *= 2
    }

    const finalDamage = damage

    // Build appropriate message
    let message = `${finalDamage} damage!`
    if (critical && isHelpless) {
      message = `Critical Hit on helpless target! ${finalDamage} damage!`
    } else if (critical) {
      message = `Critical Hit! ${finalDamage} damage!`
    } else if (isHelpless) {
      message = `Strikes helpless target! ${finalDamage} damage!`
    }

    return {
      hit: true,
      damage: finalDamage,
      critical,
      message
    }
  }

  /**
   * Class-specific unarmed damage (authentic Wizardry 1)
   * Most classes: 1d2
   * Ninja: 1d4 + level/3 (rounded down)
   */
  private static readonly CLASS_UNARMED_DAMAGE: Record<string, { die: number; bonus: boolean }> = {
    FIGHTER: { die: 2, bonus: false },
    MAGE: { die: 2, bonus: false },
    PRIEST: { die: 2, bonus: false },
    THIEF: { die: 2, bonus: false },
    BISHOP: { die: 2, bonus: false },
    SAMURAI: { die: 2, bonus: false },
    LORD: { die: 2, bonus: false },
    NINJA: { die: 4, bonus: true }  // Ninja gets level bonus
  }

  private static rollDamage(combatant: Combatant): number {
    // For characters: use equipped weapon or unarmed damage
    if ('class' in combatant) {
      const char = combatant as Character

      // Check for equipped weapon
      if (char.equippedWeapon) {
        const weapon = char.equippedWeapon
        // Use damageRoll if available (has min/max), otherwise fall back to damage
        if (weapon.damageRoll) {
          const baseDamage = RandomService.random(weapon.damageRoll.min, weapon.damageRoll.max)
          const enhancement = weapon.enhancement || 0
          return baseDamage + enhancement
        } else if (weapon.damage) {
          const enhancement = weapon.enhancement || 0
          return RandomService.rollDie(weapon.damage) + enhancement
        }
      }

      // Unarmed damage (authentic Wizardry 1)
      const unarmedConfig = this.CLASS_UNARMED_DAMAGE[char.class] ?? { die: 2, bonus: false }
      let damage = RandomService.rollDie(unarmedConfig.die)

      // Ninja gets level-based unarmed bonus
      if (unarmedConfig.bonus) {
        damage += Math.floor(char.level / 3)
      }

      return damage
    }

    // For monsters: roll from damage array
    if ('damage' in combatant && combatant.damage && combatant.damage.length > 0) {
      const dice = combatant.damage[0]
      return RandomService.random(dice.min, dice.max)
    }
    return 1
  }

  private static getStrengthModifier(combatant: Combatant): number {
    if ('strength' in combatant) {
      return Math.floor((combatant.strength - 10) / 2)
    }
    return 0
  }

  /**
   * Check if target is helpless (sleeping or paralyzed)
   * Helpless targets take 2× damage from physical attacks (Wizardry 1 mechanic)
   */
  private static isHelplessTarget(combatant: Combatant): boolean {
    // Check status field for characters and monsters
    if ('status' in combatant) {
      const status = combatant.status
      // Check for sleeping or paralyzed status
      // Status can be CharacterStatus enum or CombatantStatus string
      if (typeof status === 'string') {
        const statusStr = status.toUpperCase()
        return statusStr === 'ASLEEP' || statusStr === 'PARALYZED'
      }
      // For numeric enum values (CharacterStatus)
      // CharacterStatus.ASLEEP = 3, CharacterStatus.PARALYZED = 4
      return status === 3 || status === 4
    }
    return false
  }

  /**
   * Get number of attacks per round for a combatant
   * Formula:
   * - Fighter/Lord/Samurai: 1 + floor(level/5)
   * - Ninja: 2 + floor(level/5)
   * - Others: 1
   * - Max: 10 attacks
   */
  static getAttacksPerRound(combatant: Combatant): number {
    const combatantName = combatant.name || 'Unknown'

    // Monsters always get 1 attack
    if ('monsterId' in combatant) {
      if (this.DEBUG_COMBAT) console.debug(`[Combat] getAttacksPerRound: ${combatantName} (monster) = 1 attack`)
      return 1
    }

    // Characters: check class
    if ('class' in combatant) {
      const level = combatant.level || 1
      const levelBonus = Math.floor(level / 5)
      let attacks: number

      switch (combatant.class) {
        case 'FIGHTER':
        case 'LORD':
        case 'SAMURAI':
          attacks = Math.min(10, 1 + levelBonus)
          break
        case 'NINJA':
          attacks = Math.min(10, 2 + levelBonus)
          break
        default:
          attacks = 1
      }

      if (this.DEBUG_COMBAT) console.debug(`[Combat] getAttacksPerRound: ${combatantName} (${combatant.class}, level ${level}) = ${attacks} attack(s)`)
      return attacks
    }

    if (this.DEBUG_COMBAT) console.debug(`[Combat] getAttacksPerRound: ${combatantName} (unknown type) = 1 attack`)
    return 1
  }

  /**
   * Select action for a monster during combat
   *
   * @param monster - The monster selecting an action
   * @param party - The party characters
   * @param frontRow - Array of character IDs in the front row
   * @param monsterGroup - The group this monster belongs to (optional, for formation checks)
   * @param allGroups - All monster groups in combat (optional, for advancement checks)
   * @returns CombatCommand representing the monster's action
   */
  static selectMonsterAction(
    monster: MonsterInstance,
    party: Character[],
    frontRow: string[],
    monsterGroup?: MonsterGroup,
    allGroups?: MonsterGroup[]
  ): CombatCommand {
    // Check if monster is in back row and needs to advance
    if (monsterGroup && allGroups && monsterGroup.formation === 'back') {
      const template = MonsterDataLoader.getMonster(monster.monsterId)

      // If melee-only monster in back row, need to advance to attack
      if (template && !MonsterService.canAttackFromBackRow(template)) {
        // Check if front row has room (at least one front group is wiped out or empty)
        const frontGroups = allGroups.filter(g =>
          g.formation === 'front' && g.monsters.some(m => m.hp > 0)
        )

        // Allow advancement if front row has room
        if (frontGroups.length < ENCOUNTER_CONFIG.MAX_FRONT_ROW_GROUPS) {
          return this.createCommand(monster, 'ADVANCE')
        }

        // Can't advance, front row is full - just parry/wait
        return this.createCommand(monster, 'PARRY')
      }
    }

    // Get alive front row members that can be targeted
    const aliveFront = party.filter(c =>
      frontRow.includes(c.id) && this.canCombatantAct(c)
    )

    // If no alive front row, target alive back row
    const targetPool = aliveFront.length > 0
      ? aliveFront
      : party.filter(c => this.canCombatantAct(c))

    // If no valid targets, return a do-nothing command
    if (targetPool.length === 0) {
      return this.createCommand(monster, 'PARRY')
    }

    // Select target using AI strategy based on monster level
    const target = this.selectMonsterTarget(monster, targetPool)

    return this.createCommand(monster, 'ATTACK', target)
  }

  /**
   * Select best target for monster using AI strategy
   * Strategy varies by monster level:
   * - Level 1-2: Random targeting (simple creatures)
   * - Level 3-5: Focus fire on weakest (smart hunters)
   * - Level 6+: Target spellcasters preferentially (intelligent foes)
   */
  private static selectMonsterTarget(
    monster: MonsterInstance,
    targets: Character[]
  ): Character {
    const level = monster.level || 1

    // Level 1-2: Random targeting
    if (level <= 2) {
      return RandomService.pickRandom(targets)
    }

    // Level 3-5: Focus fire on weakest HP%
    if (level <= 5) {
      return targets.reduce((weakest, current) => {
        const weakestPercent = weakest.hp / weakest.maxHp
        const currentPercent = current.hp / current.maxHp
        return currentPercent < weakestPercent ? current : weakest
      })
    }

    // Level 6+: Prefer spellcasters (MAGE > PRIEST > BISHOP > others)
    const spellcasters = targets.filter(c =>
      c.class === 'MAGE' || c.class === 'PRIEST' || c.class === 'BISHOP'
    )

    if (spellcasters.length > 0) {
      // Among spellcasters, target the weakest HP%
      return spellcasters.reduce((weakest, current) => {
        const weakestPercent = weakest.hp / weakest.maxHp
        const currentPercent = current.hp / current.maxHp
        return currentPercent < weakestPercent ? current : weakest
      })
    }

    // If no spellcasters, fall back to weakest HP%
    return targets.reduce((weakest, current) => {
      const weakestPercent = weakest.hp / weakest.maxHp
      const currentPercent = current.hp / current.maxHp
      return currentPercent < weakestPercent ? current : weakest
    })
  }

  /**
   * Result message marker prefix
   * Messages prefixed with this are "results" of actions and use actionResultDelay
   * The marker is stripped before display
   */
  static readonly RESULT_MARKER = '→ '

  static executeCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>,
    existingCharacterUpdates?: Map<string, Character>
  ): CommandExecutionResult {
    if (this.DEBUG_COMBAT) {
      const actorName = this.getCombatantName(command.actor)
      const targetName = this.getTargetName(command.target)
      const isMonster = 'monsterId' in command.actor

      console.log(`[Combat] Executing command:`, {
        type: command.type,
        actor: actorName,
        actorId: command.actor.id,
        actorType: isMonster ? 'monster' : 'character',
        target: targetName,
        targetId: this.getTargetId(command.target),
        initiative: command.initiative
      })
    }

    // Handle different command types
    if (command.type === 'ATTACK') {
      return this.executeAttackCommand(state, command, parryingCombatants)
    }

    if (command.type === 'PARRY') {
      return this.executeParryCommand(state, command, parryingCombatants)
    }

    if (command.type === 'RUN') {
      return this.executeRunCommand(state, command)
    }

    if (command.type === 'CAST_SPELL') {
      return this.executeCastSpellCommand(state, command, existingCharacterUpdates)
    }

    if (command.type === 'DISPEL') {
      return this.executeDispelCommand(state, command)
    }

    if (command.type === 'ADVANCE') {
      return this.executeAdvanceCommand(state, command)
    }

    // TODO: Handle other command types (USE_ITEM)
    return { newState: state, messages: ['Unknown command type'] }
  }

  /**
   * Check if a message is a result message (has the result marker prefix)
   */
  static isResultMessage(message: string): boolean {
    return message.startsWith(this.RESULT_MARKER)
  }

  /**
   * Strip the result marker from a message for display
   */
  static stripResultMarker(message: string): string {
    return message.startsWith(this.RESULT_MARKER)
      ? message.substring(this.RESULT_MARKER.length)
      : message
  }

  /**
   * Execute a physical attack command
   * @param state Current combat state
   * @param command The attack command to execute
   * @param parryingCombatants Set of combatant IDs that are currently parrying
   * @returns Updated combat state, result messages, and damage info for display sync
   *
   * @remarks
   * Authentic Wizardry mechanic: Helpless targets (ASLEEP or PARALYZED) take 2x damage
   * from physical attacks. This multiplier is applied after hit/damage calculations.
   */
  private static executeAttackCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): CommandExecutionResult {
    const target = command.target as Combatant
    if (!target) {
      return { newState: state, messages: ['No target specified'] }
    }

    // Check if target is parrying (apply -2 AC bonus)
    const isParrying = parryingCombatants.has(target.id)
    const acModifier = isParrying ? -2 : 0

    // Check if attacker is blind (-4 attack penalty)
    const isBlind = this.hasStatusEffect(state, command.actor.id, 'BLIND')
    const attackerPenalty = isBlind ? -4 : 0

    // Calculate victim position for authentic Wizardry 1 hit modifier
    // Monsters in back of their group are easier to hit (+3% per position)
    let victimPosition = 0
    if ('monsterId' in target) {
      const group = state.monsterGroups.find(g => g.monsters.some(m => m.id === target.id))
      if (group) {
        victimPosition = group.monsters.findIndex(m => m.id === target.id)
      }
    }

    const attackResult = this.resolveAttack(command.actor, target, acModifier, attackerPenalty, victimPosition)
    const actorName = this.getCombatantName(command.actor)
    const targetName = this.getCombatantName(target)

    if (this.DEBUG_COMBAT) {
      console.debug(`[Combat] Attack resolution:`, {
        attacker: actorName,
        defender: targetName,
        hit: attackResult.hit,
        damage: attackResult.damage,
        critical: attackResult.critical,
        defenderAC: 'ac' in target ? target.ac : 'unknown',
        acModifier,
        attackerPenalty,
        isParrying
      })
    }

    // Action message (always shown first)
    const actionMessage = `${actorName} attacks ${targetName}`

    if (!attackResult.hit) {
      // Result message for miss
      const resultMessage = `${this.RESULT_MARKER}${actorName} misses!`
      return {
        newState: state,
        messages: [actionMessage, resultMessage]
      }
    }

    /**
     * Authentic Wizardry Damage Multiplier
     * Helpless targets (ASLEEP or PARALYZED) take double damage from physical attacks.
     * This represents the attacker taking advantage of a defenseless opponent.
     * Source: docs/research/combat-formulas.md lines 266-270
     */
    const isAsleep = target.status === 'ASLEEP'
    const isParalyzed = target.status === 'PARALYZED'
    const damageMultiplier = (isAsleep || isParalyzed) ? 2 : 1
    const finalDamage = Math.floor(attackResult.damage * damageMultiplier)

    // Calculate new HP and status for target
    const newHp = Math.max(0, target.hp - finalDamage)
    // For status, handle monsters (CombatantStatus) vs characters (CharacterStatus)
    // Monsters wake up when damaged, characters maintain their status
    let newStatus: CombatantStatus
    if ('monsterId' in target) {
      // Monster: wake from ASLEEP, or keep status (unless dead)
      newStatus = newHp === 0 ? 'DEAD' : target.status === 'ASLEEP' ? 'ALIVE' : target.status
    } else {
      // Character: map to ALIVE/DEAD for display purposes
      newStatus = newHp === 0 ? 'DEAD' : 'ALIVE'
    }

    // Apply damage to target (for monsters - characters are tracked separately)
    const newState = this.applyDamage(state, target, finalDamage)

    if (this.DEBUG_COMBAT) {
      console.debug(`[Combat] Damage applied:`, {
        attacker: actorName,
        defender: targetName,
        baseDamage: attackResult.damage,
        multiplier: damageMultiplier,
        finalDamage,
        previousHp: target.hp,
        newHp,
        newStatus,
        isHelpless: isAsleep || isParalyzed
      })
    }

    // Build result message
    let resultText: string
    if (attackResult.critical) {
      resultText = `${actorName} scores a CRITICAL HIT for ${finalDamage} damage!`
    } else {
      resultText = `${actorName} hits for ${finalDamage} damage!`
    }

    if (isAsleep || isParalyzed) {
      resultText += ' (HELPLESS: 2x damage!)'
    }

    const resultMessage = `${this.RESULT_MARKER}${resultText}`

    return {
      newState,
      messages: [actionMessage, resultMessage],
      targetDamage: {
        targetId: target.id,
        damage: finalDamage,
        newHp,
        newStatus
      }
    }
  }

  private static executeParryCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): CommandExecutionResult {
    // Add actor to parrying set
    parryingCombatants.add(command.actor.id)

    const actorName = this.getCombatantName(command.actor)
    return {
      newState: state, // State doesn't change for PARRY, return as-is
      messages: [`${actorName} assumes a defensive stance! (AC -2)`]
    }
  }

  private static executeRunCommand(
    state: CombatState,
    command: CombatCommand
  ): CommandExecutionResult {
    const actorName = this.getCombatantName(command.actor)
    return {
      newState: state, // State doesn't change, flee is checked at end of round
      messages: [`${actorName} attempts to flee!`]
    }
  }

  /**
   * Execute an advance command - monster group moves from back row to front row
   * This is used when melee-only monsters are in the back row and need to advance
   * to be able to attack.
   */
  private static executeAdvanceCommand(
    state: CombatState,
    command: CombatCommand
  ): CommandExecutionResult {
    const monster = command.actor as MonsterInstance

    // Find the group this monster belongs to
    const group = state.monsterGroups.find(g =>
      g.monsters.some(m => m.id === monster.id)
    )

    if (!group) {
      return {
        newState: state,
        messages: [`${monster.name} tries to advance but can't find their group!`]
      }
    }

    // If already in front row, just return (shouldn't happen)
    if (group.formation === 'front') {
      return {
        newState: state,
        messages: [`${monster.name} is already in the front row!`]
      }
    }

    // Count alive monsters in the group for the message
    const aliveCount = group.monsters.filter(m => m.hp > 0).length

    // Move the entire group to front row
    const newMonsterGroups = state.monsterGroups.map(g =>
      g.id === group.id
        ? { ...g, formation: 'front' as const }
        : g
    )

    const message = aliveCount > 1
      ? `The ${monster.name}s advance to the front row!`
      : `${monster.name} advances to the front row!`

    return {
      newState: {
        ...state,
        monsterGroups: newMonsterGroups
      },
      messages: [message]
    }
  }

  private static executeCastSpellCommand(
    state: CombatState,
    command: CombatCommand,
    existingCharacterUpdates?: Map<string, Character>
  ): CommandExecutionResult {
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster)
    const spellId = command.data?.spellId
    const characterUpdates = new Map<string, Character>()

    if (!spellId) {
      return { newState: state, messages: [`${actorName} casts nothing!`] }
    }

    // Check if silenced
    if (this.hasStatusEffect(state, caster.id, 'SILENCED')) {
      return {
        newState: state,
        messages: [`${actorName} is silenced and cannot cast spells!`]
      }
    }

    // Check if can cast
    const canCastResult = SpellCastingService.canCastSpell(caster, spellId)
    if (!canCastResult.canCast) {
      return {
        newState: state,
        messages: [`${actorName} cannot cast spell: ${canCastResult.reason}`]
      }
    }

    // Get spell definition to check target type
    const spell = SpellCastingService.getSpell(spellId)

    // Determine targets based on spell type and command
    let targets: Combatant[] = []

    if (spell && spell.target === 'group' && command.targetGroupId) {
      // Group-targeting spell: get all alive monsters from the target group
      const group = state.monsterGroups.find(g => g.id === command.targetGroupId)
      if (group) {
        targets = group.monsters.filter(m => m.hp > 0)
      }
    } else if (spell && spell.target === 'all_enemies') {
      // All-enemies spell: get all alive monsters from all groups
      targets = this.getAllAliveMonsters(state)
    } else {
      // Single target or other: use command.target
      targets = Array.isArray(command.target) ? command.target : command.target ? [command.target] : []
    }

    // Resolve spell effect
    const spellEffect = SpellCastingService.resolveSpellEffect(spellId, caster, targets)

    if (this.DEBUG_COMBAT) {
      console.log(`[Combat] Spell ${spellId} resolved:`, {
        targets: targets.length,
        damage: spellEffect.damage,
        statusEffects: spellEffect.statusEffects?.length || 0,
        instantDeath: spellEffect.instantDeath?.length || 0,
        message: spellEffect.message
      })
    }

    // Apply damage to targets (if spell has damage)
    let newState = state
    if (spellEffect.damage && spellEffect.damage.length > 0) {
      for (let i = 0; i < targets.length && i < spellEffect.damage.length; i++) {
        const target = targets[i]
        const damage = spellEffect.damage[i]
        if (this.DEBUG_COMBAT && 'monsterId' in target) {
          console.log(`[Combat] Spell damage: ${target.name} takes ${damage} damage (HP: ${target.hp} -> ${Math.max(0, target.hp - damage)})`)
        }
        newState = this.applyDamage(newState, target, damage)
      }
    }

    // Apply status effects to targets
    if (spellEffect.statusEffects && spellEffect.statusEffects.length > 0) {
      for (const statusEffect of spellEffect.statusEffects) {
        const effect = statusEffect.effect

        // Handle combat-only status effects (BLIND, SILENCED)
        if (effect === 'BLIND' || effect === 'SILENCED') {
          newState = this.applyStatusEffect(newState, statusEffect.target, effect)
        }
        // Handle CombatantStatus effects (ASLEEP, PARALYZED)
        else if (effect === 'ASLEEP') {
          newState = this.applyAsleepStatus(newState, statusEffect.target)
        }
        else if (effect === 'PARALYZED') {
          newState = this.applyParalyzedStatus(newState, statusEffect.target)
        }
      }
    }

    // Apply healing to character targets
    if (spellEffect.healing && spellEffect.healing.length > 0) {
      for (let i = 0; i < targets.length && i < spellEffect.healing.length; i++) {
        const target = targets[i]
        const healing = spellEffect.healing[i]
        // Only apply healing to characters (not monsters)
        if ('class' in target) {
          // Get the most recent state of this character
          const currentChar = existingCharacterUpdates?.get(target.id) || characterUpdates.get(target.id) || target as Character
          const healed = this.applyHealingToCharacter(currentChar, healing)
          characterUpdates.set(target.id, healed)
        }
      }
    }

    // Apply AC buffs to targets
    if (spellEffect.acBuffs && spellEffect.acBuffs.length > 0) {
      for (const acBuff of spellEffect.acBuffs) {
        newState = this.applyAcBuff(newState, acBuff.target, acBuff.acModifier)
      }
    }

    // Apply full healing to character targets (MALIKTO)
    if (spellEffect.fullHeal && spellEffect.fullHeal.length > 0) {
      for (const targetId of spellEffect.fullHeal) {
        // Find the character in targets
        const target = targets.find(t => t.id === targetId)
        if (target && 'class' in target) {
          const currentChar = existingCharacterUpdates?.get(targetId) || characterUpdates.get(targetId) || target as Character
          const healed = { ...currentChar, hp: currentChar.maxHp }
          characterUpdates.set(targetId, healed)
        }
      }
    }

    // Apply instant death to targets (MAKANITO)
    if (spellEffect.instantDeath && spellEffect.instantDeath.length > 0) {
      for (const targetId of spellEffect.instantDeath) {
        newState = this.applyInstantDeath(newState, targetId)
      }
    }

    // Apply resurrection to character targets (KADORTO)
    if (spellEffect.resurrection && spellEffect.resurrection.length > 0) {
      for (const resResult of spellEffect.resurrection) {
        // Only apply successful resurrections
        if (!resResult.success || resResult.resultStatus !== 'OK') continue

        const targetId = resResult.targetId
        // Find the character in targets
        const target = targets.find(t => t.id === targetId)
        if (target && 'class' in target) {
          const currentChar = existingCharacterUpdates?.get(targetId) || characterUpdates.get(targetId) || target as Character
          // Resurrect with 1 HP and OK status
          const resurrected = { ...currentChar, hp: 1, status: CharacterStatus.OK }
          characterUpdates.set(targetId, resurrected)
        }
      }
    }

    // Apply status cures to targets (LITOKAN, LATUMOFIS)
    if (spellEffect.statusCures) {
      newState = this.applyCureStatus(
        newState,
        spellEffect.statusCures.targetIds,
        spellEffect.statusCures.cureType
      )
      // Track cured characters for component to update
      for (const targetId of spellEffect.statusCures.targetIds) {
        const target = targets.find(t => t.id === targetId)
        if (target && 'class' in target) {
          const currentChar = existingCharacterUpdates?.get(targetId) || characterUpdates.get(targetId) || target as Character
          const cured = { ...currentChar, status: CharacterStatus.OK }
          characterUpdates.set(targetId, cured)
        }
      }
    }

    // Build action message (casting announcement)
    let actionMessage = `${actorName} casts ${spellId.toUpperCase()}`

    if (spell && spell.target === 'group' && command.targetGroupId) {
      actionMessage += ` on Group ${command.targetGroupId}`
    } else if (spell && spell.target === 'all_enemies') {
      actionMessage += ` on all enemies`
    }

    // Build result message (spell effect)
    const resultMessage = `${this.RESULT_MARKER}${spellEffect.message}`

    return {
      newState,
      messages: [actionMessage, resultMessage],
      characterUpdates: characterUpdates.size > 0 ? characterUpdates : undefined
    }
  }

  private static executeDispelCommand(
    state: CombatState,
    command: CombatCommand
  ): CommandExecutionResult {
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster)

    // Must have a target group specified
    const groupId = command.targetGroupId
    if (!groupId) {
      return {
        newState: state,
        messages: [`${actorName} attempts to DISPEL but no group targeted!`]
      }
    }

    const group = state.monsterGroups.find(g => g.id === groupId)
    if (!group || group.monsters.length === 0) {
      return {
        newState: state,
        messages: [`${actorName} attempts to DISPEL Group ${groupId}`, `${this.RESULT_MARKER}The group is empty!`]
      }
    }

    // Get first alive monster to determine level for dispel chance
    const aliveMonsters = group.monsters.filter(m => m.hp > 0)
    if (aliveMonsters.length === 0) {
      return {
        newState: state,
        messages: [`${actorName} attempts to DISPEL Group ${groupId}`, `${this.RESULT_MARKER}All monsters already dead!`]
      }
    }

    // Action message
    const actionMessage = `${actorName} attempts to DISPEL Group ${groupId}`

    // KNOWN LIMITATION: Undead check not implemented
    // In authentic Wizardry 1, DISPEL only works on undead monsters.
    // Currently applies to ALL monsters which makes it overpowered.
    //
    // TODO: Implement proper undead classification:
    // 1. Add 'undead: boolean' property to MonsterTemplate and MonsterInstance
    // 2. Filter monsters by undead property before applying dispel
    // 3. Return "has no effect" message for non-undead groups
    //
    // See: docs/research/spell-reference.md for authentic mechanics

    // Calculate dispel chance - Authentic Wizardry 1 formula:
    // Base: 50% + (5 × CharLevel) - (10 × MonsterLevel)
    // Class penalties:
    //   - Priest: no penalty (always available)
    //   - Bishop (level 4+): -20%
    //   - Lord (level 9+): -40%
    const casterLevel = caster.level || 1
    const undeadLevel = aliveMonsters[0].level || 1

    // Base formula
    let rawChance = 50 + (5 * casterLevel) - (10 * undeadLevel)

    // Apply class penalties
    const casterClass = caster.class
    if (casterClass === 'BISHOP' && casterLevel >= 4) {
      rawChance -= 20
    } else if (casterClass === 'LORD' && casterLevel >= 9) {
      rawChance -= 40
    }

    const dispelChance = Math.max(5, Math.min(95, rawChance))

    // Roll for success
    const success = RandomService.chance(dispelChance)

    if (success) {
      // Success! Destroy entire group
      const newMonsterGroups = state.monsterGroups.map(g =>
        g.id === groupId
          ? {
              ...g,
              monsters: g.monsters.map(m => ({
                ...m,
                hp: 0,
                status: 'DEAD' as const
              }))
            }
          : g
      )

      const resultMessage = `${this.RESULT_MARKER}${aliveMonsters.length} undead destroyed!`
      return {
        newState: { ...state, monsterGroups: newMonsterGroups },
        messages: [actionMessage, resultMessage]
      }
    } else {
      // Failure
      const resultMessage = `${this.RESULT_MARKER}The undead resist! (${dispelChance}% chance)`
      return {
        newState: state,
        messages: [actionMessage, resultMessage]
      }
    }
  }

  /**
   * Calculate flee chance percentage
   * Formula based on Wizardry 1 research (docs/commands/combat/FleeCommand.md):
   * - Base chance: 50%
   * - Speed difference: ±5% per AGI point difference (party avg vs monster avg)
   * - Luck factor: ±2% per LUC point above/below 10
   * - Clamped to 10-90% (always some chance to succeed/fail)
   */
  static calculateFleeChance(
    state: CombatState,
    party: Character[],
    fleeingCharacterIds: Set<string>,
    characterUpdates?: Map<string, Character>
  ): number {
    // Boss fights cannot flee
    if (!state.canFlee) {
      return 0
    }

    // Must have at least one character attempting to flee
    if (fleeingCharacterIds.size === 0) {
      return 0
    }

    let chance = 50 // Base 50%

    // Calculate party average AGI (only alive members)
    // Use characterUpdates to check current HP (after damage this round)
    const aliveParty = party.filter(c => {
      const updated = characterUpdates?.get(c.id) || c
      return updated.status !== CharacterStatus.DEAD && updated.hp > 0
    })
    if (aliveParty.length === 0) {
      return 0
    }

    // Use updated agility values if available
    const partyAvgAgi = aliveParty.reduce((sum, c) => {
      const updated = characterUpdates?.get(c.id) || c
      return sum + updated.agility
    }, 0) / aliveParty.length

    // Calculate monster average AGI (only alive monsters)
    const aliveMonsters = this.getAllAliveMonsters(state)
    const monsterAvgAgi = aliveMonsters.length > 0
      ? aliveMonsters.reduce((sum, m) => sum + (m.agility || 10), 0) / aliveMonsters.length
      : 10

    // Speed difference modifier: ±5% per AGI point
    const speedDifference = partyAvgAgi - monsterAvgAgi
    chance += speedDifference * 5

    // Luck factor: average party LUC, ±2% per point above/below 10
    const partyAvgLuck = aliveParty.reduce((sum, c) => sum + c.luck, 0) / aliveParty.length
    chance += (partyAvgLuck - 10) * 2

    // Clamp to 10-90% (always some chance to succeed/fail)
    return Math.max(10, Math.min(90, chance))
  }

  /**
   * Execute flee failure penalty - monsters get a free attack round
   * Per Wizardry research: when flee fails, all monsters attack without party retaliation
   */
  static executeFleeFailurePenalty(
    state: CombatState,
    party: Character[],
    frontRow: string[]
  ): {
    newState: CombatState
    messages: string[]
    damagedCharacters: Map<string, Character>
  } {
    if (this.DEBUG_COMBAT) console.log('[Combat] ===== FLEE FAILURE PENALTY =====')
    const messages: string[] = ['The monsters take advantage of the failed escape!']
    const damagedCharacters = new Map<string, Character>()
    let currentState = state

    // All alive monsters get a free attack
    const actingMonsters = this.getAllActingMonsters(state)
    if (this.DEBUG_COMBAT) {
      console.log(`[Combat] ${actingMonsters.length} monsters get FREE BONUS ATTACKS!`)
      actingMonsters.forEach(m => console.debug(`  - ${m.name} (${m.id})`))
    }

    for (const monster of actingMonsters) {
      // Get alive front row members that can be targeted
      const aliveFront = party.filter(c =>
        frontRow.includes(c.id) && c.hp > 0 && c.status !== CharacterStatus.DEAD
      )

      // Check if character was already damaged this penalty round
      const getEffectiveChar = (c: Character): Character => {
        return damagedCharacters.get(c.id) || c
      }

      // Filter to only alive targets after previous penalty attacks
      const effectiveAliveFront = aliveFront.filter(c => getEffectiveChar(c).hp > 0)

      // If no alive front row, target back row
      const aliveBack = party.filter(c =>
        !frontRow.includes(c.id) && c.hp > 0 && c.status !== CharacterStatus.DEAD
      )
      const effectiveAliveBack = aliveBack.filter(c => getEffectiveChar(c).hp > 0)

      const targetPool = effectiveAliveFront.length > 0
        ? effectiveAliveFront
        : effectiveAliveBack

      if (targetPool.length === 0) continue

      // Select random target using RandomService for deterministic testing
      const target = RandomService.pickRandom(targetPool)
      const effectiveTarget = getEffectiveChar(target)

      // Resolve attack (no parrying during penalty round)
      const attackResult = this.resolveAttack(monster, effectiveTarget, 0, 0)

      if (this.DEBUG_COMBAT) {
        console.debug(`[Combat] BONUS ATTACK: ${monster.name} -> ${target.name}`, {
          hit: attackResult.hit,
          damage: attackResult.damage,
          targetHp: effectiveTarget.hp
        })
      }

      if (attackResult.hit) {
        const damaged = this.applyDamageToCharacter(effectiveTarget, attackResult.damage)
        damagedCharacters.set(target.id, damaged)
        messages.push(`${monster.name} attacks ${target.name}: ${attackResult.damage} damage!`)
      } else {
        messages.push(`${monster.name} attacks ${target.name}: Miss!`)
      }
    }

    if (this.DEBUG_COMBAT) console.log('[Combat] ===== END FLEE PENALTY =====')
    return {
      newState: currentState,
      messages,
      damagedCharacters
    }
  }

  /**
   * Check if a combatant has a specific status effect
   */
  static hasStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: 'BLIND' | 'SILENCED'
  ): boolean {
    const effects = state.statusEffects.get(combatantId)
    return effects ? effects.has(effect) : false
  }

  /**
   * Apply a status effect to a combatant
   */
  static applyStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: 'BLIND' | 'SILENCED'
  ): CombatState {
    const newStatusEffects = new Map(state.statusEffects)
    const existing = newStatusEffects.get(combatantId) || new Set()
    newStatusEffects.set(combatantId, new Set([...existing, effect]))

    return {
      ...state,
      statusEffects: newStatusEffects
    }
  }

  /**
   * Remove a status effect from a combatant
   */
  static removeStatusEffect(
    state: CombatState,
    combatantId: string,
    effect: 'BLIND' | 'SILENCED'
  ): CombatState {
    const newStatusEffects = new Map(state.statusEffects)
    const existing = newStatusEffects.get(combatantId)

    if (existing) {
      const newEffects = new Set(existing)
      newEffects.delete(effect)

      if (newEffects.size === 0) {
        newStatusEffects.delete(combatantId)
      } else {
        newStatusEffects.set(combatantId, newEffects)
      }
    }

    return {
      ...state,
      statusEffects: newStatusEffects
    }
  }

  /**
   * Apply ASLEEP status to a monster
   * Updates the monster's status field to 'ASLEEP'
   */
  private static applyAsleepStatus(
    state: CombatState,
    combatantId: string
  ): CombatState {
    // Find and update the monster
    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== combatantId) return m
        // Only put alive monsters to sleep (can't sleep if dead)
        if (m.status === 'ALIVE') {
          return { ...m, status: 'ASLEEP' as const }
        }
        return m
      })
    }))

    return { ...state, monsterGroups: newMonsterGroups }
  }

  /**
   * Apply paralyzed status to a monster (MORLIS)
   * Paralyzed monsters cannot act and take 2x damage from physical attacks
   */
  private static applyParalyzedStatus(
    state: CombatState,
    combatantId: string
  ): CombatState {
    // Find and update the monster
    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== combatantId) return m
        // Only paralyze alive monsters (can't paralyze if dead)
        if (m.status === 'ALIVE') {
          return { ...m, status: 'PARALYZED' as const }
        }
        return m
      })
    }))

    return { ...state, monsterGroups: newMonsterGroups }
  }

  private static applyDamage(
    state: CombatState,
    target: Combatant,
    damage: number
  ): CombatState {
    // Apply damage to monster
    if ('monsterId' in target) {
      const newMonsterGroups = state.monsterGroups.map(group => ({
        ...group,
        monsters: group.monsters.map(m => {
          if (m.id !== target.id) return m
          const newHp = Math.max(0, m.hp - damage)
          // Wake up sleeping monster if damaged
          const newStatus = newHp === 0 ? 'DEAD' : m.status === 'ASLEEP' ? 'ALIVE' : m.status
          return {
            ...m,
            hp: newHp,
            status: newStatus
          }
        })
      }))
      return { ...state, monsterGroups: newMonsterGroups }
    }

    // Apply damage to character (handled in component via GameStateService)
    // We return the character with updated HP for the component to handle
    // Note: The component needs to update the roster with the damaged character
    return state
  }

  /**
   * Apply damage to a character and update status if dead
   * Returns updated character (for use by components)
   * Also wakes sleeping characters
   */
  static applyDamageToCharacter(character: Character, damage: number): Character {
    const newHp = Math.max(0, character.hp - damage)
    const isDead = newHp === 0

    // Wake up sleeping character if damaged
    const newStatus = isDead
      ? CharacterStatus.DEAD
      : character.status === CharacterStatus.ASLEEP
        ? CharacterStatus.OK
        : character.status

    return {
      ...character,
      hp: newHp,
      status: newStatus
    }
  }

  /**
   * Apply healing to a character
   * Returns updated character with restored HP (capped at maxHp)
   */
  static applyHealingToCharacter(character: Character, healing: number): Character {
    const newHp = Math.min(character.maxHp, character.hp + healing)
    return {
      ...character,
      hp: newHp
    }
  }

  /**
   * Apply healing to a combatant (Note: healing only affects characters in practice)
   * For characters, this is handled by the component via GameStateService
   * Returns the state unchanged (component must update roster)
   */
  private static applyHealing(
    state: CombatState,
    target: Combatant,
    healing: number
  ): CombatState {
    // Healing is applied to characters via the roster in the component
    // This method exists for consistency with applyDamage
    return state
  }

  /**
   * Apply AC buff to a combatant
   * Stores the AC modifier in the combat state
   */
  private static applyAcBuff(
    state: CombatState,
    targetId: string,
    acModifier: number
  ): CombatState {
    const newAcModifiers = new Map(state.acModifiers)
    const currentModifier = newAcModifiers.get(targetId) || 0
    newAcModifiers.set(targetId, currentModifier + acModifier)
    return { ...state, acModifiers: newAcModifiers }
  }

  /**
   * Apply instant death to a monster (MAKANITO)
   * Sets monster HP to 0 and status to DEAD
   */
  private static applyInstantDeath(
    state: CombatState,
    targetId: string
  ): CombatState {
    // Only affects monsters
    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== targetId) return m
        return {
          ...m,
          hp: 0,
          status: 'DEAD' as const
        }
      })
    }))
    return { ...state, monsterGroups: newMonsterGroups }
  }

  /**
   * Apply full heal to a combatant (MALIKTO)
   * Note: For characters, this is handled by the component via GameStateService
   * This method exists for consistency
   */
  private static applyFullHeal(
    state: CombatState,
    targetId: string
  ): CombatState {
    // Full healing is applied to characters via the roster in the component
    // This method exists for consistency with other spell effects
    return state
  }

  /**
   * Apply resurrection to a character (KADORTO)
   * Note: This is handled by the component via GameStateService
   * Combat state doesn't directly track character status
   */
  private static applyResurrection(
    state: CombatState,
    targetId: string
  ): CombatState {
    // Resurrection is applied to characters via the roster in the component
    // Combat state doesn't track character resurrection directly
    return state
  }

  /**
   * Remove status effects from a combatant (LITOKAN, LATUMOFIS)
   * Removes combat status effects (BLIND, SILENCED)
   * Character status effects (PARALYZED, POISONED) handled by component
   */
  private static applyCureStatus(
    state: CombatState,
    targetIds: string[],
    cureType: 'poison' | 'paralysis' | 'silence' | 'blind' | 'asleep' | 'all'
  ): CombatState {
    let newState = state

    for (const targetId of targetIds) {
      // Cure SILENCED
      if (cureType === 'silence' || cureType === 'all') {
        if (this.hasStatusEffect(newState, targetId, 'SILENCED')) {
          newState = this.removeStatusEffect(newState, targetId, 'SILENCED')
        }
      }

      // Cure BLIND
      if (cureType === 'blind' || cureType === 'all') {
        if (this.hasStatusEffect(newState, targetId, 'BLIND')) {
          newState = this.removeStatusEffect(newState, targetId, 'BLIND')
        }
      }

      // Cure ASLEEP (for monsters)
      if (cureType === 'asleep' || cureType === 'all') {
        newState = this.wakeTarget(newState, targetId)
      }
    }

    return newState
  }

  /**
   * Wake a sleeping target
   */
  private static wakeTarget(
    state: CombatState,
    targetId: string
  ): CombatState {
    const newMonsterGroups = state.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(m => {
        if (m.id !== targetId) return m
        if (m.status === 'ASLEEP') {
          return { ...m, status: 'ALIVE' as const }
        }
        return m
      })
    }))
    return { ...state, monsterGroups: newMonsterGroups }
  }

  private static getCombatantName(combatant: Combatant): string {
    return combatant.name || 'Unknown'
  }

  private static getTargetName(target: Combatant | Combatant[] | undefined): string {
    if (!target) return 'none'
    if (Array.isArray(target)) {
      return target.map(t => t.name || 'Unknown').join(', ')
    }
    return target.name || 'Unknown'
  }

  private static getTargetId(target: Combatant | Combatant[] | undefined): string | undefined {
    if (!target) return undefined
    if (Array.isArray(target)) {
      return target[0]?.id
    }
    return target.id
  }

  static executeRound(
    state: CombatState,
    party: Character[],
    frontRow: string[] = []
  ): {
    newState: CombatState
    messages: string[]
    damagedCharacters: Map<string, Character>  // Characters that took damage this round
    spellCasters: Map<string, { character: Character; spellId: string }>  // Characters who cast spells this round
    curedCharacters: Map<string, Character>  // Characters whose status changed (sleep/paralysis wore off)
    victory: boolean
    defeat: boolean
    fled: boolean  // Whether party successfully fled
  } {
    // Sort commands by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState: CombatState = { ...state, commandQueue: [] }
    const messages: string[] = []
    const damagedCharacters = new Map<string, Character>()
    const spellCasters = new Map<string, { character: Character; spellId: string }>()
    const curedCharacters = new Map<string, Character>()
    const parryingCombatants = new Set<string>()  // Track who is parrying this round
    const fleeingCharacters = new Set<string>()   // Track who is attempting to flee

    // Apply poison damage at start of round
    const poisonResult = this.applyPoisonDamage(currentState, party)
    currentState = poisonResult.newState
    messages.push(...poisonResult.messages)
    // Merge poison damage into damagedCharacters
    for (const [charId, char] of poisonResult.damagedCharacters.entries()) {
      damagedCharacters.set(charId, char)
    }

    // Check for defeat from poison damage
    const allPartyDeadFromPoison = this.areAllCharactersDead(party, damagedCharacters)
    if (allPartyDeadFromPoison) {
      return {
        newState: currentState,
        messages,
        damagedCharacters,
        spellCasters,
        curedCharacters,
        victory: false,
        defeat: true,
        fled: false
      }
    }

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor cannot act (dead, asleep, paralyzed, or died this round)
      if (!this.getCurrentActorIfCanAct(command, currentState, damagedCharacters)) continue

      const result = this.executeCommand(currentState, command, parryingCombatants, damagedCharacters)
      currentState = result.newState
      messages.push(...result.messages)

      // Merge character updates from spell effects (healing, resurrection, etc.)
      if (result.characterUpdates) {
        for (const [charId, char] of result.characterUpdates.entries()) {
          damagedCharacters.set(charId, char)
        }
      }

      // Track RUN commands
      if (command.type === 'RUN' && !('monsterId' in command.actor)) {
        fleeingCharacters.add(command.actor.id)
      }

      // Track CAST_SPELL commands for spell point deduction
      if (command.type === 'CAST_SPELL' && !('monsterId' in command.actor) && command.data?.spellId) {
        const caster = command.actor as Character
        spellCasters.set(caster.id, { character: caster, spellId: command.data.spellId })
      }

      // Track character damage for component to update roster using targetDamage from executeCommand
      // This avoids re-rolling attack and ensures displayed damage matches the actual state
      if (result.targetDamage && command.target && !('monsterId' in command.target)) {
        const target = command.target as Character
        // Get existing character state (may have already been damaged this round)
        const existingChar = damagedCharacters.get(target.id) || target

        // Apply the damage that was actually calculated (from targetDamage)
        const updated = this.applyDamageToCharacter(existingChar, result.targetDamage.damage)
        damagedCharacters.set(target.id, updated)
      }

      // Check victory after each action
      const allMonstersDead = this.areAllMonstersDead(currentState)
      if (allMonstersDead) {
        return {
          newState: currentState,
          messages,
          damagedCharacters,
          spellCasters,
          curedCharacters,
          victory: true,
          defeat: false,
          fled: false
        }
      }

      // Check defeat after each action
      const allPartyDead = this.areAllCharactersDead(party, damagedCharacters)
      if (allPartyDead) {
        return {
          newState: currentState,
          messages,
          damagedCharacters,
          spellCasters,
          curedCharacters,
          victory: false,
          defeat: true,
          fled: false
        }
      }
    }

    // Final victory/defeat check after all commands executed
    const allMonstersDead = this.areAllMonstersDead(currentState)
    if (allMonstersDead) {
      return {
        newState: currentState,
        messages,
        damagedCharacters,
        spellCasters,
        curedCharacters,
        victory: true,
        defeat: false,
        fled: false
      }
    }

    const allPartyDead = this.areAllCharactersDead(party, damagedCharacters)
    if (allPartyDead) {
      return {
        newState: currentState,
        messages,
        damagedCharacters,
        spellCasters,
        curedCharacters,
        victory: false,
        defeat: true,
        fled: false
      }
    }

    // Check if all alive characters are fleeing
    // Use damagedCharacters to check current HP (after damage this round)
    const aliveCharacters = party.filter(c => {
      const updated = damagedCharacters.get(c.id) || c
      return updated.status !== CharacterStatus.DEAD && updated.hp > 0
    })
    const allFleeing = aliveCharacters.length > 0 &&
                      aliveCharacters.every(c => fleeingCharacters.has(c.id))

    if (allFleeing) {
      const fleeChance = this.calculateFleeChance(currentState, party, fleeingCharacters, damagedCharacters)
      const fleeSuccess = RandomService.chance(fleeChance)

      if (fleeSuccess) {
        messages.push(`The party successfully flees from combat!`)
        return {
          newState: currentState,
          messages,
          damagedCharacters,
          spellCasters,
          curedCharacters,
          victory: false,
          defeat: false,
          fled: true
        }
      } else {
        messages.push(`The party fails to escape!`)

        // Apply flee failure penalty - monsters get free attacks
        const penaltyResult = this.executeFleeFailurePenalty(currentState, party, frontRow)
        currentState = penaltyResult.newState
        messages.push(...penaltyResult.messages)

        // Merge penalty damage into damagedCharacters
        for (const [charId, char] of penaltyResult.damagedCharacters.entries()) {
          const existing = damagedCharacters.get(charId)
          if (existing) {
            // Accumulate damage if character was already damaged
            damagedCharacters.set(charId, char)
          } else {
            damagedCharacters.set(charId, char)
          }
        }

        // Check for defeat after penalty round
        const allPartyDeadFromPenalty = this.areAllCharactersDead(party, damagedCharacters)
        if (allPartyDeadFromPenalty) {
          return {
            newState: currentState,
            messages,
            damagedCharacters,
            spellCasters,
            curedCharacters,
            victory: false,
            defeat: true,
            fled: false
          }
        }
      }
    }

    // Process monster status effect recovery (per-round chance to shake off effects)
    const monsterRecoveryResult = this.processMonsterStatusRecovery(currentState)
    currentState = monsterRecoveryResult.newState
    messages.push(...monsterRecoveryResult.messages)

    // Tick down status effect durations at end of round
    const durationResult = this.tickStatusDurations(currentState, party)
    currentState = durationResult.newState
    messages.push(...durationResult.messages)

    // Track characters whose status changed (wake/unparalyze)
    // Component will need to update roster for these characters
    for (const msg of durationResult.messages) {
      // Find characters mentioned in wear-off messages
      for (const char of party) {
        if (msg.includes(char.name) && (msg.includes('ASLEEP') || msg.includes('PARALYZED'))) {
          // Mark character as needing status cure
          const curedChar = { ...char, status: CharacterStatus.OK }
          curedCharacters.set(char.id, curedChar)
        }
      }
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      damagedCharacters,
      spellCasters,
      curedCharacters,
      victory: false,
      defeat: false,
      fled: false
    }
  }

  /**
   * Execute a combat round with event-based tracking for animation synchronization.
   * Returns events that pair messages with their state changes, allowing the UI
   * to apply state updates in sync with message display.
   *
   * @param state Current combat state
   * @param party Party characters
   * @param frontRow Array of character IDs in front row
   * @returns CombatRoundResult with events for animation
   */
  static executeRoundWithEvents(
    state: CombatState,
    party: Character[],
    frontRow: string[] = []
  ): CombatRoundResult {
    // Sort commands by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState: CombatState = { ...state, commandQueue: [] }
    const events: CombatRoundEvent[] = []
    const accumulatedCharacterUpdates = new Map<string, Character>()
    const spellCasters = new Map<string, { character: Character; spellId: string }>()
    const curedCharacters = new Map<string, Character>()
    const parryingCombatants = new Set<string>()
    const fleeingCharacters = new Set<string>()

    // Helper to create character update from damage
    const createCharacterUpdate = (char: Character, newHp: number): CharacterUpdate => ({
      hp: newHp,
      status: newHp <= 0 ? CharacterStatus.DEAD : char.status
    })

    // Apply poison damage at start of round
    const poisonResult = this.applyPoisonDamage(currentState, party)
    currentState = poisonResult.newState

    // Create poison event if any characters were damaged
    if (poisonResult.messages.length > 0) {
      const poisonCharacterUpdates = new Map<string, CharacterUpdate>()
      for (const [charId, char] of poisonResult.damagedCharacters.entries()) {
        poisonCharacterUpdates.set(charId, createCharacterUpdate(char, char.hp))
        accumulatedCharacterUpdates.set(charId, char)
      }

      events.push({
        type: 'poison',
        messages: poisonResult.messages,
        monsterGroupsSnapshot: [...currentState.monsterGroups],
        characterUpdates: poisonCharacterUpdates
      })
    }

    // Check for defeat from poison damage
    if (this.areAllCharactersDead(party, accumulatedCharacterUpdates)) {
      return {
        events,
        finalState: currentState,
        finalCharacterUpdates: accumulatedCharacterUpdates,
        spellCasters,
        curedCharacters,
        victory: false,
        defeat: true,
        fled: false
      }
    }

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor cannot act (dead, asleep, paralyzed, or died this round)
      if (!this.getCurrentActorIfCanAct(command, currentState, accumulatedCharacterUpdates)) continue

      // Capture state before command for comparison
      const stateBefore = currentState

      const result = this.executeCommand(currentState, command, parryingCombatants, accumulatedCharacterUpdates)
      currentState = result.newState

      // Merge character updates from spell effects (healing, resurrection, etc.)
      if (result.characterUpdates) {
        for (const [charId, char] of result.characterUpdates.entries()) {
          accumulatedCharacterUpdates.set(charId, char)
        }
      }

      // Track RUN commands
      if (command.type === 'RUN' && !('monsterId' in command.actor)) {
        fleeingCharacters.add(command.actor.id)
      }

      // Track CAST_SPELL commands for spell point deduction
      let spellCast: { characterId: string; spellId: string } | undefined
      if (command.type === 'CAST_SPELL' && !('monsterId' in command.actor) && command.data?.spellId) {
        const caster = command.actor as Character
        spellCasters.set(caster.id, { character: caster, spellId: command.data.spellId })
        spellCast = { characterId: caster.id, spellId: command.data.spellId }
      }

      // Track character damage for this event using targetDamage from executeCommand
      // This avoids re-rolling attack and ensures displayed damage matches messages
      const eventCharacterUpdates = new Map<string, CharacterUpdate>()

      // Include spell healing/resurrection in event character updates
      if (result.characterUpdates) {
        for (const [charId, char] of result.characterUpdates.entries()) {
          eventCharacterUpdates.set(charId, createCharacterUpdate(char, char.hp))
        }
      }

      if (result.targetDamage && command.target && !('monsterId' in command.target)) {
        const target = command.target as Character
        // Get existing character state (may have already been damaged this round)
        const existingChar = accumulatedCharacterUpdates.get(target.id) || target

        // Apply the damage that was actually calculated (from targetDamage)
        const updated = this.applyDamageToCharacter(existingChar, result.targetDamage.damage)
        accumulatedCharacterUpdates.set(target.id, updated)
        eventCharacterUpdates.set(target.id, createCharacterUpdate(updated, updated.hp))
      }

      // Check if monster groups changed (efficient comparison without JSON.stringify)
      const monstersChanged = this.monsterGroupsChanged(stateBefore.monsterGroups, currentState.monsterGroups)

      // Create event for this command
      const event: CombatRoundEvent = {
        type: 'action',
        messages: result.messages,
        ...(monstersChanged && { monsterGroupsSnapshot: [...currentState.monsterGroups] }),
        ...(eventCharacterUpdates.size > 0 && { characterUpdates: eventCharacterUpdates }),
        ...(spellCast && { spellCast })
      }
      events.push(event)

      // Check victory after each action
      if (this.areAllMonstersDead(currentState)) {
        if (this.DEBUG_COMBAT) {
          const aliveMonsters = this.getAllAliveMonsters(currentState)
          console.log(`[Combat] Victory check after command #${events.length}:`, {
            allMonstersDead: true,
            aliveMonsters: aliveMonsters.length,
            totalEventsCreated: events.length,
            remainingCommands: sortedQueue.length - events.length
          })
          // Log each monster's status
          for (const group of currentState.monsterGroups) {
            for (const m of group.monsters) {
              console.log(`[Combat]   Monster ${m.name}: HP=${m.hp}, status=${m.status}`)
            }
          }
        }
        return {
          events,
          finalState: currentState,
          finalCharacterUpdates: accumulatedCharacterUpdates,
          spellCasters,
          curedCharacters,
          victory: true,
          defeat: false,
          fled: false
        }
      }

      // Check defeat after each action
      if (this.areAllCharactersDead(party, accumulatedCharacterUpdates)) {
        return {
          events,
          finalState: currentState,
          finalCharacterUpdates: accumulatedCharacterUpdates,
          spellCasters,
          curedCharacters,
          victory: false,
          defeat: true,
          fled: false
        }
      }
    }

    // Final victory/defeat check
    if (this.areAllMonstersDead(currentState)) {
      return {
        events,
        finalState: currentState,
        finalCharacterUpdates: accumulatedCharacterUpdates,
        spellCasters,
        curedCharacters,
        victory: true,
        defeat: false,
        fled: false
      }
    }

    if (this.areAllCharactersDead(party, accumulatedCharacterUpdates)) {
      return {
        events,
        finalState: currentState,
        finalCharacterUpdates: accumulatedCharacterUpdates,
        spellCasters,
        curedCharacters,
        victory: false,
        defeat: true,
        fled: false
      }
    }

    // Check if all alive characters are fleeing
    // Use accumulatedCharacterUpdates to check current HP (after damage this round)
    const aliveCharacters = party.filter(c => {
      const updated = accumulatedCharacterUpdates.get(c.id) || c
      return updated.status !== CharacterStatus.DEAD && updated.hp > 0
    })
    const allFleeing = aliveCharacters.length > 0 &&
                      aliveCharacters.every(c => fleeingCharacters.has(c.id))

    if (allFleeing) {
      const fleeChance = this.calculateFleeChance(currentState, party, fleeingCharacters, accumulatedCharacterUpdates)
      const fleeSuccess = RandomService.chance(fleeChance)

      if (fleeSuccess) {
        events.push({
          type: 'flee',
          messages: [`The party successfully flees from combat!`]
        })

        return {
          events,
          finalState: currentState,
          finalCharacterUpdates: accumulatedCharacterUpdates,
          spellCasters,
          curedCharacters,
          victory: false,
          defeat: false,
          fled: true
        }
      } else {
        events.push({
          type: 'flee',
          messages: [`The party fails to escape!`]
        })

        // Apply flee failure penalty - monsters get free attacks
        const penaltyResult = this.executeFleeFailurePenalty(currentState, party, frontRow)
        currentState = penaltyResult.newState

        // Create event for penalty attacks
        if (penaltyResult.messages.length > 0) {
          const penaltyCharacterUpdates = new Map<string, CharacterUpdate>()
          for (const [charId, char] of penaltyResult.damagedCharacters.entries()) {
            const existing = accumulatedCharacterUpdates.get(charId)
            if (existing) {
              accumulatedCharacterUpdates.set(charId, char)
            } else {
              accumulatedCharacterUpdates.set(charId, char)
            }
            penaltyCharacterUpdates.set(charId, createCharacterUpdate(char, char.hp))
          }

          events.push({
            type: 'action',
            messages: penaltyResult.messages,
            characterUpdates: penaltyCharacterUpdates
          })
        }

        // Check for defeat after penalty round
        if (this.areAllCharactersDead(party, accumulatedCharacterUpdates)) {
          return {
            events,
            finalState: currentState,
            finalCharacterUpdates: accumulatedCharacterUpdates,
            spellCasters,
            curedCharacters,
            victory: false,
            defeat: true,
            fled: false
          }
        }
      }
    }

    // Process monster status effect recovery (per-round chance to shake off effects)
    const monsterRecoveryResult = this.processMonsterStatusRecovery(currentState)
    currentState = monsterRecoveryResult.newState

    // Create monster recovery event if any monsters recovered
    if (monsterRecoveryResult.messages.length > 0) {
      events.push({
        type: 'status',
        messages: monsterRecoveryResult.messages,
        monsterGroupsSnapshot: currentState.monsterGroups
      })
    }

    // Tick down status effect durations at end of round
    const durationResult = this.tickStatusDurations(currentState, party)
    currentState = durationResult.newState

    // Create status event if any effects wore off
    if (durationResult.messages.length > 0) {
      const statusCharacterUpdates = new Map<string, CharacterUpdate>()

      // Track characters whose status changed (wake/unparalyze)
      for (const msg of durationResult.messages) {
        for (const char of party) {
          if (msg.includes(char.name) && (msg.includes('ASLEEP') || msg.includes('PARALYZED'))) {
            const curedChar = { ...char, status: CharacterStatus.OK }
            curedCharacters.set(char.id, curedChar)
            statusCharacterUpdates.set(char.id, { status: CharacterStatus.OK })
          }
        }
      }

      events.push({
        type: 'status',
        messages: durationResult.messages,
        ...(statusCharacterUpdates.size > 0 && { characterUpdates: statusCharacterUpdates })
      })
    }

    return {
      events,
      finalState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      finalCharacterUpdates: accumulatedCharacterUpdates,
      spellCasters,
      curedCharacters,
      victory: false,
      defeat: false,
      fled: false
    }
  }

  /**
   * Efficiently compare two monster group arrays to detect changes
   * Only checks mutable properties (hp, status) rather than full deep equality
   * @returns true if any monster hp or status changed
   */
  private static monsterGroupsChanged(before: MonsterGroup[], after: MonsterGroup[]): boolean {
    if (before.length !== after.length) return true

    for (let i = 0; i < before.length; i++) {
      const groupBefore = before[i]
      const groupAfter = after[i]

      // Check formation change
      if (groupBefore.formation !== groupAfter.formation) return true

      // Check if monsters list length changed (shouldn't happen, but defensive)
      if (groupBefore.monsters.length !== groupAfter.monsters.length) return true

      // Check individual monster changes
      for (let j = 0; j < groupBefore.monsters.length; j++) {
        const monsterBefore = groupBefore.monsters[j]
        const monsterAfter = groupAfter.monsters[j]

        // Only check mutable properties that can change during combat
        if (monsterBefore.hp !== monsterAfter.hp) return true
        if (monsterBefore.status !== monsterAfter.status) return true
      }
    }

    return false
  }

  /**
   * Check if all monsters in all groups are dead
   */
  private static areAllMonstersDead(state: CombatState): boolean {
    return state.monsterGroups.every(group =>
      group.monsters.every(m => m.status === 'DEAD' || m.hp <= 0)
    )
  }

  /**
   * Check if all party members are dead
   */
  private static areAllCharactersDead(
    party: Character[],
    damagedCharacters: Map<string, Character>
  ): boolean {
    return party.every(char => {
      // Check if character was damaged this round
      const damaged = damagedCharacters.get(char.id)
      if (damaged) {
        return damaged.status === CharacterStatus.DEAD || damaged.hp <= 0
      }
      // Otherwise check original state
      return char.status === CharacterStatus.DEAD || char.hp <= 0
    })
  }

  private static isCombatantDead(combatant: Combatant): boolean {
    // Check monster status
    if ('monsterId' in combatant) {
      return combatant.status === 'DEAD' || combatant.hp <= 0
    }
    // Check character status
    if ('class' in combatant) {
      return combatant.status === CharacterStatus.DEAD || combatant.hp <= 0
    }
    return false
  }

  /**
   * Get all monsters from all groups (flattened array)
   */
  static getAllMonsters(state: CombatState): MonsterInstance[] {
    return state.monsterGroups.flatMap(group => group.monsters)
  }

  /**
   * Get all alive monsters from all groups
   */
  static getAllAliveMonsters(state: CombatState): MonsterInstance[] {
    return this.getAllMonsters(state).filter(m => m.status !== 'DEAD' && m.hp > 0)
  }

  /**
   * Get all monsters that can act (alive and not incapacitated)
   * Incapacitated: DEAD, ASLEEP, PARALYZED
   */
  static getAllActingMonsters(state: CombatState): MonsterInstance[] {
    return this.getAllMonsters(state).filter(m =>
      m.status === 'ALIVE' && m.hp > 0
    )
  }

  /**
   * Check if back-row melee monsters should auto-advance when front row is wiped out.
   * This should be called at the end of each round or after casualties occur.
   *
   * When there are no alive monsters in the front row, the first back-row group
   * with melee-only monsters will automatically advance to the front.
   *
   * @param state - Current combat state
   * @returns Updated combat state with advanced groups and log message, or original state if no advancement needed
   */
  static checkAndAdvanceMonsters(state: CombatState): { newState: CombatState; message?: string } {
    // Check if any alive monsters are in the front row
    const frontGroups = state.monsterGroups.filter(g =>
      g.formation === 'front' && g.monsters.some(m => m.hp > 0)
    )

    // If there are still alive front row monsters, no auto-advance needed
    if (frontGroups.length > 0) {
      return { newState: state }
    }

    // Find the first back-row group with melee-only monsters that can advance
    const backMeleeGroup = state.monsterGroups.find(g => {
      if (g.formation !== 'back') return false
      if (!g.monsters.some(m => m.hp > 0)) return false

      // Check if the group has melee-only monsters
      const template = MonsterDataLoader.getMonster(g.monsters[0].monsterId)
      return template && !MonsterService.canAttackFromBackRow(template)
    })

    if (!backMeleeGroup) {
      // No back-row melee groups to advance
      return { newState: state }
    }

    // Advance the group
    const aliveCount = backMeleeGroup.monsters.filter(m => m.hp > 0).length
    const monsterName = backMeleeGroup.monsters[0].name

    const newMonsterGroups = state.monsterGroups.map(g =>
      g.id === backMeleeGroup.id
        ? { ...g, formation: 'front' as const }
        : g
    )

    const message = aliveCount > 1
      ? `The ${monsterName}s rush forward to fill the gap!`
      : `${monsterName} rushes forward to fill the gap!`

    return {
      newState: {
        ...state,
        monsterGroups: newMonsterGroups
      },
      message
    }
  }

  /**
   * Get the current state of a monster from the combat state
   * Used to check if a monster has died during the current round
   */
  static getCurrentMonsterState(
    state: CombatState,
    monsterId: string
  ): MonsterInstance | undefined {
    return state.monsterGroups.flatMap(g => g.monsters).find(m => m.id === monsterId)
  }

  /**
   * Get the current state of a command's actor, checking for mid-round deaths.
   * Returns null if the actor cannot act (dead, doesn't exist, etc.)
   *
   * @param command - The combat command to check
   * @param currentState - Current combat state (for monster lookups)
   * @param characterUpdates - Map of character updates (for character damage tracking)
   * @returns The current actor state, or null if actor cannot act
   */
  private static getCurrentActorIfCanAct(
    command: CombatCommand,
    currentState: CombatState,
    characterUpdates: Map<string, Character>
  ): Combatant | null {
    let currentActor: Combatant = command.actor

    if ('monsterId' in command.actor) {
      // For monsters, look up current state since they may have died during this round
      const currentMonster = this.getCurrentMonsterState(currentState, command.actor.id)
      if (!currentMonster) return null  // Monster no longer exists
      currentActor = currentMonster
    } else {
      // For characters, check if they've been damaged to death this round
      const existingUpdate = characterUpdates.get(command.actor.id)
      if (existingUpdate) {
        currentActor = existingUpdate
      }
    }

    return this.canCombatantAct(currentActor) ? currentActor : null
  }

  /**
   * Check if a combatant can act this round
   * Returns false if dead, asleep, or paralyzed
   */
  static canCombatantAct(combatant: Combatant): boolean {
    // Check monster status
    if ('monsterId' in combatant) {
      const monster = combatant as MonsterInstance
      return monster.status === 'ALIVE' && monster.hp > 0
    }

    // Check character status
    if ('class' in combatant) {
      const char = combatant as Character
      return char.hp > 0 &&
             char.status !== CharacterStatus.DEAD &&
             char.status !== CharacterStatus.ASLEEP &&
             char.status !== CharacterStatus.PARALYZED
    }

    return false
  }

  /**
   * Set status effect duration for a combatant
   * @param rounds - Number of rounds the status lasts, -1 for permanent/until cured
   */
  static setStatusDuration(
    state: CombatState,
    combatantId: string,
    status: import('../types/Combat').DurationTrackedStatus,
    rounds: number
  ): CombatState {
    const newDurations = new Map(state.statusDurations)
    const combatantDurations = newDurations.get(combatantId) || new Map()
    const updatedCombatantDurations = new Map(combatantDurations)
    updatedCombatantDurations.set(status, rounds)
    newDurations.set(combatantId, updatedCombatantDurations)

    return {
      ...state,
      statusDurations: newDurations
    }
  }

  /**
   * Get remaining duration for a status effect
   * Returns 0 if status is not active
   */
  static getStatusDuration(
    state: CombatState,
    combatantId: string,
    status: import('../types/Combat').DurationTrackedStatus
  ): number {
    const combatantDurations = state.statusDurations.get(combatantId)
    if (!combatantDurations) return 0
    return combatantDurations.get(status) || 0
  }

  /**
   * Tick down all status effect durations by 1 round
   * Removes effects when duration reaches 0
   * Returns new state and messages about effects wearing off
   */
  static tickStatusDurations(
    state: CombatState,
    party: Character[]
  ): { newState: CombatState; messages: string[] } {
    let currentState = state
    const messages: string[] = []
    const newDurations = new Map(state.statusDurations)

    // Process each combatant's status durations
    for (const [combatantId, statusMap] of newDurations.entries()) {
      const updatedStatusMap = new Map(statusMap)
      let hasChanges = false

      for (const [status, duration] of updatedStatusMap.entries()) {
        // Skip permanent effects (-1)
        if (duration === -1) continue

        const newDuration = duration - 1

        if (newDuration <= 0) {
          // Status effect expires
          updatedStatusMap.delete(status)
          hasChanges = true

          // Remove from corresponding status tracking
          if (status === 'BLIND' || status === 'SILENCED') {
            currentState = this.removeStatusEffect(currentState, combatantId, status)
          } else if (status === 'ASLEEP' || status === 'PARALYZED') {
            // Wake/unparalyze character
            currentState = this.cureCharacterStatus(currentState, combatantId, status, party)
          }

          // Find combatant name for message
          const combatant = this.findCombatant(currentState, combatantId, party)
          if (combatant) {
            messages.push(`${this.getCombatantName(combatant)}'s ${status} effect wears off!`)
          }
        } else {
          // Decrease duration
          updatedStatusMap.set(status, newDuration)
          hasChanges = true
        }
      }

      if (hasChanges) {
        if (updatedStatusMap.size === 0) {
          newDurations.delete(combatantId)
        } else {
          newDurations.set(combatantId, updatedStatusMap)
        }
      }
    }

    return {
      newState: { ...currentState, statusDurations: newDurations },
      messages
    }
  }

  /**
   * Process monster status effect recovery (per-round chance to shake off effects)
   *
   * Based on Wizardry 1 research:
   * - Sleep: (20 × Level)% per round, capped at 50%
   * - Fear: (10 × Level)% per round, capped at 50%
   * - Paralysis: (7 × Level)% per round, capped at 50%
   * - Silence: (10 × Level)% per round, capped at 50% (bug-fixed)
   *
   * @returns Updated state with recovered monsters and messages
   */
  static processMonsterStatusRecovery(
    state: CombatState
  ): { newState: CombatState; messages: string[] } {
    let currentState = state
    const messages: string[] = []

    // Check each monster for status effects that can recover
    const newMonsterGroups = currentState.monsterGroups.map(group => ({
      ...group,
      monsters: group.monsters.map(monster => {
        // Only process monsters with recoverable status effects
        if (monster.status !== 'ASLEEP' && monster.status !== 'PARALYZED') {
          return monster
        }

        // Determine recovery type based on status
        const statusType = monster.status === 'ASLEEP' ? 'ASLEEP' : 'PARALYZED'

        // Roll for recovery using ResistanceService
        if (ResistanceService.rollRecovery(monster.level, statusType)) {
          messages.push(`${monster.name} recovers from ${statusType.toLowerCase()}!`)
          return { ...monster, status: 'ALIVE' as CombatantStatus }
        }

        return monster
      })
    }))

    // Also check for SILENCED and FEAR in statusEffects map
    const newStatusEffects = new Map(currentState.statusEffects)
    for (const group of currentState.monsterGroups) {
      for (const monster of group.monsters) {
        const monsterEffects = newStatusEffects.get(monster.id)
        if (!monsterEffects) continue

        // Check SILENCED recovery
        if (monsterEffects.has('SILENCED')) {
          if (ResistanceService.rollRecovery(monster.level, 'SILENCED')) {
            const updatedEffects = new Set(monsterEffects)
            updatedEffects.delete('SILENCED')
            if (updatedEffects.size === 0) {
              newStatusEffects.delete(monster.id)
            } else {
              newStatusEffects.set(monster.id, updatedEffects)
            }
            messages.push(`${monster.name} recovers from silence!`)
          }
        }

        // Check BLIND (treated as FEAR for recovery)
        if (monsterEffects.has('BLIND')) {
          if (ResistanceService.rollRecovery(monster.level, 'FEAR')) {
            const updatedEffects = new Set(monsterEffects)
            updatedEffects.delete('BLIND')
            if (updatedEffects.size === 0) {
              newStatusEffects.delete(monster.id)
            } else {
              newStatusEffects.set(monster.id, updatedEffects)
            }
            messages.push(`${monster.name} recovers from blindness!`)
          }
        }
      }
    }

    return {
      newState: {
        ...currentState,
        monsterGroups: newMonsterGroups,
        statusEffects: newStatusEffects
      },
      messages
    }
  }

  /**
   * Apply poison damage to all poisoned combatants
   * Returns new state, damaged characters, and damage messages
   */
  static applyPoisonDamage(
    state: CombatState,
    party: Character[]
  ): {
    newState: CombatState
    damagedCharacters: Map<string, Character>
    messages: string[]
  } {
    let currentState = state
    const damagedCharacters = new Map<string, Character>()
    const messages: string[] = []

    // Check party members for poison
    for (const char of party) {
      if (char.status === CharacterStatus.POISONED && char.hp > 0) {
        // Poison does 1d4 damage per round
        const poisonDamage = RandomService.rollDie(4)
        const damagedChar = this.applyDamageToCharacter(char, poisonDamage)
        damagedCharacters.set(char.id, damagedChar)

        if (damagedChar.hp <= 0) {
          messages.push(`${char.name} succumbs to poison! (${poisonDamage} damage)`)
        } else {
          messages.push(`${char.name} takes ${poisonDamage} poison damage!`)
        }
      }
    }

    // Check monsters for poison (monsters don't typically get poisoned, but support it)
    for (const monster of this.getAllMonsters(currentState)) {
      if (monster.status === 'ALIVE' && monster.hp > 0) {
        const duration = this.getStatusDuration(currentState, monster.id, 'POISONED')
        if (duration > 0) {
          const poisonDamage = RandomService.rollDie(4)
          currentState = this.applyDamage(currentState, monster, poisonDamage)
          messages.push(`${monster.name} takes ${poisonDamage} poison damage!`)
        }
      }
    }

    return {
      newState: currentState,
      damagedCharacters,
      messages
    }
  }

  /**
   * Cure a character's persistent status effect (ASLEEP, PARALYZED, POISONED)
   * Returns new state (Note: Character status changes must be applied by component)
   */
  private static cureCharacterStatus(
    state: CombatState,
    characterId: string,
    status: 'ASLEEP' | 'PARALYZED' | 'POISONED',
    party: Character[]
  ): CombatState {
    // This method exists for consistency
    // The actual character status change happens in the component via roster update
    // We just need to clear the duration tracking
    return state
  }

  /**
   * Find a combatant by ID in combat state or party
   */
  private static findCombatant(
    state: CombatState,
    combatantId: string,
    party: Character[]
  ): Combatant | undefined {
    // Check party
    const partyMember = party.find(c => c.id === combatantId)
    if (partyMember) return partyMember

    // Check monsters
    return this.getAllMonsters(state).find(m => m.id === combatantId)
  }
}
