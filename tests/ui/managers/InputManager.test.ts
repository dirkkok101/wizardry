import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SceneInputManager } from '../../../src/ui/managers/InputManager'
import { InputService } from '../../../src/services/InputService'

describe('SceneInputManager', () => {
  let canvas: HTMLCanvasElement
  let manager: SceneInputManager

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    document.body.appendChild(canvas)
    manager = new SceneInputManager()
  })

  afterEach(() => {
    manager.destroy()
    document.body.removeChild(canvas)
  })

  describe('onKeyPress', () => {
    it('should register keyboard handler', () => {
      const handler = vi.fn()
      const spy = vi.spyOn(InputService, 'onKeyPress')

      manager.onKeyPress('a', handler)

      expect(spy).toHaveBeenCalledWith('a', handler)
    })

    it('should store unsubscribe function', () => {
      manager.onKeyPress('a', () => {})

      // Check that subscriptions array has one entry
      expect(manager['subscriptions'].length).toBe(1)
    })
  })

  describe('onMouseMove', () => {
    it('should register mouse move handler', () => {
      const handler = vi.fn()

      manager.onMouseMove(canvas, handler)

      // Trigger mouse move event
      const event = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('should convert screen coordinates to canvas coordinates', () => {
      const handler = vi.fn()

      manager.onMouseMove(canvas, handler)

      const event = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      // Handler should be called with canvas coordinates
      expect(handler).toHaveBeenCalledWith(expect.any(Number), expect.any(Number))
    })
  })

  describe('onMouseClick', () => {
    it('should register mouse click handler', () => {
      const handler = vi.fn()

      manager.onMouseClick(canvas, handler)

      const event = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      })
      canvas.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should unsubscribe all handlers', () => {
      const unsub1 = vi.fn()
      const unsub2 = vi.fn()

      // Mock subscriptions
      manager['subscriptions'] = [unsub1, unsub2]

      manager.destroy()

      expect(unsub1).toHaveBeenCalled()
      expect(unsub2).toHaveBeenCalled()
      expect(manager['subscriptions'].length).toBe(0)
    })

    it('should remove mouse event listeners', () => {
      const handler = vi.fn()
      const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener')

      manager.onMouseMove(canvas, handler)
      manager.destroy()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    })
  })
})
