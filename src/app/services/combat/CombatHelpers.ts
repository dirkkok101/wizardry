/**
 * CombatHelpers - Shared utility functions for combat-related monster checks
 *
 * Centralizes monster alive/dead status checks to ensure consistency
 * across all combat services. A monster is considered alive if it has
 * both hp > 0 AND status !== 'DEAD' (to handle instant-death effects).
 */

import { MonsterInstance } from '@models/Combat'

export const CombatHelpers = {
  /**
   * Check if a monster is alive (can take actions and be targeted)
   *
   * A monster is alive if:
   * - hp > 0 (has hit points remaining)
   * - status !== 'DEAD' (not killed by instant-death effects)
   */
  isMonsterAlive(monster: MonsterInstance): boolean {
    return monster.hp > 0 && monster.status !== 'DEAD'
  },

  /**
   * Check if a monster is dead (cannot act, should be removed from combat)
   */
  isMonsterDead(monster: MonsterInstance): boolean {
    return monster.hp <= 0 || monster.status === 'DEAD'
  },

  /**
   * Filter an array of monsters to only those that are alive
   */
  getAliveMonsters(monsters: MonsterInstance[]): MonsterInstance[] {
    return monsters.filter(m => this.isMonsterAlive(m))
  },

  /**
   * Check if any monster in the array is alive
   */
  hasAliveMonsters(monsters: MonsterInstance[]): boolean {
    return monsters.some(m => this.isMonsterAlive(m))
  },

  /**
   * Get the first alive monster in the array (for targeting)
   */
  getFirstAliveMonster(monsters: MonsterInstance[]): MonsterInstance | undefined {
    return monsters.find(m => this.isMonsterAlive(m))
  },

  /**
   * Count how many monsters are alive in the array
   */
  countAliveMonsters(monsters: MonsterInstance[]): number {
    return monsters.filter(m => this.isMonsterAlive(m)).length
  }
}
