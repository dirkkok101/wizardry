// Minimal combat component stub
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
  executeRound(): void {
    // TODO: Integrate with CombatService.executeRound()
    this.combatLog.update(log => [...log, `Round ${this.roundNumber()} executed`])
    this.roundNumber.update(n => n + 1)
  }
}
