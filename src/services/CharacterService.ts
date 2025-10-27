import { GameState } from '../types/GameState'
import { Character, CreateCharacterParams } from '../types/Character'
import { CharacterClass, CLASS_REQUIREMENTS } from '../types/CharacterClass'
import { CharacterStatus } from '../types/CharacterStatus'
import { Race, RACE_MODIFIERS } from '../types/Race'
import { Alignment } from '../types/Alignment'

/**
 * Get all characters from roster
 */
function getAllCharacters(state: GameState): Character[] {
  return Array.from(state.roster.values())
}

export const CharacterService = {
  getAllCharacters
}
