/**
 * TitleScreenScene - Canvas-based title screen implementation
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { AssetLoadingService } from '../../services/AssetLoadingService'
import { InputService } from '../../services/InputService'
import { SaveService } from '../../services/SaveService'
import { StartGameCommand } from './commands/StartGameCommand'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { ImageRenderer } from '../../ui/renderers/ImageRenderer'
import { COLORS, BUTTON_SIZES, ANIMATION } from '../../ui/theme'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'

type TitleScreenMode = 'LOADING' | 'READY' | 'TRANSITIONING'

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
    width: BUTTON_SIZES.LARGE.width,
    height: BUTTON_SIZES.LARGE.height,
    text: 'Loading...',
    key: 's',
    disabled: true,
    hovered: false
  }

  private inputManager!: SceneInputManager
  private mouseX = 0
  private mouseY = 0
  private pulseTime = 0

  /**
   * Initialize the scene
   */
  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas

    // Center button both horizontally and vertically
    const pos = LayoutHelpers.centerRectangle(
      canvas.width,
      canvas.height,
      this.button.width,
      this.button.height
    )
    this.button.x = pos.x
    this.button.y = pos.y

    // Set up input handlers
    this.setupInputHandlers()

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
      })

      AssetLoadingService.loadGameAssets()
    } catch (error) {
      console.error('Failed to load assets:', error)
      this.button.text = 'Error Loading'
    }
  }

  /**
   * Set up input handlers
   */
  private setupInputHandlers(): void {
    this.inputManager = new SceneInputManager()

    // Keyboard handler
    this.inputManager.onKeyPress('s', () => {
      this.handleStart()
    })

    // Mouse handlers
    this.inputManager.onMouseMove(this.canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })

    this.inputManager.onMouseClick(this.canvas, (x, y) => {
      if (ButtonRenderer.isPointInButton(x, y, this.button) && !this.button.disabled) {
        this.handleStart()
      }
    })
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
    ButtonStateHelpers.updateHoverState(this.button, this.mouseX, this.mouseY)
  }

  /**
   * Render the scene
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title bitmap if loaded (full screen)
    if (this.titleBitmap) {
      this.drawTitleBitmap(ctx)
    }

    // Draw start button overlay
    this.drawButton(ctx)
  }

  /**
   * Draw the title bitmap
   */
  private drawTitleBitmap(ctx: CanvasRenderingContext2D): void {
    if (!this.titleBitmap) return

    ImageRenderer.renderBackgroundImage(ctx, {
      image: this.titleBitmap,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      fit: 'contain',
      pixelArt: true
    })
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

    // Map button state to ButtonRenderer state
    let state: 'normal' | 'hover' | 'disabled'
    if (disabled) {
      state = 'disabled'
    } else if (hovered) {
      state = 'hover'
    } else {
      state = 'normal'
    }

    // Render button using ButtonRenderer
    ButtonRenderer.renderButton(ctx, {
      x,
      y,
      width,
      height,
      text,
      state,
      showPulse: this.mode === 'READY' && !disabled,
      pulseTime: this.pulseTime
    })
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
    this.inputManager.destroy()
  }
}
