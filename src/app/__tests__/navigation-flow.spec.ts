import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { routes } from '@app/app.routes';
import { LoadingProgressService } from '@services/LoadingProgressService';

describe('Navigation Flow Integration', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    // Mock LoadingProgressService to allow navigation past the guard
    const mockLoadingProgressService = {
      isComplete: jest.fn().mockReturnValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideLocationMocks(),
        { provide: LoadingProgressService, useValue: mockLoadingProgressService }
      ]
    });

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Initialize router - required for navigation tests
    await router.initialNavigation();
  });

  describe('Title Screen → Castle Menu', () => {
    it('navigates from title screen to castle menu', async () => {
      await router.navigate(['/']);
      expect(location.path()).toBe('/');

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
      expect(location.path()).toBe('/');
    });
  });
});
