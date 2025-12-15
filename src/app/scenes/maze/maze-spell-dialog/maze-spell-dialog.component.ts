/**
 * MazeSpellDialogComponent - Spell casting dialog wrapper
 *
 * Manages the spell selection and target selection flow:
 * 1. Shows spell panel when caster is selected
 * 2. Shows target dialog when spell needs a target
 * 3. Emits events for spell casting completion
 */

import { Component, computed, inject, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { SpellPanelComponent } from '@shared/components/spell-panel/spell-panel.component'
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component'

import { Character } from '@models/Character'
import { SpellData } from '@services/SpellCastingService'

export type SpellContext = 'dungeon' | 'combat'

@Component({
  selector: 'app-maze-spell-dialog',
  standalone: true,
  imports: [
    CommonModule,
    SpellPanelComponent,
    CharacterSelectionDialogComponent
  ],
  template: `
    <!-- Spell Selection Panel -->
    @if (selectedCaster()) {
      <app-spell-panel
        [visible]="showSpellPanel()"
        [character]="selectedCaster()!"
        [mode]="'casting'"
        [context]="context()"
        [title]="'SELECT SPELL'"
        (spellSelected)="onSpellSelected($event)"
        (closed)="onSpellPanelClosed()"
      />
    }

    <!-- Character Target Selection Dialog -->
    <app-character-selection-dialog
      [visible]="showTargetDialog()"
      [characters]="targetOptions()"
      [prompt]="'SELECT TARGET'"
      (characterSelected)="onTargetSelected($event)"
      (cancelled)="onTargetDialogCancelled()"
    />
  `
})
export class MazeSpellDialogComponent {
  // Inputs
  showSpellPanel = input.required<boolean>()
  showTargetDialog = input.required<boolean>()
  selectedCaster = input.required<Character | null>()
  targetOptions = input.required<CharacterOption[]>()
  context = input<SpellContext>('dungeon')

  // Outputs
  spellSelected = output<SpellData>()
  spellPanelClosed = output<void>()
  targetSelected = output<Character>()
  targetDialogCancelled = output<void>()

  onSpellSelected(spell: SpellData): void {
    this.spellSelected.emit(spell)
  }

  onSpellPanelClosed(): void {
    this.spellPanelClosed.emit()
  }

  onTargetSelected(target: Character): void {
    this.targetSelected.emit(target)
  }

  onTargetDialogCancelled(): void {
    this.targetDialogCancelled.emit()
  }
}
