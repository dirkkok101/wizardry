/**
 * CampScene - Placeholder for Camp (maze entry/exit)
 */

import { Scene } from './Scene'
import { SceneType } from '../types/SceneType'
import { SceneTransitionData } from '../services/SceneNavigationService'

export class CampScene implements Scene {
  readonly type = SceneType.CAMP

  private canvas!: HTMLCanvasElement
  private pulseTime = 0

  /**
   * Initialize the scene
   */
  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
  }

  /**
   * Called when scene becomes active
   */
  enter(data?: SceneTransitionData): void {
    console.log('Entered Camp scene', data)
    this.pulseTime = 0
  }

  /**
   * Update scene state
   */
  update(deltaTime: number): void {
    this.pulseTime += deltaTime
  }

  /**
   * Render the scene
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title
    ctx.fillStyle = '#fff'
    ctx.font = '32px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CAMP', this.canvas.width / 2, this.canvas.height / 2 - 60)

    // Draw subtitle
    ctx.fillStyle = '#aaa'
    ctx.font = '20px monospace'
    ctx.fillText(
      'Edge of the Maze',
      this.canvas.width / 2,
      this.canvas.height / 2 - 20
    )

    // Draw "Coming Soon" with pulse effect
    const pulseAlpha = 0.5 + 0.5 * Math.sin(this.pulseTime / 800)
    ctx.fillStyle = `rgba(170, 170, 170, ${pulseAlpha})`
    ctx.font = '24px monospace'
    ctx.fillText('Coming Soon', this.canvas.width / 2, this.canvas.height / 2 + 40)

    // Draw footer
    ctx.fillStyle = '#666'
    ctx.font = '16px monospace'
    ctx.fillText(
      'This scene will be implemented in a future task',
      this.canvas.width / 2,
      this.canvas.height - 80
    )
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // No resources to clean up yet
  }
}
