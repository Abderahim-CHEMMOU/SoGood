import { Routes } from '@angular/router';
import { ComposantPrincipalApplication } from './composant-principal-application.component';
import { ComposantAuthentification } from './components/composant-authentification/composant-authentification.component';
import { ComposantDetailProduit } from './components/composant-detail-produit/composant-detail-produit.component';
import { ComposantAjouterProduit } from './components/composant-ajouter-produit/composant-ajouter-produit.component';
import { ComposantLayout } from './layout/composant-layout.component';
import { ComposantListeProduits } from './components/composant-liste-produits/composant-liste-produits.component';
import { ComposantFavoris } from './components/composant-favoris/composant-favoris.component';

export const routes: Routes = [
  { path: 'authentification', component: ComposantAuthentification },
  { 
    path: '', 
    component: ComposantLayout,
    children: [
      { path: '', component: ComposantListeProduits },
      { path: 'favoris', component: ComposantFavoris },
      { path: 'ajouter-produit', component: ComposantAjouterProduit },
      { path: 'produit/:id', component: ComposantDetailProduit }
    ]
  },
  { path: '**', redirectTo: '' }
];