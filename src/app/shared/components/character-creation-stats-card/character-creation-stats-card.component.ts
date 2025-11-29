import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Race, RaceBaseStats } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { CharacterClass } from '@models/CharacterClass'
import { RolledStats } from '@services/CharacterCreationService'
import { CharacterService } from '@services/CharacterService'

/**
 * Configuration for stat allocation during character creation
 */
export interface AllocationConfig {
  bonusPoints: number        // Remaining points to allocate
  baseStats: RaceBaseStats   // Race base stats (str, int, pie, etc.)
  allocatedStats: RolledStats // Current allocated stats
  maxStat: number            // Maximum stat value (18 in Wizardry)
}

/**
 * Partial character data used during character creation
 * Fields are optional and filled in progressively
 */
export interface PartialCharacter {
  race?: Race
  alignment?: Alignment
  class?: CharacterClass
  name?: string
  // Stats (filled after roll)
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
}

/**
 * Stat key type for allocation
 */
export type StatKey = 'strength' | 'intelligence' | 'piety' | 'vitality' | 'agility' | 'luck'

/**
 * Stat configuration for display
 */
interface StatConfig {
  key: StatKey
  label: string
  shortKey: keyof RaceBaseStats
}

/**
 * CharacterCreationStatsCardComponent - Dedicated component for character creation stats display
 *
 * Features:
 * - Progressive reveal: shows Race, then Alignment, then Class, then Stats as they become available
 * - Split header: Race, Alignment, Class on separate rows (not one line)
 * - No level/status display (meaningless during creation)
 * - Instructions for stat allocation
 * - Compact vertical height to fit within screen bounds
 *
 * @example
 * <app-character-creation-stats-card
 *   [partialCharacter]="partialCharacter()"
 *   [allocationConfig]="allocationConfig()"
 *   (allocate)="handleAllocation($event)"
 * />
 */
@Component({
  selector: 'app-character-creation-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-creation-stats-card.component.html',
  styleUrls: ['./character-creation-stats-card.component.scss']
})
export class CharacterCreationStatsCardComponent {
  @Input() partialCharacter?: PartialCharacter
  @Input() allocationConfig?: AllocationConfig

  @Output() allocate = new EventEmitter<{ stat: StatKey; delta: number }>()

  /**
   * Stat configuration for iteration in template
   */
  readonly stats: StatConfig[] = [
    { key: 'strength', label: 'STR', shortKey: 'str' },
    { key: 'vitality', label: 'VIT', shortKey: 'vit' },
    { key: 'intelligence', label: 'INT', shortKey: 'int' },
    { key: 'agility', label: 'AGI', shortKey: 'agi' },
    { key: 'piety', label: 'PIE', shortKey: 'pie' },
    { key: 'luck', label: 'LUK', shortKey: 'luc' }
  ]

  /**
   * Check if stat allocation is available
   */
  get hasStats(): boolean {
    return !!this.allocationConfig
  }

  /**
   * Get the stat value for display
   */
  getStatValue(stat: StatKey): number | undefined {
    return this.partialCharacter?.[stat]
  }

  /**
   * Get the base stat value from race
   */
  getBaseStat(stat: StatKey): number {
    if (!this.allocationConfig) return 0
    const config = this.stats.find(s => s.key === stat)
    if (!config) return 0
    return this.allocationConfig.baseStats[config.shortKey] ?? 0
  }

  /**
   * Get allocated points for a stat
   */
  getAllocated(stat: StatKey): number {
    if (!this.allocationConfig) return 0
    return this.allocationConfig.allocatedStats[stat] ?? 0
  }

  /**
   * Check if we can increment a stat (has bonus points and stat < max)
   */
  canIncrement(stat: StatKey): boolean {
    if (!this.allocationConfig) return false
    const base = this.getBaseStat(stat)
    const allocated = this.getAllocated(stat)
    const total = base + allocated
    return this.allocationConfig.bonusPoints > 0 && total < this.allocationConfig.maxStat
  }

  /**
   * Check if we can decrement a stat (allocated > 0)
   */
  canDecrement(stat: StatKey): boolean {
    if (!this.allocationConfig) return false
    return this.getAllocated(stat) > 0
  }

  /**
   * Emit allocation event for increment
   */
  incrementStat(stat: StatKey): void {
    if (this.canIncrement(stat)) {
      this.allocate.emit({ stat, delta: 1 })
    }
  }

  /**
   * Emit allocation event for decrement
   */
  decrementStat(stat: StatKey): void {
    if (this.canDecrement(stat)) {
      this.allocate.emit({ stat, delta: -1 })
    }
  }

  /**
   * Get stat modifier display (uses final stat value)
   */
  getStatModifier(stat: StatKey): string {
    const value = this.getStatValue(stat)
    if (value === undefined) return '--'

    switch (stat) {
      case 'strength': {
        const mod = Math.floor((value - 10) / 2)
        return mod >= 0 ? `+${mod} dmg` : `${mod} dmg`
      }
      case 'vitality': {
        const bonus = CharacterService.getVitalityBonus(value)
        return bonus >= 0 ? `+${bonus} HP/lvl` : `${bonus} HP/lvl`
      }
      case 'intelligence': {
        const mod = Math.floor((value - 10) / 2)
        return mod >= 0 ? `+${mod} learn` : `${mod} learn`
      }
      case 'agility': {
        const mod = Math.floor((value - 10) / 2)
        return mod >= 0 ? `+${mod} AC` : `${mod} AC`
      }
      case 'piety': {
        const mod = Math.floor((value - 10) / 2)
        return mod >= 0 ? `+${mod} learn` : `${mod} learn`
      }
      case 'luck': {
        const effect = (value - 10) * 2
        return effect >= 0 ? `+${effect}% flee` : `${effect}% flee`
      }
      default:
        return ''
    }
  }
}
