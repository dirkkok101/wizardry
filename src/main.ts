/**
 * Wizardry: Proving Grounds of the Mad Overlord
 * Main entry point
 */

// Initialize canvas
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

// Set canvas size (640x480 - classic 4:3 aspect ratio)
canvas.width = 640
canvas.height = 480

const ctx = canvas.getContext('2d')
if (!ctx) {
  throw new Error('Failed to get 2D context')
}

// Temporary: Display loading message
ctx.fillStyle = '#000'
ctx.fillRect(0, 0, canvas.width, canvas.height)
ctx.fillStyle = '#fff'
ctx.font = '16px monospace'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('Wizardry: Proving Grounds of the Mad Overlord', canvas.width / 2, canvas.height / 2)
ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2 + 30)

console.log('Wizardry initialized')
