/**
 * Wizardry: Proving Grounds of the Mad Overlord
 * Main entry point
 */

import { TitleScreenScene } from './scenes/TitleScreenScene'
import { Scene } from './scenes/Scene'

// Initialize canvas
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('Failed to get 2D context')
}

// Game loop state
let currentScene: Scene | null = null
let lastFrameTime = performance.now()
let isRunning = false

/**
 * Make canvas responsive to window size
 * Maintains 4:3 aspect ratio
 */
function resizeCanvas() {
  const aspectRatio = 4 / 3
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight

  let canvasWidth = windowWidth
  let canvasHeight = windowWidth / aspectRatio

  // If height exceeds window, scale by height instead
  if (canvasHeight > windowHeight) {
    canvasHeight = windowHeight
    canvasWidth = windowHeight * aspectRatio
  }

  // Set canvas display size (CSS pixels)
  canvas.style.width = `${canvasWidth}px`
  canvas.style.height = `${canvasHeight}px`

  // Set canvas internal resolution (maintains crisp pixel art)
  // Use fixed internal resolution for consistent rendering
  canvas.width = 640
  canvas.height = 480
}

/**
 * Draw loading screen
 */
function drawLoadingScreen() {
  if (!ctx) return

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Wizardry: Proving Grounds of the Mad Overlord', canvas.width / 2, canvas.height / 2)
  ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2 + 30)
}

/**
 * Game loop - update and render
 */
function gameLoop(currentTime: number) {
  if (!isRunning) return

  // Calculate delta time
  const deltaTime = currentTime - lastFrameTime
  lastFrameTime = currentTime

  // Update and render current scene
  if (currentScene && ctx) {
    currentScene.update(deltaTime)
    currentScene.render(ctx)
  }

  // Continue loop
  requestAnimationFrame(gameLoop)
}

/**
 * Initialize game
 */
async function initGame() {
  // Initial resize
  resizeCanvas()

  // Listen for window resize
  window.addEventListener('resize', resizeCanvas)

  // Draw initial loading screen
  drawLoadingScreen()

  // Create and initialize title screen
  const titleScreen = new TitleScreenScene()
  if (!ctx) throw new Error('Canvas context is null')
  await titleScreen.init(canvas, ctx)

  // Set as current scene
  currentScene = titleScreen

  // Start game loop
  isRunning = true
  lastFrameTime = performance.now()
  requestAnimationFrame(gameLoop)

  console.log('Wizardry initialized - Title screen loaded')
}

// Start the game
initGame().catch(error => {
  console.error('Failed to initialize game:', error)
  if (ctx) {
    ctx.fillStyle = '#f00'
    ctx.font = '16px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Error: Failed to initialize game', canvas.width / 2, canvas.height / 2)
    ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 30)
  }
})
