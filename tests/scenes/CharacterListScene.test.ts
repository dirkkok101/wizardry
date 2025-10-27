import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CharacterListScene } from '../../src/scenes/character-list-scene/CharacterListScene'
import { SceneType } from '../../src/types/SceneType'
import { GameInitializationService } from '../../src/services/GameInitializationService'
import { CharacterService } from '../../src/services/CharacterService'
import { createTestCharacter, createGameState } from '../helpers/test-factories'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Race } from '../../src/types/Race'
import { Alignment } from '../../src/types/Alignment'

// Mock SceneNavigationService to prevent actual scene transitions
vi.mock('../../src/services/SceneNavigationService', () => ({
  SceneNavigationService: {
    transitionTo: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('CharacterListScene', () => {
  let scene: CharacterListScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new CharacterListScene()

    // Initialize with clean game state
    const state = createGameState()
    GameInitializationService.updateGameState(state)
  })

  afterEach(() => {
    scene.destroy?.()
  })

  it('should have correct scene type', () => {
    expect(scene.type).toBe(SceneType.CHARACTER_LIST)
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

    it('should initialize with default configuration', async () => {
      await scene.init(canvas, ctx)
      expect(scene['title']).toBe('CHARACTER LIST')
      expect(scene['emptyMessage']).toBe('No characters available')
      expect(scene['returnTo']).toBe(SceneType.TRAINING_GROUNDS)
    })
  })

  describe('enter', () => {
    beforeEach(async () => {
      await scene.init(canvas, ctx)
    })

    it('should accept title from transition data', () => {
      scene.enter({ data: { title: 'MY ROSTER' } })
      expect(scene['title']).toBe('MY ROSTER')
    })

    it('should accept emptyMessage from transition data', () => {
      scene.enter({ data: { emptyMessage: 'No characters found' } })
      expect(scene['emptyMessage']).toBe('No characters found')
    })

    it('should accept returnTo from transition data', () => {
      scene.enter({ data: { returnTo: SceneType.CASTLE_MENU } })
      expect(scene['returnTo']).toBe(SceneType.CASTLE_MENU)
    })

    it('should load all characters when no filter provided', () => {
      // Add test characters to game state
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf', class: CharacterClass.MAGE })
      const char2 = createTestCharacter({ name: 'Aragorn', class: CharacterClass.FIGHTER })
      state.roster.set(char1.id, char1)
      state.roster.set(char2.id, char2)
      GameInitializationService.updateGameState(state)

      scene.enter()

      expect(scene['characters'].length).toBe(2)
      expect(scene['characters'][0].name).toBe('Gandalf')
      expect(scene['characters'][1].name).toBe('Aragorn')
    })

    it('should filter characters when filter provided', () => {
      // Add test characters
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf', class: CharacterClass.MAGE })
      const char2 = createTestCharacter({ name: 'Aragorn', class: CharacterClass.FIGHTER })
      const char3 = createTestCharacter({ name: 'Legolas', class: CharacterClass.MAGE })
      state.roster.set(char1.id, char1)
      state.roster.set(char2.id, char2)
      state.roster.set(char3.id, char3)
      GameInitializationService.updateGameState(state)

      // Filter for only mages
      scene.enter({
        data: {
          filter: (char) => char.class === CharacterClass.MAGE
        }
      })

      expect(scene['characters'].length).toBe(2)
      expect(scene['characters'][0].name).toBe('Gandalf')
      expect(scene['characters'][1].name).toBe('Legolas')
    })

    it('should create buttons for each character', () => {
      // Add test characters
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf', class: CharacterClass.MAGE, level: 5 })
      const char2 = createTestCharacter({ name: 'Aragorn', class: CharacterClass.FIGHTER, level: 7 })
      state.roster.set(char1.id, char1)
      state.roster.set(char2.id, char2)
      GameInitializationService.updateGameState(state)

      scene.enter()

      expect(scene['buttons'].length).toBe(2)
      expect(scene['buttons'][0].text).toBe('1. GANDALF (Level 5 MAGE)')
      expect(scene['buttons'][0].key).toBe('1')
      expect(scene['buttons'][1].text).toBe('2. ARAGORN (Level 7 FIGHTER)')
      expect(scene['buttons'][1].key).toBe('2')
    })

    it('should display empty state when no characters exist', () => {
      scene.enter()
      expect(scene['characters'].length).toBe(0)
      expect(scene['buttons'].length).toBe(0)
    })

    it('should display empty state when no characters match filter', () => {
      // Add test characters
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf', class: CharacterClass.MAGE })
      state.roster.set(char1.id, char1)
      GameInitializationService.updateGameState(state)

      // Filter for fighters only
      scene.enter({
        data: {
          filter: (char) => char.class === CharacterClass.FIGHTER
        }
      })

      expect(scene['characters'].length).toBe(0)
      expect(scene['buttons'].length).toBe(0)
    })

    it('should reset mode to READY on enter', () => {
      scene['mode'] = 'TRANSITIONING'
      scene.enter()
      expect(scene['mode']).toBe('READY')
    })

    it('should accept onSelect callback from transition data', () => {
      const callback = vi.fn()
      scene.enter({ data: { onSelect: callback } })
      expect(scene['onSelect']).toBe(callback)
    })
  })

  describe('navigation', () => {
    beforeEach(async () => {
      await scene.init(canvas, ctx)
    })

    it('should call onSelect callback when character selected by number key', async () => {
      // Setup
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf', class: CharacterClass.MAGE })
      state.roster.set(char1.id, char1)
      GameInitializationService.updateGameState(state)

      const callback = vi.fn()
      scene.enter({ data: { onSelect: callback } })

      // Simulate pressing '1'
      await scene['handleSelection']('1')

      expect(callback).toHaveBeenCalledWith(char1)
    })

    it('should transition to returnTo scene on ESC', async () => {
      const { SceneNavigationService } = await import('../../src/services/SceneNavigationService')

      scene.enter({ data: { returnTo: SceneType.CASTLE_MENU } })

      await scene['handleSelection']('escape')

      expect(SceneNavigationService.transitionTo).toHaveBeenCalledWith(
        SceneType.CASTLE_MENU,
        { direction: 'fade' }
      )
    })

    it('should prevent multiple transitions when already transitioning', async () => {
      const callback = vi.fn()
      scene.enter({ data: { onSelect: callback } })

      scene['mode'] = 'TRANSITIONING'
      await scene['handleSelection']('1')

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle invalid number keys gracefully', async () => {
      const callback = vi.fn()
      scene.enter({ data: { onSelect: callback } })

      await scene['handleSelection']('9') // No character at index 9

      expect(callback).not.toHaveBeenCalled()
      expect(scene['mode']).toBe('READY') // Should stay in READY mode
    })
  })

  describe('update', () => {
    beforeEach(async () => {
      await scene.init(canvas, ctx)
    })

    it('should update hover states based on mouse position', () => {
      // Add test characters
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf' })
      state.roster.set(char1.id, char1)
      GameInitializationService.updateGameState(state)

      scene.enter()

      // Move mouse over first button
      scene['mouseX'] = scene['buttons'][0].x + 10
      scene['mouseY'] = scene['buttons'][0].y + 10

      scene.update(16)

      expect(scene['buttons'][0].hovered).toBe(true)
    })
  })

  describe('render', () => {
    beforeEach(async () => {
      await scene.init(canvas, ctx)
    })

    it('should clear screen with background color', () => {
      scene.enter()
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      expect(fillRectSpy).toHaveBeenCalledWith(0, 0, 800, 600)
    })

    it('should render title text', () => {
      scene.enter({ data: { title: 'SELECT CHARACTER' } })
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      scene.render(ctx)

      // Should render title
      expect(fillTextSpy).toHaveBeenCalled()
    })

    it('should render buttons when characters exist', () => {
      const state = GameInitializationService.getGameState()
      const char1 = createTestCharacter({ name: 'Gandalf' })
      state.roster.set(char1.id, char1)
      GameInitializationService.updateGameState(state)

      scene.enter()
      const fillRectSpy = vi.spyOn(ctx, 'fillRect')

      scene.render(ctx)

      // Should render background + buttons
      expect(fillRectSpy.mock.calls.length).toBeGreaterThan(1)
    })

    it('should render empty message when no characters exist', () => {
      scene.enter({ data: { emptyMessage: 'NO CHARACTERS' } })
      const fillTextSpy = vi.spyOn(ctx, 'fillText')

      scene.render(ctx)

      // Should render empty message
      expect(fillTextSpy).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should destroy input manager', async () => {
      await scene.init(canvas, ctx)
      const destroySpy = vi.spyOn(scene['inputManager'], 'destroy')

      scene.destroy?.()

      expect(destroySpy).toHaveBeenCalled()
    })
  })
})
