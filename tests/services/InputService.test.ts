import { describe, it, expect, beforeEach, vi } from 'vitest'
import { InputService } from '../../src/services/InputService'

describe('InputService', () => {
  beforeEach(() => {
    InputService.clearAllHandlers()
    InputService.setInputEnabled(true)
  })

  describe('onKeyPress', () => {
    it('should register key handler', () => {
      const handler = vi.fn()
      InputService.onKeyPress('S', handler)

      // Simulate keypress
      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('should be case-insensitive by default', () => {
      const handler = vi.fn()
      InputService.onKeyPress('S', handler)

      // Press lowercase
      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('should return unsubscribe function', () => {
      const handler = vi.fn()
      const unsubscribe = InputService.onKeyPress('S', handler)

      unsubscribe()

      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('setInputEnabled', () => {
    it('should disable input when set to false', () => {
      const handler = vi.fn()
      InputService.onKeyPress('S', handler)

      InputService.setInputEnabled(false)

      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should re-enable input when set to true', () => {
      const handler = vi.fn()
      InputService.onKeyPress('S', handler)

      InputService.setInputEnabled(false)
      InputService.setInputEnabled(true)

      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })
  })

  describe('clearAllHandlers', () => {
    it('should remove all handlers', () => {
      const handler = vi.fn()
      InputService.onKeyPress('S', handler)

      InputService.clearAllHandlers()

      const event = new KeyboardEvent('keydown', { key: 's' })
      document.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('waitForSingleKeystroke', () => {
    it('should resolve on any key press', async () => {
      const promise = InputService.waitForSingleKeystroke()

      setTimeout(() => {
        const event = new KeyboardEvent('keydown', { key: 's' })
        document.dispatchEvent(event)
      }, 10)

      const key = await promise
      expect(key).toBe('s')
    })

    it('should filter valid keys', async () => {
      const promise = InputService.waitForSingleKeystroke(['Y', 'N'])

      setTimeout(() => {
        // Invalid key - should be ignored
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
        // Valid key
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }))
      }, 10)

      const key = await promise
      expect(key).toBe('y')
    })
  })
})
