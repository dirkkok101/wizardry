import { Character } from '@models/Character'

/**
 * Type guard to check if a value is a Character
 */
export function isCharacter(value: unknown): value is Character {
  return value !== undefined && value !== null &&
         typeof value === 'object' && 'id' in value
}

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}
