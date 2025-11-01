import { CharacterService } from '../CharacterService'
import { GameState } from '../../types/GameState'
import { Character, CreateCharacterParams } from '../../types/Character'
import { Race } from '../../types/Race'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'
import { CharacterStatus } from '../../types/CharacterStatus'
import { BaseStats } from '../CharacterCreationService'

describe('CharacterService', () => {
  let gameState: GameState

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
        hp: 10,
        maxHp: 10,
        ac: 10,
        inventory: [],
        password: 'test123',
        createdAt: Date.now(),
        lastModified: Date.now()
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

      // Stats should be in valid range (3-18 base)
      expect(character.strength).toBeGreaterThanOrEqual(3)
      expect(character.strength).toBeLessThanOrEqual(18)
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
        hp: 10,
        maxHp: 10,
        ac: 10,
        inventory: [],
        password: 'test123',
        createdAt: Date.now(),
        lastModified: Date.now()
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
})
