/**
 * SceneManager - Manages scene lifecycle and transitions
 */

import { Scene } from '../scenes/Scene'
import { SceneType } from '../types/SceneType'
import { SceneNavigationService, SceneTransitionData } from '../services/SceneNavigationService'
import { TitleScreenScene } from '../scenes/title-screen-scene/TitleScreenScene'
import { CastleMenuScene } from '../scenes/castle-menu-scene/CastleMenuScene'
import { CampScene } from '../scenes/camp-scene/CampScene'
import { TrainingGroundsScene } from '../scenes/training-grounds-scene/TrainingGroundsScene'
import { CharacterListScene } from '../scenes/character-list-scene/CharacterListScene'
import { CharacterInspectionScene } from '../scenes/character-inspection-scene/CharacterInspectionScene'

export class SceneManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private currentScene: Scene | null = null
  private isTransitioning = false
  private unsubscribeEnterHandlers: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.ctx = ctx
  }

  /**
   * Initialize with starting scene
   */
  async init(initialSceneType: SceneType = SceneType.TITLE_SCREEN): Promise<void> {
    // Subscribe to scene navigation events
    this.setupSceneNavigationListeners()

    // Load initial scene
    await this.transitionToScene(initialSceneType)
  }

  /**
   * Setup listeners for SceneNavigationService events
   */
  private setupSceneNavigationListeners(): void {
    // Listen for all scene types
    const sceneTypes = [
      SceneType.TITLE_SCREEN,
      SceneType.CASTLE_MENU,
      SceneType.CAMP,
      SceneType.TRAINING_GROUNDS,
      SceneType.CHARACTER_LIST,
      SceneType.CHARACTER_INSPECTION
    ]

    sceneTypes.forEach(sceneType => {
      const unsubscribe = SceneNavigationService.onSceneEnter(sceneType, (data) => {
        // Only transition if not already on this scene
        if (this.currentScene?.type !== sceneType) {
          this.transitionToScene(sceneType, data).catch(error => {
            console.error(`Failed to transition to ${sceneType}:`, error)
          })
        }
      })
      this.unsubscribeEnterHandlers.push(unsubscribe)
    })
  }

  /**
   * Transition to a new scene
   */
  private async transitionToScene(
    sceneType: SceneType,
    transitionData?: SceneTransitionData
  ): Promise<void> {
    // Prevent double transitions
    if (this.isTransitioning) {
      console.warn(`Transition already in progress, ignoring transition to ${sceneType}`)
      return
    }

    this.isTransitioning = true

    try {
      const oldScene = this.currentScene

      // 1. Exit old scene
      if (oldScene?.exit) {
        oldScene.exit()
      }

      // 2. Destroy old scene
      if (oldScene?.destroy) {
        oldScene.destroy()
      }

      // 3. Create new scene
      const newScene = this.createScene(sceneType)

      // 4. Initialize new scene
      await newScene.init(this.canvas, this.ctx)

      // 5. Set as current scene
      this.currentScene = newScene

      // 6. Enter new scene
      if (newScene.enter) {
        newScene.enter(transitionData)
      }

      console.log(`Scene transition complete: ${oldScene?.type || 'none'} -> ${sceneType}`)
    } finally {
      this.isTransitioning = false
    }
  }

  /**
   * Factory method to create scenes by type
   */
  private createScene(sceneType: SceneType): Scene {
    switch (sceneType) {
      case SceneType.TITLE_SCREEN:
        return new TitleScreenScene()
      case SceneType.CASTLE_MENU:
        return new CastleMenuScene()
      case SceneType.CAMP:
        return new CampScene()
      case SceneType.TRAINING_GROUNDS:
        return new TrainingGroundsScene()
      case SceneType.CHARACTER_LIST:
        return new CharacterListScene()
      case SceneType.CHARACTER_INSPECTION:
        return new CharacterInspectionScene()
      default:
        throw new Error(`Unknown scene type: ${sceneType}`)
    }
  }

  /**
   * Update current scene
   */
  update(deltaTime: number): void {
    if (this.currentScene && !this.isTransitioning) {
      this.currentScene.update(deltaTime)
    }
  }

  /**
   * Render current scene
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (this.currentScene && !this.isTransitioning) {
      this.currentScene.render(ctx)
    }
  }

  /**
   * Get current scene type
   */
  getCurrentSceneType(): SceneType | null {
    return this.currentScene?.type || null
  }

  /**
   * Check if transition is in progress
   */
  isTransitionInProgress(): boolean {
    return this.isTransitioning
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Unsubscribe from scene navigation
    this.unsubscribeEnterHandlers.forEach(unsub => unsub())
    this.unsubscribeEnterHandlers = []

    // Destroy current scene
    if (this.currentScene?.destroy) {
      this.currentScene.destroy()
    }

    this.currentScene = null
  }
}
