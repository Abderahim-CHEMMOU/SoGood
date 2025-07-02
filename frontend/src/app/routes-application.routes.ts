import { Routes } from '@angular/router';
import { ComposantPrincipalApplication } from './composant-principal-application.component';
import { ComposantAuthentification } from './components/composant-authentification/composant-authentification.component';

export const routes: Routes = [
  { path: '', component: ComposantPrincipalApplication },
  { path: 'authentification', component: ComposantAuthentification },
  { path: '**', redirectTo: 'authentification' }
];