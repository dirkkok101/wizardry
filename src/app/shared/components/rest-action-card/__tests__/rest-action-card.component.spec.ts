import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestActionCardComponent, RestActionConfig } from '../rest-action-card.component';

describe('RestActionCardComponent', () => {
  let component: RestActionCardComponent;
  let fixture: ComponentFixture<RestActionCardComponent>;

  const mockConfig: RestActionConfig = {
    type: 'restore-spells',
    title: 'Restore Spells',
    description: 'Rest at the stables to restore all spell points.',
    costText: '1 week at Stables',
    goldCost: 0,
    weeksNeeded: 1,
    enabled: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestActionCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RestActionCardComponent);
    component = fixture.componentInstance;
    component.config = mockConfig;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('displays the title and cost text', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.title')?.textContent).toContain('Restore Spells');
    expect(compiled.querySelector('.description')?.textContent).toContain('1 week at Stables');
  });

  it('displays gold cost when non-zero', () => {
    component.config = {
      ...mockConfig,
      type: 'heal-party',
      goldCost: 500
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.gold-cost')?.textContent).toContain('500 GP');
  });

  it('displays "Free" when gold cost is zero', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const goldCost = compiled.querySelector('.gold-cost');
    expect(goldCost?.textContent).toContain('Free');
    expect(goldCost?.classList.contains('free')).toBe(true);
  });

  it('emits selected event when action button clicked', () => {
    const spy = jest.spyOn(component.selected, 'emit');

    const button = fixture.nativeElement.querySelector('.action-button');
    button.click();

    expect(spy).toHaveBeenCalledWith('restore-spells');
  });

  it('does not emit when disabled', () => {
    component.config = { ...mockConfig, enabled: false };
    fixture.detectChanges();

    const spy = jest.spyOn(component.selected, 'emit');
    const button = fixture.nativeElement.querySelector('.action-button');
    button.click();

    expect(spy).not.toHaveBeenCalled();
  });

  it('displays action button with Rest label', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.action-button');
    expect(button?.textContent?.trim()).toBe('[Rest]');
  });

  it('displays disabled reason when provided', () => {
    component.config = {
      ...mockConfig,
      enabled: false,
      disabledReason: 'No casters in party'
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.disabled-reason')?.textContent).toContain('No casters in party');
  });

  it('applies disabled class when disabled', () => {
    component.config = { ...mockConfig, enabled: false };
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.rest-action-card');
    expect(button.classList.contains('disabled')).toBe(true);
  });
});
