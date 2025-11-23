import { SpellDataLoader } from '../SpellDataLoader'

// Mock global.fetch for performance testing
beforeAll(() => {
  global.fetch = jest.fn((url: string) => {
    const spellId = url.split('/').pop()?.replace('.json', '')
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

describe('SpellDataLoader - Performance', () => {
  beforeEach(() => {
    SpellDataLoader.clearCache()
  })

  it('loads all spells in less than 500ms', async () => {
    const start = performance.now()
    await SpellDataLoader.loadAllSpells()
    const duration = performance.now() - start

    console.log(`Loaded spells in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(500)
  })

  it('cache access is instant', async () => {
    await SpellDataLoader.loadAllSpells()

    const start = performance.now()
    const spells = await SpellDataLoader.loadAllSpells()
    const duration = performance.now() - start

    console.log(`Cache access in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(1)  // Should be instant
    expect(spells.size).toBeGreaterThan(50)
  })

  it('loads at least 56 spells', async () => {
    const spells = await SpellDataLoader.loadAllSpells()
    expect(spells.size).toBeGreaterThanOrEqual(56)
  })
})
