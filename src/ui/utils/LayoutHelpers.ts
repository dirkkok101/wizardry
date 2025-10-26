/**
 * LayoutHelpers - Utilities for calculating responsive UI layouts
 */

export interface ButtonLayout {
  x: number
  y: number
  width: number
  height: number
}

export interface HorizontalButtonLayoutConfig {
  canvasWidth: number
  canvasHeight: number
  buttonCount: number
  buttonHeight: number
  bottomMargin: number
  sideMargin: number
  spacing: number
}

export interface VerticalButtonLayoutConfig {
  canvasWidth: number
  canvasHeight: number
  buttonCount: number
  buttonWidth: number
  topMargin: number
  spacing: number
}

export interface GridLayoutConfig {
  canvasWidth: number
  canvasHeight: number
  rows: number
  cols: number
  itemWidth: number
  itemHeight: number
  topMargin: number
  sideMargin: number
  rowSpacing: number
  colSpacing: number
}

export const LayoutHelpers = {
  /**
   * Calculate horizontal button layout that fills available width
   * Returns array of {x, y, width, height} for each button
   *
   * Example: 5 buttons across the bottom of the screen
   */
  calculateHorizontalButtonLayout(config: HorizontalButtonLayoutConfig): ButtonLayout[] {
    const {
      canvasWidth,
      canvasHeight,
      buttonCount,
      buttonHeight,
      bottomMargin,
      sideMargin,
      spacing
    } = config

    // Calculate button width to fill available canvas width
    // Available width = canvas width - (2 side margins + spacings between buttons)
    const availableWidth = canvasWidth - (sideMargin * 2) - (spacing * (buttonCount - 1))
    const buttonWidth = Math.floor(availableWidth / buttonCount)

    const startX = sideMargin
    const buttonY = canvasHeight - bottomMargin - buttonHeight

    const layouts: ButtonLayout[] = []
    for (let i = 0; i < buttonCount; i++) {
      layouts.push({
        x: startX + (i * (buttonWidth + spacing)),
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
      })
    }

    return layouts
  },

  /**
   * Calculate vertical button layout (centered column)
   * Returns array of {x, y, width, height} for each button
   *
   * Example: Menu with stacked buttons
   */
  calculateVerticalButtonLayout(config: VerticalButtonLayoutConfig): ButtonLayout[] {
    const {
      canvasWidth,
      canvasHeight,
      buttonCount,
      buttonWidth,
      topMargin,
      spacing
    } = config

    const buttonHeight = 40 // Standard button height
    const startX = (canvasWidth - buttonWidth) / 2 // Center horizontally
    const startY = topMargin

    const layouts: ButtonLayout[] = []
    for (let i = 0; i < buttonCount; i++) {
      layouts.push({
        x: startX,
        y: startY + (i * (buttonHeight + spacing)),
        width: buttonWidth,
        height: buttonHeight
      })
    }

    return layouts
  },

  /**
   * Calculate grid layout for items (inventory, character roster, etc.)
   * Returns array of {x, y, width, height} for each grid cell
   *
   * Example: 6x8 inventory grid
   */
  calculateGridLayout(config: GridLayoutConfig): ButtonLayout[] {
    const {
      rows,
      cols,
      itemWidth,
      itemHeight,
      topMargin,
      sideMargin,
      rowSpacing,
      colSpacing
    } = config

    const layouts: ButtonLayout[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        layouts.push({
          x: sideMargin + (col * (itemWidth + colSpacing)),
          y: topMargin + (row * (itemHeight + rowSpacing)),
          width: itemWidth,
          height: itemHeight
        })
      }
    }

    return layouts
  },

  /**
   * Calculate centered position for a rectangle
   */
  centerRectangle(
    containerWidth: number,
    containerHeight: number,
    rectWidth: number,
    rectHeight: number
  ): { x: number, y: number } {
    return {
      x: (containerWidth - rectWidth) / 2,
      y: (containerHeight - rectHeight) / 2
    }
  }
}
