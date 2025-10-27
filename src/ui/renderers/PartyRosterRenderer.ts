import { Character } from '../../types/Character'
import { COLORS } from '../theme'
import { CharacterStatus } from '../../types/CharacterStatus'

export interface PartyRosterRenderOptions {
  characters: Character[]
  x: number
  y: number
  maxWidth: number
  showTitle?: boolean
  fontSize?: number
  lineHeight?: number
  highlightIndex?: number
}

export class PartyRosterRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    options: PartyRosterRenderOptions
  ): void {
    const {
      characters,
      x,
      y,
      showTitle = true,
      fontSize = 16,
      lineHeight = 20,
      highlightIndex = -1
    } = options

    let currentY = y

    // Render title
    if (showTitle) {
      ctx.fillStyle = COLORS.TEXT_PRIMARY
      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = 'left'
      ctx.fillText('CURRENT PARTY:', x, currentY)
      currentY += lineHeight + 5
    }

    // Render empty party message
    if (characters.length === 0) {
      ctx.fillStyle = COLORS.TEXT_SECONDARY
      ctx.font = `${fontSize}px monospace`
      ctx.fillText('No party formed', x, currentY)
      return
    }

    // Render each party member
    characters.forEach((character, index) => {
      const isHighlighted = index === highlightIndex

      // Format member line
      const line = `${index + 1}. ${character.name.padEnd(12)} ${character.class.padEnd(8)} Lvl ${character.level}  ${character.status}`

      // Determine color based on status
      const color = this.getStatusColor(character.status, isHighlighted)

      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`
      ctx.fillText(line, x, currentY)

      currentY += lineHeight
    })
  }

  private static getStatusColor(status: CharacterStatus, highlighted: boolean): string {
    if (highlighted) {
      return COLORS.TEXT_PRIMARY
    }

    switch (status) {
      case CharacterStatus.GOOD:
        return COLORS.TEXT_PRIMARY
      case CharacterStatus.INJURED:
        return '#FFFF00' // Yellow
      case CharacterStatus.POISONED:
        return '#00FF00' // Green
      case CharacterStatus.PARALYZED:
        return '#808080' // Gray
      case CharacterStatus.DEAD:
        return '#FF0000' // Red
      case CharacterStatus.ASHES:
        return '#8B0000' // Dark red
      case CharacterStatus.LOST_FOREVER:
        return '#8B0000' // Dark red
      default:
        return COLORS.TEXT_PRIMARY
    }
  }
}
