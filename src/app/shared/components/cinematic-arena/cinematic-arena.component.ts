/**
 * CinematicArenaComponent - Theatrical combat round visualization
 *
 * Transforms combat round execution into a dramatic JRPG-style experience.
 * Displays a split-screen arena with attacker (left) vs target (right) facing off,
 * using letterbox framing for a cinematic presentation.
 *
 * This component ONLY appears during round execution (after "Begin Round").
 * It consumes pre-calculated CombatRoundEvent[] and plays them back visually.
 */

import {
  Component,
  input,
  output,
  signal,
  effect,
  OnDestroy
} from '@angular/core'
import { CommonModule } from '@angular/common'
import {
  CombatRoundEvent,
  CombatRoundAudit,
  MonsterGroup,
  CombatActionType,
  DamageResult
} from '@models/Combat'
import { Character } from '@models/Character'
import { SpriteService } from '@services/SpriteService'
import {
  FloatingDamageComponent,
  FloatingDamageEntry,
  createFloatingDamage,
  parseCombatMessage,
  DamageType
} from '../floating-damage/floating-damage.component'
import {
  ArenaState,
  ArenaCombatant,
  ArenaAnimation,
  DamageDisplayType,
  ARENA_TIMING,
  getArenaAnimation,
  getActionVerbDisplay
} from './cinematic-arena.types'
import { RESULT_MARKER } from '@services/combat'

@Component({
  selector: 'app-cinematic-arena',
  standalone: true,
  imports: [CommonModule, FloatingDamageComponent],
  templateUrl: './cinematic-arena.component.html',
  styleUrls: ['./cinematic-arena.component.scss']
})
export class CinematicArenaComponent implements OnDestroy {
  // ============================================================================
  // INPUTS
  // ============================================================================

  /** Whether the arena is visible */
  readonly visible = input(false)

  /** Events to play back (from CombatRoundResult.events) */
  readonly events = input.required<CombatRoundEvent[]>()

  /** Audit data for building timeline (from CombatRoundResult.audit) */
  readonly audit = input<CombatRoundAudit | null>(null)

  /** Party characters for sprite lookup */
  readonly partyCharacters = input.required<Character[]>()

  /** Monster groups for sprite lookup */
  readonly monsterGroups = input.required<MonsterGroup[]>()

  // ============================================================================
  // OUTPUTS
  // ============================================================================

  /** Emitted when playback completes */
  readonly playbackComplete = output<void>()

  /** Emitted after each event is displayed (for combat log sync) */
  readonly eventPlayed = output<CombatRoundEvent>()

  // ============================================================================
  // INTERNAL STATE
  // ============================================================================

  /** Current arena state (attacker/target display) */
  readonly arenaState = signal<ArenaState | null>(null)

  /** Whether playback is in progress */
  readonly isPlaying = signal(false)

  /** Whether letterbox is expanded */
  readonly letterboxExpanded = signal(false)

  /** Floating damage entries */
  readonly damageEntries = signal<FloatingDamageEntry[]>([])

  /** Current attacker animation state */
  readonly attackerAnimation = signal<'idle' | 'attacking' | 'casting'>('idle')

  /** Current target animation state */
  readonly targetAnimation = signal<'idle' | 'shaking'>('idle')

  /** Action result message (bottom center banner) */
  readonly actionResultMessage = signal<string | null>(null)

  /** Whether the action result is a status effect (for purple theming) */
  readonly isStatusEffectMessage = signal(false)

  /** Whether the action result is a healing effect (for green theming) */
  readonly isHealingMessage = signal(false)

  /** Whether the action result is an AC buff (for steel blue theming) */
  readonly isAcBuffMessage = signal(false)

  /** Character ID currently being healed (for HP pulse animation) */
  readonly healingCharacterId = signal<string | null>(null)

  /** Character ID currently receiving AC buff (for shield pulse animation) */
  readonly buffedCharacterId = signal<string | null>(null)

  // ============================================================================
  // PHASED REVEAL STATE (for dramatic labels)
  // ============================================================================

  /** Whether to show attacker label */
  readonly showAttackerLabel = signal(false)

  /** Whether to show action verb */
  readonly showActionVerb = signal(false)

  /** Whether to show target label */
  readonly showTargetLabel = signal(false)

  /** Whether to show outcome */
  readonly showOutcome = signal(false)

  /** Outcome text to display (e.g., "8 DAMAGE!") */
  readonly outcomeText = signal<string | null>(null)

  /** Outcome display type for styling */
  readonly outcomeType = signal<DamageDisplayType>('damage')

  /** Playback cancellation flag */
  private playbackCancelled = false

  /** Track sprite errors */
  private readonly spriteErrors = signal<Set<string>>(new Set())

  // ============================================================================
  // LIVE STATS (updated during playback)
  // ============================================================================

  /** Live HP tracking for characters during combat visualization */
  readonly liveCharacterHp = signal<Map<string, number>>(new Map())

  /** Live monster alive counts for groups during combat visualization */
  readonly liveMonsterCounts = signal<Map<string, number>>(new Map())

  /** Live monster active counts (not asleep/paralyzed) for groups */
  readonly liveMonsterActiveCounts = signal<Map<string, number>>(new Map())

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Start playback when component becomes visible with events
    effect(() => {
      if (this.visible() && this.events().length > 0 && !this.isPlaying()) {
        this.startPlayback()
      }
    })
  }

  ngOnDestroy(): void {
    this.playbackCancelled = true
  }

  // ============================================================================
  // PLAYBACK ORCHESTRATION
  // ============================================================================

  /**
   * Start the playback sequence
   */
  private async startPlayback(): Promise<void> {
    this.playbackCancelled = false
    this.isPlaying.set(true)

    // Initialize live stats from current party/monster state
    this.initializeLiveStats()

    // Phase 1: Expand letterbox
    this.letterboxExpanded.set(true)
    await this.delay(ARENA_TIMING.LETTERBOX_EXPAND)

    // Phase 2: Play each event
    const events = this.events()
    for (let i = 0; i < events.length; i++) {
      if (this.playbackCancelled) break

      const event = events[i]
      await this.playEvent(event, i)

      // Emit event for combat log sync
      this.eventPlayed.emit(event)
    }

    // Phase 3: Collapse and complete
    await this.delay(ARENA_TIMING.NEXT_ACTION_DELAY)
    this.letterboxExpanded.set(false)
    await this.delay(ARENA_TIMING.LETTERBOX_COLLAPSE)

    this.isPlaying.set(false)
    this.arenaState.set(null)

    this.playbackComplete.emit()
  }

  /**
   * Play a single combat event with dramatic phased reveal
   *
   * Sequence (~4.5s per action):
   * 1. Portrait entrance (400ms)
   * 2. Attacker name reveal (400ms) - "FIGHTER"
   * 3. Action verb reveal (600ms) - "ATTACKS"
   * 4. Target visible pause (400ms)
   * 5. Attack/spell animation (500ms)
   * 6. Anticipation pause (800ms)
   * 7. Damage display + shake (300ms + 900ms)
   * 8. Settle before next (600ms)
   */
  private async playEvent(event: CombatRoundEvent, eventIndex: number): Promise<void> {
    if (this.playbackCancelled) return

    // Reset phased reveal state
    this.resetPhasedReveal()

    // Build arena state from event
    const arenaState = this.buildArenaState(event)
    if (arenaState) {
      this.arenaState.set(arenaState)

      // Phase 1: Portrait entrance
      await this.delay(ARENA_TIMING.PORTRAIT_ENTER)

      // Phase 2: Attacker name reveal
      this.showAttackerLabel.set(true)
      await this.delay(ARENA_TIMING.ATTACKER_REVEAL)

      // Phase 3: Action verb reveal
      this.showActionVerb.set(true)
      await this.delay(ARENA_TIMING.ACTION_VERB_DISPLAY)

      // Phase 4: Brief pause for target cards to be visible (no text label needed - cards show target)
      if (arenaState.targets.length > 0) {
        await this.delay(ARENA_TIMING.TARGET_REVEAL)
      }

      // Phase 4.5: Show outcome label (HITS/MISSES/CRITICAL HIT!)
      if (arenaState.damageResult) {
        this.showOutcome.set(true)
        await this.delay(400)  // Let outcome settle before animation
      }

      // Phase 5: Play attack/spell animation
      if (arenaState.actionAnimation === 'attack' || arenaState.actionAnimation === 'breath') {
        this.attackerAnimation.set('attacking')
        await this.delay(ARENA_TIMING.ATTACK_ANIMATION)
        this.attackerAnimation.set('idle')
      } else if (arenaState.actionAnimation === 'spell') {
        this.attackerAnimation.set('casting')
        await this.delay(ARENA_TIMING.ATTACK_ANIMATION)
        this.attackerAnimation.set('idle')
      } else {
        // For parry, flee, etc. - still pause for effect
        await this.delay(ARENA_TIMING.ATTACK_ANIMATION)
      }

      // Phase 6: Anticipation pause
      await this.delay(ARENA_TIMING.RESULT_DELAY)

      // Phase 7: Damage display (floating numbers + shake)
      // Use structured damageResults if available (for group spells), otherwise fall back to parsed message
      const currentEvent = this.events()[eventIndex]
      if (currentEvent.damageResults && currentEvent.damageResults.length > 0) {
        // Sequential damage display for group spells
        await this.showSequentialDamage(currentEvent.damageResults)
      } else if (arenaState.damageResult && arenaState.targets.length > 0) {
        // Single damage fallback (attacks, single-target spells)
        this.showDamage(arenaState.damageResult.value, arenaState.damageResult.type)

        if (arenaState.damageResult.type !== 'miss') {
          this.targetAnimation.set('shaking')
          await this.delay(ARENA_TIMING.TARGET_HIT_SHAKE)
          this.targetAnimation.set('idle')
        }

        // Damage float time
        await this.delay(ARENA_TIMING.DAMAGE_FLOAT - ARENA_TIMING.TARGET_HIT_SHAKE)
      }

      // Update live stats after damage is applied (for real-time HP/count updates)
      this.updateLiveStats(currentEvent)

      // Rebuild arena state with updated stats for display
      const updatedState = this.buildArenaState(currentEvent)
      if (updatedState) {
        this.arenaState.set(updatedState)
      }

      // Phase 7.5: Show status effect indicator and banner (sleep, paralysis, etc.)
      // Use structured statusEffects data from event instead of parsing message text
      const statusEffects = currentEvent.statusEffects
      if (statusEffects && statusEffects.length > 0) {
        // Get the effect type from the first status effect
        const effectType = statusEffects[0].effect.toUpperCase()

        // Show floating status indicator on target
        this.showFloatingStatusByType(effectType)

        // Show action result banner with purple theming
        const message = this.formatStatusMessage(effectType, statusEffects.length)
        this.showActionResult(message, 2500, true)
        await this.delay(800)  // Let banner display before moving on
      }

      // Phase 7.6: Show healing celebration (banner + HP pulse effect)
      const healingResults = currentEvent.damageResults?.filter(r => r.type === 'healing')
      if (healingResults && healingResults.length > 0) {
        const totalHealing = healingResults.reduce((sum, r) => sum + r.value, 0)

        // Trigger HP pulse on healed character card
        this.healingCharacterId.set(healingResults[0].targetId)
        setTimeout(() => this.healingCharacterId.set(null), 600)

        // Show floating healing indicator
        this.showFloatingHeal(totalHealing)

        // Show green healing banner
        const message = this.formatHealingMessage(totalHealing, healingResults.length)
        this.showActionResult(message, 2500, false, 'healing')
        await this.delay(800)  // Let banner display before moving on
      }

      // Phase 7.7: Show AC buff celebration (MOGREF, KALKI, etc.)
      const acBuffs = currentEvent.acBuffs
      if (acBuffs && acBuffs.length > 0) {
        const totalAcBonus = acBuffs.reduce((sum, b) => sum + Math.abs(b.acModifier), 0)

        // Trigger shield pulse on buffed character card
        this.buffedCharacterId.set(acBuffs[0].target)
        setTimeout(() => this.buffedCharacterId.set(null), 600)

        // Show floating shield indicator
        this.showFloatingAcBuff(totalAcBonus)

        // Show steel blue banner
        const message = this.formatAcBuffMessage(totalAcBonus, acBuffs.length)
        this.showActionResult(message, 2500, false, 'acBuff')
        await this.delay(800)  // Let banner display before moving on
      }
    }

    // Phase 8: Settle before next action
    await this.delay(ARENA_TIMING.NEXT_ACTION_DELAY)
  }

  /**
   * Format outcome text for dramatic display (used in floating damage)
   */
  private formatOutcomeText(value: string, type: DamageDisplayType): string {
    switch (type) {
      case 'critical':
        return `CRITICAL! ${value}`
      case 'miss':
        return 'MISS!'
      case 'heal':
        return `+${value} HP`
      case 'status':
        return value.toUpperCase()
      default:
        return `${value} DAMAGE!`
    }
  }

  /**
   * Get outcome label text (HITS, MISSES, CRITICAL HIT!, etc.)
   * Displayed in action center between attacker name and damage
   */
  getOutcomeText(damageResult: { value: string; type: DamageDisplayType } | undefined): string {
    if (!damageResult) return ''
    switch (damageResult.type) {
      case 'miss':
        return 'MISSES'
      case 'critical':
        return 'CRITICAL HIT!'
      case 'damage':
        return 'HITS'
      case 'heal':
        return 'HEALS'
      case 'status':
        return 'INFLICTS'
      default:
        return 'HITS'
    }
  }

  // ============================================================================
  // CARD STAT HELPERS
  // ============================================================================

  /**
   * Get group color for monster badges
   */
  getGroupColor(groupId: string | undefined): string {
    const colors: Record<string, string> = {
      'A': '#ff6b6b',
      'B': '#4ecdc4',
      'C': '#ffe66d',
      'D': '#a8e6cf'
    }
    return colors[groupId ?? ''] ?? 'var(--color-gold-primary)'
  }

  /**
   * Check if HP is in warning range (25-50%)
   */
  isHpWarning(combatant: ArenaCombatant): boolean {
    if (!combatant.currentHp || !combatant.maxHp) return false
    const ratio = combatant.currentHp / combatant.maxHp
    return ratio <= 0.5 && ratio > 0.25
  }

  /**
   * Check if HP is in critical range (≤25%)
   */
  isHpCritical(combatant: ArenaCombatant): boolean {
    if (!combatant.currentHp || !combatant.maxHp) return false
    return combatant.currentHp / combatant.maxHp <= 0.25
  }

  /**
   * Get live HP for a combatant (uses signal if available)
   */
  getLiveHp(combatant: ArenaCombatant): number {
    if (combatant.type !== 'character') return 0
    return this.liveCharacterHp().get(combatant.id) ?? combatant.currentHp ?? 0
  }

  /**
   * Get live monster alive count for a group (uses signal if available)
   */
  getLiveCount(combatant: ArenaCombatant): number {
    if (combatant.type !== 'monster' || !combatant.groupId) return 0
    return this.liveMonsterCounts().get(combatant.groupId) ?? combatant.aliveCount ?? 0
  }

  /**
   * Get live monster active count (not asleep/paralyzed) for a group
   */
  getLiveActiveCount(combatant: ArenaCombatant): number {
    if (combatant.type !== 'monster' || !combatant.groupId) return 0
    return this.liveMonsterActiveCounts().get(combatant.groupId) ?? combatant.activeCount ?? this.getLiveCount(combatant)
  }

  /**
   * Check if a monster group has inactive (asleep/paralyzed) monsters
   * Returns true when activeCount < aliveCount
   */
  hasInactiveMonsters(combatant: ArenaCombatant): boolean {
    if (combatant.type !== 'monster') return false
    const activeCount = this.getLiveActiveCount(combatant)
    const aliveCount = this.getLiveCount(combatant)
    return activeCount < aliveCount
  }

  /**
   * Update live stats from combat event (called during damage phase)
   */
  private updateLiveStats(event: CombatRoundEvent): void {
    // Update character HP from event.characterUpdates
    if (event.characterUpdates) {
      const hpMap = new Map(this.liveCharacterHp())
      for (const [charId, update] of event.characterUpdates) {
        if (update.hp !== undefined) {
          hpMap.set(charId, update.hp)
        }
      }
      this.liveCharacterHp.set(hpMap)
    }

    // Update monster counts from event.monsterGroupsSnapshot
    if (event.monsterGroupsSnapshot) {
      const aliveMap = new Map(this.liveMonsterCounts())
      const activeMap = new Map(this.liveMonsterActiveCounts())
      for (const group of event.monsterGroupsSnapshot) {
        const aliveMonsters = group.monsters.filter(m => m.hp > 0)
        aliveMap.set(group.id, aliveMonsters.length)
        // Active = alive and not asleep/paralyzed
        const activeMonsters = aliveMonsters.filter(m =>
          m.status !== 'ASLEEP' && m.status !== 'PARALYZED'
        )
        activeMap.set(group.id, activeMonsters.length)
      }
      this.liveMonsterCounts.set(aliveMap)
      this.liveMonsterActiveCounts.set(activeMap)
    }
  }

  /**
   * Initialize live stats from current party/monster state
   */
  private initializeLiveStats(): void {
    // Initialize character HP
    const hpMap = new Map<string, number>()
    for (const char of this.partyCharacters()) {
      hpMap.set(char.id, char.hp)
    }
    this.liveCharacterHp.set(hpMap)

    // Initialize monster counts (alive and active)
    const aliveMap = new Map<string, number>()
    const activeMap = new Map<string, number>()
    for (const group of this.monsterGroups()) {
      const aliveMonsters = group.monsters.filter(m => m.hp > 0)
      aliveMap.set(group.id, aliveMonsters.length)
      // Active = alive and not asleep/paralyzed
      const activeMonsters = aliveMonsters.filter(m =>
        m.status !== 'ASLEEP' && m.status !== 'PARALYZED'
      )
      activeMap.set(group.id, activeMonsters.length)
    }
    this.liveMonsterCounts.set(aliveMap)
    this.liveMonsterActiveCounts.set(activeMap)
  }

  /**
   * Reset all phased reveal signals
   */
  private resetPhasedReveal(): void {
    this.showAttackerLabel.set(false)
    this.showActionVerb.set(false)
    this.showTargetLabel.set(false)
    this.showOutcome.set(false)
    this.outcomeText.set(null)
    this.outcomeType.set('damage')
  }

  // ============================================================================
  // ARENA STATE BUILDING
  // ============================================================================

  /**
   * Build arena state from combat event
   */
  private buildArenaState(event: CombatRoundEvent): ArenaState | null {
    const messages = event.messages
    if (!messages.length) return null

    const actionMsg = messages[0]
    const resultMsg = messages.find(m => m.startsWith(RESULT_MARKER))

    // Parse actor from message
    const attacker = this.parseAttackerFromMessage(actionMsg)
    if (!attacker) return null

    // Parse targets from message (returns array)
    const targets = this.parseTargetsFromMessage(actionMsg)

    // Parse spell name if this is a spell cast
    const spellName = this.parseSpellName(actionMsg)

    // Parse damage from result
    const damageResult = resultMsg
      ? parseCombatMessage(resultMsg.substring(RESULT_MARKER.length))
      : null

    // Determine action type from audit or message
    const actionType = this.inferActionType(actionMsg)

    return {
      attacker,
      targets,
      actionText: this.formatActionText(actionMsg),
      spellName,
      resultText: resultMsg ? resultMsg.substring(RESULT_MARKER.length) : undefined,
      actionAnimation: getArenaAnimation(actionType),
      damageResult: damageResult ? {
        value: damageResult.value,
        type: damageResult.type
      } : undefined
    }
  }

  /**
   * Parse attacker from action message
   */
  private parseAttackerFromMessage(message: string): ArenaCombatant | null {
    // Message format: "ActorName attacks/casts/parries..."
    const match = message.match(/^([A-Za-z\s]+?)\s+(attacks?|casts?|parries?|attempts?|advances?|breathes?|calls?|flees?|uses?)/i)
    if (!match) return null

    const name = match[1].trim()

    // Try to find in party
    const character = this.partyCharacters().find(c => c.name === name)
    if (character) {
      // Get live HP from signal if available, otherwise use character HP
      const liveHp = this.liveCharacterHp().get(character.id) ?? character.hp
      return {
        id: character.id,
        name: character.name,
        spriteUrl: SpriteService.getSpriteUrl(character),
        type: 'character',
        className: character.class,
        currentHp: liveHp,
        maxHp: character.maxHp
      }
    }

    // Try to find in monster groups
    for (const group of this.monsterGroups()) {
      const monster = group.monsters.find(m =>
        m.name === name || m.unidentifiedName === name
      )
      if (monster) {
        // Get live count from signal if available
        const liveCount = this.liveMonsterCounts().get(group.id) ??
          group.monsters.filter(m => m.hp > 0).length
        return {
          id: group.id,
          name: monster.name,
          spriteUrl: `/assets/sprites/monsters/${monster.monsterId}.png`,
          type: 'monster',
          groupId: group.id,
          aliveCount: liveCount,
          totalCount: group.monsters.length
        }
      }
    }

    // Fallback: return generic
    return {
      id: 'unknown',
      name,
      spriteUrl: '/assets/sprites/characters/human_fighter.png',
      type: 'character'
    }
  }

  /**
   * Parse targets from action message (returns array for stacked card display)
   */
  private parseTargetsFromMessage(message: string): ArenaCombatant[] {
    // Check for "all enemies" targeting - returns all groups for stacking
    if (message.toLowerCase().includes('on all enemies')) {
      return this.getAllEnemyGroups()
    }

    // Check for group targeting: "on Group A", "on Group B", etc.
    const groupMatch = message.match(/on\s+Group\s+([A-D])/i)
    if (groupMatch) {
      const groupId = groupMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D'
      const group = this.getGroupAsCombatant(groupId)
      return group ? [group] : []
    }

    // Common patterns: "attacks TargetName", "casts SPELL on TargetName"
    const patterns = [
      /attacks?\s+(.+?)(?:\s*!|$)/i,
      /on\s+(.+?)(?:\s*!|$)/i,
      /targets?\s+(.+?)(?:\s*!|$)/i
    ]

    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match) {
        const targetName = match[1].trim()
        const target = this.findCombatantByName(targetName)
        return target ? [target] : []
      }
    }

    return []
  }

  /**
   * Parse spell name from message (e.g., "casts MAHALITO" -> "MAHALITO")
   */
  private parseSpellName(message: string): string | undefined {
    const match = message.match(/casts?\s+([A-Z]+)/i)
    return match ? match[1].toUpperCase() : undefined
  }

  /**
   * Get a monster group as a single combatant for display
   * Uses the first alive monster's sprite as representative
   */
  private getGroupAsCombatant(groupId: 'A' | 'B' | 'C' | 'D'): ArenaCombatant | null {
    const group = this.monsterGroups().find(g => g.id === groupId)
    if (!group || group.monsters.length === 0) return null

    // Get first alive monster as representative
    const representative = group.monsters.find(m => m.hp > 0) || group.monsters[0]
    // Get live count from signal if available
    const liveCount = this.liveMonsterCounts().get(group.id) ??
      group.monsters.filter(m => m.hp > 0).length

    return {
      id: group.id,
      name: representative.name,  // Just the name, count shown in overlay
      spriteUrl: `/assets/sprites/monsters/${representative.monsterId}.png`,
      type: 'monster',
      groupId,
      aliveCount: liveCount,
      totalCount: group.monsters.length
    }
  }

  /**
   * Get all enemy groups as an array for stacked card display
   */
  private getAllEnemyGroups(): ArenaCombatant[] {
    const groups = this.monsterGroups()
    return groups
      .filter(group => group.monsters.some(m => m.hp > 0))
      .map(group => {
        const representative = group.monsters.find(m => m.hp > 0) || group.monsters[0]
        // Get live count from signal if available
        const liveCount = this.liveMonsterCounts().get(group.id) ??
          group.monsters.filter(m => m.hp > 0).length
        return {
          id: group.id,
          name: representative.name,  // Just the name, count shown in overlay
          spriteUrl: `/assets/sprites/monsters/${representative.monsterId}.png`,
          type: 'monster' as const,
          groupId: group.id,
          aliveCount: liveCount,
          totalCount: group.monsters.length
        }
      })
  }

  /**
   * Find combatant by name
   */
  private findCombatantByName(name: string): ArenaCombatant | null {
    // Check party
    const character = this.partyCharacters().find(c =>
      c.name.toLowerCase() === name.toLowerCase()
    )
    if (character) {
      // Get live HP from signal if available
      const liveHp = this.liveCharacterHp().get(character.id) ?? character.hp
      return {
        id: character.id,
        name: character.name,
        spriteUrl: SpriteService.getSpriteUrl(character),
        type: 'character',
        className: character.class,
        currentHp: liveHp,
        maxHp: character.maxHp
      }
    }

    // Check monsters
    for (const group of this.monsterGroups()) {
      const monster = group.monsters.find(m =>
        m.name.toLowerCase() === name.toLowerCase() ||
        m.unidentifiedName.toLowerCase() === name.toLowerCase()
      )
      if (monster) {
        // Get live count from signal if available
        const liveCount = this.liveMonsterCounts().get(group.id) ??
          group.monsters.filter(m => m.hp > 0).length
        return {
          id: group.id,
          name: monster.name,
          spriteUrl: `/assets/sprites/monsters/${monster.monsterId}.png`,
          type: 'monster',
          groupId: group.id,
          aliveCount: liveCount,
          totalCount: group.monsters.length
        }
      }
    }

    return null
  }

  /**
   * Infer action type from message
   */
  private inferActionType(message: string): CombatActionType {
    const lower = message.toLowerCase()
    if (lower.includes('attacks')) return 'ATTACK'
    if (lower.includes('casts')) return 'CAST_SPELL'
    if (lower.includes('parries') || lower.includes('parrying')) return 'PARRY'
    if (lower.includes('flee') || lower.includes('run')) return 'RUN'
    if (lower.includes('dispel')) return 'DISPEL'
    if (lower.includes('advances')) return 'ADVANCE'
    if (lower.includes('breathes')) return 'BREATH'
    if (lower.includes('calls for help')) return 'CALL_FOR_HELP'
    return 'ATTACK'
  }

  /**
   * Format action text for display
   */
  private formatActionText(message: string): string {
    // Remove result marker if present
    return message.startsWith(RESULT_MARKER) ? message.substring(RESULT_MARKER.length) : message
  }

  // ============================================================================
  // SPRITE HELPERS
  // ============================================================================

  /**
   * Get character sprite URL
   */
  private getCharacterSpriteUrl(characterId: string): string {
    const character = this.partyCharacters().find(c => c.id === characterId)
    if (!character) return '/assets/sprites/characters/human_fighter.png'
    return SpriteService.getSpriteUrl(character)
  }

  /**
   * Get monster sprite URL
   */
  private getMonsterSpriteUrl(actorId: string): string {
    // actorId for monsters is usually the monster name, need to find monsterId
    for (const group of this.monsterGroups()) {
      for (const monster of group.monsters) {
        if (monster.id === actorId || monster.name === actorId) {
          return `/assets/sprites/monsters/${monster.monsterId}.png`
        }
      }
    }
    return '/assets/sprites/monsters/unknown.png'
  }

  /**
   * Get monster group ID from actor ID
   */
  private getMonsterGroupId(actorId: string): 'A' | 'B' | 'C' | 'D' | undefined {
    for (const group of this.monsterGroups()) {
      for (const monster of group.monsters) {
        if (monster.id === actorId || monster.name === actorId) {
          return group.id
        }
      }
    }
    return undefined
  }

  // ============================================================================
  // DAMAGE DISPLAY
  // ============================================================================

  /** Delay between sequential damage numbers (ms) */
  private readonly SEQUENTIAL_DAMAGE_DELAY = 400

  /**
   * Show floating damage
   */
  private showDamage(value: string, type: DamageType): void {
    // Skip floating damage for misses - outcome label already shows "MISSES"
    if (type === 'miss') return

    // Position over target area (right side)
    const entry = createFloatingDamage(value, type, 75, 40)
    this.damageEntries.update(entries => [...entries, entry])
  }

  /**
   * Show floating status effect indicator by effect type
   * Uses dramatic text for consistent cross-platform rendering
   */
  private showFloatingStatusByType(effectType: string): void {
    const displayTextMap: Record<string, string> = {
      'ASLEEP': 'SLEEP!',
      'PARALYZED': 'PARALYZED!',
      'POISONED': 'POISONED!',
      'STONED': 'STONED!',
      'SILENCED': 'SILENCED!',
      'BLIND': 'BLINDED!'
    }
    const displayText = displayTextMap[effectType] || 'AFFLICTED!'

    // Position over target area (right side, slightly higher than damage)
    const entry = createFloatingDamage(displayText, 'status', 75, 35)
    this.damageEntries.update(entries => [...entries, entry])
  }

  /**
   * Format a status effect message for the action result banner
   */
  private formatStatusMessage(effectType: string, count: number): string {
    const effectNames: Record<string, string> = {
      'ASLEEP': 'asleep',
      'PARALYZED': 'paralyzed',
      'SILENCED': 'silenced',
      'BLIND': 'blinded',
      'POISONED': 'poisoned',
      'STONED': 'stoned'
    }
    const effectName = effectNames[effectType] || effectType.toLowerCase()
    return `${count} monster${count > 1 ? 's' : ''} ${effectName}!`
  }

  /**
   * Show floating healing indicator with dramatic presentation
   */
  private showFloatingHeal(totalHealing: number): void {
    // Position over target area (left side for party characters)
    const entry = createFloatingDamage(`+${totalHealing} HP`, 'heal', 25, 35)
    this.damageEntries.update(entries => [...entries, entry])
  }

  /**
   * Format a healing message for the action result banner
   */
  private formatHealingMessage(total: number, targetCount: number): string {
    if (targetCount === 1) {
      return `HEALED +${total} HP!`
    }
    return `HEALED ${targetCount} ALLIES +${total} HP!`
  }

  /**
   * Show floating AC buff indicator with dramatic presentation
   */
  private showFloatingAcBuff(acBonus: number): void {
    // Position over caster area (left side for party characters casting on self)
    const entry = createFloatingDamage('SHIELDED!', 'buff', 25, 35)
    this.damageEntries.update(entries => [...entries, entry])
  }

  /**
   * Format an AC buff message for the action result banner
   */
  private formatAcBuffMessage(totalBonus: number, targetCount: number): string {
    if (targetCount === 1) {
      return `DEFENSES STRENGTHENED! AC -${totalBonus}`
    }
    return `PARTY SHIELDED! AC -${totalBonus}`
  }

  /**
   * Display sequential damage numbers for group spells
   * Each damage number appears staggered with a shake effect
   *
   * Visual timeline for 3 targets:
   * t=0ms:     [12] appears, shake
   * t=400ms:   [8] appears, shake
   * t=800ms:   [15] appears, shake
   * t=1600ms:  all numbers floating/fading
   */
  private async showSequentialDamage(damageResults: DamageResult[]): Promise<void> {
    for (let i = 0; i < damageResults.length; i++) {
      const result = damageResults[i]

      // Position damage numbers staggered horizontally for stacked cards
      // Single target: centered at 75%
      // Multiple targets: offset based on stack position
      const xOffset = damageResults.length > 1
        ? 60 + (i * 12)  // Stagger right for stacked cards
        : 75              // Center for single target
      const yOffset = damageResults.length > 1
        ? 35 + (i * 6)   // Stagger down slightly
        : 40              // Default position

      // Convert DamageResult type to DamageType for floating damage
      const damageType: DamageType = result.category === 'critical'
        ? 'critical'
        : result.category === 'miss'
          ? 'miss'
          : result.type === 'healing'
            ? 'heal'
            : 'damage'

      // Skip floating damage for misses - outcome label already shows "MISSES"
      if (damageType === 'miss') continue

      // Show this damage number
      const entry = createFloatingDamage(String(result.value), damageType, xOffset, yOffset)
      this.damageEntries.update(entries => [...entries, entry])

      // Shake effect per hit
      this.targetAnimation.set('shaking')
      await this.delay(150)
      this.targetAnimation.set('idle')

      // Wait before next damage (except for last)
      if (i < damageResults.length - 1) {
        await this.delay(this.SEQUENTIAL_DAMAGE_DELAY - 150)
      }
    }

    // Final float time for all damage numbers to fade
    await this.delay(ARENA_TIMING.DAMAGE_FLOAT - 150)
  }

  /**
   * Handle damage animation complete
   */
  onDamageComplete(entryId: string): void {
    this.damageEntries.update(entries =>
      entries.filter(e => e.id !== entryId)
    )
  }

  // ============================================================================
  // TEMPLATE HELPERS
  // ============================================================================

  /**
   * Get dramatic action verb for center display (ATTACKS, CASTS, etc.)
   */
  getActionVerbDisplay(animation: ArenaAnimation): string {
    return getActionVerbDisplay(animation)
  }

  /**
   * Handle sprite error
   */
  onSpriteError(spriteUrl: string): void {
    this.spriteErrors.update(errors => new Set(errors).add(spriteUrl))
  }

  /**
   * Check if sprite has error
   */
  hasSpriteError(spriteUrl: string): boolean {
    return this.spriteErrors().has(spriteUrl)
  }

  /**
   * Get fallback initial for sprite
   */
  getSpriteInitial(name: string): string {
    return name.charAt(0).toUpperCase()
  }

  // ============================================================================
  // ACTION RESULT BANNER
  // ============================================================================

  /**
   * Show action result message with auto-clear
   * @param message Message to display (e.g., "2 BUBBLY SLIMES fall asleep!")
   * @param duration Duration in ms before auto-clear (default 2000ms)
   * @param isStatusEffect Whether this is a status effect message (uses purple theming)
   * @param variant Optional variant for different effect types ('healing' for green, 'acBuff' for steel blue)
   */
  showActionResult(message: string, duration = 2000, isStatusEffect = false, variant?: 'healing' | 'acBuff'): void {
    this.actionResultMessage.set(message)
    this.isStatusEffectMessage.set(isStatusEffect)
    this.isHealingMessage.set(variant === 'healing')
    this.isAcBuffMessage.set(variant === 'acBuff')
    setTimeout(() => {
      this.actionResultMessage.set(null)
      this.isStatusEffectMessage.set(false)
      this.isHealingMessage.set(false)
      this.isAcBuffMessage.set(false)
    }, duration)
  }

  /**
   * Clear action result message immediately
   */
  clearActionResult(): void {
    this.actionResultMessage.set(null)
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Promisified delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
