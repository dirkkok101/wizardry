import { GameInitializationService } from '../GameInitializationService'
import { SceneType } from '../../types/SceneType'
import { RaceService } from '../RaceService'
import { ClassService } from '../ClassService'

describe('GameInitializationService', () => {
  beforeEach(() => {
    // Mock fetch for data file loading
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      // Race data mocks
      if (path.includes('/assets/races/human.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'human',
            name: 'Human',
            baseStats: { str: 8, int: 8, pie: 5, vit: 8, agi: 8, luc: 9 },
            savingThrowBonus: { death: -1 },
            statTotal: 46,
            description: 'Humans are the most versatile race',
            strengths: ['Balanced stats'],
            weaknesses: ['No special bonuses'],
            bestClasses: ['Any']
          })
        } as Response)
      }
      if (path.includes('/assets/races/elf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'elf',
            name: 'Elf',
            baseStats: { str: 7, int: 10, pie: 10, vit: 6, agi: 9, luc: 6 },
            savingThrowBonus: { wand: -2 },
            statTotal: 48,
            description: 'Elves are magical and agile',
            strengths: ['High INT, PIE'],
            weaknesses: ['Low VIT'],
            bestClasses: ['Mage', 'Priest']
          })
        } as Response)
      }
      if (path.includes('/assets/races/dwarf.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'dwarf',
            name: 'Dwarf',
            baseStats: { str: 10, int: 7, pie: 10, vit: 10, agi: 5, luc: 6 },
            savingThrowBonus: { breath: -4 },
            statTotal: 48,
            description: 'Dwarves are tough',
            strengths: ['High VIT'],
            weaknesses: ['Low AGI'],
            bestClasses: ['Fighter', 'Priest']
          })
        } as Response)
      }
      if (path.includes('/assets/races/gnome.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'gnome',
            name: 'Gnome',
            baseStats: { str: 7, int: 7, pie: 10, vit: 8, agi: 10, luc: 7 },
            savingThrowBonus: { petrify: -2 },
            statTotal: 49,
            description: 'Gnomes are clever',
            strengths: ['Balanced'],
            weaknesses: ['Low STR'],
            bestClasses: ['Thief', 'Mage']
          })
        } as Response)
      }
      if (path.includes('/assets/races/hobbit.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'hobbit',
            name: 'Hobbit',
            baseStats: { str: 5, int: 7, pie: 6, vit: 6, agi: 10, luc: 12 },
            savingThrowBonus: { spell: -3 },
            statTotal: 46,
            description: 'Hobbits are lucky',
            strengths: ['High LUC, AGI'],
            weaknesses: ['Low STR, VIT'],
            bestClasses: ['Thief']
          })
        } as Response)
      }

      // Class data mocks
      if (path.includes('/assets/classes/fighter.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'fighter',
            name: 'Fighter',
            description: 'Master of combat',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: null,
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 900000, 1300000],
            specialAbilities: [],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/mage.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'mage',
            name: 'Mage',
            description: 'Master of arcane magic',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['dagger', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d4',
            spellAccess: { mage: { minLevel: 1, maxLevel: 7 } },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2400, 4800, 9600, 19200, 38400, 76800, 150000, 300000, 600000, 1080000, 1560000],
            specialAbilities: ['Cast mage spells'],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/priest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'priest',
            name: 'Priest',
            description: 'Divine spellcaster',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['mace', 'staff', 'flail'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: { priest: { minLevel: 1, maxLevel: 7 } },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2200, 4400, 8800, 17600, 35200, 70400, 137500, 275000, 550000, 990000, 1430000],
            specialAbilities: ['Cast priest spells'],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/thief.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'thief',
            name: 'Thief',
            description: 'Sneaky rogue',
            requirements: {},
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['dagger', 'short-sword'],
              armor: ['leather'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1+': 1 },
            xpTable: [1800, 3600, 7200, 14400, 28800, 57600, 112500, 225000, 450000, 810000, 1170000],
            specialAbilities: ['Pick locks', 'Disarm traps', 'Hide in shadows'],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/bishop.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'bishop',
            name: 'Bishop',
            description: 'Dual spellcaster',
            requirements: { int: 12, pie: 12 },
            alignmentRestrictions: [],
            equipmentRestrictions: {
              weapons: ['mace', 'staff'],
              armor: ['robes'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: {
              mage: { minLevel: 1, maxLevel: 7 },
              priest: { minLevel: 1, maxLevel: 7 }
            },
            attacksPerLevel: { '1+': 1 },
            xpTable: [2600, 5200, 10400, 20800, 41600, 83200, 162500, 325000, 650000, 1170000, 1690000],
            specialAbilities: ['Cast both mage and priest spells'],
            canIdentifyItems: true,
            canDispelUndead: true,
            canCriticalHit: false
          })
        } as Response)
      }
      if (path.includes('/assets/classes/samurai.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'samurai',
            name: 'Samurai',
            description: 'Elite warrior-mage',
            requirements: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 },
            alignmentRestrictions: ['good'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d8',
            spellAccess: { mage: { minLevel: 4, maxLevel: 6 } },
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 187500, 375000, 750000, 1350000, 1950000],
            specialAbilities: ['Cast mage spells (limited)'],
            canIdentifyItems: false,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/lord.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'lord',
            name: 'Lord',
            description: 'Holy warrior',
            requirements: { str: 15, int: 12, pie: 12, vit: 15, agi: 14 },
            alignmentRestrictions: ['good'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['all'],
              shields: ['all'],
              helmets: ['all']
            },
            hitDice: '1d10',
            spellAccess: { priest: { minLevel: 3, maxLevel: 6 } },
            attacksPerLevel: { '1-4': 1, '5-9': 2, '10+': 3 },
            xpTable: [2800, 5600, 11200, 22400, 44800, 89600, 175000, 350000, 700000, 1260000, 1820000],
            specialAbilities: ['Cast priest spells (limited)', 'Dispel undead'],
            canIdentifyItems: false,
            canDispelUndead: true,
            canCriticalHit: true
          })
        } as Response)
      }
      if (path.includes('/assets/classes/ninja.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'ninja',
            name: 'Ninja',
            description: 'Elite assassin',
            requirements: { str: 17, int: 17, pie: 17, vit: 17, agi: 17 },
            alignmentRestrictions: ['evil'],
            equipmentRestrictions: {
              weapons: ['all'],
              armor: ['leather', 'chain'],
              shields: [],
              helmets: []
            },
            hitDice: '1d6',
            spellAccess: null,
            attacksPerLevel: { '1-4': 2, '5-9': 3, '10+': 4 },
            xpTable: [3200, 6400, 12800, 25600, 51200, 102400, 200000, 400000, 800000, 1440000, 2080000],
            specialAbilities: ['Critical hit', 'Extra attacks', 'AC bonus'],
            canIdentifyItems: true,
            canDispelUndead: false,
            canCriticalHit: true
          })
        } as Response)
      }

      return Promise.reject(new Error(`Not found: ${path}`))
    }) as jest.Mock
  })

  describe('createNewGame', () => {
    it('should create new game with empty party', () => {
      const gameState = GameInitializationService.createNewGame()

      expect(gameState).toBeDefined()
      expect(gameState.currentScene).toBe(SceneType.TITLE_SCREEN)
      expect(gameState.roster).toBeDefined()
      expect(gameState.roster.size).toBe(0)
      expect(gameState.party).toBeDefined()
      expect(gameState.party.light).toBe(false)
      expect(gameState.party.members).toEqual([])
      expect(gameState.party.formation.frontRow).toEqual([])
      expect(gameState.party.formation.backRow).toEqual([])
      expect(gameState.party.position.level).toBe(1)
      expect(gameState.party.position.x).toBe(0)
      expect(gameState.party.position.y).toBe(0)
      expect(gameState.party.position.facing).toBe('NORTH')
      expect(gameState.dungeon).toBeDefined()
      expect(gameState.dungeon.currentLevel).toBe(1)
      expect(gameState.settings).toBeDefined()
      expect(gameState.settings.difficulty).toBe('NORMAL')
    })
  })

  describe('initializeGame', () => {
    it('should initialize RaceService and ClassService in parallel', async () => {
      await GameInitializationService.initializeGame()

      // Verify services are actually initialized
      expect(RaceService.isInitialized()).toBe(true)
      expect(ClassService.isInitialized()).toBe(true)
    })

    it('should handle initialization errors gracefully', async () => {
      // Save original methods
      const originalRaceInit = RaceService.initialize

      // Mock only for error test
      RaceService.initialize = jest.fn().mockRejectedValue(new Error('Failed to load race data'))

      await expect(GameInitializationService.initializeGame()).rejects.toThrow('Failed to load race data')

      // Restore original method
      RaceService.initialize = originalRaceInit
    })

    it('initializes party with zero gold', () => {
      const state = GameInitializationService.createNewGame()

      expect(state.party.gold).toBe(0)
    })
  })
})
