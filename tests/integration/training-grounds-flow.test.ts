import { describe, it, expect, beforeEach } from 'vitest'
import { GameInitializationService } from '../../src/services/GameInitializationService'
import { CharacterService } from '../../src/services/CharacterService'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'

describe('Training Grounds Integration', () => {
  beforeEach(async () => {
    await GameInitializationService.initializeGame()
  })

  it('creates character and adds to roster', () => {
    const state = GameInitializationService.getGameState()

    const result = CharacterService.createCharacter(state, {
      name: 'TestFighter',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      password: 'secret'
    })

    expect(result.state.roster.size).toBe(1)
    expect(result.character.name).toBe('TestFighter')

    // Update game state
    GameInitializationService.updateGameState(result.state)

    // Verify character is in roster
    const characters = CharacterService.getAllCharacters(result.state)
    expect(characters).toHaveLength(1)
    expect(characters[0].name).toBe('TestFighter')
  })

  it('deletes character from roster', () => {
    const state = GameInitializationService.getGameState()

    // Create character
    const createResult = CharacterService.createCharacter(state, {
      name: 'ToDelete',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      password: 'secret'
    })

    // Delete character
    const deleteResult = CharacterService.deleteCharacter(
      createResult.state,
      createResult.character.id
    )

    expect(deleteResult.roster.size).toBe(0)
  })

  it('validates class eligibility correctly', () => {
    // Basic class - always eligible
    expect(CharacterService.validateClassEligibility(
      CharacterClass.FIGHTER,
      {
        strength: 5,
        intelligence: 5,
        piety: 5,
        vitality: 5,
        agility: 5,
        luck: 5,
        alignment: Alignment.GOOD
      }
    )).toBe(true)

    // Ninja - requires high stats and EVIL alignment
    expect(CharacterService.validateClassEligibility(
      CharacterClass.NINJA,
      {
        strength: 18,
        intelligence: 18,
        piety: 18,
        vitality: 18,
        agility: 18,
        luck: 18,
        alignment: Alignment.EVIL
      }
    )).toBe(true)

    expect(CharacterService.validateClassEligibility(
      CharacterClass.NINJA,
      {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        alignment: Alignment.EVIL
      }
    )).toBe(false)
  })
})
