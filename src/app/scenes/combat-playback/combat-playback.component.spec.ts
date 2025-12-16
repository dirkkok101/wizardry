/**
 * CombatPlaybackComponent smoke tests
 *
 * Tests basic component rendering during combat round resolution.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CombatPlaybackComponent } from './combat-playback.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter, createTestCombatState } from '@testing/test-factories';
import { GameState } from '@models/GameState';
import { CombatState } from '@models/Combat';

describe('CombatPlaybackComponent', () => {
  let component: CombatPlaybackComponent;
  let fixture: ComponentFixture<CombatPlaybackComponent>;
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
      imports: [CombatPlaybackComponent],
      providers: [
        {
          provide: GameStateService,
          useValue: {
            state: signal(mockGameState),
            updateState: jest.fn()
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

    fixture = TestBed.createComponent(CombatPlaybackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render scene title', () => {
    const compiled = fixture.nativeElement;
    const title = compiled.querySelector('app-scene-title');
    expect(title).toBeTruthy();
  });

  it('should render character panels', () => {
    const compiled = fixture.nativeElement;
    const panels = compiled.querySelectorAll('app-character-panel');
    expect(panels.length).toBe(2);
  });

  it('should render combat overlay', () => {
    const compiled = fixture.nativeElement;
    const overlay = compiled.querySelector('app-combat-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should render message log', () => {
    const compiled = fixture.nativeElement;
    const messageLog = compiled.querySelector('app-message-log');
    expect(messageLog).toBeTruthy();
  });

  it('should compute combat state', () => {
    expect(component.combatState()).toBeTruthy();
    expect(component.combatState()?.roundNumber).toBe(mockCombatState.roundNumber);
  });

  it('should compute monster groups', () => {
    expect(component.monsterGroups()).toEqual(mockCombatState.monsterGroups);
  });
});
