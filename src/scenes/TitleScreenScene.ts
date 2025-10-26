/**
 * TitleScreenScene - Canvas-based title screen implementation
 */

import { Scene, SceneTransitionData } from './Scene'
import { SceneType } from '../types/SceneType'
import { AssetLoadingService } from '../services/AssetLoadingService'
import { InputService } from '../services/InputService'
import { SaveService } from '../services/SaveService'
import { StartGameCommand } from '../commands/StartGameCommand'

type TitleScreenMode = 'LOADING' | 'READY' | 'TRANSITIONING'

interface ButtonState {
  x: number
  y: number
  width: number
  height: number
  text: string
  disabled: boolean
  hovered: boolean
}

export class TitleScreenScene implements Scene {
  readonly type = SceneType.TITLE_SCREEN

  private canvas!: HTMLCanvasElement
  private mode: TitleScreenMode = 'LOADING'
  private assetsLoaded = false
  private titleBitmap: HTMLImageElement | null = null
  private saveDataDetected = false
  private button: ButtonState = {
    x: 0,
    y: 0,
    width: 250,
    height: 60,
    text: 'Loading...',
    disabled: true,
    hovered: false
  }

  private unsubscribeKeyPress?: () => void
  private mouseX = 0
  private mouseY = 0
  private pulseTime = 0

  /**
   * Initialize the scene
   */
  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas

    // Center button
    this.button.x = (canvas.width - this.button.width) / 2
    this.button.y = canvas.height * 0.65

    // Set up mouse tracking
    this.setupMouseTracking()

    // Load assets
    await this.loadAssets()
  }

  /**
   * Load title screen assets
   */
  private async loadAssets(): Promise<void> {
    try {
      // Phase 1: Load critical assets (title bitmap)
      const assets = await AssetLoadingService.loadTitleAssets()
      this.titleBitmap = assets.titleBitmap

      // Check for save data
      this.saveDataDetected = await SaveService.checkForSaveData()

      // Phase 2: Load game assets in background
      AssetLoadingService.onLoadComplete(() => {
        this.assetsLoaded = true
        this.mode = 'READY'
        this.button.disabled = false
        this.button.text = '(S)TART'

        // Register keyboard handler
        this.unsubscribeKeyPress = InputService.onKeyPress('s', () => {
          this.handleStart()
        })
      })

      AssetLoadingService.loadGameAssets()
    } catch (error) {
      console.error('Failed to load assets:', error)
      this.button.text = 'Error Loading'
    }
  }

  /**
   * Set up mouse tracking for hover effects
   */
  private setupMouseTracking(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height

      this.mouseX = (e.clientX - rect.left) * scaleX
      this.mouseY = (e.clientY - rect.top) * scaleY
    })

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      // Check if click is on button
      if (this.isPointInButton(x, y) && !this.button.disabled) {
        this.handleStart()
      }
    })
  }

  /**
   * Check if point is inside button bounds
   */
  private isPointInButton(x: number, y: number): boolean {
    return x >= this.button.x &&
           x <= this.button.x + this.button.width &&
           y >= this.button.y &&
           y <= this.button.y + this.button.height
  }

  /**
   * Handle start button click/press
   */
  private async handleStart(): Promise<void> {
    if (!this.assetsLoaded || this.mode === 'TRANSITIONING') return

    this.mode = 'TRANSITIONING'
    this.button.disabled = true

    const result = await StartGameCommand.execute({
      assetsLoaded: this.assetsLoaded,
      saveDataDetected: this.saveDataDetected,
      mode: this.mode
    })

    if (!result.success) {
      console.error('Failed to start game:', result.error)
      this.mode = 'READY'
      this.button.disabled = false
    }
  }

  /**
   * Called when scene becomes active
   */
  enter(_data?: SceneTransitionData): void {
    // Reset state when entering
    this.pulseTime = 0
  }

  /**
   * Update scene state
   */
  update(deltaTime: number): void {
    // Update pulse animation
    this.pulseTime += deltaTime

    // Update button hover state
    this.button.hovered = this.isPointInButton(this.mouseX, this.mouseY) && !this.button.disabled
  }

  /**
   * Render the scene
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title bitmap if loaded
    if (this.titleBitmap) {
      this.drawTitleBitmap(ctx)
    }

    // Draw subtitle
    this.drawSubtitle(ctx)

    // Draw start button
    this.drawButton(ctx)

    // Draw footer
    this.drawFooter(ctx)
  }

  /**
   * Draw the title bitmap
   */
  private drawTitleBitmap(ctx: CanvasRenderingContext2D): void {
    if (!this.titleBitmap) return

    // Center the image
    const scale = 2 // Scale up for modern displays
    const width = this.titleBitmap.width * scale
    const height = this.titleBitmap.height * scale
    const x = (this.canvas.width - width) / 2
    const y = 60

    // Use nearest-neighbor scaling for pixel art
    ctx.imageSmoothingEnabled = false

    ctx.drawImage(
      this.titleBitmap,
      x,
      y,
      width,
      height
    )
  }

  /**
   * Draw subtitle text
   */
  private drawSubtitle(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#aaa'
    ctx.font = '20px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      'Proving Grounds of the Mad Overlord',
      this.canvas.width / 2,
      this.canvas.height * 0.55
    )
  }

  /**
   * Draw the start button
   */
  private drawButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, text, disabled, hovered } = this.button

    // Draw button background
    if (disabled) {
      ctx.fillStyle = '#333'
    } else if (hovered) {
      ctx.fillStyle = '#444'
    } else {
      ctx.fillStyle = '#333'
    }
    ctx.fillRect(x, y, width, height)

    // Draw button border
    const borderColor = disabled ? '#666' : this.mode === 'READY' ? '#fff' : '#666'
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)

    // Draw pulse effect when ready
    if (this.mode === 'READY' && !disabled) {
      const pulseAlpha = 0.5 + 0.3 * Math.sin(this.pulseTime / 500)
      const pulseSize = 5 + 15 * Math.sin(this.pulseTime / 500)

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`
      ctx.lineWidth = 3
      ctx.strokeRect(x - pulseSize/2, y - pulseSize/2, width + pulseSize, height + pulseSize)
    }

    // Draw button text
    ctx.fillStyle = disabled ? '#888' : '#fff'
    ctx.font = '24px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + width / 2, y + height / 2)
  }

  /**
   * Draw copyright footer
   */
  private drawFooter(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#666'
    ctx.font = '14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const footerY = this.canvas.height - 60

    ctx.fillText(
      'Copyright 1981 Sir-Tech Software',
      this.canvas.width / 2,
      footerY
    )
    ctx.fillText(
      'Version 1.0',
      this.canvas.width / 2,
      footerY + 20
    )
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Unsubscribe from keyboard events
    if (this.unsubscribeKeyPress) {
      this.unsubscribeKeyPress()
    }
  }
}
