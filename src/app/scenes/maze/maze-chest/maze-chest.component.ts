/**
 * MazeChestComponent - Pure presenter for chest interaction rendering
 *
 * Extracted from MazeComponent to handle:
 * - Chest overlay rendering
 * - Chest action coordination (open, inspect, calfo, disarm)
 * - Trap visualization
 *
 * Uses MazeStateStore for state and ChestOrchestrator for actions.
 */

import { Component, computed, inject, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { ChestOverlayComponent } from '@shared/components/chest-overlay/chest-overlay.component'

import { Character } from '@models/Character'
import { MazeStateStore } from '@services/MazeStateStore'
import { ChestOrchestrator } from '@services/ChestOrchestrator'

@Component({
  selector: 'app-maze-chest',
  standalone: true,
  imports: [
    CommonModule,
    ChestOverlayComponent
  ],
  template: `
    <!-- Chest Overlay (Theater Stage) -->
    <app-chest-overlay
      [visible]="showChestOverlay()"
      [phase]="chestPhase()"
      [chest]="pendingChest()"
      [spriteState]="chestSprite()"
      [scrambledState]="scrambledTrapState()"
      [trapInput]="chestTrapInput()"
      [summary]="chestSummary()"
      [availableCharacters]="partyCharacters()"
      [calfoEligibleCasters]="calfoEligibleCasters()"
      [selectedOpener]="chestOpener()"
      [lastMessage]="chestLastMessage()"
      [recommendedHandler]="recommendedChestHandler()"
      [inventoryWarning]="chestInventoryWarning()"
      [letterboxType]="chestLetterboxType()"
      [inspectChance]="chestInspectChance()"
      [disarmChance]="chestDisarmChance()"
      [trapLetterboxName]="trapLetterboxName()"
      (characterSelected)="onChestCharacterSelected($event)"
      (casterSelected)="onChestCasterSelected($event)"
    />
  `
})
export class MazeChestComponent {
  // Injected services - MazeStateStore for state, ChestOrchestrator for actions
  private stateStore = inject(MazeStateStore)
  private chestOrch = inject(ChestOrchestrator)

  // Inputs
  partyCharacters = input.required<Character[]>()

  // Outputs
  characterSelected = output<number>()
  casterSelected = output<number>()

  // Chest state from MazeStateStore (computed proxies)
  readonly chestPhase = computed(() => this.stateStore.chestPhase())
  readonly chestLetterboxType = computed(() => this.stateStore.chestLetterboxType())
  readonly pendingChest = computed(() => this.stateStore.pendingChest())
  readonly chestSprite = computed(() => this.stateStore.chestSprite())
  readonly chestOpener = computed(() => this.stateStore.chestOpener())
  readonly chestCaster = computed(() => this.stateStore.chestCaster())
  readonly scrambledTrapState = computed(() => this.stateStore.scrambledTrapState())
  readonly chestTrapInput = computed(() => this.stateStore.chestTrapInput())
  readonly chestSummary = computed(() => this.stateStore.chestSummary())
  readonly chestLastMessage = computed(() => this.stateStore.chestLastMessage())
  readonly chestInventoryWarning = computed(() => this.stateStore.chestInventoryWarning())
  readonly preSelectedRecipient = computed(() => this.stateStore.preSelectedRecipient())
  readonly pendingTrapInfo = computed(() => this.stateStore.pendingTrapInfo())

  // Trap effect visualization state
  readonly trapLetterboxName = computed(() => this.stateStore.trapLetterboxName())
  readonly hitCharacterIds = computed(() => this.stateStore.hitCharacterIds())
  readonly currentDamageIndicator = computed(() => this.stateStore.currentDamageIndicator())

  // Computed chest state
  readonly showChestOverlay = computed(() => this.stateStore.showChestOverlay())
  readonly calfoEligibleCasters = computed(() => this.chestOrch.getCalfoEligibleCasters())
  readonly recommendedChestHandler = computed(() => this.chestOrch.getRecommendedHandler())
  readonly chestInspectChance = computed(() => {
    const opener = this.stateStore.chestOpener()
    if (!opener) return 0
    return this.chestOrch.getInspectChance(opener)
  })
  readonly chestDisarmChance = computed(() => {
    const opener = this.stateStore.chestOpener()
    const chest = this.stateStore.pendingChest()
    if (!opener || !chest) return 0
    return this.chestOrch.getDisarmChance(opener, chest.mazeLevel)
  })

  // ============================================================
  // CHEST ACTIONS - delegate to ChestOrchestrator
  // ============================================================

  onChestCharacterSelected(index: number): void {
    this.chestOrch.onCharacterSelected(index)
    this.characterSelected.emit(index)
  }

  onChestCasterSelected(index: number): void {
    this.chestOrch.onCasterSelected(index)
    this.casterSelected.emit(index)
  }
}
