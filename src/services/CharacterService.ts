import { GameState } from '../types/GameState'
import { Character, CreateCharacterParams } from '../types/Character'
import { CharacterClass, CLASS_REQUIREMENTS } from '../types/CharacterClass'
import { CharacterStatus } from '../types/CharacterStatus'
import { Race } from '../types/Race'
import { Alignment } from '../types/Alignment'
import { BaseStats } from './CharacterCreationService'
import { CharacterSpellPoints } from '../types/SpellPoints'
import { MaxCurrent } from '../types/MaxCurrent'
import { ClassService } from './ClassService'
import { RaceService } from './RaceService'
import { v4 as uuidv4 } from 'uuid'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface CreateCharacterInput {
  name: string
  password: string
  race: Race
  alignment: Alignment
  stats: BaseStats
  selectedClass: CharacterClass
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
 * Roll hit dice based on hit dice string (e.g., "1d8", "1d10")
 */
function rollHitDice(hitDice: string): number {
  const match = hitDice.match(/^(\d+)d(\d+)$/)
  if (!match) {
    throw new Error(`Invalid hit dice format: ${hitDice}`)
  }

  const numDice = parseInt(match[1], 10)
  const diceSize = parseInt(match[2], 10)

  let total = 0
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * diceSize) + 1
  }

  return total
}

/**
 * Initialize spell points for caster classes
 * Returns undefined for non-casters, appropriate pools for Mage/Priest/Bishop
 * Level 1 casters start with 2 spell points for level 1 spells (authentic Wizardry 1981)
 */
function initializeSpellPoints(characterClass: CharacterClass): CharacterSpellPoints | undefined {
  const classData = ClassService.getClassData(characterClass)

  // Non-casters have no spell access
  if (!classData.spellAccess) {
    return undefined
  }

  const spellPoints: CharacterSpellPoints = {}

  // Level 1 casters start with 2 spell points for level 1 spells
  // Higher levels start at 0 and are gained through leveling up
  const magePool = {
    level1: { current: 2, max: 2 },
    level2: { current: 0, max: 0 },
    level3: { current: 0, max: 0 },
    level4: { current: 0, max: 0 },
    level5: { current: 0, max: 0 },
    level6: { current: 0, max: 0 },
    level7: { current: 0, max: 0 }
  }

  const priestPool = {
    level1: { current: 2, max: 2 },
    level2: { current: 0, max: 0 },
    level3: { current: 0, max: 0 },
    level4: { current: 0, max: 0 },
    level5: { current: 0, max: 0 },
    level6: { current: 0, max: 0 },
    level7: { current: 0, max: 0 }
  }

  // Initialize pools based on spell access
  if (classData.spellAccess.mage) {
    spellPoints.mage = { ...magePool }
  }

  if (classData.spellAccess.priest) {
    spellPoints.priest = { ...priestPool }
  }

  return spellPoints
}

/**
 * Generate random age (14-16, original Wizardry range)
 */
function generateAge(): number {
  return 14 + Math.floor(Math.random() * 3)
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

  // Apply race modifiers using RaceService
  const raceData = RaceService.getRaceData(params.race)
  const raceModifiers = raceData.baseStats
  const strength = baseStrength + raceModifiers.str
  const intelligence = baseIntelligence + raceModifiers.int
  const piety = basePiety + raceModifiers.pie
  const vitality = baseVitality + raceModifiers.vit
  const agility = baseAgility + raceModifiers.agi
  const luck = baseLuck + raceModifiers.luc

  // Calculate starting HP using ClassService hit dice
  const classData = ClassService.getClassData(params.class)
  const maxHp = rollHitDice(classData.hitDice)

  // Initialize VIM (vitality for resurrection)
  const vim: MaxCurrent = {
    current: vitality,
    max: vitality
  }

  // Generate age (14-16)
  const age = generateAge()

  // Initialize spell points for caster classes
  const spellPoints = initializeSpellPoints(params.class)

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
    age,
    hp: maxHp,
    maxHp,
    ac: 10, // Base AC, improved by armor
    vim,
    spellPoints,
    knownSpells: [],
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
 * Delete a character from the roster
 *
 * @param state - Current game state
 * @param characterId - ID of character to delete
 * @returns New game state with character removed
 * @throws Error if character is in party
 */
function deleteCharacter(state: GameState, characterId: string): GameState {
  const character = state.roster.get(characterId)

  // Character doesn't exist - return unchanged state
  if (!character) {
    return state
  }

  // Validate: character must not be in party
  if (state.party.members.includes(characterId)) {
    throw new Error('Cannot delete character: character is in party')
  }

  // Create new roster without the character (immutable update)
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

/**
 * Calculate starting HP based on class hit dice.
 *
 * Uses ClassService.getClassData().hitDice (e.g., "1d10", "1d8")
 */
function calculateStartingHP(characterClass: CharacterClass): { hp: number; maxHp: number } {
  const classData = ClassService.getClassData(characterClass)
  const maxHp = rollHitDice(classData.hitDice)

  return { hp: maxHp, maxHp }
}

/**
 * Create a new character with validated stats and class.
 *
 * Throws error if character does not meet class requirements.
 */
function createCharacterFromStats(input: CreateCharacterInput): Character {
  const { name, password, race, alignment, stats, selectedClass } = input

  // Validate character meets class requirements
  const eligible = getEligibleClasses(stats, alignment)
  if (!eligible.includes(selectedClass)) {
    throw new Error(
      `Character does not meet requirements for ${selectedClass}`
    )
  }

  // Calculate starting HP based on class hit dice
  const { hp, maxHp } = calculateStartingHP(selectedClass)

  // Initialize VIM (vitality for resurrection)
  const vim: MaxCurrent = {
    current: stats.vitality,
    max: stats.vitality
  }

  // Generate age (14-16)
  const age = generateAge()

  // Initialize spell points for caster classes
  const spellPoints = initializeSpellPoints(selectedClass)

  // Create character
  const character: Character = {
    id: uuidv4(),
    name,
    password,
    race,
    alignment,
    class: selectedClass,
    level: 1,
    experience: 0,
    age,

    // Stats
    strength: stats.strength,
    intelligence: stats.intelligence,
    piety: stats.piety,
    vitality: stats.vitality,
    agility: stats.agility,
    luck: stats.luck,

    // HP
    hp,
    maxHp,

    // AC (base 10, improved by armor)
    ac: 10,

    // Status & Vitality
    status: CharacterStatus.OK,
    vim,

    // Spell System
    spellPoints,
    knownSpells: [],

    // Equipment
    equippedWeapon: undefined,
    equippedArmor: undefined,
    equippedShield: undefined,
    equippedHelmet: undefined,
    equippedGauntlets: undefined,

    // Inventory
    inventory: []
  }

  return character
}

export const CharacterService = {
  getAllCharacters,
  createCharacter,
  deleteCharacter,
  validateClassEligibility,
  getEligibleClasses,
  validateCharacterName,
  validatePassword,
  createCharacterFromStats
}
