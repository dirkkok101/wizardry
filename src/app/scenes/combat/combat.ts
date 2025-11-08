// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant } from '../../../types/Combat'
import { Character } from '../../../types/Character'

interface SelectedAction {
  characterId: string
  command: CombatCommand
}

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.html',
  styleUrls: ['./combat.scss']
})
export class CombatComponent implements OnInit {
  // Computed from GameStateService
  readonly combatState = computed(() => this.gameState.state().combat)
  readonly party = computed(() => this.gameState.state().party)
  readonly roster = computed(() => this.gameState.state().roster)

  // Local UI state
  readonly selectedActions = signal<Map<string, CombatCommand>>(new Map())
  readonly isExecutingRound = signal<boolean>(false)

  // Computed party characters
  readonly partyCharacters = computed(() => {
    const members = this.party().members
    const roster = this.roster()
    return members
      .map(id => roster.get(id))
      .filter((char): char is Character => char !== undefined)
  })

  readonly monsters = computed(() => {
    const combat = this.combatState()
    return combat?.monsters || []
  })

  readonly combatLog = computed(() => {
    const combat = this.combatState()
    return combat?.combatLog || []
  })

  readonly roundNumber = computed(() => {
    const combat = this.combatState()
    return combat?.roundNumber || 1
  })

  readonly allActionsSelected = computed(() => {
    const chars = this.partyCharacters()
    const actions = this.selectedActions()

    // All alive characters must have selected an action
    return chars
      .filter(c => c.hp > 0)
      .every(c => actions.has(c.id))
  })

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.COMBAT
    }))
  }

  selectAction(characterId: string, actionType: string, target?: Combatant): void {
    // TODO: Implement in next task
  }

  executeRound(): void {
    // TODO: Implement in next task
  }

  returnToMaze(): void {
    // TODO: Implement in next task
  }
}
