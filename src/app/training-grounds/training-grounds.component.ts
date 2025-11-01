import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../services/GameStateService'
import { CharacterCreationService, RolledStats, BaseStats } from '../../services/CharacterCreationService'
import { CharacterService } from '../../services/CharacterService'
import { SceneType } from '../../types/SceneType'
import { Race, RACE_MODIFIERS, RaceModifiers } from '../../types/Race'
import { Alignment } from '../../types/Alignment'
import { CharacterClass } from '../../types/CharacterClass'

export type WizardStep =
  | 'RACE'
  | 'ALIGNMENT'
  | 'STATS'
  | 'BONUS_POINTS'
  | 'CLASS'
  | 'NAME_PASSWORD'
  | 'CONFIRM'

export interface WizardState {
  selectedRace: Race | null
  selectedAlignment: Alignment | null
  rolledStats: RolledStats | null
  selectedClass: CharacterClass | null
  name: string
  password: string
}

/**
 * Training Grounds Component
 *
 * Character creation wizard with 7 steps:
 * 1. Race selection (Human, Elf, Dwarf, Gnome, Hobbit)
 * 2. Alignment selection (Good, Neutral, Evil)
 * 3. Stat rolling (3d6 per attribute + bonus points)
 * 4. Bonus point allocation
 * 5. Class selection (based on stat requirements)
 * 6. Name and password entry
 * 7. Confirmation
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  // Wizard state
  readonly currentStep = signal<WizardStep>('RACE')
  readonly wizardState = signal<WizardState>({
    selectedRace: null,
    selectedAlignment: null,
    rolledStats: null,
    selectedClass: null,
    name: '',
    password: ''
  })

  // Error and success messages
  readonly errorMessage = signal<string | null>(null)
  readonly successMessage = signal<string | null>(null)

  // Step sequence for navigation
  private readonly stepSequence: WizardStep[] = [
    'RACE',
    'ALIGNMENT',
    'STATS',
    'BONUS_POINTS',
    'CLASS',
    'NAME_PASSWORD',
    'CONFIRM'
  ]

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }))
  }

  /**
   * Select race and advance to alignment step
   */
  selectRace(race: Race): void {
    this.wizardState.update(state => ({
      ...state,
      selectedRace: race
    }))
    this.nextStep()
  }

  /**
   * Select alignment and advance to stats step
   */
  selectAlignment(alignment: Alignment): void {
    this.wizardState.update(state => ({
      ...state,
      selectedAlignment: alignment
    }))
    this.nextStep()
  }

  /**
   * Roll stats (or reroll)
   */
  rollStats(): void {
    const baseStats = CharacterCreationService.rollStats()
    const race = this.wizardState().selectedRace

    if (!race) {
      this.errorMessage.set('Race not selected')
      return
    }

    // Apply race modifiers
    const modifiedStats = CharacterCreationService.applyRaceModifiers(
      baseStats,
      race
    )

    this.wizardState.update(state => ({
      ...state,
      rolledStats: {
        ...modifiedStats,
        bonusPoints: baseStats.bonusPoints
      }
    }))
  }

  /**
   * Advance to next step in wizard
   */
  private nextStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex < this.stepSequence.length - 1) {
      this.currentStep.set(this.stepSequence[currentIndex + 1])
    }
  }

  /**
   * Go back to previous step in wizard
   */
  previousStep(): void {
    const currentIndex = this.stepSequence.indexOf(this.currentStep())
    if (currentIndex > 0) {
      this.currentStep.set(this.stepSequence[currentIndex - 1])
    }
  }

  /**
   * Get all available race options
   */
  getRaceOptions(): Race[] {
    return [Race.HUMAN, Race.ELF, Race.DWARF, Race.GNOME, Race.HOBBIT]
  }

  /**
   * Get stat modifiers for a race
   */
  getRaceModifiers(race: Race): RaceModifiers {
    return RACE_MODIFIERS[race]
  }

  /**
   * Get all available alignment options
   */
  getAlignmentOptions(): Alignment[] {
    return [Alignment.GOOD, Alignment.NEUTRAL, Alignment.EVIL]
  }

  /**
   * Get description for an alignment
   */
  getAlignmentDescription(alignment: Alignment): string {
    const descriptions: Record<Alignment, string> = {
      [Alignment.GOOD]: 'Virtuous and righteous characters who aid others',
      [Alignment.NEUTRAL]: 'Balanced characters who follow their own path',
      [Alignment.EVIL]: 'Self-serving characters who pursue power'
    }
    return descriptions[alignment]
  }

  /**
   * Accept rolled stats and advance to bonus point allocation
   */
  acceptStats(): void {
    if (!this.wizardState().rolledStats) {
      this.errorMessage.set('Roll stats first')
      return
    }

    this.errorMessage.set(null)
    this.nextStep()
  }

  /**
   * Get available bonus points
   */
  getAvailableBonusPoints(): number {
    return this.wizardState().rolledStats?.bonusPoints ?? 0
  }

  /**
   * Allocate bonus points to a specific stat
   */
  allocateBonusPoint(stat: keyof BaseStats, points: number): void {
    const currentStats = this.wizardState().rolledStats

    if (!currentStats) {
      this.errorMessage.set('No stats rolled')
      return
    }

    try {
      const updatedStats = CharacterCreationService.allocateBonusPoints(
        currentStats,
        stat,
        points
      )

      this.wizardState.update(state => ({
        ...state,
        rolledStats: updatedStats
      }))

      this.errorMessage.set(null)
    } catch (error) {
      this.errorMessage.set((error as Error).message)
    }
  }

  /**
   * Get eligible classes based on current stats (with bonus allocation)
   */
  getEligibleClasses(): CharacterClass[] {
    const { rolledStats, selectedAlignment } = this.wizardState()

    if (!rolledStats || !selectedAlignment) {
      return []
    }

    return CharacterService.getEligibleClasses(rolledStats, selectedAlignment)
  }

  /**
   * Finish bonus point allocation and advance to class selection
   */
  finishBonusAllocation(): void {
    this.nextStep()
  }

  /**
   * Return to castle menu
   */
  returnToCastle(): void {
    this.router.navigate(['/castle-menu'])
  }
}
