import { AssetLoadingService } from '../AssetLoadingService'

// Mock HTMLImageElement
global.Image = class MockImage {
  src = ''
  onload: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    // Simulate successful load after a short delay
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 10)
  }
} as any

describe('AssetLoadingService', () => {
  beforeEach(() => {
    AssetLoadingService.clearCache()
  })

  describe('loadTitleAssets', () => {
    it('should load title bitmap and return TitleAssets', async () => {
      const assets = await AssetLoadingService.loadTitleAssets()

      expect(assets).toBeDefined()
      expect(assets.titleBitmap).toBeDefined()
    })

    it('should complete in under 500ms', async () => {
      const start = Date.now()
      await AssetLoadingService.loadTitleAssets()
      const duration = Date.now() - start

      expect(duration).toBeLessThan(500)
    })

    it('should cache loaded assets', async () => {
      await AssetLoadingService.loadTitleAssets()

      expect(AssetLoadingService.isAssetLoaded('title_bitmap')).toBe(true)
    })
  })

  describe('loadGameAssets', () => {
    it('should load game assets and fire onLoadComplete', async () => {
      const completeSpy = jest.fn()
      AssetLoadingService.onLoadComplete(completeSpy)

      await AssetLoadingService.loadGameAssets()

      expect(completeSpy).toHaveBeenCalled()
    })

    it('should update loading stats', async () => {
      await AssetLoadingService.loadGameAssets()

      const stats = AssetLoadingService.getLoadingStats()
      expect(stats.state).toBe('complete')
      expect(stats.progress).toBe(100)
    })
  })

  describe('getAsset', () => {
    it('should return null for non-existent asset', () => {
      const asset = AssetLoadingService.getAsset('nonexistent')
      expect(asset).toBeNull()
    })

    it('should return cached asset', async () => {
      await AssetLoadingService.loadTitleAssets()

      const bitmap = AssetLoadingService.getAsset<HTMLImageElement>('title_bitmap')
      expect(bitmap).toBeDefined()
    })
  })

  describe('loadTrainingGroundsAssets', () => {
    it('loads training grounds background image', async () => {
      const image = await AssetLoadingService.loadTrainingGroundsAssets()
      expect(image).toBeDefined()
    })

    it('caches training grounds image', async () => {
      const image1 = await AssetLoadingService.loadTrainingGroundsAssets()
      const image2 = await AssetLoadingService.loadTrainingGroundsAssets()
      expect(image1).toBe(image2)
    })
  })

  describe('clearCache', () => {
    it('should remove all cached assets', async () => {
      await AssetLoadingService.loadTitleAssets()
      expect(AssetLoadingService.isAssetLoaded('title_bitmap')).toBe(true)

      AssetLoadingService.clearCache()
      expect(AssetLoadingService.isAssetLoaded('title_bitmap')).toBe(false)
    })
  })
})
