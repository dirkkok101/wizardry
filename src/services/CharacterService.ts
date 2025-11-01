import { GameState } from '../types/GameState'
import { Character, CreateCharacterParams } from '../types/Character'
import { CharacterClass, CLASS_REQUIREMENTS } from '../types/CharacterClass'
import { CharacterStatus } from '../types/CharacterStatus'
import { Race, RACE_MODIFIERS } from '../types/Race'
import { Alignment } from '../types/Alignment'
import { BaseStats } from './CharacterCreationService'

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Class stat requirements based on authentic Wizardry mechanics
 */
const CLASS_REQUIREMENTS_FOR_ELIGIBILITY: Record<CharacterClass, Partial<BaseStats>> = {
  [CharacterClass.FIGHTER]: { strength: 11 },
  [CharacterClass.MAGE]: { intelligence: 11 },
  [CharacterClass.PRIEST]: { piety: 11 },
  [CharacterClass.THIEF]: { agility: 11 },
  [CharacterClass.BISHOP]: { intelligence: 12, piety: 12 },
  [CharacterClass.SAMURAI]: {
    strength: 15,
    intelligence: 11,
    piety: 10,
    vitality: 14,
    agility: 10
  },
  [CharacterClass.LORD]: {
    strength: 15,
    intelligence: 12,
    piety: 12,
    vitality: 15,
    agility: 14,
    luck: 15
  },
  [CharacterClass.NINJA]: {
    strength: 17,
    intelligence: 17,
    piety: 17,
    vitality: 17,
    agility: 17,
    luck: 17
  }
}

/**
 * Get all characters from roster
 */
function getAllCharacters(state: GameState): Character[] {
  return Array.from(state.roster.values())
}

/**
 * Roll a stat (3d6, range 3-18)
 */
function rollStat(): number {
  return Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1
}

/**
 * Generate unique character ID
 */
function generateCharacterId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create new character with rolled stats
 */
function createCharacter(
  state: GameState,
  params: CreateCharacterParams
): { state: GameState, character: Character } {
  // Roll base stats
  const baseStrength = rollStat()
  const baseIntelligence = rollStat()
  const basePiety = rollStat()
  const baseVitality = rollStat()
  const baseAgility = rollStat()
  const baseLuck = rollStat()

  // Apply race modifiers
  const raceModifiers = RACE_MODIFIERS[params.race]
  const strength = baseStrength + raceModifiers.strength
  const intelligence = baseIntelligence + raceModifiers.intelligence
  const piety = basePiety + raceModifiers.piety
  const vitality = baseVitality + raceModifiers.vitality
  const agility = baseAgility + raceModifiers.agility
  const luck = baseLuck + raceModifiers.luck

  // Calculate starting HP (vitality-based)
  const maxHp = Math.max(1, vitality + Math.floor(Math.random() * 8) + 1)

  const character: Character = {
    id: generateCharacterId(),
    name: params.name,
    race: params.race,
    class: params.class,
    alignment: params.alignment,
    status: CharacterStatus.OK,
    strength,
    intelligence,
    piety,
    vitality,
    agility,
    luck,
    level: 1,
    experience: 0,
    hp: maxHp,
    maxHp,
    ac: 10, // Base AC, improved by armor
    inventory: [],
    password: params.password,
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  // Add to roster
  const newRoster = new Map(state.roster)
  newRoster.set(character.id, character)

  return {
    state: {
      ...state,
      roster: newRoster
    },
    character
  }
}

/**
 * Delete character from roster
 */
function deleteCharacter(state: GameState, characterId: string): GameState {
  if (!state.roster.has(characterId)) {
    return state
  }

  const newRoster = new Map(state.roster)
  newRoster.delete(characterId)

  return {
    ...state,
    roster: newRoster
  }
}

/**
 * Check if character stats meet class requirements
 */
function validateClassEligibility(
  characterClass: CharacterClass,
  stats: {
    strength: number
    intelligence: number
    piety: number
    vitality: number
    agility: number
    luck: number
    alignment: Alignment
  }
): boolean {
  const requirements = CLASS_REQUIREMENTS[characterClass]

  // Check stat requirements
  if (requirements.strength && stats.strength < requirements.strength) return false
  if (requirements.intelligence && stats.intelligence < requirements.intelligence) return false
  if (requirements.piety && stats.piety < requirements.piety) return false
  if (requirements.vitality && stats.vitality < requirements.vitality) return false
  if (requirements.agility && stats.agility < requirements.agility) return false
  if (requirements.luck && stats.luck < requirements.luck) return false

  // Check alignment requirement
  if (requirements.alignment && !requirements.alignment.includes(stats.alignment)) {
    return false
  }

  return true
}

/**
 * Alignment restrictions for each class based on authentic Wizardry mechanics
 */
const CLASS_ALIGNMENT_RESTRICTIONS: Record<CharacterClass, Alignment[] | null> = {
  [CharacterClass.FIGHTER]: null, // Any alignment
  [CharacterClass.MAGE]: null, // Any alignment
  [CharacterClass.PRIEST]: [Alignment.GOOD, Alignment.EVIL], // Not Neutral
  [CharacterClass.THIEF]: [Alignment.NEUTRAL, Alignment.EVIL], // Not Good
  [CharacterClass.BISHOP]: null, // Any alignment
  [CharacterClass.SAMURAI]: [Alignment.GOOD, Alignment.NEUTRAL], // Not Evil
  [CharacterClass.LORD]: [Alignment.GOOD], // Good only
  [CharacterClass.NINJA]: [Alignment.EVIL] // Evil only
}

/**
 * Calculate which classes a character is eligible for based on their stats and alignment.
 *
 * Returns array of eligible CharacterClass values.
 */
function getEligibleClasses(stats: BaseStats, alignment: Alignment): CharacterClass[] {
  const eligible: CharacterClass[] = []

  for (const [className, requirements] of Object.entries(CLASS_REQUIREMENTS_FOR_ELIGIBILITY)) {
    const charClass = className as CharacterClass

    // Check stat requirements first
    if (!meetsRequirements(stats, requirements)) {
      continue
    }

    // Check alignment requirements
    const allowedAlignments = CLASS_ALIGNMENT_RESTRICTIONS[charClass]
    if (allowedAlignments !== null && !allowedAlignments.includes(alignment)) {
      continue
    }

    eligible.push(charClass)
  }

  return eligible
}

/**
 * Check if character stats meet the requirements for a class.
 */
function meetsRequirements(
  stats: BaseStats,
  requirements: Partial<BaseStats>
): boolean {
  for (const [stat, required] of Object.entries(requirements)) {
    const statKey = stat as keyof BaseStats
    if (stats[statKey] < required) {
      return false
    }
  }
  return true
}

/**
 * Validate character name.
 *
 * Rules:
 * - Required (not empty)
 * - Max 15 characters
 * - Alphanumeric + spaces only
 */
function validateCharacterName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required' }
  }

  if (name.length > 15) {
    return { valid: false, error: 'Name must be 15 characters or less' }
  }

  if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
    return {
      valid: false,
      error: 'Name must contain only letters, numbers, and spaces'
    }
  }

  return { valid: true }
}

/**
 * Validate character password.
 *
 * Rules:
 * - Required (not empty)
 * - 4-8 characters
 * - Alphanumeric only
 */
function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < 4 || password.length > 8) {
    return { valid: false, error: 'Password must be 4-8 characters' }
  }

  if (!/^[a-zA-Z0-9]+$/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain only letters and numbers'
    }
  }

  return { valid: true }
}

export const CharacterService = {
  getAllCharacters,
  createCharacter,
  deleteCharacter,
  validateClassEligibility,
  getEligibleClasses,
  validateCharacterName,
  validatePassword
}
