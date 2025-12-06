/**
 * LoadingProgressService - Track and report game data loading progress
 *
 * Provides centralized progress tracking for async data loading operations.
 * Uses Angular signals for reactive UI updates.
 */

import { Injectable, signal, computed } from '@angular/core'

export interface LoadingProgress {
  phase: 'idle' | 'loading' | 'complete' | 'error'
  currentAsset: string
  loadedSteps: number
  totalSteps: number
  error?: string
}

// Loading steps with their weights (approximate % of total load time)
export const LOADING_STEPS = {
  classes: { label: 'Loading classes...', weight: 3 },
  spells: { label: 'Loading spells...', weight: 12 },
  monsters: { label: 'Loading monsters...', weight: 25 },
  races: { label: 'Loading races...', weight: 2 },
  statModifiers: { label: 'Loading stat modifiers...', weight: 2 },
  items: { label: 'Loading items...', weight: 25 },
  traps: { label: 'Loading traps...', weight: 5 },
  treasure: { label: 'Loading treasure...', weight: 8 },
  sprites: { label: 'Loading sprites...', weight: 15 },
  finalizing: { label: 'Initializing game...', weight: 3 }
} as const

export type LoadingStep = keyof typeof LOADING_STEPS

// Calculate total weight for percentage calculations
const TOTAL_WEIGHT = Object.values(LOADING_STEPS).reduce((sum, step) => sum + step.weight, 0)

@Injectable({
  providedIn: 'root'
})
export class LoadingProgressService {
  private readonly _progress = signal<LoadingProgress>({
    phase: 'idle',
    currentAsset: '',
    loadedSteps: 0,
    totalSteps: Object.keys(LOADING_STEPS).length
  })

  private completedSteps = new Set<LoadingStep>()

  // Public readonly access to progress
  readonly progress = this._progress.asReadonly()

  // Computed percentage based on step weights
  readonly percentage = computed(() => {
    const progress = this._progress()
    if (progress.phase === 'complete') return 100
    if (progress.phase === 'idle') return 0

    let completedWeight = 0
    for (const step of this.completedSteps) {
      completedWeight += LOADING_STEPS[step].weight
    }

    return Math.round((completedWeight / TOTAL_WEIGHT) * 100)
  })

  // Computed flags for UI
  readonly isLoading = computed(() => this._progress().phase === 'loading')
  readonly isComplete = computed(() => this._progress().phase === 'complete')
  readonly hasError = computed(() => this._progress().phase === 'error')
  readonly currentAsset = computed(() => this._progress().currentAsset)
  readonly errorMessage = computed(() => this._progress().error)

  /**
   * Start the loading process
   */
  startLoading(): void {
    this.completedSteps.clear()
    this._progress.set({
      phase: 'loading',
      currentAsset: LOADING_STEPS.classes.label,
      loadedSteps: 0,
      totalSteps: Object.keys(LOADING_STEPS).length
    })
  }

  /**
   * Report that a loading step is starting
   */
  startStep(step: LoadingStep): void {
    this._progress.update(p => ({
      ...p,
      currentAsset: LOADING_STEPS[step].label
    }))
  }

  /**
   * Report that a loading step has completed
   */
  completeStep(step: LoadingStep): void {
    this.completedSteps.add(step)
    this._progress.update(p => ({
      ...p,
      loadedSteps: this.completedSteps.size
    }))
  }

  /**
   * Mark loading as complete
   */
  complete(): void {
    this._progress.set({
      phase: 'complete',
      currentAsset: 'Ready!',
      loadedSteps: Object.keys(LOADING_STEPS).length,
      totalSteps: Object.keys(LOADING_STEPS).length
    })
  }

  /**
   * Report a loading error
   */
  error(message: string): void {
    this._progress.update(p => ({
      ...p,
      phase: 'error',
      error: message
    }))
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.completedSteps.clear()
    this._progress.set({
      phase: 'idle',
      currentAsset: '',
      loadedSteps: 0,
      totalSteps: Object.keys(LOADING_STEPS).length
    })
  }
}
