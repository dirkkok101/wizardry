/**
 * Button state for interactive UI buttons
 */
export interface ButtonState {
  x: number
  y: number
  width: number
  height: number
  text: string
  key: string          // keyboard shortcut key
  disabled: boolean
  hovered: boolean
}
