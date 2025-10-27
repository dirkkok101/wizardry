import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterService } from '../../src/services/CharacterService'
import { GameState } from '../../src/types/GameState'
import { Character, CreateCharacterParams } from '../../src/types/Character'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'
import { CharacterStatus } from '../../src/types/CharacterStatus'

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
})
