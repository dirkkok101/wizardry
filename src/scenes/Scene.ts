/**
 * Scene - Base interface for Canvas-based scenes
 */

import { SceneType } from '../types/SceneType'

export interface SceneTransitionData {
  data?: Record<string, any>
}

export interface Scene {
  /**
   * Scene identifier
   */
  readonly type: SceneType

  /**
   * Initialize the scene
   * Called once when scene is created
   */
  init(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Promise<void>

  /**
   * Called when scene becomes active
   */
  enter?(data?: SceneTransitionData): void

  /**
   * Called when scene becomes inactive
   */
  exit?(): void

  /**
   * Update scene state
   * Called every frame
   * @param deltaTime Time since last update in milliseconds
   */
  update(deltaTime: number): void

  /**
   * Render scene to canvas
   * Called every frame after update
   */
  render(ctx: CanvasRenderingContext2D): void

  /**
   * Clean up resources
   * Called when scene is destroyed
   */
  destroy?(): void
}
