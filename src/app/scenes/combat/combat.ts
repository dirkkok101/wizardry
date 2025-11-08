// Minimal combat component stub
// NOTE: Full UI integration (Tasks 18-20 from implementation plan) requires:
// - GameStateService (not yet implemented)
// - EncounterService (not yet implemented)
// - Router integration with maze scene
// - Victory/defeat handling with XP/gold distribution
//
// This stub demonstrates the integration points. The combat SERVICE LAYER
// (MonsterService, CombatService, SpellCastingService) is complete and tested.

import { Component, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent {
  // Stub - demonstrates integration points
  readonly combatLog = signal<string[]>(['Combat system initialized'])
  readonly roundNumber = signal<number>(1)

  // Placeholder methods for service integration
  // TODO (Task 18): Add GameStateService integration
  // TODO (Task 19): Implement executeRound() with CombatService.executeRound()
  // TODO (Task 20): Add victory handling, XP/gold distribution
  executeRound(): void {
    this.combatLog.update(log => [...log, `Round ${this.roundNumber()} executed`])
    this.roundNumber.update(n => n + 1)
  }
}
