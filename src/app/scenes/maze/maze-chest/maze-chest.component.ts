/**
 * MazeChestComponent - Handles chest interaction rendering
 *
 * Extracted from MazeComponent to handle:
 * - Chest overlay rendering
 * - Chest action coordination (open, inspect, calfo, disarm)
 * - Trap visualization
 *
 * Uses ChestFlowController for state management.
 */

import { Component, computed, inject, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { ChestOverlayComponent } from '@shared/components/chest-overlay/chest-overlay.component'

import { Character } from '@models/Character'
import { ChestFlowController } from '@services/ChestFlowController'

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
  // Injected services
  private chestFlow = inject(ChestFlowController)

  // Inputs
  partyCharacters = input.required<Character[]>()

  // Outputs
  characterSelected = output<number>()
  casterSelected = output<number>()

  // Chest state from ChestFlowController (computed proxies)
  readonly chestPhase = computed(() => this.chestFlow.chestPhase())
  readonly chestLetterboxType = computed(() => this.chestFlow.chestLetterboxType())
  readonly pendingChest = computed(() => this.chestFlow.pendingChest())
  readonly chestSprite = computed(() => this.chestFlow.chestSprite())
  readonly chestOpener = computed(() => this.chestFlow.chestOpener())
  readonly chestCaster = computed(() => this.chestFlow.chestCaster())
  readonly scrambledTrapState = computed(() => this.chestFlow.scrambledTrapState())
  readonly chestTrapInput = computed(() => this.chestFlow.chestTrapInput())
  readonly chestSummary = computed(() => this.chestFlow.chestSummary())
  readonly chestLastMessage = computed(() => this.chestFlow.chestLastMessage())
  readonly chestInventoryWarning = computed(() => this.chestFlow.chestInventoryWarning())
  readonly preSelectedRecipient = computed(() => this.chestFlow.preSelectedRecipient())
  readonly pendingTrapInfo = computed(() => this.chestFlow.pendingTrapInfo())

  // Trap effect visualization state
  readonly trapLetterboxName = computed(() => this.chestFlow.trapLetterboxName())
  readonly hitCharacterIds = computed(() => this.chestFlow.hitCharacterIds())
  readonly currentDamageIndicator = computed(() => this.chestFlow.currentDamageIndicator())

  // Computed chest state
  readonly showChestOverlay = computed(() => this.chestFlow.showChestOverlay())
  readonly calfoEligibleCasters = computed(() => this.chestFlow.getCalfoEligibleCasters())
  readonly recommendedChestHandler = computed(() => this.chestFlow.getRecommendedHandler())
  readonly chestInspectChance = computed(() => this.chestFlow.chestInspectChance())
  readonly chestDisarmChance = computed(() => this.chestFlow.chestDisarmChance())

  // ============================================================
  // CHEST ACTIONS
  // ============================================================

  onChestCharacterSelected(index: number): void {
    this.chestFlow.onCharacterSelected(index)
    this.characterSelected.emit(index)
  }

  onChestCasterSelected(index: number): void {
    this.chestFlow.onCasterSelected(index)
    this.casterSelected.emit(index)
  }
}
