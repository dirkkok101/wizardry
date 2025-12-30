import { CharacterResistances } from './CharacterResistance';

/**
 * Character Races - Original Wizardry races
 */
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT',
}

/**
 * Base attribute stats for a race (from JSON data)
 */
export interface RaceBaseStats {
  str: number; // Strength (3-18 range)
  int: number; // Intelligence
  pie: number; // Piety
  vit: number; // Vitality
  agi: number; // Agility
  luc: number; // Luck
}

/**
 * Saving throw bonuses (negative modifiers - lower is better)
 * From original Wizardry 1 saving throw formula
 */
export interface SavingThrowBonus {
  death?: number; // Human: -1 (poison, paralysis, critical hits)
  wand?: number; // Elf: -2 (wand save - unused in game)
  breath?: number; // Dwarf: -4 (breath attacks, gas)
  petrify?: number; // Gnome: -2 (petrification)
  spell?: number; // Hobbit: -3 (spells, magic)
}

/**
 * Complete race data structure (matches JSON files)
 */
export interface RaceData {
  id: string;
  name: string;
  baseStats: RaceBaseStats;
  savingThrowBonus: SavingThrowBonus;
  resistances?: CharacterResistances; // Percentage-based protections
  statTotal: number;
  description: string;
  strengths: string[];
  weaknesses: string[];
  bestClasses: string[];
}

/**
 * Map race enum to lowercase ID for JSON loading
 */
export function getRaceId(race: Race): string {
  return race.toLowerCase();
}

/**
 * Map lowercase ID to race enum
 */
export function parseRace(id: string): Race | null {
  const upperID = id.toUpperCase();
  if (upperID in Race) {
    return Race[upperID as keyof typeof Race];
  }
  return null;
}

/**
 * Helper to parse saving throw bonuses from JSON
 */
export function parseSavingThrowBonus(data: Record<string, number>): SavingThrowBonus {
  return {
    death: data['death'],
    wand: data['wand'],
    breath: data['breath'],
    petrify: data['petrify'],
    spell: data['spell'],
  };
}
