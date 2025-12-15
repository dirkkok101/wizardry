import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { LoggerService } from '@services/LoggerService';

/**
 * Route guard that requires an active combat state.
 *
 * Used for combat-related routes:
 * - /maze/combat/planning
 * - /maze/combat/playback
 * - /maze/combat/victory
 * - /maze/combat/defeat
 *
 * Redirects to /maze if not in combat.
 */
export const inCombatGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const state = gameState.state();

  if (!state.combat) {
    logger.warn('[Guard] Cannot access combat routes without active combat. Redirecting to maze.');
    router.navigate(['/maze']);
    return false;
  }

  return true;
};

/**
 * Route guard that requires NO active combat state.
 *
 * Used for exploration route:
 * - /maze (default child route)
 *
 * Redirects to /maze/combat/planning if combat is active.
 */
export const notInCombatGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const state = gameState.state();

  if (state.combat) {
    logger.warn('[Guard] Cannot access exploration while in combat. Redirecting to combat planning.');
    router.navigate(['/maze/combat/planning']);
    return false;
  }

  return true;
};

/**
 * Route guard that requires a pending chest.
 *
 * Used for chest-related routes:
 * - /maze/chest
 * - /maze/chest/playback
 * - /maze/chest/rewards
 *
 * Redirects to /maze if no pending chest.
 */
export const hasChestGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const state = gameState.state();

  if (!state.pendingChest) {
    logger.warn('[Guard] Cannot access chest routes without pending chest. Redirecting to maze.');
    router.navigate(['/maze']);
    return false;
  }

  return true;
};

/**
 * Route guard that requires NO pending chest.
 *
 * Used to prevent exploration while chest interaction is pending.
 * Redirects to /maze/chest if a chest is pending.
 */
export const noChestGuard: CanActivateFn = () => {
  const gameState = inject(GameStateService);
  const router = inject(Router);
  const logger = inject(LoggerService);

  const state = gameState.state();

  if (state.pendingChest) {
    logger.warn('[Guard] Cannot access exploration while chest is pending. Redirecting to chest.');
    router.navigate(['/maze/chest']);
    return false;
  }

  return true;
};
