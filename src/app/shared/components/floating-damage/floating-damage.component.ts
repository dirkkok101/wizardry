import {
  Component,
  input,
  output,
  signal,
  computed,
  effect
} from '@angular/core'
import { CommonModule } from '@angular/common'

export type DamageType = 'damage' | 'critical' | 'heal' | 'miss' | 'status'

export interface FloatingDamageEntry {
  id: string
  text: string
  type: DamageType
  x: number  // Position as percentage (0-100)
  y: number  // Position as percentage (0-100)
  timestamp: number
}

/**
 * FloatingDamageComponent - Animated floating damage/heal numbers.
 *
 * This component displays combat feedback numbers that float upward
 * and fade out, synced with combat message display.
 *
 * Features:
 * - Multiple simultaneous damage numbers
 * - Color-coded by type (damage=red, critical=gold, heal=green, miss=gray)
 * - Float-up and fade-out animation
 * - Auto-removes entries after animation completes
 *
 * @example
 * <app-floating-damage
 *   [entries]="damageEntries()"
 *   (entryComplete)="onDamageComplete($event)"
 * />
 */
@Component({
  selector: 'app-floating-damage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-damage.component.html',
  styleUrls: ['./floating-damage.component.scss']
})
export class FloatingDamageComponent {
  // Inputs
  readonly entries = input<FloatingDamageEntry[]>([])

  // Outputs
  readonly entryComplete = output<string>()

  // Internal tracking for animation completion
  private animatingIds = new Set<string>()

  /**
   * Handle animation end for an entry
   */
  onAnimationEnd(entryId: string): void {
    if (this.animatingIds.has(entryId)) {
      this.animatingIds.delete(entryId)
      this.entryComplete.emit(entryId)
    }
  }

  /**
   * Track function for ngFor
   */
  trackById(index: number, entry: FloatingDamageEntry): string {
    return entry.id
  }

  /**
   * Get CSS class for damage type
   */
  getTypeClass(type: DamageType): string {
    return `damage-${type}`
  }

  /**
   * Get position style for entry
   */
  getPositionStyle(entry: FloatingDamageEntry): Record<string, string> {
    return {
      left: `${entry.x}%`,
      top: `${entry.y}%`
    }
  }

  /**
   * Start tracking animation for an entry
   */
  startAnimation(entryId: string): void {
    this.animatingIds.add(entryId)
  }

  // Effect to start tracking new entries
  constructor() {
    effect(() => {
      const entries = this.entries()
      for (const entry of entries) {
        if (!this.animatingIds.has(entry.id)) {
          this.animatingIds.add(entry.id)
        }
      }
    })
  }
}

/**
 * Utility function to create a floating damage entry
 */
export function createFloatingDamage(
  text: string,
  type: DamageType,
  x: number,
  y: number
): FloatingDamageEntry {
  return {
    id: `damage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    type,
    x,
    y,
    timestamp: Date.now()
  }
}

/**
 * Parse combat message to determine damage type and extract value
 */
export function parseCombatMessage(message: string): { value: string; type: DamageType } | null {
  // Critical hit patterns - includes instant kill decapitation
  if (message.includes('CRITICAL') || message.includes('critical') ||
      message.includes('decapitates') || message.includes('decapitated')) {
    // Decapitation = instant kill, show dramatic text instead of damage number
    if (message.includes('decapitates') || message.includes('decapitated')) {
      return { value: 'INSTANT KILL!', type: 'critical' }
    }
    const match = message.match(/(\d+)\s*(?:damage|HP|points)/i)
    return match ? { value: match[1], type: 'critical' } : { value: 'CRIT!', type: 'critical' }
  }

  // Miss patterns
  if (message.includes('missed') || message.includes('misses') || message.includes('MISS')) {
    return { value: 'MISS', type: 'miss' }
  }

  // Heal patterns
  if (message.includes('healed') || message.includes('restored') || message.includes('recovered')) {
    const match = message.match(/(\d+)\s*(?:HP|hit points|points)/i)
    return match ? { value: `+${match[1]}`, type: 'heal' } : null
  }

  // Damage patterns
  const damageMatch = message.match(/(?:deals?|takes?|suffers?|inflicts?|for)\s*(\d+)\s*(?:damage|HP|points)/i)
  if (damageMatch) {
    return { value: damageMatch[1], type: 'damage' }
  }

  // Status effect patterns
  if (message.includes('poisoned') || message.includes('paralyzed') || message.includes('asleep')) {
    const status = message.includes('poisoned') ? 'POISON' :
                   message.includes('paralyzed') ? 'PARALYZE' :
                   message.includes('asleep') ? 'SLEEP' : 'STATUS'
    return { value: status, type: 'status' }
  }

  return null
}
