import { bootstrapApplication } from '@angular/platform-browser';
import { ComposantPrincipalApplication } from './app/composant-principal-application.component';
import { appConfig } from './app/configuration-application.config';

bootstrapApplication(ComposantPrincipalApplication, appConfig)
  .catch(err => console.error(err));