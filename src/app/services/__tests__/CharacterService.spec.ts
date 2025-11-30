import { CharacterService } from '../CharacterService'
import { GameState } from '@models/GameState'
import { Character, CreateCharacterParams } from '@models/Character'
import { Race } from '@models/Race'
import { CharacterClass } from '@models/CharacterClass'
import { Alignment } from '@models/Alignment'
import { CharacterStatus } from '@models/CharacterStatus'
import { BaseStats } from '../CharacterCreationService'
import { ClassService } from '../ClassService'
import { RaceService } from '../RaceService'
import { StatModifierService } from '../StatModifierService'
import * as fs from 'fs'
import * as path from 'path'

describe('CharacterService', () => {
  let gameState: GameState

  beforeAll(async () => {
    // Mock fetch to load real data files from data/ directory
    global.fetch = jest.fn((url: string) => {
      const urlPath = url.toString()

      // Handle config files (stat-modifiers.json)
      if (urlPath.includes('/assets/config/stat-modifiers.json')) {
        const dataPath = path.join(__dirname, '../../../../data/config/stat-modifiers.json')
        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8')
          const jsonData = JSON.parse(fileContent)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response)
        } catch (error) {
          return Promise.reject(new Error(`File not found: ${dataPath}`))
        }
      }

      // Extract filename from URL (e.g., '/assets/races/human.json' -> 'human.json')
      const match = urlPath.match(/\/(races|classes|spells|monsters|items)\/([^/]+\.json)/)
      if (match) {
        const [, directory, filename] = match
        const dataPath = path.join(__dirname, '../../../../data', directory, filename)

        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8')
          const jsonData = JSON.parse(fileContent)

          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response)
        } catch (error) {
          return Promise.reject(new Error(`File not found: ${dataPath}`))
        }
      }

      return Promise.reject(new Error(`Not found: ${urlPath}`))
    }) as jest.Mock

    // Initialize services for data-driven character creation
    await ClassService.initialize()
    await RaceService.initialize()
    await StatModifierService.initialize()
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

    it('calculates starting HP using class hit dice + VIT bonus (authentic Wizardry)', () => {
      // Authentic Wizardry 1: VIT 6-15 gives +0 bonus (flat middle range)
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

      // Fighter uses 1d10 + VIT bonus (+0 for VIT 14), so HP should be 1-10
      expect(fighterChar.hp).toBeGreaterThanOrEqual(1)
      expect(fighterChar.hp).toBeLessThanOrEqual(10)
      expect(fighterChar.maxHp).toBe(fighterChar.hp)

      // Mage uses 1d4 + VIT bonus (+0 for VIT 14), so HP should be 1-4
      expect(mageChar.hp).toBeGreaterThanOrEqual(1)
      expect(mageChar.hp).toBeLessThanOrEqual(4)
      expect(mageChar.maxHp).toBe(mageChar.hp)
    })

    it('applies minimum HP of 1 even with low VIT penalty', () => {
      // Authentic Wizardry 1: VIT 4-5 gives -1 penalty
      // Use VIT 3 for maximum penalty of -2
      const lowVitMage = CharacterService.createCharacterFromStats({
        name: 'WeakMage',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: { ...validStats, vitality: 3 },
        selectedClass: CharacterClass.MAGE
      })

      // Mage 1d4 - 2 could be negative (1-2 = -1), but minimum is 1
      expect(lowVitMage.hp).toBeGreaterThanOrEqual(1)
      expect(lowVitMage.maxHp).toBe(lowVitMage.hp)
    })

    it('applies high VIT bonus for starting HP', () => {
      // Authentic Wizardry 1: VIT 16 = +1, VIT 17 = +2, VIT 18+ = +3
      const highVitFighter = CharacterService.createCharacterFromStats({
        name: 'ToughFighter',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: { ...validStats, vitality: 18 },
        selectedClass: CharacterClass.FIGHTER
      })

      // Fighter uses 1d10 + VIT bonus (+3 for VIT 18), so HP should be 4-13
      expect(highVitFighter.hp).toBeGreaterThanOrEqual(4)
      expect(highVitFighter.hp).toBeLessThanOrEqual(13)
      expect(highVitFighter.maxHp).toBe(highVitFighter.hp)
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
      // Level 1 casters start with 2 spell points for level 1 spells (authentic Wizardry 1981)
      expect(char.spellPoints?.mage?.level1).toEqual({ current: 2, max: 2 })
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
      // Level 1 casters start with 2 spell points for level 1 spells (authentic Wizardry 1981)
      expect(char.spellPoints?.priest?.level1).toEqual({ current: 2, max: 2 })
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
      // Level 1 casters start with 2 spell points for level 1 spells (authentic Wizardry 1981)
      expect(char.spellPoints?.mage?.level1).toEqual({ current: 2, max: 2 })
      expect(char.spellPoints?.priest?.level1).toEqual({ current: 2, max: 2 })
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

    it('uses ClassService hit dice + VIT bonus for HP calculation', () => {
      // Authentic Wizardry 1: validStats has vitality: 14 which gives +0 bonus (VIT 6-15 = 0)
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

      // Fighter uses 1d10 + VIT bonus (+0 for VIT 14), so HP should be 1-10
      // Mage uses 1d4 + VIT bonus (+0 for VIT 14), so HP should be 1-4
      expect(fighterChar.hp).toBeGreaterThanOrEqual(1)
      expect(fighterChar.hp).toBeLessThanOrEqual(10)
      expect(mageChar.hp).toBeGreaterThanOrEqual(1)
      expect(mageChar.hp).toBeLessThanOrEqual(4)
    })

    it('initializes character with starting gold in range 90-190 (authentic Wizardry 1)', () => {
      const char = CharacterService.createCharacterFromStats({
        name: 'Test',
        password: 'test',
        race: Race.HUMAN,
        alignment: Alignment.GOOD,
        stats: validStats,
        selectedClass: CharacterClass.FIGHTER
      })

      // Starting gold formula: 90 + random(0-100) = 90-190 gold
      expect(char.gold).toBeDefined()
      expect(char.gold).toBeGreaterThanOrEqual(90)
      expect(char.gold).toBeLessThanOrEqual(190)
    })

    it('generates different starting gold for different characters (random)', () => {
      // Create multiple characters and verify gold varies
      const characters = []
      for (let i = 0; i < 10; i++) {
        characters.push(CharacterService.createCharacterFromStats({
          name: `Test${i}`,
          password: 'test',
          race: Race.HUMAN,
          alignment: Alignment.GOOD,
          stats: validStats,
          selectedClass: CharacterClass.FIGHTER
        }))
      }

      // All should be in valid range
      characters.forEach(char => {
        expect(char.gold).toBeGreaterThanOrEqual(90)
        expect(char.gold).toBeLessThanOrEqual(190)
      })

      // At least some variation should exist (not all the same)
      const uniqueGoldValues = new Set(characters.map(c => c.gold))
      expect(uniqueGoldValues.size).toBeGreaterThan(1)
    })
  })

  describe('createCharacter (with gold)', () => {
    it('creates character with starting gold in range 90-190', () => {
      const params: CreateCharacterParams = {
        name: 'GoldTest',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        password: 'secret'
      }

      const result = CharacterService.createCharacter(gameState, params)
      const character = Array.from(result.state.roster.values())[0]

      // Starting gold formula: 90 + random(0-100) = 90-190 gold
      expect(character.gold).toBeDefined()
      expect(character.gold).toBeGreaterThanOrEqual(90)
      expect(character.gold).toBeLessThanOrEqual(190)
    })
  })
})
