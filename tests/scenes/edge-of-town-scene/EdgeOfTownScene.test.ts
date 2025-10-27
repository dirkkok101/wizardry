import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EdgeOfTownScene } from '../../../src/scenes/edge-of-town-scene/EdgeOfTownScene'
import { SceneType } from '../../../src/types/SceneType'

describe('EdgeOfTownScene', () => {
  let scene: EdgeOfTownScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new EdgeOfTownScene()
  })

  afterEach(() => {
    scene.destroy?.()
  })

  describe('initialization', () => {
    it('should have correct scene type', () => {
      expect(scene.type).toBe(SceneType.EDGE_OF_TOWN)
    })

    it('should initialize canvas and input manager', async () => {
      await scene.init(canvas, ctx)
      expect(scene['canvas']).toBe(canvas)
      expect(scene['inputManager']).toBeDefined()
    })

    it('should have 3 buttons', async () => {
      await scene.init(canvas, ctx)
      expect(scene['buttons'].length).toBe(3)
    })
  })
})
