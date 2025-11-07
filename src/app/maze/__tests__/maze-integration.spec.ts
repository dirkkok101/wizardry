/**
 * Integration Test: MazeComponent - Sequential Navigation Operations
 *
 * NOTE: This is a multi-step component test, not a full system integration test.
 * It tests multiple navigation features in sequence but within a single component instance.
 *
 * A true integration test would include:
 * - Real routing between Camp → Maze → Combat scenes
 * - State persistence across navigation boundaries
 * - Component lifecycle across route changes
 * - Minimal mocking (only random elements for determinism)
 *
 * This test validates that all navigation methods can be called in sequence
 * and produce correct results, which is valuable for regression testing.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MazeComponent } from '../maze.component';
import { GameStateService } from '../../../services/GameStateService';
import { DungeonService } from '../../../services/DungeonService';
import { EncounterService } from '../../../services/EncounterService';

/**
 * Helper function to create test dungeon state
 */
function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 1,
    teleportCount: 0,
    visitedTiles: new Set<string>(),
    defeatedEncounters: []
  };
}

/**
 * COORDINATE SYSTEM REFERENCE:
 *
 *     North (+Y)
 *         ↑
 * West(-X) ← → East(+X)
 *         ↓
 *     South(-Y)
 *
 * Movement directions:
 * - NORTH: y + 1
 * - SOUTH: y - 1
 * - EAST:  x + 1
 * - WEST:  x - 1
 */

describe('MazeComponent - Sequential Navigation Operations', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Set up test state at position (5,5) facing NORTH
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        ...createTestDungeonState(),
        position: { x: 5, y: 5, facing: 'NORTH' }
      }
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('sequential navigation: forward → turn → strafe → encounter', (done) => {
    // Mock: Allow all movements (for controlled test environment)
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({ allowed: true });

    // Mock: First 3 movements = no encounter, 4th = encounter (for deterministic test)
    const encounterSpy = jest.spyOn(EncounterService, 'rollRandomEncounter');
    encounterSpy.mockReturnValueOnce(false); // Move forward - no encounter
    encounterSpy.mockReturnValueOnce(false); // Strafe left - no encounter
    encounterSpy.mockReturnValueOnce(true);  // Final movement - encounter!

    // Mock: Encounter details (for deterministic test)
    jest.spyOn(EncounterService, 'getEncounterTable').mockReturnValue({
      levelId: 'level_1_monsters',
      encounterRate: 0.10,
      monsters: [{ monsterId: 'orc', weight: 1 }]
    });
    jest.spyOn(EncounterService, 'selectMonster').mockReturnValue('orc');

    const navigateSpy = jest.spyOn(router, 'navigate');

    // STEP 1: Move forward (W) - from (5,5) NORTH to (5,6) NORTH
    // North movement increases Y coordinate
    expect(component.position()).toEqual({ x: 5, y: 5, facing: 'NORTH' });
    component.moveForward();
    fixture.detectChanges();
    expect(component.position()).toEqual({ x: 5, y: 6, facing: 'NORTH' });
    expect(component.messages()).toContain('You move forward.');

    // STEP 2: Turn right (D) - still at (5,6) but now facing EAST
    // Rotation changes facing but not position
    component.turnRight();
    fixture.detectChanges();
    expect(component.position()).toEqual({ x: 5, y: 6, facing: 'EAST' });
    expect(component.messages()).toContain('You turn right.');

    // STEP 3: Strafe left (Q) - moves perpendicular to facing
    // When facing EAST, left is NORTH, so Y increases: (5,6) → (5,7)
    component.strafeLeft();
    fixture.detectChanges();
    expect(component.position()).toEqual({ x: 5, y: 7, facing: 'EAST' });
    expect(component.messages()).toContain('You strafe left.');

    // STEP 4: Move forward (W) again - triggers encounter
    // Forward when facing EAST increases X: (5,7) → (6,7)
    component.moveForward();
    fixture.detectChanges();
    expect(component.position()).toEqual({ x: 6, y: 7, facing: 'EAST' });

    // Verify encounter detection and navigation
    // Uses queueMicrotask() to match component's async navigation pattern
    queueMicrotask(() => {
      const messages = component.messages();
      const hasEncounterMessage = messages.some(msg => msg.includes('encounter'));
      expect(hasEncounterMessage).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith(['/combat-stub']);
      done();
    });
  });
});
