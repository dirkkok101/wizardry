/**
 * Combat System Constants
 *
 * Centralizes all magic numbers and formulas from the combat system.
 * Based on authentic Wizardry 1 Apple II mechanics.
 *
 * @see docs/research/combat-formulas.md
 */

// ============================================================================
// Initiative Constants
// ============================================================================

/**
 * Agility-to-initiative modifier lookup table (Apple II reference)
 * Lower initiative = faster action
 */
export const AGILITY_MODIFIERS: ReadonlyMap<number, number> = new Map([
  [3, 2], // AGI 1-3: +2 (slowest)
  [5, 1], // AGI 4-5: +1
  [7, 0], // AGI 6-7: +0
  [14, -1], // AGI 8-14: -1
  [15, -2], // AGI 15: -2
  [16, -3], // AGI 16: -3
  [17, -4], // AGI 17: -4
  [18, -5], // AGI 18+: -5 (fastest)
]);

export const INITIATIVE = {
  /** Character initiative: 1d10 */
  CHARACTER_DICE_MIN: 1,
  CHARACTER_DICE_MAX: 10,
  /** Monster initiative: 1d8 + 1 (range 2-9) */
  MONSTER_DICE_MIN: 1,
  MONSTER_DICE_MAX: 8,
  MONSTER_BONUS: 1,
  /** Initiative clamping for characters */
  MIN_INITIATIVE: 1,
  MAX_INITIATIVE: 10,
} as const;

// ============================================================================
// Hit Chance Constants
// ============================================================================

export const HIT_CHANCE = {
  /** Base formula multiplier: (attackBonus + defenderAC + 29) × 5% */
  BASE_MULTIPLIER: 5,
  BASE_OFFSET: 29,
  /** Position modifier: +3% per victim position in group */
  POSITION_MODIFIER: 3,
  /** Minimum/maximum hit chance */
  MIN_CHANCE: 5,
  MAX_CHANCE: 95,
  /** Blind attacker penalty */
  BLIND_PENALTY: -4,
  /** Parry AC bonus (lower AC is better) */
  PARRY_AC_BONUS: -2,
} as const;

// ============================================================================
// Critical Hit Constants
// ============================================================================

export const CRITICAL_HIT = {
  /** Critical chance formula: (2 × Level)%, max 50% */
  LEVEL_MULTIPLIER: 2,
  MAX_CHANCE: 50,
  /** Monster resistance formula: (MonsterLevel + 10) must be < random(0, 34) */
  RESISTANCE_LEVEL_OFFSET: 10,
  RESISTANCE_ROLL_MAX: 34,
  /** Level at which monsters always resist: 24 + 10 = 34, never < random(0,34) */
  ALWAYS_RESIST_LEVEL: 24,
} as const;

// ============================================================================
// Damage Constants
// ============================================================================

export const DAMAGE = {
  /** Minimum damage per hit */
  MINIMUM_DAMAGE: 1,
  /** Helpless target multiplier (sleeping/paralyzed) */
  HELPLESS_MULTIPLIER: 2,
  /** Purposed weapon multiplier (Dragon Slayer, etc.) */
  PURPOSED_WEAPON_MULTIPLIER: 2,
} as const;

// ============================================================================
// Attack Count Constants
// ============================================================================

export const ATTACKS_PER_ROUND = {
  /** Level divisor for bonus attacks */
  LEVEL_DIVISOR: 5,
  /** Base attacks by class type */
  FIGHTER_BASE: 1,
  NINJA_BASE: 2,
  OTHER_BASE: 1,
  /** Maximum attacks per round */
  MAX_ATTACKS: 10,
} as const;

// ============================================================================
// Unarmed Combat Constants
// ============================================================================

export const UNARMED_DAMAGE = {
  /** Default unarmed damage die (1d2) */
  DEFAULT_DIE: 2,
  /** Ninja unarmed damage die (1d4) */
  NINJA_DIE: 4,
  /** Ninja level bonus divisor: floor(level/3) */
  NINJA_LEVEL_DIVISOR: 3,
} as const;

// ============================================================================
// Surprise Constants
// ============================================================================

export const SURPRISE = {
  /** Party surprises monsters: 20% */
  PARTY_SURPRISE_CHANCE: 20,
  /** Monsters surprise party: 20% (only if party didn't surprise) */
  MONSTER_SURPRISE_CHANCE: 20,
} as const;

// ============================================================================
// Flee Constants
// ============================================================================

export const FLEE = {
  /** Base formula: 39% - (MazeLevel × 3%) */
  BASE_CHANCE: 39,
  LEVEL_PENALTY_MULTIPLIER: 3,
  /** Small party bonus threshold */
  SMALL_PARTY_THRESHOLD: 3,
  /** Small party formula: 20% - (PartySize × 5%) */
  SMALL_PARTY_BASE_BONUS: 20,
  SMALL_PARTY_SIZE_PENALTY: 5,
  /** Demoralization bonus */
  DEMORALIZATION_BONUS: 20,
  /** Level 10 blocks all flee attempts */
  BLOCKED_LEVEL: 10,
} as const;

// ============================================================================
// Monster AI Constants
// ============================================================================

export const MONSTER_AI = {
  /** Mage spell casting chance */
  MAGE_SPELL_CHANCE: 75,
  /** Priest spell casting chance */
  PRIEST_SPELL_CHANCE: 75,
  /** Breath weapon chance */
  BREATH_CHANCE: 60,
  /** Flee chance when demoralized */
  FLEE_CHANCE: 65,
  /** Call for help threshold (group size < this) */
  CALL_HELP_THRESHOLD: 5,
  /** Call for help chance */
  CALL_HELP_CHANCE: 75,
  /** Help arrival formula: (MonsterLevel × 5)% */
  HELP_ARRIVAL_LEVEL_MULTIPLIER: 5,
  /** Reinforcement count range */
  REINFORCEMENT_MIN: 1,
  REINFORCEMENT_MAX: 4,
  /** Target selection: Level 1-2 use random targeting */
  RANDOM_TARGET_MAX_LEVEL: 2,
  /** Target selection: Level 3-5 use smart focus fire */
  SMART_TARGET_MAX_LEVEL: 5,
} as const;

// ============================================================================
// Dispel (Turn Undead) Constants
// ============================================================================

export const DISPEL = {
  /** Base formula: ((50 + 5×CharLevel) - (10×MonsterLevel))% */
  BASE_CHANCE: 50,
  CASTER_LEVEL_MULTIPLIER: 5,
  MONSTER_LEVEL_MULTIPLIER: 10,
  /** Class penalties */
  BISHOP_PENALTY: 20,
  LORD_PENALTY: 40,
  /** Min/max chance */
  MIN_CHANCE: 5,
  MAX_CHANCE: 95,
} as const;

// ============================================================================
// Spell Degradation Constants
// ============================================================================

export const SPELL_DEGRADATION = {
  /**
   * Degradation chance formula: 1 / (aliveInGroup + 2)
   * Example: 3 alive = 1/5 = 20%, 1 alive = 1/3 = 33%
   */
  DIVISOR_OFFSET: 2,
  PERCENTAGE_MULTIPLIER: 100,
} as const;

// ============================================================================
// Item Protection Constants
// ============================================================================

export const ITEM_PROTECTION = {
  /** Class protection nullify chance */
  CLASS_PROTECTION_CHANCE: 50,
} as const;

// ============================================================================
// Status Recovery Constants
// ============================================================================

export const STATUS_RECOVERY = {
  /** Monster wake from sleep: each round */
  MONSTER_WAKE_CHANCE: 25,
  /** Regeneration proc chance */
  REGENERATION_CHANCE: 25,
} as const;

// ============================================================================
// Hit Calculation Modifier (HPCALCMD) Constants
// ============================================================================

export const HIT_CALC_MOD = {
  /** Strong combat classes (Fighter, Priest, Samurai, Lord, Ninja) */
  STRONG_CLASS_BASE: 2,
  STRONG_CLASS_LEVEL_DIVISOR: 3,
  /** Weak combat classes (Mage, Thief, Bishop) */
  WEAK_CLASS_LEVEL_DIVISOR: 5,
} as const;

/**
 * Classes that use the strong combat hit formula
 */
export const STRONG_COMBAT_CLASSES = ['FIGHTER', 'PRIEST', 'SAMURAI', 'LORD', 'NINJA'] as const;

// ============================================================================
// Message Formatting
// ============================================================================

/**
 * Result message marker prefix
 * Messages prefixed with this are "results" of actions and use actionResultDelay
 * The marker is stripped before display
 */
export const RESULT_MARKER = '→ ';
