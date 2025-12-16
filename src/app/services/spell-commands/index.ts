/**
 * Spell Commands Barrel Export
 *
 * Re-exports all spell command types and the registry.
 * Import from this file for cleaner imports throughout the application.
 */

// Interface and types
export * from './spell-command.interface'

// Registry
export * from './spell-command.registry'

// Individual commands (for direct testing)
export * from './milwa.command'
export * from './lomilwa.command'
export * from './dumapic.command'
export * from './loktofeit.command'
export * from './latumapic.command'
export * from './maporfic.command'
export * from './calfo.command'
export * from './kandi.command'
export * from './default.command'
