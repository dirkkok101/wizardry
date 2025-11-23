// src/services/CombatService.ts
import { Combatant, CombatState, CombatCommand, CombatActionType, AttackResult, MonsterInstance, MonsterGroup } from '../types/Combat'
import { Character } from '../types/Character'
import { MonsterService } from './MonsterService'
import { CharacterStatus } from '../types/CharacterStatus'
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
   */
  static calculateHitChance(attacker: Combatant, defender: Combatant): number {
    const attackBonus = this.getAttackBonus(attacker)
    const rawChance = (attackBonus + defender.ac + 10) * 5

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

  static resolveAttack(attacker: Combatant, defender: Combatant): AttackResult {
    const hitChance = this.calculateHitChance(attacker, defender)
    const roll = Math.random() * 100

    if (roll >= hitChance) {
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

    // Critical hit on roll >= 95
    const critical = roll >= 95
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
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    // Handle different command types
    if (command.type === 'ATTACK') {
      return this.executeAttackCommand(state, command)
    }

    // TODO: Handle other command types (CAST_SPELL, USE_ITEM, etc.)
    return { newState: state, message: 'Unknown command type' }
  }

  private static executeAttackCommand(
    state: CombatState,
    command: CombatCommand
  ): { newState: CombatState; message: string } {
    const target = command.target as Combatant
    if (!target) {
      return { newState: state, message: 'No target specified' }
    }

    const attackResult = this.resolveAttack(command.actor, target)
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
    victory: boolean
    defeat: boolean
  } {
    // Sort commands by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState: CombatState = { ...state, commandQueue: [] }
    const messages: string[] = []
    const damagedCharacters = new Map<string, Character>()

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor is dead
      if (this.isCombatantDead(command.actor)) continue

      const result = this.executeCommand(currentState, command)
      currentState = result.newState
      messages.push(result.message)

      // Track character damage for component to update roster
      if (command.target && !('monsterId' in command.target)) {
        const target = command.target as Character
        const existingDamage = damagedCharacters.get(target.id)
        if (existingDamage) {
          // Accumulate damage
          const attackResult = this.resolveAttack(command.actor, target)
          if (attackResult.hit) {
            const updated = this.applyDamageToCharacter(existingDamage, attackResult.damage)
            damagedCharacters.set(target.id, updated)
          }
        } else {
          // First damage to this character
          const attackResult = this.resolveAttack(command.actor, target)
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
          victory: true,
          defeat: false
        }
      }

      // Check defeat after each action
      const allPartyDead = this.areAllCharactersDead(party, damagedCharacters)
      if (allPartyDead) {
        return {
          newState: currentState,
          messages,
          damagedCharacters,
          victory: false,
          defeat: true
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
        victory: true,
        defeat: false
      }
    }

    const allPartyDead = this.areAllCharactersDead(party, damagedCharacters)
    if (allPartyDead) {
      return {
        newState: currentState,
        messages,
        damagedCharacters,
        victory: false,
        defeat: true
      }
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      damagedCharacters,
      victory: false,
      defeat: false
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
