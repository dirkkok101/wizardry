import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initializeFileLogging } from './services/FileLoggingService';

// Initialize file logging before app bootstrap to capture all logs
initializeFileLogging(1000);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
