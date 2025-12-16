/**
 * CombatDefeatComponent smoke tests
 *
 * Tests basic component rendering after party defeat.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CombatDefeatComponent } from './combat-defeat.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter, createTestCombatState } from '@testing/test-factories';
import { GameState } from '@models/GameState';
import { CharacterStatus } from '@models/CharacterStatus';

describe('CombatDefeatComponent', () => {
  let component: CombatDefeatComponent;
  let fixture: ComponentFixture<CombatDefeatComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with party defeat
    mockGameState = createTestGameState();
    mockGameState.combat = createTestCombatState();

    mockGameState.dungeon = {
      ...mockGameState.dungeon!,
      currentLevel: 1,
      position: { x: 10, y: 0, facing: 'N' },
      visitedTiles: new Set(['10,0'])
    };

    // Add party members (all dead for defeat state)
    const characters = Array.from({ length: 6 }, (_, i) =>
      createTestCharacter({
        id: `char-${i}`,
        name: `Hero ${i + 1}`,
        hp: 0,
        status: CharacterStatus.DEAD
      })
    );
    mockGameState.party.members = characters.map(c => c.id);
    characters.forEach(c => mockGameState.roster.set(c.id, c));

    await TestBed.configureTestingModule({
      imports: [CombatDefeatComponent],
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

    fixture = TestBed.createComponent(CombatDefeatComponent);
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

  it('should render combat overlay with defeat state', () => {
    const compiled = fixture.nativeElement;
    const overlay = compiled.querySelector('app-combat-overlay');
    expect(overlay).toBeTruthy();
  });

  it('should render footer menu', () => {
    const compiled = fixture.nativeElement;
    const footer = compiled.querySelector('app-scene-footer');
    expect(footer).toBeTruthy();
  });

  it('should render message log', () => {
    const compiled = fixture.nativeElement;
    const messageLog = compiled.querySelector('app-message-log');
    expect(messageLog).toBeTruthy();
  });

  it('should compute defeat scene title', () => {
    expect(component.sceneTitle()).toBe('DEFEAT');
  });
});
