# AssetLoadingService

**Pure function service for loading and managing game assets (graphics, sounds, data files).**

## Responsibility

Handles progressive loading of all game assets including images, sprite sheets, audio files, fonts, and JSON data files. Provides loading progress tracking, error handling, and caching for optimal performance.

## Overview

The AssetLoadingService implements a two-phase loading strategy:
1. **Critical Path:** Load minimal assets needed to display title screen
2. **Parallel Loading:** Load remaining game assets in background

This approach ensures fast initial render while preparing the full game experience.

**Key Features:**
- Progressive asset loading
- Loading progress tracking
- Asset caching and preloading
- Error recovery and retry logic
- Memory-efficient asset management

## API Reference

### loadTitleAssets

Load critical assets needed for title screen display.

**Signature:**
```typescript
function loadTitleAssets(): Promise<TitleAssets>
```

**Returns:** Promise resolving to title screen assets

**Throws:**
- `AssetLoadError` if critical assets fail to load

**Example:**
```typescript
const titleAssets = await AssetLoadingService.loadTitleAssets()
// titleAssets.titleBitmap now available for rendering
// Title screen can display while game assets load
```

**Assets Loaded:**
- Title screen bitmap (< 10KB PNG)
- UI fonts (web fonts or custom fonts)
- Basic UI sounds (optional beep/click)

**Load Time:** Target < 500ms

### loadGameAssets

Load all remaining game assets in parallel.

**Signature:**
```typescript
function loadGameAssets(): Promise<GameAssets>
```

**Returns:** Promise resolving to complete game asset collection

**Throws:**
- `AssetLoadError` if critical game assets fail to load
- Non-critical asset failures are logged but don't throw

**Example:**
```typescript
// Start loading in background
AssetLoadingService.loadGameAssets().then(assets => {
  console.log('All game assets loaded')
  // Enable START button
})

// Or with await
const gameAssets = await AssetLoadingService.loadGameAssets()
// All sprites, sounds, and data files now available
```

**Assets Loaded:**
- Sprite sheets (characters, monsters, items, dungeon tiles)
- Sound effects (combat, spells, UI)
- Background music tracks
- Data files (classes, races, spells, items, monsters, maps)

**Load Time:** Target 1-3 seconds

### loadDataFiles

Load all JSON data files for game content.

**Signature:**
```typescript
function loadDataFiles(): Promise<DataFiles>
```

**Returns:** Promise resolving to loaded data files

**Throws:**
- `DataLoadError` if data files fail to load or parse

**Example:**
```typescript
const dataFiles = await AssetLoadingService.loadDataFiles()
// dataFiles.classes contains all class definitions
// dataFiles.spells contains all spell definitions
```

**Data Files Loaded:**
- Classes (8 files)
- Races (5 files)
- Spells (56 files)
- Items (80+ files)
- Monsters (96 files)
- Maps (10 files)

### isAssetLoaded

Check if a specific asset has been loaded.

**Signature:**
```typescript
function isAssetLoaded(assetId: string): boolean
```

**Parameters:**
- `assetId`: Unique asset identifier

**Returns:** True if asset is loaded and cached, false otherwise

**Example:**
```typescript
if (AssetLoadingService.isAssetLoaded('title_bitmap')) {
  // Asset is available
  const bitmap = AssetLoadingService.getAsset('title_bitmap')
}
```

### getAsset

Retrieve a loaded asset by ID.

**Signature:**
```typescript
function getAsset<T>(assetId: string): T | null
```

**Parameters:**
- `assetId`: Unique asset identifier

**Returns:** Asset if loaded, null if not found

**Throws:**
- Never throws (returns null for missing assets)

**Example:**
```typescript
// Get image asset
const titleBitmap = AssetLoadingService.getAsset<HTMLImageElement>('title_bitmap')

// Get sound asset
const clickSound = AssetLoadingService.getAsset<AudioBuffer>('ui_click')

// Get data asset
const fighterClass = AssetLoadingService.getAsset<Class>('class_fighter')
```

### preloadAssets

Preload specific assets before they're needed.

**Signature:**
```typescript
function preloadAssets(assetIds: string[]): Promise<void>
```

**Parameters:**
- `assetIds`: Array of asset identifiers to preload

**Returns:** Promise resolving when all assets loaded

**Example:**
```typescript
// Preload combat assets before entering combat
await AssetLoadingService.preloadAssets([
  'combat_music',
  'spell_effects',
  'monster_sprites_level_1'
])
```

### getLoadingProgress

Get overall loading progress percentage.

**Signature:**
```typescript
function getLoadingProgress(): number
```

**Returns:** Progress percentage (0-100)

**Example:**
```typescript
const progress = AssetLoadingService.getLoadingProgress()
console.log(`Loading: ${progress}%`)
// Loading: 67%
```

### getLoadingStats

Get detailed loading statistics.

**Signature:**
```typescript
function getLoadingStats(): LoadingStats
```

**Returns:** Detailed loading statistics object

**Example:**
```typescript
const stats = AssetLoadingService.getLoadingStats()
console.log(`Loaded ${stats.loadedCount} / ${stats.totalCount} assets`)
console.log(`Failed: ${stats.failedCount}`)
console.log(`Size: ${stats.totalSize} bytes`)
```

### onLoadStart

Register callback for when loading starts.

**Signature:**
```typescript
function onLoadStart(callback: () => void): () => void
```

**Parameters:**
- `callback`: Function called when loading begins

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = AssetLoadingService.onLoadStart(() => {
  console.log('Asset loading started')
  showLoadingScreen()
})

// Later: unsubscribe()
```

### onLoadProgress

Register callback for loading progress updates.

**Signature:**
```typescript
function onLoadProgress(callback: (progress: number) => void): () => void
```

**Parameters:**
- `callback`: Function called with progress percentage (0-100)

**Returns:** Unsubscribe function

**Example:**
```typescript
AssetLoadingService.onLoadProgress((progress) => {
  updateProgressBar(progress)
  console.log(`Loading: ${progress}%`)
})
```

### onLoadComplete

Register callback for when all assets finish loading.

**Signature:**
```typescript
function onLoadComplete(callback: () => void): () => void
```

**Parameters:**
- `callback`: Function called when loading completes

**Returns:** Unsubscribe function

**Example:**
```typescript
AssetLoadingService.onLoadComplete(() => {
  console.log('All assets loaded!')
  enableStartButton()
})
```

### onLoadError

Register callback for loading errors.

**Signature:**
```typescript
function onLoadError(callback: (error: AssetLoadError) => void): () => void
```

**Parameters:**
- `callback`: Function called when asset loading fails

**Returns:** Unsubscribe function

**Example:**
```typescript
AssetLoadingService.onLoadError((error) => {
  console.error('Asset load failed:', error.assetId, error.message)
  showErrorMessage(`Failed to load ${error.assetId}`)
})
```

### clearCache

Clear all cached assets from memory.

**Signature:**
```typescript
function clearCache(): void
```

**Example:**
```typescript
// Clear cache when returning to title screen
AssetLoadingService.clearCache()
```

### retryFailedAssets

Retry loading assets that previously failed.

**Signature:**
```typescript
function retryFailedAssets(): Promise<void>
```

**Returns:** Promise resolving when retry completes

**Example:**
```typescript
// If initial load failed, retry
if (stats.failedCount > 0) {
  await AssetLoadingService.retryFailedAssets()
}
```

## Data Structures

### TitleAssets

Assets needed for title screen display.

```typescript
interface TitleAssets {
  // Title screen bitmap graphic
  titleBitmap: HTMLImageElement

  // UI fonts
  fonts: FontFace[]

  // Optional UI sounds
  uiSounds?: {
    click?: AudioBuffer
    beep?: AudioBuffer
  }
}
```

### GameAssets

Complete collection of game assets.

```typescript
interface GameAssets {
  // Sprite sheets organized by category
  sprites: {
    characters: Record<string, HTMLImageElement>
    monsters: Record<string, HTMLImageElement>
    items: Record<string, HTMLImageElement>
    ui: Record<string, HTMLImageElement>
    dungeon: Record<string, HTMLImageElement>
  }

  // Sound effects organized by category
  sounds: {
    combat: Record<string, AudioBuffer>
    spells: Record<string, AudioBuffer>
    ui: Record<string, AudioBuffer>
    ambient: Record<string, AudioBuffer>
  }

  // Background music tracks
  music: Record<string, AudioBuffer>

  // Game data files
  dataFiles: DataFiles
}
```

### DataFiles

JSON data files for game content.

```typescript
interface DataFiles {
  // Character classes (8 classes)
  classes: Map<string, Class>

  // Races (5 races)
  races: Map<string, Race>

  // Spells (56 spells)
  spells: Map<string, Spell>

  // Items (80+ items)
  items: Map<string, Item>

  // Monsters (96 monsters)
  monsters: Map<string, Monster>

  // Dungeon maps (10 levels)
  maps: Map<number, DungeonLevel>
}
```

### LoadingStats

Detailed loading statistics.

```typescript
interface LoadingStats {
  // Total number of assets to load
  totalCount: number

  // Number of assets successfully loaded
  loadedCount: number

  // Number of assets that failed to load
  failedCount: number

  // Total size of loaded assets in bytes
  totalSize: number

  // Loading progress (0-100)
  progress: number

  // Loading state
  state: 'idle' | 'loading' | 'complete' | 'error'

  // Load start time
  startTime: number

  // Load end time (if complete)
  endTime?: number

  // Duration in milliseconds (if complete)
  duration?: number
}
```

### AssetLoadError

Error thrown when asset loading fails.

```typescript
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
```

## Asset Loading Strategy

### Two-Phase Loading

**Phase 1: Critical Path (Immediate)**
```typescript
// Load minimal assets for title screen
const titleAssets = await loadTitleAssets()
// Title screen displays with "Loading..." button

// Assets loaded:
// - title_bitmap.png (< 10KB)
// - ui_font.woff2 (< 20KB)
// - ui_click.mp3 (< 5KB, optional)

// Total: < 35KB, loads in ~500ms
```

**Phase 2: Parallel Loading (Background)**
```typescript
// Start background loading
loadGameAssets() // Non-blocking

// Assets loaded in parallel:
// - All sprite sheets (~500KB)
// - All sound effects (~2MB)
// - All data files (~500KB)
// - Background music (~5MB, lowest priority)

// Total: ~8MB, loads in 1-3 seconds

// When complete, enable START button
```

### Asset Manifest

All assets defined in a central manifest:

```typescript
const ASSET_MANIFEST = {
  // Critical path assets
  critical: [
    {
      id: 'title_bitmap',
      type: 'image',
      path: '/assets/images/title.png',
      size: 9500 // bytes
    },
    {
      id: 'ui_font',
      type: 'font',
      path: '/assets/fonts/ui.woff2',
      size: 18000
    }
  ],

  // Game assets
  sprites: [
    {
      id: 'character_sprites',
      type: 'image',
      path: '/assets/sprites/characters.png',
      size: 125000
    }
    // ... more sprites
  ],

  sounds: [
    {
      id: 'combat_hit',
      type: 'audio',
      path: '/assets/sounds/combat_hit.mp3',
      size: 15000
    }
    // ... more sounds
  ],

  data: [
    {
      id: 'class_fighter',
      type: 'json',
      path: '/data/classes/fighter.json',
      size: 500
    }
    // ... more data files
  ]
}
```

### Progressive Loading

Assets loaded in priority order:

1. **Critical:** Title bitmap, UI fonts (phase 1)
2. **High Priority:** UI sprites, core sounds, data files
3. **Medium Priority:** Character/monster sprites, combat sounds
4. **Low Priority:** Background music, optional effects

```typescript
// Load by priority
await loadCriticalAssets()    // Must succeed
await loadHighPriorityAssets() // Should succeed
loadMediumPriorityAssets()     // Best effort
loadLowPriorityAssets()        // Optional
```

## Error Handling

### Retry Logic

Failed assets automatically retry with exponential backoff:

```typescript
async function loadAssetWithRetry(
  assetId: string,
  maxRetries = 3
): Promise<Asset> {
  let lastError: Error

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await loadAsset(assetId)
    } catch (error) {
      lastError = error
      // Exponential backoff: 1s, 2s, 4s
      await delay(Math.pow(2, attempt) * 1000)
    }
  }

  throw new AssetLoadError(
    assetId,
    'unknown',
    `Failed after ${maxRetries} retries`,
    lastError
  )
}
```

### Fallback Assets

Critical assets have fallbacks:

```typescript
// If title bitmap fails, use base64 inline
const titleBitmap = await loadAsset('title_bitmap').catch(() => {
  return loadInlineFallback('title_bitmap_fallback')
})

// If sound fails, use silent placeholder
const clickSound = await loadAsset('ui_click').catch(() => {
  return createSilentAudioBuffer()
})
```

### Graceful Degradation

Non-critical failures don't block gameplay:

```typescript
// Music fails? Continue without music
try {
  await loadAsset('battle_music')
} catch (error) {
  console.warn('Battle music failed to load, continuing without')
  // Game still playable
}
```

## Caching Strategy

### Memory Cache

Loaded assets cached in memory:

```typescript
const assetCache = new Map<string, any>()

// Get from cache first
function getAsset<T>(assetId: string): T | null {
  return assetCache.get(assetId) ?? null
}

// Cache on load
async function loadAndCache(assetId: string): Promise<void> {
  const asset = await fetchAsset(assetId)
  assetCache.set(assetId, asset)
}
```

### Browser Cache

Assets cached by browser via HTTP headers:

```
Cache-Control: public, max-age=31536000, immutable
```

- Images: Long cache (1 year)
- Sounds: Long cache (1 year)
- Data files: Short cache (1 hour, may change in updates)

### Service Worker (Optional)

For offline support, use service worker to cache assets:

```javascript
// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('wizardry-v1').then((cache) => {
      return cache.addAll([
        '/assets/images/title.png',
        '/assets/fonts/ui.woff2',
        // ... all assets
      ])
    })
  )
})
```

## Performance Optimization

### Image Optimization

- **Format:** PNG for pixel art, WebP for photos
- **Compression:** Optimize with tools (pngcrush, optipng)
- **Size:** Title bitmap < 10KB, sprites < 200KB each
- **Loading:** Use `<img>` preload or `new Image()`

### Audio Optimization

- **Format:** MP3 for compatibility, OGG for size
- **Bitrate:** 128kbps for music, 64kbps for SFX
- **Size:** Keep sounds < 50KB each
- **Loading:** Use Web Audio API for low-latency playback

### Data File Optimization

- **Format:** Minified JSON (no whitespace)
- **Size:** Individual files < 5KB each
- **Loading:** Parallel fetch with Promise.all()
- **Parsing:** Stream parse for large files (if needed)

### Lazy Loading

Load assets on-demand when needed:

```typescript
// Load combat assets only when entering combat
async function enterCombat() {
  await AssetLoadingService.preloadAssets([
    'combat_music',
    'spell_effects',
    'monster_sprites_level_1'
  ])

  // Now start combat
  await SceneNavigationService.transitionTo(SceneType.COMBAT)
}
```

## Dependencies

Uses:
- Browser Fetch API (asset downloading)
- Web Audio API (audio loading)
- Canvas API (image loading)

Used by:
- Title Screen (loadTitleAssets, loadGameAssets)
- Data Services (loadDataFiles)
- Combat Scene (preload combat assets)
- All scenes (getAsset for sprites/sounds)

## Testing

See [AssetLoadingService.test.ts](../../tests/services/AssetLoadingService.test.ts)

**Key test cases:**
- loadTitleAssets succeeds with valid assets
- loadGameAssets loads all asset categories
- getAsset returns cached asset
- getAsset returns null for missing asset
- isAssetLoaded returns correct status
- getLoadingProgress returns correct percentage
- onLoadComplete fires when loading finishes
- onLoadError fires on load failure
- retryFailedAssets retries failed assets
- clearCache removes all cached assets

**Performance tests:**
- Title assets load in < 500ms
- Game assets load in < 3s (on average connection)
- Progress updates fire at reasonable intervals
- Memory usage stays within bounds
- No memory leaks after clearCache()

## Usage Examples

### Title Screen Loading Flow

```typescript
// Title screen component
async function initializeTitleScreen() {
  // 1. Load critical assets first
  const titleAssets = await AssetLoadingService.loadTitleAssets()

  // Display title screen with "Loading..." button
  renderTitleScreen(titleAssets.titleBitmap)

  // 2. Start background loading
  AssetLoadingService.onLoadProgress((progress) => {
    // Optional: show progress
    console.log(`Loading: ${progress}%`)
  })

  AssetLoadingService.onLoadComplete(() => {
    // Enable START button
    setState({ assetsLoaded: true, mode: 'READY' })
  })

  AssetLoadingService.loadGameAssets()
}
```

### Loading with Progress Bar

```typescript
function showLoadingWithProgress() {
  const progressBar = document.getElementById('progress-bar')

  AssetLoadingService.onLoadProgress((progress) => {
    progressBar.style.width = `${progress}%`
    progressBar.textContent = `${Math.round(progress)}%`
  })

  AssetLoadingService.onLoadComplete(() => {
    progressBar.style.width = '100%'
    setTimeout(() => {
      hideLoadingScreen()
    }, 500)
  })

  AssetLoadingService.loadGameAssets()
}
```

### Preloading Combat Assets

```typescript
async function prepareForCombat(encounterLevel: number) {
  // Preload assets for this dungeon level
  await AssetLoadingService.preloadAssets([
    `monster_sprites_level_${encounterLevel}`,
    'combat_music',
    'spell_effect_fire',
    'spell_effect_ice'
  ])

  // Assets ready, start combat
  await SceneNavigationService.transitionTo(SceneType.COMBAT)
}
```

### Error Recovery

```typescript
async function loadAssetsWithRecovery() {
  try {
    await AssetLoadingService.loadGameAssets()
  } catch (error) {
    console.error('Asset loading failed:', error)

    // Get stats to see what failed
    const stats = AssetLoadingService.getLoadingStats()
    console.log(`Failed assets: ${stats.failedCount}`)

    // Try to recover
    const shouldRetry = confirm('Some assets failed to load. Retry?')
    if (shouldRetry) {
      await AssetLoadingService.retryFailedAssets()
    } else {
      // Continue with degraded experience
      console.warn('Continuing with missing assets')
    }
  }
}
```

## Related

- [Title Screen](../ui/scenes/00-title-screen.md) - Primary user
- [SceneNavigationService](./SceneNavigationService.md) - Scene transitions
- [Data Services](./data-services.md) - Uses loadDataFiles()
- [SaveService](./SaveService.md) - May preload save data

---

**Last Updated:** 2025-10-26
