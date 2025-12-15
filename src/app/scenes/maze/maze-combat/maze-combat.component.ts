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
import { MazeStateStore } from '@services/MazeStateStore'
import { CombatOrchestrator } from '@services/CombatOrchestrator'

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
  private stateStore = inject(MazeStateStore)
  private combatOrch = inject(CombatOrchestrator)

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

  // Combat state from MazeStateStore (computed proxies)
  readonly combatPhase = computed(() => this.stateStore.combatPhase())
  readonly letterboxType = computed(() => this.stateStore.combatLetterboxType())
  readonly selectedTargetGroupId = computed(() => this.stateStore.selectedTargetGroupId())
  readonly isTargetingMode = computed(() => this.stateStore.isTargetingMode())
  readonly victoryRewards = computed(() => this.stateStore.victoryRewards())
  readonly combatIntroActive = computed(() => this.stateStore.combatIntroActive())
  readonly showCinematicArena = computed(() => this.stateStore.showCinematicArena())
  readonly arenaEvents = computed(() => this.stateStore.arenaEvents())
  readonly arenaAudit = computed(() => this.stateStore.arenaAudit())

  // Combat state from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly inCombat = computed(() => !!this.combatState())
  readonly monsterGroups = computed((): MonsterGroup[] => this.combatState()?.monsterGroups ?? [])
  readonly combatRoundNumber = computed(() => this.combatState()?.roundNumber ?? 1)

  // Computed state
  readonly showMonsterCards = computed(() =>
    this.inCombat() && !this.combatIntroActive() && !this.showCinematicArena()
  )

  // Event handler - delegates to CombatOrchestrator
  onGroupClicked(groupId: 'A' | 'B' | 'C' | 'D'): void {
    this.combatOrch.onCombatGroupClicked(groupId)
    this.groupClicked.emit(groupId)
  }
}
