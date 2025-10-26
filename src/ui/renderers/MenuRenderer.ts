/**
 * MenuRenderer - Renders vertical menu lists with keyboard shortcuts and hover states
 */

import { COLORS, TYPOGRAPHY } from '../theme'

export interface MenuItem {
  key: string           // Keyboard shortcut (e.g., 'g', 't')
  label: string         // Display text (e.g., "(G)ILGAMESH'S TAVERN")
  disabled?: boolean    // Grayed out if true
  hovered?: boolean     // Highlighted if true
}

export interface MenuRenderOptions {
  x: number                           // Center X position
  y: number                           // Top Y position
  items: MenuItem[]                   // Menu items to render
  itemHeight: number                  // Height per item (spacing)
  fontSize: number                    // Text size
  alignment: 'left' | 'center' | 'right'
  showKeys: boolean                   // Display "(G)" prefix
}

export const MenuRenderer = {
  renderMenu(ctx: CanvasRenderingContext2D, options: MenuRenderOptions): void {
    const { x, y, items, itemHeight, fontSize, alignment, showKeys } = options

    items.forEach((item, index) => {
      const itemY = y + index * itemHeight

      // Set color based on item state
      if (item.disabled) {
        ctx.fillStyle = COLORS.TEXT_DISABLED
      } else if (item.hovered) {
        ctx.fillStyle = COLORS.TEXT_PRIMARY
      } else {
        ctx.fillStyle = COLORS.TEXT_SECONDARY
      }

      // Set font and alignment
      ctx.font = `${fontSize}px ${TYPOGRAPHY.FAMILIES.PRIMARY}`
      ctx.textAlign = alignment
      ctx.textBaseline = 'middle'

      // Draw text
      ctx.fillText(item.label, x, itemY)
    })
  }
}
