import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CombatStubComponent } from './combat-stub.component';

describe('CombatStubComponent', () => {
  let component: CombatStubComponent;
  let fixture: ComponentFixture<CombatStubComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CombatStubComponent]
    });

    fixture = TestBed.createComponent(CombatStubComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  it('displays combat message', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.combat-stub-content');
    expect(content.textContent).toContain('encounter monsters');
  });

  it('navigates back to maze on footer action', () => {
    fixture.detectChanges();

    component.handleFooterAction('return');

    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });

  it('handles ESC key to return to maze', () => {
    fixture.detectChanges();

    component.handleEscape();

    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });
});
