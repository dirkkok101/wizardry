import { CharacterClass } from '@models/CharacterClass'
import { Race } from '@models/Race'

/**
 * Sprite information for character portraits
 */
export interface SpriteInfo {
  id: string           // e.g., 'human_fighter'
  race: string         // e.g., 'human'
  classType: string    // e.g., 'fighter' (using classType to avoid reserved word)
  url: string          // e.g., '/assets/sprites/characters/human_fighter.png'
  displayName: string  // e.g., 'Human Fighter'
}

/**
 * All 20 available character sprites
 */
const AVAILABLE_SPRITES: SpriteInfo[] = [
  // Human
  { id: 'human_fighter', race: 'human', classType: 'fighter', url: '/assets/sprites/characters/human_fighter.png', displayName: 'Human Fighter' },
  { id: 'human_mage', race: 'human', classType: 'mage', url: '/assets/sprites/characters/human_mage.png', displayName: 'Human Mage' },
  { id: 'human_priest', race: 'human', classType: 'priest', url: '/assets/sprites/characters/human_priest.png', displayName: 'Human Priest' },
  { id: 'human_thief', race: 'human', classType: 'thief', url: '/assets/sprites/characters/human_thief.png', displayName: 'Human Thief' },
  // Elf
  { id: 'elf_fighter', race: 'elf', classType: 'fighter', url: '/assets/sprites/characters/elf_fighter.png', displayName: 'Elf Fighter' },
  { id: 'elf_mage', race: 'elf', classType: 'mage', url: '/assets/sprites/characters/elf_mage.png', displayName: 'Elf Mage' },
  { id: 'elf_priest', race: 'elf', classType: 'priest', url: '/assets/sprites/characters/elf_priest.png', displayName: 'Elf Priest' },
  { id: 'elf_thief', race: 'elf', classType: 'thief', url: '/assets/sprites/characters/elf_thief.png', displayName: 'Elf Thief' },
  // Dwarf
  { id: 'dwarf_fighter', race: 'dwarf', classType: 'fighter', url: '/assets/sprites/characters/dwarf_fighter.png', displayName: 'Dwarf Fighter' },
  { id: 'dwarf_mage', race: 'dwarf', classType: 'mage', url: '/assets/sprites/characters/dwarf_mage.png', displayName: 'Dwarf Mage' },
  { id: 'dwarf_priest', race: 'dwarf', classType: 'priest', url: '/assets/sprites/characters/dwarf_priest.png', displayName: 'Dwarf Priest' },
  { id: 'dwarf_thief', race: 'dwarf', classType: 'thief', url: '/assets/sprites/characters/dwarf_thief.png', displayName: 'Dwarf Thief' },
  // Gnome
  { id: 'gnome_fighter', race: 'gnome', classType: 'fighter', url: '/assets/sprites/characters/gnome_fighter.png', displayName: 'Gnome Fighter' },
  { id: 'gnome_mage', race: 'gnome', classType: 'mage', url: '/assets/sprites/characters/gnome_mage.png', displayName: 'Gnome Mage' },
  { id: 'gnome_priest', race: 'gnome', classType: 'priest', url: '/assets/sprites/characters/gnome_priest.png', displayName: 'Gnome Priest' },
  { id: 'gnome_thief', race: 'gnome', classType: 'thief', url: '/assets/sprites/characters/gnome_thief.png', displayName: 'Gnome Thief' },
  // Hobbit
  { id: 'hobbit_fighter', race: 'hobbit', classType: 'fighter', url: '/assets/sprites/characters/hobbit_fighter.png', displayName: 'Hobbit Fighter' },
  { id: 'hobbit_mage', race: 'hobbit', classType: 'mage', url: '/assets/sprites/characters/hobbit_mage.png', displayName: 'Hobbit Mage' },
  { id: 'hobbit_priest', race: 'hobbit', classType: 'priest', url: '/assets/sprites/characters/hobbit_priest.png', displayName: 'Hobbit Priest' },
  { id: 'hobbit_thief', race: 'hobbit', classType: 'thief', url: '/assets/sprites/characters/hobbit_thief.png', displayName: 'Hobbit Thief' },
]

/**
 * Map advanced classes to their base sprite class type
 * - Bishop: Religious caster -> priest sprite
 * - Samurai/Lord: Martial classes -> fighter sprite
 * - Ninja: Stealth class -> thief sprite
 */
const CLASS_TO_SPRITE_TYPE: Record<CharacterClass, string> = {
  [CharacterClass.FIGHTER]: 'fighter',
  [CharacterClass.MAGE]: 'mage',
  [CharacterClass.PRIEST]: 'priest',
  [CharacterClass.THIEF]: 'thief',
  [CharacterClass.BISHOP]: 'priest',
  [CharacterClass.SAMURAI]: 'fighter',
  [CharacterClass.LORD]: 'fighter',
  [CharacterClass.NINJA]: 'thief',
}

/**
 * Map race enum to sprite race string
 */
const RACE_TO_SPRITE_RACE: Record<Race, string> = {
  [Race.HUMAN]: 'human',
  [Race.ELF]: 'elf',
  [Race.DWARF]: 'dwarf',
  [Race.GNOME]: 'gnome',
  [Race.HOBBIT]: 'hobbit',
}

/**
 * Get all available sprites
 */
function getAllSprites(): SpriteInfo[] {
  return [...AVAILABLE_SPRITES]
}

/**
 * Get sprite by ID
 */
function getSpriteById(spriteId: string): SpriteInfo | undefined {
  return AVAILABLE_SPRITES.find(s => s.id === spriteId)
}

/**
 * Get sprite URL for a character (with fallback)
 * If character has explicit spriteId, use it
 * Otherwise derive from race + class
 */
function getSpriteUrl(character: { spriteId?: string; race: Race; class: CharacterClass }): string {
  // If character has explicit sprite, use it
  if (character.spriteId) {
    const sprite = getSpriteById(character.spriteId)
    if (sprite) return sprite.url
  }

  // Derive from race + class
  const suggested = suggestSprite(character.race, character.class)
  return suggested?.url ?? '/assets/sprites/characters/human_fighter.png'
}

/**
 * Suggest a sprite based on race and class
 */
function suggestSprite(race: Race, characterClass: CharacterClass): SpriteInfo | undefined {
  const spriteRace = RACE_TO_SPRITE_RACE[race]
  const spriteType = CLASS_TO_SPRITE_TYPE[characterClass]

  if (!spriteRace || !spriteType) return undefined

  return AVAILABLE_SPRITES.find(
    s => s.race === spriteRace && s.classType === spriteType
  )
}

/**
 * Get index of sprite in the array
 */
function getSpriteIndex(spriteId: string): number {
  return AVAILABLE_SPRITES.findIndex(s => s.id === spriteId)
}

/**
 * Get sprite at index (wrapping for carousel)
 */
function getSpriteAtIndex(index: number): SpriteInfo {
  const len = AVAILABLE_SPRITES.length
  const normalizedIndex = ((index % len) + len) % len // Handle negative indices
  return AVAILABLE_SPRITES[normalizedIndex]
}

/**
 * Navigate to next sprite (for carousel)
 */
function getNextSprite(currentSpriteId: string): SpriteInfo {
  const currentIndex = getSpriteIndex(currentSpriteId)
  if (currentIndex === -1) return AVAILABLE_SPRITES[0]
  return getSpriteAtIndex(currentIndex + 1)
}

/**
 * Navigate to previous sprite (for carousel)
 */
function getPreviousSprite(currentSpriteId: string): SpriteInfo {
  const currentIndex = getSpriteIndex(currentSpriteId)
  if (currentIndex === -1) return AVAILABLE_SPRITES[AVAILABLE_SPRITES.length - 1]
  return getSpriteAtIndex(currentIndex - 1)
}

/**
 * Get total number of available sprites
 */
function getSpriteCount(): number {
  return AVAILABLE_SPRITES.length
}

export const SpriteService = {
  getAllSprites,
  getSpriteById,
  getSpriteUrl,
  suggestSprite,
  getSpriteIndex,
  getSpriteAtIndex,
  getNextSprite,
  getPreviousSprite,
  getSpriteCount,
}
