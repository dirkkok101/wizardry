import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { GameInitializationService } from '@services/GameInitializationService';

/**
 * Initialize game data (races, classes) at app startup.
 * Ensures data is available regardless of entry route.
 */
function initializeApp(): () => Promise<void> {
  return () => GameInitializationService.initializeGame();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true
    }
  ]
};
