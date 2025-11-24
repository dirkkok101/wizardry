import { SpellDataLoader } from '../SpellDataLoader'

// Note: Real spell data is loaded from data/spells/ via setup-jest.ts
// This follows the project philosophy: "No mocks for services - test with real data"

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

  it('loads all 51 authentic Wizardry 1 spells', async () => {
    const spells = await SpellDataLoader.loadAllSpells()
    expect(spells.size).toBe(51)  // 22 Mage + 29 Priest spell definitions
  })
})
