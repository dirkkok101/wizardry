// src/services/CombatService.ts
import { Combatant, CombatState, CombatCommand, CombatActionType, AttackResult, MonsterInstance, MonsterGroup } from '../types/Combat'
import { Character } from '../types/Character'
import { MonsterService } from './MonsterService'
import { CharacterStatus } from '../types/CharacterStatus'
import { SpellCastingService } from './SpellCastingService'
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

  static initiateCombat(
    monsterId: string,
    party: Character[],
    canFlee: boolean
  ): CombatState {
    const monsters = MonsterService.generateMonsterGroup(monsterId)

    // Create single monster group (Group A, front row)
    // TODO: Support multiple groups when implementing encounter system
    const monsterGroups: MonsterGroup[] = [
      {
        id: 'A',
        monsters,
        formation: 'front'
      }
    ]

    return {
      monsterGroups,
      commandQueue: [],
      roundNumber: 1,
      combatLog: [],
      canFlee
    }
  }

  static createCommand(
    actor: Combatant,
    actionType: CombatActionType,
    target?: Combatant | Combatant[],
    data?: any
  ): CombatCommand {
    return {
      id: uuidv4(),
      actor,
      type: actionType,
      initiative: this.calculateInitiative(actor),
      target,
      data
    }
  }

  /**
   * Calculate hit chance percentage
   * Formula: (attackBonus + defenderAC + 10) × 5%
   * Clamped between 5% and 95%
   *
   * @param defenderAcModifier - AC modifier (e.g., -2 for PARRY). Lower AC = better defense
   */
  static calculateHitChance(
    attacker: Combatant,
    defender: Combatant,
    defenderAcModifier: number = 0
  ): number {
    const attackBonus = this.getAttackBonus(attacker)
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
    defenderAcModifier: number = 0
  ): AttackResult {
    const hitChance = this.calculateHitChance(attacker, defender, defenderAcModifier)
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
        case 'Fighter':
        case 'Lord':
        case 'Samurai':
          return Math.min(10, 1 + levelBonus)
        case 'Ninja':
          return Math.min(10, 2 + levelBonus)
        default:
          return 1
      }
    }

    return 1
  }

  static selectMonsterAction(
    monster: MonsterInstance,
    party: Character[],
    frontRow: string[]
  ): CombatCommand {
    // Get alive front row members
    const aliveFront = party.filter(c =>
      frontRow.includes(c.id) && c.status !== CharacterStatus.DEAD && c.hp > 0
    )

    // If no alive front row, target alive back row
    const targetPool = aliveFront.length > 0
      ? aliveFront
      : party.filter(c => c.status !== CharacterStatus.DEAD && c.hp > 0)

    // Select random target
    const target = targetPool[Math.floor(Math.random() * targetPool.length)]

    return this.createCommand(monster, 'ATTACK', target)
  }

  static executeCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): { newState: CombatState; message: string } {
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

    // TODO: Handle other command types (USE_ITEM)
    return { newState: state, message: 'Unknown command type' }
  }

  private static executeAttackCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): { newState: CombatState; message: string } {
    const target = command.target as Combatant
    if (!target) {
      return { newState: state, message: 'No target specified' }
    }

    // Check if target is parrying (apply -2 AC bonus)
    const isParrying = parryingCombatants.has(target.id)
    const acModifier = isParrying ? -2 : 0

    const attackResult = this.resolveAttack(command.actor, target, acModifier)
    const actorName = this.getCombatantName(command.actor)
    const targetName = this.getCombatantName(target)

    if (!attackResult.hit) {
      return {
        newState: state,
        message: `${actorName} attacks ${targetName}: ${attackResult.message}`
      }
    }

    // Apply damage to target
    const newState = this.applyDamage(state, target, attackResult.damage)

    return {
      newState,
      message: `${actorName} attacks ${targetName}: ${attackResult.message}`
    }
  }

  private static executeParryCommand(
    state: CombatState,
    command: CombatCommand,
    parryingCombatants: Set<string>
  ): { newState: CombatState; message: string } {
    // Add actor to parrying set
    parryingCombatants.add(command.actor.id)

    const actorName = this.getCombatantName(command.actor)
    return {
      newState: state, // State doesn't change for PARRY, return as-is
      message: `${actorName} assumes a defensive stance! (AC -2)`
    }
  }

  private static executeRunCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    const actorName = this.getCombatantName(command.actor)
    return {
      newState: state, // State doesn't change, flee is checked at end of round
      message: `${actorName} attempts to flee!`
    }
  }

  private static executeCastSpellCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster)
    const spellId = command.data?.spellId

    if (!spellId) {
      return { newState: state, message: `${actorName} casts nothing!` }
    }

    // Check if can cast
    const canCastResult = SpellCastingService.canCastSpell(caster, spellId)
    if (!canCastResult.canCast) {
      return {
        newState: state,
        message: `${actorName} cannot cast spell: ${canCastResult.reason}`
      }
    }

    // Get targets
    const targets = Array.isArray(command.target) ? command.target : command.target ? [command.target] : []

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

    // TODO: Apply healing to targets
    // TODO: Apply status effects

    return {
      newState,
      message: `${actorName} casts ${spellId.toUpperCase()}: ${spellEffect.message}`
    }
  }

  private static executeDispelCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    const caster = command.actor as Character
    const actorName = this.getCombatantName(caster)

    // Must target a monster group
    if (!command.target || !('monsterId' in command.target)) {
      return {
        newState: state,
        message: `${actorName} cannot dispel that target!`
      }
    }

    const targetMonster = command.target as MonsterInstance

    // Find the group containing this monster
    const groupId = command.data?.groupId as 'A' | 'B' | 'C' | 'D' | undefined
    if (!groupId) {
      return {
        newState: state,
        message: `${actorName} DISPEL fails: no group specified!`
      }
    }

    const group = state.monsterGroups.find(g => g.id === groupId)
    if (!group || group.monsters.length === 0) {
      return {
        newState: state,
        message: `${actorName} DISPEL fails: group empty!`
      }
    }

    // Check if group contains undead
    // TODO: Add isUndead property to monsters
    // For now, assume all monsters can be dispelled (simplified)

    // Calculate dispel chance: (CasterLevel - UndeadLevel) × 10, clamped to 5-95%
    const casterLevel = caster.level || 1
    const undeadLevel = targetMonster.level || 1
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

      return {
        newState: { ...state, monsterGroups: newMonsterGroups },
        message: `${actorName} DISPEL destroys Group ${groupId}!`
      }
    } else {
      // Failure
      return {
        newState: state,
        message: `${actorName} DISPEL fails!`
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
          return {
            ...m,
            hp: newHp,
            status: newHp === 0 ? 'DEAD' : m.status
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
   */
  static applyDamageToCharacter(character: Character, damage: number): Character {
    const newHp = Math.max(0, character.hp - damage)
    const isDead = newHp === 0

    return {
      ...character,
      hp: newHp,
      status: isDead ? CharacterStatus.DEAD : character.status
    }
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
    const parryingCombatants = new Set<string>()  // Track who is parrying this round
    const fleeingCharacters = new Set<string>()   // Track who is attempting to flee

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor is dead
      if (this.isCombatantDead(command.actor)) continue

      const result = this.executeCommand(currentState, command, parryingCombatants)
      currentState = result.newState
      messages.push(result.message)

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

        const existingDamage = damagedCharacters.get(target.id)
        if (existingDamage) {
          // Accumulate damage
          const attackResult = this.resolveAttack(command.actor, target, acModifier)
          if (attackResult.hit) {
            const updated = this.applyDamageToCharacter(existingDamage, attackResult.damage)
            damagedCharacters.set(target.id, updated)
          }
        } else {
          // First damage to this character
          const attackResult = this.resolveAttack(command.actor, target, acModifier)
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
          victory: false,
          defeat: false,
          fled: true
        }
      } else {
        messages.push(`The party fails to escape!`)
      }
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      damagedCharacters,
      spellCasters,
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
}
