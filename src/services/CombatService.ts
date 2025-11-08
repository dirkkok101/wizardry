// src/services/CombatService.ts
import { Combatant, CombatState, CombatCommand, CombatActionType, AttackResult, MonsterInstance } from '../types/Combat'
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

    return {
      monsters,
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
      const newMonsters = state.monsters.map(m => {
        if (m.id !== target.id) return m
        const newHp = Math.max(0, m.hp - damage)
        return {
          ...m,
          hp: newHp,
          status: newHp === 0 ? 'DEAD' : m.status
        }
      })
      return { ...state, monsters: newMonsters }
    }

    // TODO: Apply damage to character
    return state
  }

  private static getCombatantName(combatant: Combatant): string {
    return combatant.name || 'Unknown'
  }

  static executeRound(state: CombatState): {
    newState: CombatState
    messages: string[]
    victory: boolean
    defeat: boolean
  } {
    // Sort commands by initiative (descending)
    const sortedQueue = [...state.commandQueue].sort(
      (a, b) => b.initiative - a.initiative
    )

    let currentState = { ...state, commandQueue: [] }
    const messages: string[] = []

    // Execute each command
    for (const command of sortedQueue) {
      // Skip if actor is dead
      if (this.isCombatantDead(command.actor)) continue

      const result = this.executeCommand(currentState, command)
      currentState = result.newState
      messages.push(result.message)

      // Check victory/defeat after each action
      const allMonstersDead = currentState.monsters.every(m => m.status === 'DEAD')
      if (allMonstersDead) {
        return { newState: currentState, messages, victory: true, defeat: false }
      }

      // TODO: Check party wipe (defeat)
    }

    return {
      newState: { ...currentState, roundNumber: currentState.roundNumber + 1 },
      messages,
      victory: false,
      defeat: false
    }
  }

  private static isCombatantDead(combatant: Combatant): boolean {
    if ('status' in combatant) {
      return combatant.status === 'DEAD' || combatant.status === CharacterStatus.DEAD
    }
    return combatant.hp <= 0
  }
}
