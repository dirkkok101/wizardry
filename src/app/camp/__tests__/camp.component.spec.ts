import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { Router } from '@angular/router';
import { Character } from '../../../types/Character';
import { CharacterStatus } from '../../../types/CharacterStatus';

describe('CampComponent', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let gameState: GameStateService;
  let mockSaveService: jest.Mocked<SaveService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    mockSaveService = {
      saveGame: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [CampComponent],
      providers: [
        GameStateService,
        { provide: SaveService, useValue: mockSaveService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('party display', () => {
    it('should compute party characters from game state', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        race: 'HUMAN',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 15,
        intelligence: 10,
        piety: 10,
        vitality: 14,
        agility: 12,
        luck: 10,
        hp: 20,
        maxHp: 20,
        ac: 5,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      const char2: Character = {
        id: 'char2',
        name: 'Mage',
        class: 'MAGE',
        race: 'ELF',
        alignment: 'GOOD',
        level: 1,
        experience: 0,
        age: 18,
        strength: 10,
        intelligence: 16,
        piety: 10,
        vitality: 10,
        agility: 12,
        luck: 10,
        hp: 15,
        maxHp: 15,
        ac: 8,
        status: CharacterStatus.OK,
        vim: { current: 10, max: 10 },
        knownSpells: [],
        gold: 50,
        inventory: []
      };

      // Set up game state with party
      gameState.updateState(state => ({
        ...state,
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ])
      }));

      fixture.detectChanges();

      const chars = component.partyCharacters();
      expect(chars).toHaveLength(2);
      expect(chars[0].name).toBe('Fighter');
      expect(chars[1].name).toBe('Mage');
    });

    it('should return empty array when no party members', () => {
      // Game state starts empty, no need to update
      fixture.detectChanges();

      expect(component.partyCharacters()).toHaveLength(0);
    });
  });
});
