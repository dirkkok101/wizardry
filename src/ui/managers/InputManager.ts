/**
 * SceneInputManager - Manages scene input subscriptions with automatic cleanup
 */

import { InputService } from '../../services/InputService'

export class SceneInputManager {
  private subscriptions: Array<() => void> = []

  /**
   * Register keyboard shortcut handler
   */
  onKeyPress(key: string, handler: () => void): void {
    const unsub = InputService.onKeyPress(key, handler)
    this.subscriptions.push(unsub)
  }

  /**
   * Register mouse move handler (with coordinate conversion)
   */
  onMouseMove(
    canvas: HTMLCanvasElement,
    handler: (x: number, y: number) => void
  ): void {
    const mouseHandler = (e: MouseEvent) => {
      const coords = this.screenToCanvasCoordinates(canvas, e)
      handler(coords.x, coords.y)
    }
    canvas.addEventListener('mousemove', mouseHandler)
    this.subscriptions.push(() => {
      canvas.removeEventListener('mousemove', mouseHandler)
    })
  }

  /**
   * Register mouse click handler (with coordinate conversion)
   */
  onMouseClick(
    canvas: HTMLCanvasElement,
    handler: (x: number, y: number) => void
  ): void {
    const clickHandler = (e: MouseEvent) => {
      const coords = this.screenToCanvasCoordinates(canvas, e)
      handler(coords.x, coords.y)
    }
    canvas.addEventListener('click', clickHandler)
    this.subscriptions.push(() => {
      canvas.removeEventListener('click', clickHandler)
    })
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  private screenToCanvasCoordinates(
    canvas: HTMLCanvasElement,
    e: MouseEvent
  ): { x: number, y: number } {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  /**
   * Unsubscribe all handlers at once
   */
  destroy(): void {
    this.subscriptions.forEach(unsub => unsub())
    this.subscriptions = []
  }
}
