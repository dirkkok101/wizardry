import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CastleMenuCharacterCardComponent } from '../castle-menu-character-card.component';
import { createTestCharacter } from '../../../../test-helpers/test-factories';

describe('CastleMenuCharacterCardComponent', () => {
  let component: CastleMenuCharacterCardComponent;
  let fixture: ComponentFixture<CastleMenuCharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CastleMenuCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CastleMenuCharacterCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
