import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { SpellDataLoader } from './src/services/SpellDataLoader';
import { MonsterDataLoader } from './src/services/MonsterDataLoader';
import { ClassDataLoader } from './src/services/ClassDataLoader';
import * as fs from 'fs';
import * as path from 'path';

setupZoneTestEnv();

// Use real spell data from data/ directory
// This approach follows the project's testing philosophy: "No mocks for services - test with real data"
global.fetch = jest.fn(async (url: string) => {
  const urlPath = url.toString();

  // Convert /assets/... URLs to data/ directory paths
  // Example: /assets/spells/halito.json -> data/spells/halito.json
  let filePath: string;
  if (urlPath.includes('/assets/')) {
    const assetsIndex = urlPath.indexOf('/assets/');
    const relativePath = urlPath.substring(assetsIndex + '/assets/'.length);
    filePath = path.join(__dirname, 'data', relativePath);
  } else {
    // Fallback for other paths
    filePath = urlPath;
  }

  try {
    // Read actual JSON file from filesystem
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => jsonData
    } as Response);
  } catch (error) {
    // File not found or parse error
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => { throw new Error('Not found'); }
    } as Response);
  }
}) as jest.Mock;

// Pre-load classes, spells, and monsters for all tests using real data
beforeAll(async () => {
  await Promise.all([
    ClassDataLoader.loadAllClasses(),
    SpellDataLoader.loadAllSpells(),
    MonsterDataLoader.loadAllMonsters()
  ]);
});

// Clear caches after all tests
afterAll(() => {
  ClassDataLoader.clearCache();
  SpellDataLoader.clearCache();
  MonsterDataLoader.clearCache();
});

// Polyfill ImageData for canvas tests
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;

    constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
      if (dataOrWidth instanceof Uint8ClampedArray) {
        this.data = dataOrWidth;
        this.width = widthOrHeight;
        this.height = height || dataOrWidth.length / (4 * widthOrHeight);
      } else {
        this.width = dataOrWidth;
        this.height = widthOrHeight;
        this.data = new Uint8ClampedArray(dataOrWidth * widthOrHeight * 4);
      }
    }
  } as any;
}

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
