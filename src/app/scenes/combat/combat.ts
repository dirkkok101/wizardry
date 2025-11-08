// src/app/scenes/combat/combat.ts
import { Component, computed, signal, OnInit, HostListener } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../../services/GameStateService'
import { CombatService } from '../../../services/CombatService'
import { VictoryService, VictoryRewards } from '../../../services/VictoryService'
import { SceneType } from '../../../types/SceneType'
import { CombatState, CombatCommand, Combatant, CombatActionType } from '../../../types/Combat'
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
  readonly showVictoryModal = signal<boolean>(false)
  readonly victoryRewards = signal<VictoryRewards | null>(null)
  readonly showDefeatModal = signal<boolean>(false)

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
    const character = this.roster().get(characterId)
    if (!character) return

    // Create combat command using CombatService
    const command = CombatService.createCommand(
      character,
      actionType as CombatActionType,
      target
    )

    // Update selected actions (immutable)
    this.selectedActions.update(actions => {
      const newActions = new Map(actions)
      newActions.set(characterId, command)
      return newActions
    })
  }

  executeRound(): void {
    const combat = this.combatState()
    if (!combat) return

    const chars = this.partyCharacters()
    const actions = this.selectedActions()

    // Create party commands from selected actions
    const partyCommands = Array.from(actions.values())

    // Create monster commands using AI
    const aliveMonsters = combat.monsters.filter(m => m.hp > 0 && m.status !== 'DEAD')
    const frontRow = this.party().formation.frontRow
    const monsterCommands = aliveMonsters.map(m =>
      CombatService.selectMonsterAction(m, chars, frontRow)
    )

    // Update combat state with all commands
    const stateWithCommands: CombatState = {
      ...combat,
      commandQueue: [...partyCommands, ...monsterCommands]
    }

    // Execute round
    this.isExecutingRound.set(true)
    const result = CombatService.executeRound(stateWithCommands)

    // Update game state with result
    this.gameState.updateState(state => {
      // Update combat state
      const newState = {
        ...state,
        combat: result.newState
      }

      // Update combat log
      const updatedCombat = {
        ...result.newState,
        combatLog: [...result.newState.combatLog, ...result.messages]
      }

      return {
        ...newState,
        combat: updatedCombat
      }
    })

    // Clear selected actions
    this.selectedActions.set(new Map())
    this.isExecutingRound.set(false)

    // Check for victory or defeat
    if (result.victory) {
      this.handleVictory()
    } else if (result.defeat) {
      this.handleDefeat()
    }
  }

  private handleVictory(): void {
    const combat = this.combatState()
    if (!combat) return

    const party = this.party()
    const partySize = party.members.length

    // Calculate rewards
    const rewards = VictoryService.calculateVictoryRewards(combat.monsters, partySize)

    // Distribute rewards to roster
    const newRoster = VictoryService.distributeRewards(
      this.roster(),
      party.members,
      rewards.xpPerCharacter,
      rewards.totalGold
    )

    // Update game state
    this.gameState.updateState(state => ({
      ...state,
      roster: newRoster,
      party: {
        ...state.party,
        gold: state.party.gold + rewards.totalGold
      },
      combat: undefined  // Clear combat state
    }))

    // Show victory modal
    this.victoryRewards.set(rewards)
    this.showVictoryModal.set(true)
  }

  private handleDefeat(): void {
    // Clear combat state
    this.gameState.updateState(state => ({
      ...state,
      combat: undefined
    }))

    // Show defeat modal
    this.showDefeatModal.set(true)
  }

  returnToMaze(): void {
    this.showVictoryModal.set(false)
    this.router.navigate(['/maze'])
  }

  returnToTemple(): void {
    this.showDefeatModal.set(false)
    this.router.navigate(['/temple'])
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyPress(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()

    // Victory modal - Enter to return
    if (this.showVictoryModal() && key === 'enter') {
      this.returnToMaze()
      event.preventDefault()
      return
    }

    // Defeat modal - Enter to go to temple
    if (this.showDefeatModal() && key === 'enter') {
      this.returnToTemple()
      event.preventDefault()
      return
    }

    // Execute round - Enter when all actions selected
    if (key === 'enter' && this.allActionsSelected() && !this.isExecutingRound()) {
      this.executeRound()
      event.preventDefault()
      return
    }
  }
}
