/**
 * SceneNavigationService - Pure function service for scene transitions
 */

import { SceneType } from '../types/SceneType'

export interface TransitionOptions {
  fadeTime?: number
  direction?: 'fade' | 'slide' | 'instant'
  preserveState?: boolean
  data?: Record<string, any>
  addToHistory?: boolean
  blockInput?: boolean
}

export interface SceneTransitionData {
  fromScene: SceneType
  toScene: SceneType
  data?: Record<string, any>
  timestamp: number
}

type SceneEnterHandler = (data?: SceneTransitionData) => void
type SceneExitHandler = (data?: SceneTransitionData) => void

class TransitionBlockedError extends Error {
  constructor(from: SceneType, to: SceneType) {
    super(`Transition from ${from} to ${to} is not allowed`)
    this.name = 'TransitionBlockedError'
  }
}

class NoHistoryError extends Error {
  constructor() {
    super('No history available for back navigation')
    this.name = 'NoHistoryError'
  }
}

// Service state
let currentScene: SceneType = SceneType.TITLE_SCREEN
const navigationHistory: SceneType[] = []
let isTransitionActive = false

const enterHandlers = new Map<SceneType, SceneEnterHandler[]>()
const exitHandlers = new Map<SceneType, SceneExitHandler[]>()

/**
 * Transition to a new scene
 */
async function transitionTo(
  sceneType: SceneType,
  options: TransitionOptions = {}
): Promise<void> {
  const {
    fadeTime = 300,
    direction = 'fade',
    data,
    addToHistory = true
  } = options

  // Validate transition
  if (!canTransitionTo(sceneType, currentScene)) {
    throw new TransitionBlockedError(currentScene, sceneType)
  }

  const fromScene = currentScene
  isTransitionActive = true

  try {
    // Fire exit handlers for current scene
    const exitHandlerList = exitHandlers.get(fromScene) || []
    const transitionData: SceneTransitionData = {
      fromScene,
      toScene: sceneType,
      data,
      timestamp: Date.now()
    }
    exitHandlerList.forEach(handler => handler(transitionData))

    // Simulate transition delay
    if (fadeTime > 0 && direction !== 'instant') {
      await new Promise(resolve => setTimeout(resolve, fadeTime))
    }

    // Update current scene
    currentScene = sceneType

    // Add to history
    if (addToHistory) {
      navigationHistory.push(sceneType)

      // Limit history to 100 entries
      if (navigationHistory.length > 100) {
        navigationHistory.shift()
      }
    }

    // Fire enter handlers for new scene
    const enterHandlerList = enterHandlers.get(sceneType) || []
    enterHandlerList.forEach(handler => handler(transitionData))
  } finally {
    isTransitionActive = false
  }
}

/**
 * Get current scene
 */
function getCurrentScene(): SceneType {
  return currentScene
}

/**
 * Get previous scene
 */
function getPreviousScene(): SceneType | null {
  if (navigationHistory.length < 2) {
    return null
  }
  return navigationHistory[navigationHistory.length - 2]
}

/**
 * Check if transition is allowed
 */
function canTransitionTo(
  sceneType: SceneType,
  fromScene: SceneType = currentScene
): boolean {
  // For now, allow all transitions except back to TITLE_SCREEN
  if (sceneType === SceneType.TITLE_SCREEN && fromScene !== SceneType.TITLE_SCREEN) {
    return false
  }

  return true
}

/**
 * Go back to previous scene
 */
async function goBack(options: TransitionOptions = {}): Promise<void> {
  if (navigationHistory.length < 2) {
    throw new NoHistoryError()
  }

  // Remove current scene from history
  navigationHistory.pop()

  // Get previous scene
  const previousScene = navigationHistory[navigationHistory.length - 1]

  // Transition without adding to history again
  await transitionTo(previousScene, {
    ...options,
    addToHistory: false
  })
}

/**
 * Register scene enter handler
 */
function onSceneEnter(
  sceneType: SceneType,
  handler: SceneEnterHandler
): void {
  const handlers = enterHandlers.get(sceneType) || []
  handlers.push(handler)
  enterHandlers.set(sceneType, handlers)
}

/**
 * Register scene exit handler
 */
function onSceneExit(
  sceneType: SceneType,
  handler: SceneExitHandler
): void {
  const handlers = exitHandlers.get(sceneType) || []
  handlers.push(handler)
  exitHandlers.set(sceneType, handlers)
}

/**
 * Clear navigation history
 */
function clearHistory(): void {
  navigationHistory.length = 0
  currentScene = SceneType.TITLE_SCREEN
  isTransitionActive = false
}

/**
 * Get navigation history
 */
function getNavigationHistory(): SceneType[] {
  return [...navigationHistory]
}

/**
 * Check if transition is in progress
 */
function isTransitioning(): boolean {
  return isTransitionActive
}

export const SceneNavigationService = {
  transitionTo,
  getCurrentScene,
  getPreviousScene,
  canTransitionTo,
  goBack,
  onSceneEnter,
  onSceneExit,
  clearHistory,
  getNavigationHistory,
  isTransitioning
}
