/**
 * TrapInspectionService - Handles trap inspection mechanics
 *
 * Implements original Wizardry 1 trap inspection formulas:
 * - Inspection: AGI × class multiplier (6 for Thief, 4 for Ninja, 1 for others)
 * - Critical failure (1-2%) can trigger trap during inspection
 * - Failed inspection returns random trap name (deception mechanic)
 *
 * @see docs/research/combat-formulas.md
 */

import { Character } from '@models/Character';
import { Chest } from '@models/Chest';
import { TrapId, TrapInspectionResult } from '@models/Trap';
import { canAct } from '@utils/CharacterStatusHelpers';
import { RandomService } from '../RandomService';
import { TrapDataLoader } from '../TrapDataLoader';
import { ClassService } from '../ClassService';

const DEFAULT_INSPECT_MULTIPLIER = 1;
const MAX_SUCCESS_CHANCE = 95;

function getInspectMultiplier(character: Character): number {
  if (!ClassService.isInitialized()) {
    return DEFAULT_INSPECT_MULTIPLIER;
  }
  const classData = ClassService.getClassData(character.class);
  return classData.trapInspectionMultiplier ?? DEFAULT_INSPECT_MULTIPLIER;
}

/**
 * Critical failure chance during inspection (1-2%)
 */
const INSPECT_CRITICAL_FAILURE_CHANCE = 2;

/**
 * Get a random trap ID from loaded trap data
 * Used for deception mechanics when inspection fails
 */
function getRandomTrapId(): TrapId {
  if (!TrapDataLoader.isLoaded()) {
    throw new Error('Trap data not loaded. Call TrapDataLoader.loadAllTraps() first.');
  }

  const allTraps = TrapDataLoader.getAllTrapEffects();
  const trapIds = Array.from(allTraps.keys());
  return RandomService.pickRandom(trapIds);
}

export function calculateInspectChance(character: Character): number {
  const multiplier = getInspectMultiplier(character);
  const chance = character.agility * multiplier;
  return Math.min(chance, MAX_SUCCESS_CHANCE);
}

/**
 * Attempt to inspect a chest for traps
 *
 * Original Wizardry 1 behavior (two-stage resolution):
 * - Success: Return real trap information
 * - Failure on trapped chest: AGI check to avoid triggering, then return RANDOM trap name
 * - Failure on untrapped chest: Return RANDOM trap name (deception mechanic!)
 *
 * The random trap name on failure is a core deception mechanic - the player
 * cannot tell if the inspection result is real or not.
 *
 * @returns InspectionResult with success status, identified trap, and trigger status
 */
export function attemptInspection(character: Character, chest: Chest): TrapInspectionResult {
  console.log(
    `[CHEST] Inspect attempt: ${character.name} (${character.class} L${character.level})`,
  );

  // Check for critical failure first (1-2% chance to trigger trap during inspection)
  const critRoll = RandomService.nextRandom() * 100;
  const critFailed = critRoll < INSPECT_CRITICAL_FAILURE_CHANCE;
  console.log(
    `[CHEST]   Critical failure check: Roll ${critRoll.toFixed(1)}% vs ${INSPECT_CRITICAL_FAILURE_CHANCE}% threshold → ${critFailed ? 'CRITICAL FAIL!' : 'Pass'}`,
  );

  if (critFailed) {
    if (chest.trapped) {
      console.log(`[CHEST]   Result: Trap triggered due to critical failure!`);
    } else {
      console.log(`[CHEST]   Result: Critical fail but chest not trapped - no effect`);
    }
    return {
      success: false,
      trapIdentified: null,
      triggered: chest.trapped, // Only triggers if actually trapped
    };
  }

  // Roll for inspection success
  const inspectChance = calculateInspectChance(character);
  const multiplier = getInspectMultiplier(character);
  const inspectRoll = RandomService.nextRandom() * 100;
  const success = inspectRoll < inspectChance;
  console.log(
    `[CHEST]   Inspect chance: AGI ${character.agility} × ${multiplier} = ${inspectChance}%`,
  );
  console.log(
    `[CHEST]   Inspect roll: ${inspectRoll.toFixed(1)}% vs ${inspectChance}% → ${success ? 'Success' : 'Fail'}`,
  );

  // SUCCESS - return real information
  if (success) {
    if (chest.trapped) {
      console.log(`[CHEST]   Result: Trap identified - ${chest.trapId}`);
    } else {
      console.log(`[CHEST]   Result: No trap found (chest is safe)`);
    }
    return {
      success: true,
      trapIdentified: chest.trapped ? chest.trapId : null,
      triggered: false,
    };
  }

  // FAILED INSPECTION - Two-stage resolution per original source code

  // Stage 1: AGI-based trigger check (only if trapped)
  // Original formula: If (RANDOM MOD 20) > AGI, trap triggers
  if (chest.trapped) {
    const triggerRoll = RandomService.random(0, 19);
    const triggered = triggerRoll > character.agility;
    console.log(
      `[CHEST]   AGI save (failed inspect): Roll ${triggerRoll} vs AGI ${character.agility} → ${triggered ? 'TRIGGERED!' : 'Saved'}`,
    );

    if (triggered) {
      return {
        success: false,
        trapIdentified: null,
        triggered: true,
      };
    }
  }

  // Stage 2: Return RANDOM trap name (misleading!)
  // This is a core deception mechanic - player cannot tell if result is real
  const randomTrapId = getRandomTrapId();
  console.log(
    `[CHEST]   Result: Failed inspection - showing random trap "${randomTrapId}" (may be misleading!)`,
  );

  return {
    success: false,
    trapIdentified: randomTrapId,
    triggered: false,
  };
}

/**
 * Get recommended character for trap handling
 * Based on inspect chance (for identification) and disarm chance
 *
 * @param partyMembers Resolved Character objects for party members
 * @param mazeLevel Current dungeon level
 * @param calculateDisarmChance Function to calculate disarm chance
 */
export function getRecommendedHandler(
  partyMembers: Character[],
  mazeLevel: number,
  calculateDisarmChance: (char: Character, level: number) => number,
): { character: Character; inspectChance: number; disarmChance: number } | null {
  let best: { character: Character; inspectChance: number; disarmChance: number } | null = null;

  for (const member of partyMembers) {
    // Skip characters who cannot act (dead, paralyzed, etc.)
    if (!canAct(member)) {
      continue;
    }

    const inspectChance = calculateInspectChance(member);
    const disarmChance = calculateDisarmChance(member, mazeLevel);

    // Score based on both abilities (weighted towards inspect since it comes first)
    const score = inspectChance * 0.6 + disarmChance * 0.4;

    if (!best || score > best.inspectChance * 0.6 + best.disarmChance * 0.4) {
      best = { character: member, inspectChance, disarmChance };
    }
  }

  return best;
}

export const TrapInspectionService = {
  calculateInspectChance,
  attemptInspection,
  getRecommendedHandler,
};
