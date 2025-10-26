// Test setup file

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => {
    return localStorageMock.store[key] || null
  },
  setItem: (key: string, value: string) => {
    localStorageMock.store[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageMock.store[key]
  },
  clear: () => {
    localStorageMock.store = {}
  },
  store: {} as Record<string, string>
}

global.localStorage = localStorageMock as Storage

// Mock Canvas
class MockCanvas {
  width = 800
  height = 600

  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      drawImage: () => {},
      fillText: () => {},
      strokeText: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
    }
  }
}

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function() {
    return new MockCanvas().getContext()
  } as any
}
