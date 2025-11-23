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
})
