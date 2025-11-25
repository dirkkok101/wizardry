import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemCardComponent } from './item-card.component';
import { Item } from '../../../../types/Item';
import { ItemType, ItemSlot } from '../../../../types/ItemType';

describe('ItemCardComponent', () => {
  let component: ItemCardComponent;
  let fixture: ComponentFixture<ItemCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ItemCardComponent);
    component = fixture.componentInstance;
  });

  it('creates component', () => {
    expect(component).toBeTruthy();
  });

  it('displays equipped weapon with stats', () => {
    const item: Item = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      damage: 8,
      identified: true,
      cursed: false,
      equipped: true
    };

    component.item = item;
    component.isEquipped = true;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Long Sword');
    expect(compiled.textContent).toContain('WEAPON');
  });

  it('shows Unequip button for equipped items', () => {
    const item: Item = {
      id: 'long_sword',
      name: 'Long Sword',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 25,
      identified: true,
      cursed: false,
      equipped: true
    };

    component.item = item;
    component.isEquipped = true;
    component.showActions = true;
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button?.textContent).toContain('Unequip');
  });

  it('shows Equip, Trade, Drop buttons for inventory items', () => {
    const item: Item = {
      id: 'potion',
      name: 'Healing Potion',
      type: ItemType.CONSUMABLE,
      slot: ItemSlot.NONE,
      price: 10,
      identified: true,
      cursed: false,
      equipped: false
    };

    component.item = item;
    component.isEquipped = false;
    component.showActions = true;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b: any) => b.textContent);

    expect(buttonTexts.some((t: string) => t.includes('Trade'))).toBe(true);
    expect(buttonTexts.some((t: string) => t.includes('Drop'))).toBe(true);
  });

  it('displays empty slot placeholder', () => {
    component.item = null;
    component.slot = ItemSlot.WEAPON;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Empty');
  });
});
