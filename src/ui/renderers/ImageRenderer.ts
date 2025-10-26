/**
 * ImageRenderer - Utility for rendering images with aspect ratio preservation
 */

export interface ImageRenderOptions {
  image: HTMLImageElement
  canvasWidth: number
  canvasHeight: number
  fit?: 'contain' | 'cover'
  pixelArt?: boolean
}

export const ImageRenderer = {
  /**
   * Render background image with aspect ratio preservation
   * Uses 'contain' fit by default (shows entire image, may have letterboxing)
   * Pixel art mode uses nearest-neighbor scaling for crisp pixels
   */
  renderBackgroundImage(
    ctx: CanvasRenderingContext2D,
    options: ImageRenderOptions
  ): void {
    const {
      image,
      canvasWidth,
      canvasHeight,
      fit = 'contain',
      pixelArt = true
    } = options

    // Calculate aspect ratios
    const canvasAspect = canvasWidth / canvasHeight
    const imageAspect = image.width / image.height

    let width: number
    let height: number
    let x: number
    let y: number

    if (fit === 'contain') {
      // Fit entire image within canvas (may have letterboxing)
      if (imageAspect > canvasAspect) {
        // Image is wider than canvas - fit to width
        width = canvasWidth
        height = width / imageAspect
        x = 0
        y = (canvasHeight - height) / 2
      } else {
        // Image is taller than canvas - fit to height
        height = canvasHeight
        width = height * imageAspect
        x = (canvasWidth - width) / 2
        y = 0
      }
    } else {
      // 'cover' - fill entire canvas (may crop image)
      if (imageAspect > canvasAspect) {
        // Image is wider - fit to height
        height = canvasHeight
        width = height * imageAspect
        x = (canvasWidth - width) / 2
        y = 0
      } else {
        // Image is taller - fit to width
        width = canvasWidth
        height = width / imageAspect
        x = 0
        y = (canvasHeight - height) / 2
      }
    }

    // Use nearest-neighbor scaling for pixel art (crisp pixels)
    if (pixelArt) {
      ctx.imageSmoothingEnabled = false
    }

    ctx.drawImage(image, x, y, width, height)

    // Restore smoothing for subsequent draws
    if (pixelArt) {
      ctx.imageSmoothingEnabled = true
    }
  }
}
