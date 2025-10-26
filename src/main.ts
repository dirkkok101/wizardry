/**
 * Wizardry: Proving Grounds of the Mad Overlord
 * Main entry point
 */

// Initialize canvas
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('Failed to get 2D context')
}

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

  // Redraw after resize
  drawLoadingScreen()
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

// Initial resize
resizeCanvas()

// Listen for window resize
window.addEventListener('resize', resizeCanvas)

console.log('Wizardry initialized')
