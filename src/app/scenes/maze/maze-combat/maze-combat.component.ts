/**
 * MazeCombatComponent - Pure presenter for combat mode rendering
 *
 * Renders combat overlays and emits events to parent for handling.
 * All combat logic remains in MazeComponent.
 */

import { Component, computed, inject, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { CombatOverlayComponent } from '@shared/components/combat-overlay/combat-overlay.component'
import { CinematicArenaComponent } from '@shared/components/cinematic-arena/cinematic-arena.component'

import { Character } from '@models/Character'
import { MonsterGroup, CombatRoundEvent } from '@models/Combat'
import { GameStateService } from '@services/GameStateService'
import { CombatFlowController } from '@services/CombatFlowController'

@Component({
  selector: 'app-maze-combat',
  standalone: true,
  imports: [
    CommonModule,
    CombatOverlayComponent,
    CinematicArenaComponent
  ],
  template: `
    <!-- Combat Overlay (Theater Stage) -->
    <app-combat-overlay
      [visible]="inCombat()"
      [monsterGroups]="monsterGroups()"
      [roundNumber]="combatRoundNumber()"
      [selectedGroupId]="selectedTargetGroupId()"
      [isTargetingMode]="isTargetingMode()"
      [letterboxType]="letterboxType()"
      [showVictoryOverlay]="combatPhase() === 'victory'"
      [showDefeatOverlay]="combatPhase() === 'defeat'"
      [victoryRewards]="victoryRewards()"
      [partyCharacters]="partyCharacters()"
      [showMonsterCards]="showMonsterCards()"
      (groupClicked)="onGroupClicked($event)"
    />

    <!-- Cinematic Arena (FFX-style combat round playback) -->
    @if (showCinematicArena()) {
      <app-cinematic-arena
        [visible]="showCinematicArena()"
        [events]="arenaEvents()"
        [audit]="arenaAudit()"
        [partyCharacters]="partyCharacters()"
        [monsterGroups]="monsterGroups()"
        (playbackComplete)="arenaPlaybackComplete.emit()"
        (eventPlayed)="arenaEventPlayed.emit($event)"
      />
    }
  `
})
export class MazeCombatComponent {
  // Injected services for state access
  private gameState = inject(GameStateService)
  private combatFlow = inject(CombatFlowController)

  // Inputs
  partyCharacters = input.required<Character[]>()
  dungeonLevel = input<number>(1)
  dungeonPosition = input<{ x: number; y: number } | null>(null)

  // Outputs - all events bubble to parent
  messageAdded = output<string>()
  combatEnded = output<void>()
  arenaPlaybackComplete = output<void>()
  arenaEventPlayed = output<CombatRoundEvent>()
  groupClicked = output<'A' | 'B' | 'C' | 'D'>()

  // Combat state from CombatFlowController (computed proxies)
  readonly combatPhase = computed(() => this.combatFlow.combatPhase())
  readonly letterboxType = computed(() => this.combatFlow.letterboxType())
  readonly selectedTargetGroupId = computed(() => this.combatFlow.selectedTargetGroupId())
  readonly isTargetingMode = computed(() => this.combatFlow.isTargetingMode())
  readonly victoryRewards = computed(() => this.combatFlow.victoryRewards())
  readonly combatIntroActive = computed(() => this.combatFlow.combatIntroActive())
  readonly showCinematicArena = computed(() => this.combatFlow.showCinematicArena())
  readonly arenaEvents = computed(() => this.combatFlow.arenaEvents())
  readonly arenaAudit = computed(() => this.combatFlow.arenaAudit())

  // Combat state from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly inCombat = computed(() => !!this.combatState())
  readonly monsterGroups = computed((): MonsterGroup[] => this.combatState()?.monsterGroups ?? [])
  readonly combatRoundNumber = computed(() => this.combatState()?.roundNumber ?? 1)

  // Computed state
  readonly showMonsterCards = computed(() =>
    this.inCombat() && !this.combatIntroActive() && !this.showCinematicArena()
  )

  // Event handler - delegates to shared CombatFlowController
  onGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    this.combatFlow.onCombatGroupClicked(groupId)
    this.groupClicked.emit(groupId)
  }
}
