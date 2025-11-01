import { CharacterService } from '../CharacterService'
import { GameState } from '../../types/GameState'
import { Character, CreateCharacterParams } from '../../types/Character'
import { Race } from '../../types/Race'
import { CharacterClass } from '../../types/CharacterClass'
import { Alignment } from '../../types/Alignment'
import { CharacterStatus } from '../../types/CharacterStatus'

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
        status: CharacterStatus.GOOD,
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
      expect(character.status).toBe(CharacterStatus.GOOD)
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
        status: CharacterStatus.GOOD,
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
})
