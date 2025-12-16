/**
 * ChestPlaybackComponent smoke tests
 *
 * Tests basic component rendering during trap resolution.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { ChestPlaybackComponent } from './chest-playback.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { createTestGameState, createTestCharacter } from '@testing/test-factories';
import { GameState } from '@models/GameState';

describe('ChestPlaybackComponent', () => {
  let component: ChestPlaybackComponent;
  let fixture: ComponentFixture<ChestPlaybackComponent>;
  let mockGameState: GameState;

  beforeEach(async () => {
    // Create game state with pending trap result (using proper Chest structure)
    mockGameState = createTestGameState();
    mockGameState.pendingChest = {
      id: 'test-chest',
      trapped: true,
      trapId: 'poison_needle',
      trapIdentified: false,
      trapDisarmed: false,
      rewardTier: 10,
      contents: {
        gold: 100,
        items: []
      },
      sourcePosition: { x: 10, y: 0, facing: 'N' },
      mazeLevel: 1,
      source: 'exploration'
    };
    mockGameState.pendingTrapResult = {
      trapId: 'poison_needle',
      triggered: true,
      disarmAttempted: true,
      disarmSuccess: false,
      messages: ['The trap was triggered!'],
      damageDealt: new Map(),
      statusApplied: new Map()
    };

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
      imports: [ChestPlaybackComponent],
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

    fixture = TestBed.createComponent(ChestPlaybackComponent);
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

  it('should render message log', () => {
    const compiled = fixture.nativeElement;
    const messageLog = compiled.querySelector('app-message-log');
    expect(messageLog).toBeTruthy();
  });

  it('should have pending trap data', () => {
    expect(component.pendingTrap()).toBeTruthy();
  });
});
