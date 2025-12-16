/**
 * CombatPlanningComponent smoke tests
 *
 * Tests basic component rendering and action selection UI.
 * Full combat flow integration tests are in separate E2E tests.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CombatPlanningComponent } from './combat-planning.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter, createTestCombatState } from '@testing/test-factories';
import { GameState } from '@models/GameState';
import { CombatState } from '@models/Combat';

describe('CombatPlanningComponent', () => {
  let component: CombatPlanningComponent;
  let fixture: ComponentFixture<CombatPlanningComponent>;
  let mockGameState: GameState;
  let mockCombatState: CombatState;

  beforeEach(async () => {
    // Create game state with combat
    mockGameState = createTestGameState();
    mockCombatState = createTestCombatState();
    mockGameState.combat = mockCombatState;

    mockGameState.dungeon = {
      ...mockGameState.dungeon!,
      currentLevel: 1,
      position: { x: 10, y: 0, facing: 'N' },
      visitedTiles: new Set(['10,0'])
    };

    // Add party members (6 characters for full party)
    const characters = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({ id: `char-${i}`, name: `Hero ${i + 1}` })
    );
    mockGameState.party.members = characters.map(c => c.id);
    characters.forEach(c => mockGameState.roster.set(c.id, c));

    await TestBed.configureTestingModule({
      imports: [CombatPlanningComponent],
      providers: [
        {
          provide: GameStateService,
          useValue: {
            state: signal(mockGameState),
            updateState: jest.fn()
          }
        },
        {
          provide: SceneNavigationService,
          useValue: {
            inspectCharacter: jest.fn(),
            castSpell: jest.fn()
          }
        },
        {
          provide: MessageLogService,
          useValue: {
            messages: signal([]),
            addMessage: jest.fn()
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CombatPlanningComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render scene title with round number', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('app-scene-title');
    expect(title).toBeTruthy();
  });

  it('should render character panels', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const panels = compiled.querySelectorAll('app-character-panel');
    expect(panels.length).toBe(2);
  });

  it('should render combat overlay', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const overlay = compiled.querySelector('app-combat-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should render footer menu', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const footer = compiled.querySelector('app-scene-footer');
    expect(footer).toBeTruthy();
  });

  it('should compute round number from combat state', () => {
    fixture.detectChanges();
    expect(component.roundNumber()).toBe(mockCombatState.roundNumber);
  });

  it('should compute monster groups from combat state', () => {
    fixture.detectChanges();
    expect(component.monsterGroups()).toEqual(mockCombatState.monsterGroups);
  });

  it('should have no selected actions initially', () => {
    fixture.detectChanges();
    expect(component.selectedActions().size).toBe(0);
  });

  it('should compute combat menu items', () => {
    // combatMenuItems is a computed signal that always returns 3 items
    // (start_round, reset, flee) - they may be enabled or disabled based on state
    fixture.detectChanges();

    const menuItems = component.combatMenuItems();
    expect(menuItems.length).toBe(3);

    const menuIds = menuItems.map(item => item.id);
    expect(menuIds).toContain('start_round');
    expect(menuIds).toContain('reset');
    expect(menuIds).toContain('flee');
  });
});
