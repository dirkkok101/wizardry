import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TradeItemDialogComponent } from './trade-item-dialog.component';
import { Character } from '../../../../types/Character';
import { Item } from '../../../../types/Item';
import { ItemType, ItemSlot } from '../../../../types/ItemType';

describe('TradeItemDialogComponent', () => {
  let component: TradeItemDialogComponent;
  let fixture: ComponentFixture<TradeItemDialogComponent>;

  const testItem: Item = {
    id: 'potion',
    name: 'Healing Potion',
    type: ItemType.CONSUMABLE,
    slot: ItemSlot.NONE,
    price: 10,
    identified: true,
    cursed: false,
    equipped: false
  };

  const partyMembers: Character[] = [
    {
      id: 'char-1',
      name: 'Gandalf',
      race: 'HUMAN',
      class: 'MAGE',
      alignment: 'GOOD',
      level: 3,
      experience: 1000,
      age: 100,
      strength: 10,
      intelligence: 18,
      piety: 12,
      vitality: 10,
      agility: 12,
      luck: 10,
      hp: 15,
      maxHp: 20,
      ac: 8,
      status: 'OK',
      inventory: ['staff', 'scroll', 'potion', 'ring', 'book'],
      createdAt: Date.now(),
      lastModified: Date.now()
    } as Character,
    {
      id: 'char-2',
      name: 'Conan',
      race: 'HUMAN',
      class: 'FIGHTER',
      alignment: 'GOOD',
      level: 4,
      experience: 2000,
      age: 25,
      strength: 18,
      intelligence: 10,
      piety: 10,
      vitality: 16,
      agility: 14,
      luck: 10,
      hp: 30,
      maxHp: 35,
      ac: 3,
      status: 'OK',
      inventory: new Array(8).fill('item'), // Full inventory
      createdAt: Date.now(),
      lastModified: Date.now()
    } as Character
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeItemDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TradeItemDialogComponent);
    component = fixture.componentInstance;
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('displays item name in header', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Healing Potion');
  });

  it('lists party members with inventory space', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Gandalf');
    expect(compiled.textContent).toContain('5/8');
  });

  it('disables member with full inventory', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;
    fixture.detectChanges();

    // Check canReceive logic directly
    expect(component.canReceive(partyMembers[0])).toBe(true); // Gandalf has space
    expect(component.canReceive(partyMembers[1])).toBe(false); // Conan is full

    const labels = fixture.nativeElement.querySelectorAll('.member-option');
    expect(labels.length).toBe(2);
    expect(labels[1].classList.contains('disabled')).toBe(true);
  });

  it('emits confirm with selected character ID', () => {
    component.item = testItem;
    component.partyMembers = partyMembers;

    let emittedId: string | undefined;
    component.confirm.subscribe((id: string) => {
      emittedId = id;
    });

    component.selectedCharacterId = 'char-1';
    component.onConfirm();

    expect(emittedId).toBe('char-1');
  });

  it('emits cancel', () => {
    let cancelled = false;
    component.cancel.subscribe(() => {
      cancelled = true;
    });

    component.onCancel();

    expect(cancelled).toBe(true);
  });
});
