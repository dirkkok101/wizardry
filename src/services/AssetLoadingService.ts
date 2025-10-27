/**
 * AssetLoadingService - Pure function service for loading game assets
 */

export interface TitleAssets {
  titleBitmap: HTMLImageElement
  fonts: FontFace[]
  uiSounds?: {
    click?: AudioBuffer
    beep?: AudioBuffer
  }
}

export interface GameAssets {
  sprites: Record<string, HTMLImageElement>
  sounds: Record<string, AudioBuffer>
  dataFiles: Map<string, any>
}

export interface LoadingStats {
  totalCount: number
  loadedCount: number
  failedCount: number
  progress: number
  state: 'idle' | 'loading' | 'complete' | 'error'
}

class AssetLoadError extends Error {
  constructor(
    public assetId: string,
    public assetType: string,
    public reason: string,
    public originalError?: Error
  ) {
    super(`Failed to load ${assetType} '${assetId}': ${reason}`)
    this.name = 'AssetLoadError'
  }
}

// Asset cache
const assetCache = new Map<string, any>()
const loadingStats: LoadingStats = {
  totalCount: 0,
  loadedCount: 0,
  failedCount: 0,
  progress: 0,
  state: 'idle'
}

// Event handlers
const loadCompleteHandlers: Array<() => void> = []
const loadProgressHandlers: Array<(progress: number) => void> = []
const loadErrorHandlers: Array<(error: AssetLoadError) => void> = []

/**
 * Load title screen assets (critical path)
 */
async function loadTitleAssets(): Promise<TitleAssets> {
  // Load title bitmap
  const titleBitmap = await loadImage('title_bitmap', '/assets/images/scenes/scene-title-screen.png')

  // For now, return minimal assets (fonts can be added later)
  return {
    titleBitmap,
    fonts: []
  }
}

/**
 * Load castle menu background image
 */
async function loadCastleMenuAssets(): Promise<HTMLImageElement> {
  return await loadImage('castle_menu_bg', '/assets/images/scenes/scene-castle-menu.png')
}

/**
 * Load training grounds background image
 */
async function loadTrainingGroundsAssets(): Promise<HTMLImageElement> {
  return await loadImage('training_grounds_bg', '/assets/images/scenes/scene-training-grounds.png')
}

/**
 * Load all game assets in parallel
 */
async function loadGameAssets(): Promise<GameAssets> {
  loadingStats.state = 'loading'
  loadingStats.totalCount = 1 // Will increase as we add more assets

  try {
    // For now, just return empty assets
    // Will be expanded in future tasks
    const assets: GameAssets = {
      sprites: {},
      sounds: {},
      dataFiles: new Map()
    }

    loadingStats.loadedCount = loadingStats.totalCount
    loadingStats.progress = 100
    loadingStats.state = 'complete'

    // Notify handlers
    loadCompleteHandlers.forEach(handler => handler())

    return assets
  } catch (error) {
    loadingStats.state = 'error'
    throw error
  }
}

/**
 * Load an image asset
 */
async function loadImage(assetId: string, path: string): Promise<HTMLImageElement> {
  // Check cache first
  if (assetCache.has(assetId)) {
    return assetCache.get(assetId)
  }

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      assetCache.set(assetId, img)
      resolve(img)
    }

    img.onerror = () => {
      reject(new AssetLoadError(
        assetId,
        'image',
        `Failed to load image from ${path}`
      ))
    }

    img.src = path
  })
}

/**
 * Check if asset is loaded
 */
function isAssetLoaded(assetId: string): boolean {
  return assetCache.has(assetId)
}

/**
 * Get loaded asset by ID
 */
function getAsset<T>(assetId: string): T | null {
  return assetCache.get(assetId) ?? null
}

/**
 * Get loading progress (0-100)
 */
function getLoadingProgress(): number {
  return loadingStats.progress
}

/**
 * Get loading statistics
 */
function getLoadingStats(): LoadingStats {
  return { ...loadingStats }
}

/**
 * Register callback for load complete
 */
function onLoadComplete(callback: () => void): () => void {
  loadCompleteHandlers.push(callback)

  // Return unsubscribe function
  return () => {
    const index = loadCompleteHandlers.indexOf(callback)
    if (index > -1) {
      loadCompleteHandlers.splice(index, 1)
    }
  }
}

/**
 * Register callback for load progress
 */
function onLoadProgress(callback: (progress: number) => void): () => void {
  loadProgressHandlers.push(callback)

  return () => {
    const index = loadProgressHandlers.indexOf(callback)
    if (index > -1) {
      loadProgressHandlers.splice(index, 1)
    }
  }
}

/**
 * Register callback for load errors
 */
function onLoadError(callback: (error: AssetLoadError) => void): () => void {
  loadErrorHandlers.push(callback)

  return () => {
    const index = loadErrorHandlers.indexOf(callback)
    if (index > -1) {
      loadErrorHandlers.splice(index, 1)
    }
  }
}

/**
 * Clear all cached assets
 */
function clearCache(): void {
  assetCache.clear()
  loadingStats.loadedCount = 0
  loadingStats.failedCount = 0
  loadingStats.progress = 0
  loadingStats.state = 'idle'
}

export const AssetLoadingService = {
  loadTitleAssets,
  loadCastleMenuAssets,
  loadTrainingGroundsAssets,
  loadGameAssets,
  isAssetLoaded,
  getAsset,
  getLoadingProgress,
  getLoadingStats,
  onLoadComplete,
  onLoadProgress,
  onLoadError,
  clearCache
}
