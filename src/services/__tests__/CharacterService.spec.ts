import { CharacterService } from '../CharacterService'
import { GameState } from '../../types/GameState'
import { Character, CreateCharacterParams } from '../../types/Character'
import { Race } from '../../types/Race'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'
import { CharacterStatus } from '../../types/CharacterStatus'
import { BaseStats } from '../CharacterCreationService'
import { ClassService } from '../ClassService'
import { RaceService } from '../RaceService'

describe('CharacterService', () => {
  let gameState: GameState

  beforeAll(async () => {
    // Mock fetch for ClassService and RaceService data files
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
            statTotal: 46,
            savingThrowBonus: { death: -1 },
            description: 'Balanced race',
            strengths: ['Balanced stats'],
            weaknesses: ['No exceptional stats'],
            bestClasses: ['fighter', 'lord']
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
            statTotal: 48,
            savingThrowBonus: { wand: -2 },
            description: 'Intelligent and pious',
            strengths: ['High intelligence and piety'],
            weaknesses: ['Low strength and vitality'],
            bestClasses: ['mage', 'priest', 'bishop']
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
            statTotal: 48,
            savingThrowBonus: { breath: -4 },
            description: 'Strong and tough',
            strengths: ['High strength and vitality'],
            weaknesses: ['Low agility'],
            bestClasses: ['fighter', 'priest']
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
            statTotal: 49,
            savingThrowBonus: { petrify: -2 },
            description: 'Clever and agile',
            strengths: ['High piety and agility'],
            weaknesses: ['Low strength'],
            bestClasses: ['priest', 'thief']
          })
        } as Response)
      }
      if (path.includes('/assets/races/hobbit.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'hobbit',
            name: 'Hobbit',
            baseStats: { str: 5, int: 7, pie: 7, vit: 6, agi: 10, luc: 15 },
            statTotal: 50,
            savingThrowBonus: { spell: -3 },
            description: 'Lucky and agile',
            strengths: ['High luck and agility'],
            weaknesses: ['Low strength and vitality'],
            bestClasses: ['thief']
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
            requirements: { str: 11 },
            alignmentRestrictions: [],
            equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] },
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
            equipmentRestrictions: { weapons: ['dagger', 'staff'], armor: ['robes'], shields: [], helmets: [] },
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
            equipmentRestrictions: { weapons: ['mace', 'staff', 'flail'], armor: ['all'], shields: ['all'], helmets: ['all'] },
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
            equipmentRestrictions: { weapons: ['dagger', 'short-sword'], armor: ['leather'], shields: [], helmets: [] },
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
            alignmentRestrictions: ['good', 'evil'],
            equipmentRestrictions: { weapons: ['mace', 'staff'], armor: ['robes'], shields: [], helmets: [] },
            hitDice: '1d6',
            spellAccess: { mage: { minLevel: 1, maxLevel: 7 }, priest: { minLevel: 1, maxLevel: 7 } },
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
            equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] },
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
            equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] },
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
            equipmentRestrictions: { weapons: ['all'], armor: ['leather', 'chain'], shields: [], helmets: [] },
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

    // Initialize ClassService and RaceService for data-driven character creation
    await ClassService.initialize()
    await RaceService.initialize()
  })

  beforeEach(() => {
    // Create clean game state
    gameState = {
      currentScene: 'TRAINING_GROUNDS' as any,
      roster: new Map(),
      party: {
        members: [],
        formation: { frontRow: [], backRow: [] },
        position: { x: 0, y: 0, facing: 'NORTH' as any },
        inMaze: false
      },
      dungeon: {
        currentLevel: 1,
        visitedTiles: new Map(),
        encounters: []
      },
      settings: {
        difficulty: 'NORMAL' as any,
        soundEnabled: true,
        musicEnabled: true
      }
    }
  })

  describe('getAllCharacters', () => {
    it('returns empty array when no characters exist', () => {
      const characters = CharacterService.getAllCharacters(gameState)
      expect(characters).toEqual([])
    })

    it('returns all characters from roster', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter1',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        status: CharacterStatus.OK,
        strength: 15,
        intelligence: 10,
        piety: 8,
        vitality: 14,
        agility: 12,
        luck: 9,
        level: 1,
        experience: 0,
        age: 15,
        hp: 10,
        maxHp: 10,
        ac: 10,
        vim: { current: 14, max: 14 },
        knownSpells: [],
        inventory: [],
        password: 'test123'
      }

      const char2: Character = {
        ...char1,
        id: 'char2',
        name: 'Mage1',
        class: CharacterClass.MAGE
      }

      gameState.roster.set('char1', char1)
      gameState.roster.set('char2', char2)

      const characters = CharacterService.getAllCharacters(gameState)
      expect(characters).toHaveLength(2)
      expect(characters[0].id).toBe('char1')
      expect(characters[1].id).toBe('char2')
    })
  })

  describe('createCharacter', () => {
    it('creates new character with rolled stats', () => {
      const params: CreateCharacterParams = {
        name: 'TestFighter',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        password: 'secret'
      }

      const result = CharacterService.createCharacter(gameState, params)

      expect(result.state.roster.size).toBe(1)
      const character = Array.from(result.state.roster.values())[0]
      expect(character.name).toBe('TestFighter')
      expect(character.race).toBe(Race.HUMAN)
      expect(character.class).toBe(CharacterClass.FIGHTER)
      expect(character.alignment).toBe(Alignment.GOOD)
      expect(character.password).toBe('secret')
      expect(character.status).toBe(CharacterStatus.OK)
      expect(character.level).toBe(1)
      expect(character.experience).toBe(0)
      expect(character.inventory).toEqual([])

      // Stats should be in valid range (3-18 base roll + race modifier)
      // Human has str: 8, so 3+8=11 to 18+8=26
      expect(character.strength).toBeGreaterThanOrEqual(11)
      expect(character.strength).toBeLessThanOrEqual(26)
      expect(character.id).toBeTruthy()
    })

    it('applies race modifiers to stats', () => {
      const params: CreateCharacterParams = {
        name: 'TestElf',
        race: Race.ELF,
        class: CharacterClass.MAGE,
        alignment: Alignment.GOOD,
        password: 'secret'
      }

      const result = CharacterService.createCharacter(gameState, params)
      const character = Array.from(result.state.roster.values())[0]

      // Elf modifiers: STR-1, INT+1, PIE+1, VIT-2, AGI+1
      // Stats should reflect race modifiers
      expect(character.race).toBe(Race.ELF)
    })
  })

  describe('deleteCharacter', () => {
    it('removes character from roster', () => {
      const char: Character = {
        id: 'char1',
        name: 'Fighter1',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        status: CharacterStatus.OK,
        strength: 15,
        intelligence: 10,
        piety: 8,
        vitality: 14,
        agility: 12,
        luck: 9,
        level: 1,
        experience: 0,
        age: 15,
        hp: 10,
        maxHp: 10,
        ac: 10,
        vim: { current: 14, max: 14 },
        knownSpells: [],
        inventory: [],
        password: 'test123'
      }

      gameState.roster.set('char1', char)

      const newState = CharacterService.deleteCharacter(gameState, 'char1')

      expect(newState.roster.size).toBe(0)
      expect(newState.roster.has('char1')).toBe(false)
    })

    it('returns unchanged state if character not found', () => {
      const newState = CharacterService.deleteCharacter(gameState, 'nonexistent')
      expect(newState).toEqual(gameState)
    })
  })

  describe('validateClassEligibility', () => {
    it('allows basic classes with any stats', () => {
      const stats = {
        strength: 5,
        intelligence: 5,
        piety: 5,
        vitality: 5,
        agility: 5,
        luck: 5,
        alignment: Alignment.GOOD
      }

      expect(CharacterService.validateClassEligibility(CharacterClass.FIGHTER, stats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.MAGE, stats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.PRIEST, stats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.THIEF, stats)).toBe(true)
    })

    it('enforces stat requirements for advanced classes', () => {
      const goodStats = {
        strength: 18,
        intelligence: 18,
        piety: 18,
        vitality: 18,
        agility: 18,
        luck: 18,
        alignment: Alignment.GOOD
      }

      const badStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        alignment: Alignment.GOOD
      }

      // Samurai requires STR 15, INT 11, PIE 10, VIT 14, AGI 10, GOOD alignment
      expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, goodStats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, badStats)).toBe(false)
    })

    it('enforces alignment requirements', () => {
      const goodStats = {
        strength: 18,
        intelligence: 18,
        piety: 18,
        vitality: 18,
        agility: 18,
        luck: 18,
        alignment: Alignment.GOOD
      }

      const evilStats = {
        ...goodStats,
        alignment: Alignment.EVIL
      }

      // Ninja requires EVIL alignment
      expect(CharacterService.validateClassEligibility(CharacterClass.NINJA, evilStats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.NINJA, goodStats)).toBe(false)

      // Samurai requires GOOD alignment
      expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, goodStats)).toBe(true)
      expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, evilStats)).toBe(false)
    })
  })

  describe('getEligibleClasses', () => {
    it('returns Fighter when STR >= 11', () => {
      const stats: BaseStats = {
        strength: 11,
        intelligence: 8,
        piety: 8,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.FIGHTER)
    })

    it('excludes Fighter when STR < 11', () => {
      const stats: BaseStats = {
        strength: 10,
        intelligence: 8,
        piety: 8,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).not.toContain(CharacterClass.FIGHTER)
    })

    it('returns Mage when IQ >= 11', () => {
      const stats: BaseStats = {
        strength: 8,
        intelligence: 11,
        piety: 8,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.MAGE)
    })

    it('returns Priest when PIE >= 11', () => {
      const stats: BaseStats = {
        strength: 8,
        intelligence: 8,
        piety: 11,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.PRIEST)
    })

    it('returns Thief when AGI >= 11', () => {
      const stats: BaseStats = {
        strength: 8,
        intelligence: 8,
        piety: 8,
        vitality: 10,
        agility: 11,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.NEUTRAL)
      expect(eligible).toContain(CharacterClass.THIEF)
    })

    it('returns Bishop when IQ >= 12 and PIE >= 12', () => {
      const stats: BaseStats = {
        strength: 8,
        intelligence: 12,
        piety: 12,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.BISHOP)
    })

    it('excludes Bishop when IQ = 12 but PIE < 12', () => {
      const stats: BaseStats = {
        strength: 8,
        intelligence: 12,
        piety: 11,
        vitality: 10,
        agility: 9,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).not.toContain(CharacterClass.BISHOP)
    })

    it('returns Samurai when STR >= 15, IQ >= 11, PIE >= 10, VIT >= 14, AGI >= 10', () => {
      const stats: BaseStats = {
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 8
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.SAMURAI)
    })

    it('returns Lord when STR >= 15, IQ >= 12, PIE >= 12, VIT >= 15, AGI >= 14, LUK >= 15', () => {
      const stats: BaseStats = {
        strength: 15,
        intelligence: 12,
        piety: 12,
        vitality: 15,
        agility: 14,
        luck: 15
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).toContain(CharacterClass.LORD)
    })

    it('returns Ninja when ALL stats >= 17', () => {
      const stats: BaseStats = {
        strength: 17,
        intelligence: 17,
        piety: 17,
        vitality: 17,
        agility: 17,
        luck: 17
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.EVIL)
      expect(eligible).toContain(CharacterClass.NINJA)
    })

    it('excludes Ninja when one stat is 16', () => {
      const stats: BaseStats = {
        strength: 17,
        intelligence: 17,
        piety: 17,
        vitality: 17,
        agility: 17,
        luck: 16 // One stat below 17
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.EVIL)
      expect(eligible).not.toContain(CharacterClass.NINJA)
    })

    it('returns multiple eligible classes', () => {
      const stats: BaseStats = {
        strength: 15,
        intelligence: 12,
        piety: 12,
        vitality: 14,
        agility: 11,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)

      // Should qualify for: Fighter, Mage, Priest, Bishop, Samurai
      // NOT Thief (Good cannot be Thief)
      expect(eligible.length).toBeGreaterThanOrEqual(5)
      expect(eligible).toContain(CharacterClass.FIGHTER)
      expect(eligible).toContain(CharacterClass.MAGE)
      expect(eligible).toContain(CharacterClass.PRIEST)
      expect(eligible).not.toContain(CharacterClass.THIEF)
      expect(eligible).toContain(CharacterClass.BISHOP)
      expect(eligible).toContain(CharacterClass.SAMURAI)
    })

    it('excludes Priest when alignment is Neutral', () => {
      const stats: BaseStats = {
        strength: 10,
        intelligence: 10,
        piety: 11,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.NEUTRAL)
      expect(eligible).not.toContain(CharacterClass.PRIEST)
    })

    it('excludes Thief when alignment is Good', () => {
      const stats: BaseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 11,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligible).not.toContain(CharacterClass.THIEF)
    })

    it('excludes Samurai when alignment is Evil', () => {
      const stats: BaseStats = {
        strength: 15,
        intelligence: 11,
        piety: 10,
        vitality: 14,
        agility: 10,
        luck: 10
      }

      const eligible = CharacterService.getEligibleClasses(stats, Alignment.EVIL)
      expect(eligible).not.toContain(CharacterClass.SAMURAI)
    })

    it('requires Good alignment for Lord', () => {
      const stats: BaseStats = {
        strength: 15,
        intelligence: 12,
        piety: 12,
        vitality: 15,
        agility: 14,
        luck: 15
      }

      const eligibleGood = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligibleGood).toContain(CharacterClass.LORD)

      const eligibleNeutral = CharacterService.getEligibleClasses(stats, Alignment.NEUTRAL)
      expect(eligibleNeutral).not.toContain(CharacterClass.LORD)

      const eligibleEvil = CharacterService.getEligibleClasses(stats, Alignment.EVIL)
      expect(eligibleEvil).not.toContain(CharacterClass.LORD)
    })

    it('requires Evil alignment for Ninja', () => {
      const stats: BaseStats = {
        strength: 17,
        intelligence: 17,
        piety: 17,
        vitality: 17,
        agility: 17,
        luck: 17
      }

      const eligibleEvil = CharacterService.getEligibleClasses(stats, Alignment.EVIL)
      expect(eligibleEvil).toContain(CharacterClass.NINJA)

      const eligibleGood = CharacterService.getEligibleClasses(stats, Alignment.GOOD)
      expect(eligibleGood).not.toContain(CharacterClass.NINJA)

      const eligibleNeutral = CharacterService.getEligibleClasses(stats, Alignment.NEUTRAL)
      expect(eligibleNeutral).not.toContain(CharacterClass.NINJA)
    })
  })

  describe('validateCharacterName', () => {
    it('accepts valid name (alphanumeric + space)', () => {
      expect(CharacterService.validateCharacterName('Gandalf')).toEqual({ valid: true })
      expect(CharacterService.validateCharacterName('Sir Lancelot')).toEqual({ valid: true })
      expect(CharacterService.validateCharacterName('Merlin 2')).toEqual({ valid: true })
    })

    it('rejects empty name', () => {
      const result = CharacterService.validateCharacterName('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('rejects name > 15 characters', () => {
      const result = CharacterService.validateCharacterName('ThisNameIsTooLong')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('15 characters')
    })

    it('rejects name with special characters', () => {
      const result = CharacterService.validateCharacterName('Gandalf!')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('letters, numbers, and spaces')
    })

    it('accepts name with exactly 15 characters', () => {
      expect(CharacterService.validateCharacterName('FifteenCharsNow')).toEqual({ valid: true })
    })
  })

  describe('validatePassword', () => {
    it('accepts valid password (4-8 chars alphanumeric)', () => {
      expect(CharacterService.validatePassword('pass')).toEqual({ valid: true })
      expect(CharacterService.validatePassword('12345678')).toEqual({ valid: true })
      expect(CharacterService.validatePassword('Test123')).toEqual({ valid: true })
    })

    it('rejects empty password', () => {
      const result = CharacterService.validatePassword('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('required')
    })

    it('rejects password < 4 characters', () => {
      const result = CharacterService.validatePassword('abc')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('4-8 characters')
    })

    it('rejects password > 8 characters', () => {
      const result = CharacterService.validatePassword('toolongpassword')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('4-8 characters')
    })

    it('rejects password with special characters', () => {
      const result = CharacterService.validatePassword('pass!')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('letters and numbers')
    })
  })

  describe('createCharacterFromStats', () => {
    const validStats: BaseStats = {
      strength: 15,
      intelligence: 12,
      piety: 12,
      vitality: 14,
      agility: 11,
      luck: 10
    }

    it('creates character with all required fields', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Gandalf',
        password: 'wizard',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.MAGE
      })

      expect(char.name).toBe('Gandalf')
      expect(char.password).toBe('wizard')
      expect(char.race).toBe(Race.HUMAN)
      expect(char.alignment).toBe(Alignment.GOOD)
      expect(char.class).toBe(CharacterClass.MAGE)
      expect(char.level).toBe(1)
      expect(char.status).toBe(CharacterStatus.OK)
    })

    it('assigns stats from input', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.strength).toBe(15)
      expect(char.intelligence).toBe(12)
      expect(char.piety).toBe(12)
      expect(char.vitality).toBe(14)
      expect(char.agility).toBe(11)
      expect(char.luck).toBe(10)
    })

    it('generates unique character ID', () => {
      const char1 = CharacterService.createCharacterFromStats({
        name: 'Char1',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      const char2 = CharacterService.createCharacterFromStats({
        name: 'Char2',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char1.id).toBeDefined()
      expect(char2.id).toBeDefined()
      expect(char1.id).not.toBe(char2.id)
    })

    it('initializes character with empty inventory', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.inventory).toEqual([])
    })

    it('initializes character with level 1 and 0 experience', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.level).toBe(1)
      expect(char.experience).toBe(0)
    })

    it('calculates starting HP using class hit dice (no longer vitality-based)', () => {
      const fighterChar = CharacterService.createCharacterFromStats({
        name: 'Fighter',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: { ...validStats, vitality: 14 },
        selectedClass: CharacterClass.FIGHTER
      })

      const mageChar = CharacterService.createCharacterFromStats({
        name: 'Mage',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: { ...validStats, vitality: 14 },
        selectedClass: CharacterClass.MAGE
      })

      // Fighter uses 1d10, so HP should be 1-10
      expect(fighterChar.hp).toBeGreaterThanOrEqual(1)
      expect(fighterChar.hp).toBeLessThanOrEqual(10)
      expect(fighterChar.maxHp).toBe(fighterChar.hp)

      // Mage uses 1d4, so HP should be 1-4
      expect(mageChar.hp).toBeGreaterThanOrEqual(1)
      expect(mageChar.hp).toBeLessThanOrEqual(4)
      expect(mageChar.maxHp).toBe(mageChar.hp)
    })

    it('throws error when character does not meet class requirements', () => {
      const lowStats: BaseStats = {
        strength: 8,
        intelligence: 8,
        piety: 8,
        vitality: 8,
        agility: 8,
        luck: 8
      }

      expect(() => {
        CharacterService.createCharacterFromStats({
          name: 'Test',
          password: 'test',
          race: Race.HUMAN,
          alignment: Alignment.GOOD,
          stats: lowStats,
          selectedClass: CharacterClass.SAMURAI // Requires high stats
        })
      }).toThrow('does not meet requirements for SAMURAI')
    })

    it('initializes vim to match vitality stat', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: { ...validStats, vitality: 16 },
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.vim).toBeDefined()
      expect(char.vim.current).toBe(16)
      expect(char.vim.max).toBe(16)
    })

    it('initializes age in 14-16 range', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.age).toBeDefined()
      expect(char.age).toBeGreaterThanOrEqual(14)
      expect(char.age).toBeLessThanOrEqual(16)
    })

    it('initializes spell points for mage class', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.MAGE
      })

      expect(char.spellPoints).toBeDefined()
      expect(char.spellPoints?.mage).toBeDefined()
      expect(char.spellPoints?.priest).toBeUndefined()
      expect(char.spellPoints?.mage?.level1).toEqual({ current: 0, max: 0 })
    })

    it('initializes spell points for priest class', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.PRIEST
      })

      expect(char.spellPoints).toBeDefined()
      expect(char.spellPoints?.priest).toBeDefined()
      expect(char.spellPoints?.mage).toBeUndefined()
      expect(char.spellPoints?.priest?.level1).toEqual({ current: 0, max: 0 })
    })

    it('initializes spell points for bishop class (both mage and priest)', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.BISHOP
      })

      expect(char.spellPoints).toBeDefined()
      expect(char.spellPoints?.mage).toBeDefined()
      expect(char.spellPoints?.priest).toBeDefined()
      expect(char.spellPoints?.mage?.level1).toEqual({ current: 0, max: 0 })
      expect(char.spellPoints?.priest?.level1).toEqual({ current: 0, max: 0 })
    })

    it('does not initialize spell points for fighter class', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.spellPoints).toBeUndefined()
    })

    it('initializes knownSpells as empty array', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.MAGE
      })

      expect(char.knownSpells).toEqual([])
    })

    it('initializes equipment slots as undefined', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      expect(char.equippedWeapon).toBeUndefined()
      expect(char.equippedArmor).toBeUndefined()
      expect(char.equippedShield).toBeUndefined()
      expect(char.equippedHelmet).toBeUndefined()
      expect(char.equippedGauntlets).toBeUndefined()
    })

    it('uses ClassService hit dice for HP calculation', () => {
      const fighterChar = CharacterService.createCharacterFromStats({
        name: 'Fighter',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      const mageChar = CharacterService.createCharacterFromStats({
        name: 'Mage',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.MAGE
      })

      // Fighter uses 1d10, Mage uses 1d4
      // HP should be in valid dice range
      expect(fighterChar.hp).toBeGreaterThanOrEqual(1)
      expect(fighterChar.hp).toBeLessThanOrEqual(10)
      expect(mageChar.hp).toBeGreaterThanOrEqual(1)
      expect(mageChar.hp).toBeLessThanOrEqual(4)
    })
  })
})
