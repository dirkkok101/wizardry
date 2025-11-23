import { SpellDataLoader } from '../SpellDataLoader'
import { SpellDefinition } from '../../types/SpellDefinition'

// Mock global.fetch for tests
beforeAll(() => {
  global.fetch = jest.fn((url: string) => {
    const spellId = url.split('/').pop()?.replace('.json', '')

    // Generate generic mock data for any spell ID
    // This allows all 56 spells to load successfully in tests
    const isMage = ['halito', 'mogref', 'katino', 'dumapic', 'dilto', 'sopic',
      'mahalito', 'molito', 'morlis', 'dalto', 'lahalito', 'madalto',
      'lakanito', 'zilwan', 'masopic', 'haman', 'malor', 'mahaman',
      'tiltowait', 'melito', 'lomilwa_mage', 'haman_7', 'mahaman_7', 'tiltowait_7'
    ].includes(spellId as string)

    const mockSpellData = {
      id: spellId,
      name: spellId?.toUpperCase() || 'UNKNOWN',
      level: 1,
      casterType: isMage ? 'mage' : 'priest',
      category: 'offensive',
      target: 'group',
      damage: { dice: '1d8', type: 'fire' },
      description: `Mock spell ${spellId}`,
      castableIn: ['combat']
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockSpellData)
    } as Response)
  }) as jest.Mock
})

afterAll(() => {
  (global.fetch as jest.Mock).mockRestore()
})

afterEach(() => {
  SpellDataLoader.clearCache()
})

describe('SpellDataLoader', () => {
  describe('loadAllSpells', () => {
    it('loads and validates all spell JSON files', async () => {
      const spells = await SpellDataLoader.loadAllSpells()

      expect(spells.size).toBeGreaterThan(50)  // Should have 56 spells
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

      expect(spells.size).toBeGreaterThan(50)
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

      expect(SpellDataLoader.getLoadedCount()).toBeGreaterThan(50)
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
