/**
 * Character Races - Original Wizardry races with stat modifiers
 */
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT'
}

/**
 * Race stat modifiers (applied during character creation)
 */
export const RACE_MODIFIERS: Record<Race, {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}> = {
  [Race.HUMAN]: { strength: 0, intelligence: 0, piety: 0, vitality: 0, agility: 0, luck: 0 },
  [Race.ELF]: { strength: -1, intelligence: 1, piety: 1, vitality: -2, agility: 1, luck: 0 },
  [Race.DWARF]: { strength: 2, intelligence: 0, piety: 0, vitality: 2, agility: -1, luck: 0 },
  [Race.GNOME]: { strength: -1, intelligence: 1, piety: 0, vitality: -1, agility: 1, luck: 0 },
  [Race.HOBBIT]: { strength: -2, intelligence: 0, piety: 1, vitality: -1, agility: 2, luck: 1 }
}
