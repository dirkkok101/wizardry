import { describe, it, expect, beforeEach } from 'vitest'
import { PartyRosterRenderer } from '../../../src/ui/renderers/PartyRosterRenderer'
import { Character } from '../../../src/types/Character'
import { createTestCharacter } from '../../helpers/test-factories'
import { CharacterClass } from '../../../src/types/CharacterClass'

describe('PartyRosterRenderer', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
  })

  describe('render', () => {
    it('should render empty party message', () => {
      // Empty character array
      const characters: Character[] = []

      // Should not throw
      expect(() => {
        PartyRosterRenderer.render(ctx, {
          characters,
          x: 50,
          y: 400,
          maxWidth: 700
        })
      }).not.toThrow()

      // Visual verification would require checking canvas pixels
      // For now, just verify it doesn't crash
    })

    it('should render party with members', () => {
      const characters = [
        createTestCharacter({ name: 'Fighter1', class: CharacterClass.FIGHTER }),
        createTestCharacter({ name: 'Mage1', class: CharacterClass.MAGE }),
        createTestCharacter({ name: 'Priest1', class: CharacterClass.PRIEST })
      ]

      expect(() => {
        PartyRosterRenderer.render(ctx, {
          characters,
          x: 50,
          y: 400,
          maxWidth: 700
        })
      }).not.toThrow()
    })

    it('should render without title when showTitle=false', () => {
      const characters: Character[] = []

      expect(() => {
        PartyRosterRenderer.render(ctx, {
          characters,
          x: 50,
          y: 400,
          maxWidth: 700,
          showTitle: false
        })
      }).not.toThrow()
    })
  })
})
