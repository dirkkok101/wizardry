/**
 * CharacterInspectionScene tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CharacterInspectionScene } from '../../src/scenes/character-inspection-scene/CharacterInspectionScene'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'
import { SceneType } from '../../src/types/SceneType'
import { createTestCharacter } from '../helpers/test-factories'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { TextRenderer } from '../../src/ui/renderers/TextRenderer'
import { Character } from '../../src/types/Character'

describe('CharacterInspectionScene', () => {
  let scene: CharacterInspectionScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let testCharacter: Character

  beforeEach(() => {
    scene = new CharacterInspectionScene()
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!

    testCharacter = createTestCharacter({
      name: 'Gandalf',
      race: Race.HUMAN,
      class: CharacterClass.MAGE,
      level: 5,
      strength: 10,
      intelligence: 18,
      piety: 12,
      vitality: 11,
      agility: 14,
      luck: 13,
      hp: 25,
      maxHp: 30,
      ac: 5,
      experience: 1000,
      inventory: ['Staff of Power', 'Robe']
    })
  })

  describe('init', () => {
    it('should initialize canvas reference', async () => {
      await scene.init(canvas, ctx)
      expect(scene['canvas']).toBe(canvas)
    })

    it('should create input manager', async () => {
      await scene.init(canvas, ctx)
      expect(scene['inputManager']).toBeDefined()
    })
  })

  describe('enter', () => {
    it('should accept character from transition data', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })
      expect(scene['character']).toBe(testCharacter)
    })

    it('should set mode from transition data', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'inspect' } })
      expect(scene['viewMode']).toBe('inspect')
    })

    it('should create no action buttons for view mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })
      // Should only have BACK button
      expect(scene['buttons'].length).toBe(1)
      expect(scene['buttons'][0].key).toBe('escape')
    })

    it('should create no action buttons for inspect mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'inspect' } })
      // Should only have BACK button
      expect(scene['buttons'].length).toBe(1)
      expect(scene['buttons'][0].key).toBe('escape')
    })

    it('should create TRADE button for trade mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'trade' } })
      expect(scene['buttons'].some(btn => btn.key === 't')).toBe(true)
      expect(scene['buttons'].length).toBe(2) // TRADE + BACK
    })

    it('should create DROP button for drop mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'drop' } })
      expect(scene['buttons'].some(btn => btn.key === 'd')).toBe(true)
      expect(scene['buttons'].length).toBe(2) // DROP + BACK
    })

    it('should default returnTo to CHARACTER_LIST for view mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })
      expect(scene['returnTo']).toBe(SceneType.CHARACTER_LIST)
    })

    it('should default returnTo to CHARACTER_LIST for inspect mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'inspect' } })
      expect(scene['returnTo']).toBe(SceneType.CHARACTER_LIST)
    })

    it('should default returnTo to TRAINING_GROUNDS for trade mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'trade' } })
      expect(scene['returnTo']).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should default returnTo to TRAINING_GROUNDS for drop mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'drop' } })
      expect(scene['returnTo']).toBe(SceneType.TRAINING_GROUNDS)
    })

    it('should use custom returnTo if provided', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view', returnTo: SceneType.CASTLE_MENU } })
      expect(scene['returnTo']).toBe(SceneType.CASTLE_MENU)
    })

    it('should reset mode to READY', async () => {
      await scene.init(canvas, ctx)
      scene['mode'] = 'TRANSITIONING'
      scene.enter({ data: { character: testCharacter, mode: 'view' } })
      expect(scene['mode']).toBe('READY')
    })
  })

  describe('navigation', () => {
    it('should navigate to returnTo scene on ESC', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      // Mock SceneNavigationService
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo')

      // Simulate ESC press
      await scene['handleAction']('escape')

      expect(transitionSpy).toHaveBeenCalledWith(SceneType.CHARACTER_LIST, { direction: 'fade' })
    })

    it('should navigate to custom returnTo scene on ESC', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view', returnTo: SceneType.CASTLE_MENU } })

      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo')
      await scene['handleAction']('escape')

      expect(transitionSpy).toHaveBeenCalledWith(SceneType.CASTLE_MENU, { direction: 'fade' })
    })
  })

  describe('mode-based actions', () => {
    it('should handle TRADE button in trade mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'trade' } })

      const consoleSpy = vi.spyOn(console, 'log')
      await scene['handleAction']('t')

      expect(consoleSpy).toHaveBeenCalledWith('[TRADE] Stub: Would open trade interface for', 'Gandalf')
      expect(scene['mode']).toBe('READY') // Should reset mode
    })

    it('should handle DROP button in drop mode', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'drop' } })

      const consoleSpy = vi.spyOn(console, 'log')
      await scene['handleAction']('d')

      expect(consoleSpy).toHaveBeenCalledWith('[DROP] Stub: Would drop character from party:', 'Gandalf')
      expect(scene['mode']).toBe('READY') // Should reset mode
    })

    it('should not allow transitioning when already transitioning', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      scene['mode'] = 'TRANSITIONING'
      const transitionSpy = vi.spyOn(SceneNavigationService, 'transitionTo')

      await scene['handleAction']('escape')

      expect(transitionSpy).not.toHaveBeenCalled()
    })
  })

  describe('render', () => {
    it('should render character name', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringContaining('GANDALF')
      }))
    })

    it('should render character race, class, and level', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringMatching(/RACE:.*HUMAN.*CLASS:.*MAGE.*LEVEL:.*5/)
      }))
    })

    it('should render character stats', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringContaining('STR')
      }))
    })

    it('should render HP, AC, and EXP', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringMatching(/HP:.*25\/30.*AC:.*5.*EXP:.*1000/)
      }))
    })

    it('should render equipment list', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringContaining('Staff of Power')
      }))
      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: expect.stringContaining('Robe')
      }))
    })

    it('should render empty equipment message for character with no items', async () => {
      const emptyCharacter = createTestCharacter({
        name: 'Empty',
        inventory: []
      })

      await scene.init(canvas, ctx)
      scene.enter({ data: { character: emptyCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      expect(renderTextSpy).toHaveBeenCalledWith(ctx, expect.objectContaining({
        text: '  (Empty)'
      }))
    })

    it('should render BACK button in all modes', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'view' } })

      const renderTextSpy = vi.spyOn(TextRenderer, 'renderText')
      scene.render(ctx)

      // Note: ButtonRenderer calls TextRenderer internally, we're checking it was called
      expect(renderTextSpy).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update button hover states', async () => {
      await scene.init(canvas, ctx)
      scene.enter({ data: { character: testCharacter, mode: 'trade' } })

      // Get first button position (should be positioned by enter())
      const button = scene['buttons'][0]

      // Verify button has been positioned
      expect(button.x).toBeGreaterThan(0)
      expect(button.y).toBeGreaterThan(0)

      // Set mouse position within button bounds
      scene['mouseX'] = button.x + button.width / 2
      scene['mouseY'] = button.y + button.height / 2

      scene.update(0)

      expect(button.hovered).toBe(true)
    })
  })

  describe('destroy', () => {
    it('should destroy input manager', async () => {
      await scene.init(canvas, ctx)
      const destroySpy = vi.spyOn(scene['inputManager'], 'destroy')

      scene.destroy()

      expect(destroySpy).toHaveBeenCalled()
    })
  })
})
