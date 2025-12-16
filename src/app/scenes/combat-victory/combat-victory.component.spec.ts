/**
 * CombatVictoryComponent smoke tests
 *
 * Tests basic component rendering after winning combat.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CombatVictoryComponent } from './combat-victory.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter, createTestCombatState } from '@testing/test-factories';
import { GameState } from '@models/GameState';

describe('CombatVictoryComponent', () => {
  let component: CombatVictoryComponent;
  let fixture: ComponentFixture<CombatVictoryComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with combat victory
    mockGameState = createTestGameState();
    const combat = createTestCombatState();
    // Mark all monsters as dead for victory state
    combat.monsterGroups.forEach(group => {
      group.monsters.forEach(m => {
        m.hp = 0;
        m.status = 'DEAD';
      });
    });
    mockGameState.combat = combat;

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
      imports: [CombatVictoryComponent],
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

    fixture = TestBed.createComponent(CombatVictoryComponent);
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

  it('should render combat overlay with victory state', () => {
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

  it('should compute victory scene title', () => {
    expect(component.sceneTitle()).toBe('VICTORY');
  });
});
