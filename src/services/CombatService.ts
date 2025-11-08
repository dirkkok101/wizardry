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
}
