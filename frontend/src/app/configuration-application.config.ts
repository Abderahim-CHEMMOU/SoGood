import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './routes-application.routes';
import { AppInitializerService } from './services/app-initializer.service';
import { authInterceptor } from './interceptors/auth.interceptor';

// Factory function pour l'initialisation
export function initializeApp(appInitializer: AppInitializerService) {
  return () => appInitializer.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    // Configuration du cache et préchargement
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitializerService],
      multi: true
    }
  ]
};