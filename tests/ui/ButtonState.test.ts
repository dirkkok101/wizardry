import { describe, it, expect } from 'vitest'
import { ButtonState } from '../../src/types/ButtonState'

describe('ButtonState', () => {
  it('should have all required fields including key', () => {
    const button: ButtonState = {
      x: 100,
      y: 200,
      width: 150,
      height: 40,
      text: 'TEST',
      key: 't',
      disabled: false,
      hovered: false
    }

    expect(button.key).toBe('t')
    expect(button.text).toBe('TEST')
  })
})
