import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Global test configuration
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance']
  })
});

Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>'
});

Object.defineProperty(document.body.style, 'transform', {
  value: () => ({
    enumerable: true,
    configurable: true
  })
});

// Mock HTMLCanvasElement.getContext for canvas rendering tests
HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      setTransform: jest.fn(),
      resetTransform: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      fillText: jest.fn(),
      strokeText: jest.fn(),
      drawImage: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: jest.fn(),
      canvas: {
        width: 450,
        height: 450
      }
    } as any;
  }
  return null;
}) as any;
