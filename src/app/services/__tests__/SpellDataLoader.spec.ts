import { SpellDataLoader } from '../SpellDataLoader'
import { SpellDefinition } from '@models/SpellDefinition'

// Note: global.fetch is mocked in setup-jest.ts to load real spell data from data/spells/
// This follows the project philosophy: "No mocks for services - test with real data"

// Data-driven: load spell count from index.json (source of truth)
const spellIndex = require('@data/spells/index.json') as string[]
const EXPECTED_SPELL_COUNT = spellIndex.length

// SpellDataLoader tests need to clear cache for isolation
// Use beforeEach to ensure fresh state for each test
beforeEach(() => {
  SpellDataLoader.clearCache()
  // Each test in this file will call loadAllSpells() explicitly if needed
})

// After all SpellDataLoader tests complete, reload spells so other test files have them
afterAll(async () => {
  SpellDataLoader.clearCache()
  await SpellDataLoader.loadAllSpells()
})

describe('SpellDataLoader', () => {
  describe('loadAllSpells', () => {
    it('loads and validates all spell JSON files', async () => {
      const spells = await SpellDataLoader.loadAllSpells()

      // Data-driven: all spells in index.json should load successfully
      expect(spells.size).toBe(EXPECTED_SPELL_COUNT)
      expect(SpellDataLoader.getFailedSpells().size).toBe(0)

      // Verify some successfully loaded spells
      expect(spells.has('halito')).toBe(true)
      expect(spells.has('dios')).toBe(true)
    })

    it('validates spell structure with Zod', async () => {
      const spells = await SpellDataLoader.loadAllSpells()
      const halito = spells.get('halito')

      expect(halito).toBeDefined()
      expect(halito!.id).toBe('halito')
      expect(halito!.name).toBe('HALITO')
      expect(halito!.level).toBe(1)
      expect(halito!.casterType).toBe('mage')
      expect(halito!.loaded).toBe(true)
      expect(halito!.validatedAt).toBeGreaterThan(0)
    })

    it('caches loaded spells to avoid reloading', async () => {
      const spells1 = await SpellDataLoader.loadAllSpells()
      const spells2 = await SpellDataLoader.loadAllSpells()

      expect(spells1).toBe(spells2)  // Same object reference
    })

    it('gracefully handles individual spell validation failures', async () => {
      // Clear cache first to ensure clean state
      SpellDataLoader.clearCache()

      // Temporarily replace the mock to return invalid data for one spell
      const originalFetch = global.fetch;
      (global.fetch as any) = jest.fn((url: string) => {
        // Handle manifest file
        if (url.includes('/index.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(['halito', 'mogref', 'katino'])
          } as Response)
        }

        const spellId = url.split('/').pop()?.replace('.json', '')

        if (spellId === 'halito') {
          // Return invalid spell data (missing required fields)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'halito', invalidField: 'bad' })
          } as Response)
        }

        // Return valid data for other spells
        const isMage = ['mogref', 'katino'].includes(spellId as string)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: spellId,
            name: spellId?.toUpperCase() || 'UNKNOWN',
            level: 1,
            casterType: isMage ? 'mage' : 'priest',
            category: 'offensive',
            target: 'group',
            damage: { dice: '1d8', type: 'fire' },
            description: `Mock spell ${spellId}`,
            castableIn: ['combat']
          })
        } as Response)
      })

      const spells = await SpellDataLoader.loadAllSpells()

      // Should load successfully despite one failure
      expect(spells.size).toBeGreaterThan(0)
      expect(spells.has('halito')).toBe(false)  // Failed spell not in results
      expect(SpellDataLoader.getFailedSpells().has('halito')).toBe(true)  // Tracked as failed

      // Restore original mock
      global.fetch = originalFetch
    })
  })

  describe('getSpell', () => {
    it('returns spell by ID after loading', async () => {
      await SpellDataLoader.loadAllSpells()
      const halito = SpellDataLoader.getSpell('halito')

      expect(halito).toBeDefined()
      expect(halito!.name).toBe('HALITO')
    })

    it('returns undefined for unknown spell', async () => {
      await SpellDataLoader.loadAllSpells()
      const unknown = SpellDataLoader.getSpell('fakespell')

      expect(unknown).toBeUndefined()
    })

    it('throws error if spells not loaded', () => {
      expect(() => SpellDataLoader.getSpell('halito')).toThrow('Spells not loaded')
    })
  })

  describe('getAllSpells', () => {
    it('returns all loaded spells', async () => {
      await SpellDataLoader.loadAllSpells()
      const spells = SpellDataLoader.getAllSpells()

      expect(spells.size).toBe(EXPECTED_SPELL_COUNT)
    })

    it('throws error if spells not loaded', () => {
      expect(() => SpellDataLoader.getAllSpells()).toThrow('Spells not loaded')
    })
  })

  describe('loading state tracking', () => {
    it('tracks loading state during load', async () => {
      expect(SpellDataLoader.isLoading()).toBe(false)
      expect(SpellDataLoader.isLoaded()).toBe(false)

      const loadPromise = SpellDataLoader.loadAllSpells()
      // Note: isLoading() may be false here due to fast execution in tests

      await loadPromise

      expect(SpellDataLoader.isLoading()).toBe(false)
      expect(SpellDataLoader.isLoaded()).toBe(true)
    })

    it('returns loaded count after loading', async () => {
      expect(SpellDataLoader.getLoadedCount()).toBe(0)

      await SpellDataLoader.loadAllSpells()

      expect(SpellDataLoader.getLoadedCount()).toBe(EXPECTED_SPELL_COUNT)
    })

    it('returns total count including failed spells', async () => {
      await SpellDataLoader.loadAllSpells()
      const loadedCount = SpellDataLoader.getLoadedCount()
      const failedCount = SpellDataLoader.getFailedSpells().size
      const totalCount = SpellDataLoader.getTotalCount()

      expect(totalCount).toBe(loadedCount + failedCount)
    })

    it('returns null error when load succeeds', async () => {
      await SpellDataLoader.loadAllSpells()

      expect(SpellDataLoader.getError()).toBeNull()
    })

    it('returns readonly map of failed spells', async () => {
      await SpellDataLoader.loadAllSpells()
      const failedSpells = SpellDataLoader.getFailedSpells()

      expect(failedSpells).toBeInstanceOf(Map)
      // ReadonlyMap check - should not have set method in type
      expect(typeof failedSpells.get).toBe('function')
    })
  })

  describe('clearCache', () => {
    it('resets all state flags', async () => {
      await SpellDataLoader.loadAllSpells()
      expect(SpellDataLoader.isLoaded()).toBe(true)
      expect(SpellDataLoader.getLoadedCount()).toBeGreaterThan(0)

      SpellDataLoader.clearCache()

      expect(SpellDataLoader.isLoaded()).toBe(false)
      expect(SpellDataLoader.isLoading()).toBe(false)
      expect(SpellDataLoader.getLoadedCount()).toBe(0)
      expect(SpellDataLoader.getFailedSpells().size).toBe(0)
      expect(SpellDataLoader.getError()).toBeNull()
    })
  })
})
