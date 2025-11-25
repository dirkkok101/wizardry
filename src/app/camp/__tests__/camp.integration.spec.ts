import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SceneNavigationService } from '../../../services/SceneNavigationService';
import { MessageService } from '../../../services/MessageService';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { Character } from '../../../types/Character';
import { GameStateQueries } from '../../../utils/GameStateQueries';

describe('CampComponent Integration', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;
  let gameState: GameStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);
    gameState = TestBed.inject(GameStateService);

    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'castSpell').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'enterMaze').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
  });

  it('should complete full inspection flow: Camp → Character Inspection → Camp', async () => {
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
      gold: 100,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        gold: 100,
        formation: { frontRow: ['char1'], backRow: [] }
      },
      roster: new Map([['char1', char1]])
    }));

    fixture.detectChanges();

    // Verify party displays
    const partyCharacters = GameStateQueries.partyCharacters(gameState.state());
    expect(partyCharacters).toHaveLength(1);
    expect(partyCharacters[0].name).toBe('Fighter');

    // Click inspect action
    component.handleActionClick({ characterId: 'char1', actionType: 'inspect' });

    // Verify navigation to character inspection with return route
    expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char1', 'camp');
  });

  it('should complete full cast flow: Camp → Spell Casting → Camp', async () => {
    const mage: Character = {
      id: 'mage1',
      name: 'Gandalf',
      class: 'MAGE',
      race: 'HUMAN',
      alignment: 'GOOD',
      level: 3,
      experience: 1000,
      age: 25,
      strength: 10,
      intelligence: 18,
      piety: 10,
      vitality: 10,
      agility: 12,
      luck: 10,
      hp: 15,
      maxHp: 15,
      ac: 8,
      status: CharacterStatus.OK,
      vim: { current: 10, max: 10 },
      gold: 50,
      inventory: [],
      knownSpells: ['DUMAPIC'],
      spellPoints: { 1: 3 }
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['mage1'],
        gold: 100,
        formation: { frontRow: [], backRow: ['mage1'] }
      },
      roster: new Map([['mage1', mage]])
    }));

    fixture.detectChanges();

    // Verify mage has cast action
    const actions = component.getActionsForCharacter(mage);
    expect(actions).toContainEqual(expect.objectContaining({ type: 'cast', enabled: true }));

    // Click cast action
    component.handleActionClick({ characterId: 'mage1', actionType: 'cast' });

    // Verify navigation to spell casting with return route
    expect(navigationService.castSpell).toHaveBeenCalledWith('mage1', 'camp');
  });

  it('should block maze entry with dead party member', async () => {
    const deadChar: Character = {
      id: 'dead1',
      name: 'Deceased',
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
      hp: 0,
      maxHp: 20,
      ac: 5,
      status: CharacterStatus.DEAD,
      vim: { current: 10, max: 10 },
      gold: 0,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state with dead character
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['dead1'],
        gold: 100,
        formation: { frontRow: ['dead1'], backRow: [] }
      },
      roster: new Map([['dead1', deadChar]])
    }));

    fixture.detectChanges();

    // Verify maze entry is disabled
    expect(component.canEnterMaze()).toBe(false);

    const menuItems = component.footerMenuItems();
    const mazeItem = menuItems.find(item => item.id === 'maze');
    expect(mazeItem?.enabled).toBe(false);

    // Try to enter maze
    component.enterMaze();

    // Verify error shown via MessageService and no navigation
    expect(messageService.messageText()).toBe('Some party members are dead - visit Temple first');
    expect(navigationService.enterMaze).not.toHaveBeenCalled();
  });

  it('should allow maze entry with valid party', async () => {
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
      gold: 100,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        gold: 100,
        formation: { frontRow: ['char1'], backRow: [] }
      },
      roster: new Map([['char1', char1]])
    }));

    fixture.detectChanges();

    // Verify maze entry is enabled
    expect(component.canEnterMaze()).toBe(true);

    // Enter maze
    component.enterMaze();

    // Verify navigation
    expect(navigationService.enterMaze).toHaveBeenCalled();
    expect(messageService.hasMessage()).toBe(false);
  });
});
