import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { routes } from '@app/app.routes';

describe('Navigation Flow Integration', () => {
  let router: Router;
  let location: Location;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)]
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('Title Screen → Castle Menu', () => {
    it('navigates from title screen to castle menu', async () => {
      await router.navigate(['/']);
      expect(location.path()).toBe('');

      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');
    });
  });

  describe('Castle Menu → Training Grounds', () => {
    it('navigates from castle menu to training grounds', async () => {
      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');

      await router.navigate(['/training-grounds']);
      expect(location.path()).toBe('/training-grounds');
    });
  });

  describe('Training Grounds → Castle Menu (round trip)', () => {
    it('navigates back to castle menu from training grounds', async () => {
      await router.navigate(['/training-grounds']);
      expect(location.path()).toBe('/training-grounds');

      await router.navigate(['/castle-menu']);
      expect(location.path()).toBe('/castle-menu');
    });
  });

  describe('Invalid routes', () => {
    it('redirects invalid routes to title screen', async () => {
      await router.navigate(['/invalid-route']);
      expect(location.path()).toBe('');
    });
  });
});
