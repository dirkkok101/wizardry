// src/services/CombatService.ts
import { Combatant, CombatState, CombatCommand, CombatActionType, AttackResult, MonsterInstance, MonsterGroup, ENCOUNTER_CONFIG } from '../types/Combat'
import { Character } from '../types/Character'
import { MonsterService } from './MonsterService'
import { MonsterDataLoader } from './MonsterDataLoader'
import { CharacterStatus } from '../types/CharacterStatus'
import { SpellCastingService } from './SpellCastingService'
import { EncounterService } from './EncounterService'
import { v4 as uuidv4 } from 'uuid'

export class CombatService {
  /**
   * Calculate initiative for combatant
   * Formula: random(0-9) + AGI_modifier (minimum 1)
   */
  static calculateInitiative(combatant: Combatant): number {
    const agi = combatant.agility || 10
    const agiMod = Math.floor((agi - 10) / 2)
    const roll = Math.floor(Math.random() * 10)  // 0-9

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
   * Formula: (attackBonus + defenderAC + 10) × 5%
   * Clamped between 5% and 95%
   *
   * @param defenderAcModifier - AC modifier (e.g., -2 for PARRY). Lower AC = better defense
   * @param attackerPenalty - Attack penalty (e.g., -4 for BLIND)
   */
  static calculateHitChance(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0
  ): number {
    const attackBonus = this.getAttackBonus(attacker) + attackerPenalty
    const effectiveAc = defender.ac + defenderAcModifier
    const rawChance = (attackBonus + effectiveAc + 10) * 5

    return Math.max(5, Math.min(95, rawChance))
  }

  private static getAttackBonus(combatant: Combatant): number {
    // For characters: level + STR modifier
    if ('class' in combatant && combatant.class) {
      const strMod = Math.floor((combatant.strength - 10) / 2)
      return combatant.level + strMod
    }
    // For monsters: level
    return combatant.level || 1
  }

  static resolveAttack(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0,
    attackerPenalty: number = 0
  ): AttackResult {
    const hitChance = this.calculateHitChance(attacker, defender, defenderAcModifier, attackerPenalty)
    const hitRoll = Math.random() * 100

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
    const damage = Math.max(1, baseDamage + strMod)

    // Critical hit: (2 × Level)% chance, max 50%
    const attackerLevel = attacker.level || 1
    const critChance = Math.min(50, attackerLevel * 2)
    const critRoll = Math.random() * 100
    const critical = critRoll < critChance

    const finalDamage = critical ? damage * 2 : damage

    return {
      hit: true,
      damage: finalDamage,
      critical,
      message: critical ? `Critical Hit! ${finalDamage} damage!` : `${finalDamage} damage!`
    }
  }

  private static rollDamage(combatant: Combatant): number {
    // For characters: basic weapon damage (simplified)
    if ('class' in combatant) {
      return Math.floor(Math.random() * 6) + 1  // 1d6
    }
    // For monsters: roll from damage array
    if ('damage' in combatant && combatant.damage && combatant.damage.length > 0) {
      const dice = combatant.damage[0]
      return Math.floor(Math.random() * (dice.max - dice.min + 1)) + dice.min
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
   * Get number of attacks per round for a combatant
   * Formula:
   * - Fighter/Lord/Samurai: 1 + floor(level/5)
   * - Ninja: 2 + floor(level/5)
   * - Others: 1
   * - Max: 10 attacks
   */
  static getAttacksPerRound(combatant: Combatant): number {
    // Monsters always get 1 attack
    if ('monsterId' in combatant) {
      return 1
    }

    // Characters: check class
    if ('class' in combatant) {
      const level = combatant.level || 1
      const levelBonus = Math.floor(level / 5)

      switch (combatant.class) {
        case 'FIGHTER':
        case 'LORD':
        case 'SAMURAI':
          return Math.min(10, 1 + levelBonus)
        case 'NINJA':
          return Math.min(10, 2 + levelBonus)
        default:
          return 1
      }
    }

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
      return targets[Math.floor(Math.random() * targets.length)]
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
    parryingCombatants: Set<string>
  ): { newState: CombatState; messages: string[] } {
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
      return this.executeCastSpellCommand(state, command)
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
   * @returns Updated combat state and result messages (action + result split)
   *
   * @remarks
   * Authentic Wizardry mechanic: Helpless targets (ASLEEP or PARALYZED) take 2x damage
   * from physical attacks. This multiplier is applied after hit/damage calculations.
   */
  private static executeAttackCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): { newState: CombatState; messages: string[] } {
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

    const attackResult = this.resolveAttack(command.actor, target, acModifier, attackerPenalty)
    const actorName = this.getCombatantName(command.actor)
    const targetName = this.getCombatantName(target)

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

    // Apply damage to target
    const newState = this.applyDamage(state, target, finalDamage)

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
      messages: [actionMessage, resultMessage]
    }
  }

  private static executeParryCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): { newState: CombatState; messages: string[] } {
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
  ): { newState: CombatState; messages: string[] } {
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
  ): { newState: CombatState; messages: string[] } {
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
    command: CombatCommand
  ): { newState: CombatState; messages: string[] } {
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster)
    const spellId = command.data?.spellId

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

    // Apply damage to targets (if spell has damage)
    let newState = state
    if (spellEffect.damage && spellEffect.damage.length > 0) {
      for (let i = 0; i < targets.length && i < spellEffect.damage.length; i++) {
        const target = targets[i]
        const damage = spellEffect.damage[i]
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

    // Apply healing to targets
    if (spellEffect.healing && spellEffect.healing.length > 0) {
      for (let i = 0; i < targets.length && i < spellEffect.healing.length; i++) {
        const target = targets[i]
        const healing = spellEffect.healing[i]
        newState = this.applyHealing(newState, target, healing)
      }
    }

    // Apply AC buffs to targets
    if (spellEffect.acBuffs && spellEffect.acBuffs.length > 0) {
      for (const acBuff of spellEffect.acBuffs) {
        newState = this.applyAcBuff(newState, acBuff.target, acBuff.acModifier)
      }
    }

    // Apply full healing to targets (MALIKTO)
    if (spellEffect.fullHeal && spellEffect.fullHeal.length > 0) {
      for (const targetId of spellEffect.fullHeal) {
        newState = this.applyFullHeal(newState, targetId)
      }
    }

    // Apply instant death to targets (MAKANITO)
    if (spellEffect.instantDeath && spellEffect.instantDeath.length > 0) {
      for (const targetId of spellEffect.instantDeath) {
        newState = this.applyInstantDeath(newState, targetId)
      }
    }

    // Apply resurrection to targets (KADORTO)
    if (spellEffect.resurrection && spellEffect.resurrection.length > 0) {
      for (const targetId of spellEffect.resurrection) {
        newState = this.applyResurrection(newState, targetId)
      }
    }

    // Apply status cures to targets (LITOKAN, LATUMOFIS)
    if (spellEffect.statusCures) {
      newState = this.applyCureStatus(
        newState,
        spellEffect.statusCures.targetIds,
        spellEffect.statusCures.cureType
      )
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
      messages: [actionMessage, resultMessage]
    }
  }

  private static executeDispelCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; messages: string[] } {
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

    // Check if group contains undead
    // TODO: Add isUndead property to monsters
    // For now, assume all monsters can be dispelled (simplified)

    // Calculate dispel chance: (CasterLevel - UndeadLevel) × 10, clamped to 5-95%
    const casterLevel = caster.level || 1
    const undeadLevel = aliveMonsters[0].level || 1
    const rawChance = (casterLevel - undeadLevel) * 10
    const dispelChance = Math.max(5, Math.min(95, rawChance))

    // Roll for success
    const roll = Math.random() * 100

    if (roll < dispelChance) {
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
   * Formula: 50% base + modifiers
   * Modifiers:
   * - Boss fight (canFlee = false): 0%
   * - Party >50% casualties: +20%
   * - Enemy surprised: +30% (not implemented yet)
   */
  static calculateFleeChance(
    state: CombatState,
    party: Character[],
    fleeingCharacterIds: Set<string>
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

    // Check party casualties
    const totalParty = party.length
    const aliveParty = party.filter(c => c.status !== CharacterStatus.DEAD && c.hp > 0).length
    const casualties = totalParty - aliveParty

    if (casualties > totalParty / 2) {
      chance += 20  // +20% if >50% dead
    }

    return chance
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

  static executeRound(
    state: CombatState,
    party: Character[]
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
      // Skip if actor cannot act (dead, asleep, paralyzed)
      if (!this.canCombatantAct(command.actor)) continue

      const result = this.executeCommand(currentState, command, parryingCombatants)
      currentState = result.newState
      messages.push(...result.messages)

      // Track RUN commands
      if (command.type === 'RUN' && !('monsterId' in command.actor)) {
        fleeingCharacters.add(command.actor.id)
      }

      // Track CAST_SPELL commands for spell point deduction
      if (command.type === 'CAST_SPELL' && !('monsterId' in command.actor) && command.data?.spellId) {
        const caster = command.actor as Character
        spellCasters.set(caster.id, { character: caster, spellId: command.data.spellId })
      }

      // Track character damage for component to update roster
      if (command.target && !('monsterId' in command.target)) {
        const target = command.target as Character
        const isParrying = parryingCombatants.has(target.id)
        const acModifier = isParrying ? -2 : 0

        // Check if attacker is blind (-4 attack penalty)
        const isBlind = this.hasStatusEffect(currentState, command.actor.id, 'BLIND')
        const attackerPenalty = isBlind ? -4 : 0

        const existingDamage = damagedCharacters.get(target.id)
        if (existingDamage) {
          // Accumulate damage
          const attackResult = this.resolveAttack(command.actor, target, acModifier, attackerPenalty)
          if (attackResult.hit) {
            const updated = this.applyDamageToCharacter(existingDamage, attackResult.damage)
            damagedCharacters.set(target.id, updated)
          }
        } else {
          // First damage to this character
          const attackResult = this.resolveAttack(command.actor, target, acModifier, attackerPenalty)
          if (attackResult.hit) {
            const updated = this.applyDamageToCharacter(target, attackResult.damage)
            damagedCharacters.set(target.id, updated)
          }
        }
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
    const aliveCharacters = party.filter(c => c.status !== CharacterStatus.DEAD && c.hp > 0)
    const allFleeing = aliveCharacters.length > 0 &&
                      aliveCharacters.every(c => fleeingCharacters.has(c.id))

    if (allFleeing) {
      const fleeChance = this.calculateFleeChance(currentState, party, fleeingCharacters)
      const fleeRoll = Math.random() * 100

      if (fleeRoll < fleeChance) {
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
      }
    }

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
        const poisonDamage = Math.floor(Math.random() * 4) + 1
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
          const poisonDamage = Math.floor(Math.random() * 4) + 1
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
