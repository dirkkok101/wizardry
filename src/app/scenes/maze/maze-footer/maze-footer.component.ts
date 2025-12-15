/**
 * MazeFooterComponent - Dynamic footer menu for maze scene
 *
 * Displays different menu configurations based on game state:
 * - Navigation mode: Movement, Search, Camp, Leave
 * - Combat mode: Start Round, Flee, Reset
 * - Targeting mode: Group selection, Cancel
 * - Chest mode: Leave button only
 */

import { Component, computed, input, output } from '@angular/core'
import { CommonModule } from '@angular/common'

import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component'
import { MenuItem } from '@shared/components/menu/menu.component'

export type FooterMode = 'navigation' | 'combat' | 'targeting' | 'chest' | 'hidden'

@Component({
  selector: 'app-maze-footer',
  standalone: true,
  imports: [CommonModule, SceneFooterComponent],
  template: `
    @switch (mode()) {
      @case ('navigation') {
        <app-scene-footer
          [menuItems]="navigationMenuItems()"
          (itemSelected)="onNavigationAction($event)"
        />
      }
      @case ('combat') {
        <app-scene-footer
          [menuItems]="combatMenuItems()"
          (itemSelected)="onCombatAction($event)"
        />
      }
      @case ('targeting') {
        <app-scene-footer
          [menuItems]="targetingMenuItems()"
          (itemSelected)="onTargetingAction($event)"
        />
      }
      @case ('chest') {
        <app-scene-footer
          [menuItems]="chestMenuItems()"
          (itemSelected)="onChestAction($event)"
        />
      }
    }
  `
})
export class MazeFooterComponent {
  // Inputs
  mode = input.required<FooterMode>()
  navigationMenuItems = input.required<MenuItem[]>()
  combatMenuItems = input.required<MenuItem[]>()
  targetingMenuItems = input.required<MenuItem[]>()
  chestMenuItems = input.required<MenuItem[]>()

  // Outputs
  navigationAction = output<string>()
  combatAction = output<string>()
  targetingAction = output<string>()
  chestAction = output<string>()

  onNavigationAction(itemId: string): void {
    this.navigationAction.emit(itemId)
  }

  onCombatAction(itemId: string): void {
    this.combatAction.emit(itemId)
  }

  onTargetingAction(itemId: string): void {
    this.targetingAction.emit(itemId)
  }

  onChestAction(itemId: string): void {
    this.chestAction.emit(itemId)
  }
}
