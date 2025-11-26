/**
 * InputService - Pure function service for handling user input
 */

export interface KeyOptions {
  caseSensitive?: boolean
  preventDefault?: boolean
  requireFocus?: boolean
  alwaysActive?: boolean
}

export interface InputState {
  enabled: boolean
  pressedKeys: Set<string>
  keyHandlers: Map<string, KeyHandler[]>
  clickHandlers: Map<string, ClickHandler>
}

type KeyHandler = (event?: KeyboardEvent) => void
type ClickHandler = (event?: MouseEvent) => void
type UnsubscribeFn = () => void

// Service state
const state: InputState = {
  enabled: true,
  pressedKeys: new Set(),
  keyHandlers: new Map(),
  clickHandlers: new Map()
}

// Global keyboard listener
function handleKeyDown(event: KeyboardEvent): void {
  if (!state.enabled) return

  const key = event.key.toLowerCase()
  state.pressedKeys.add(key)

  // Find handlers for this key
  const handlers = state.keyHandlers.get(key) || []
  handlers.forEach(handler => {
    handler(event)
  })
}

function handleKeyUp(event: KeyboardEvent): void {
  const key = event.key.toLowerCase()
  state.pressedKeys.delete(key)
}

// Initialize global listeners
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
}

/**
 * Register key press handler
 */
function onKeyPress(
  key: string,
  handler: KeyHandler,
  options: KeyOptions = {}
): UnsubscribeFn {
  const normalizedKey = options.caseSensitive ? key : key.toLowerCase()

  const handlers = state.keyHandlers.get(normalizedKey) || []
  handlers.push(handler)
  state.keyHandlers.set(normalizedKey, handlers)

  // Return unsubscribe function
  return () => {
    const currentHandlers = state.keyHandlers.get(normalizedKey) || []
    const index = currentHandlers.indexOf(handler)
    if (index > -1) {
      currentHandlers.splice(index, 1)
      if (currentHandlers.length === 0) {
        state.keyHandlers.delete(normalizedKey)
      } else {
        state.keyHandlers.set(normalizedKey, currentHandlers)
      }
    }
  }
}

/**
 * Register button click handler
 */
function onButtonClick(
  elementId: string,
  handler: ClickHandler
): UnsubscribeFn {
  const element = document.getElementById(elementId)

  if (!element) {
    console.error(`Element with id '${elementId}' not found`)
    return () => {}
  }

  const wrappedHandler = (event: Event) => {
    if (state.enabled) {
      handler(event as MouseEvent)
    }
  }

  element.addEventListener('click', wrappedHandler)
  state.clickHandlers.set(elementId, handler)

  // Return unsubscribe function
  return () => {
    element.removeEventListener('click', wrappedHandler)
    state.clickHandlers.delete(elementId)
  }
}

/**
 * Remove key press handler
 */
function offKeyPress(key: string): void {
  const normalizedKey = key.toLowerCase()
  state.keyHandlers.delete(normalizedKey)
}

/**
 * Check if key is currently pressed
 */
function isKeyPressed(key: string): boolean {
  return state.pressedKeys.has(key.toLowerCase())
}

/**
 * Enable or disable all input
 */
function setInputEnabled(enabled: boolean): void {
  state.enabled = enabled
}

/**
 * Get current input state
 */
function getInputState(): InputState {
  return {
    enabled: state.enabled,
    pressedKeys: new Set(state.pressedKeys),
    keyHandlers: new Map(state.keyHandlers),
    clickHandlers: new Map(state.clickHandlers)
  }
}

/**
 * Clear all registered handlers
 */
function clearAllHandlers(): void {
  state.keyHandlers.clear()
  state.clickHandlers.clear()
}

/**
 * Wait for a single keystroke
 */
function waitForSingleKeystroke(validKeys?: string[]): Promise<string> {
  return new Promise((resolve) => {
    const handleKey = (event: KeyboardEvent) => {
      if (!state.enabled) return

      const key = event.key.toLowerCase()

      // If valid keys specified, filter
      if (validKeys) {
        const normalizedValidKeys = validKeys.map(k => k.toLowerCase())
        if (!normalizedValidKeys.includes(key)) {
          return // Ignore this key
        }
      }

      // Remove listener
      document.removeEventListener('keydown', handleKey)

      // Resolve with key
      resolve(key)
    }

    document.addEventListener('keydown', handleKey)
  })
}

export const InputService = {
  onKeyPress,
  onButtonClick,
  offKeyPress,
  isKeyPressed,
  setInputEnabled,
  getInputState,
  clearAllHandlers,
  waitForSingleKeystroke
}
