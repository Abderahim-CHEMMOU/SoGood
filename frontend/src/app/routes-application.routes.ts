import { Routes } from '@angular/router';
import { ComposantPrincipalApplication } from './composant-principal-application.component';
import { ComposantAuthentification } from './components/composant-authentification/composant-authentification.component';
import { ComposantDetailProduit } from './components/composant-detail-produit/composant-detail-produit.component';
import { ComposantAjouterProduit } from './components/composant-ajouter-produit/composant-ajouter-produit.component';
import { ComposantLayout } from './layout/composant-layout.component';
import { ComposantListeProduits } from './components/composant-liste-produits/composant-liste-produits.component';
import { ComposantFavoris } from './components/composant-favoris/composant-favoris.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Route d'authentification (accessible à tous)
  { 
    path: 'authentification', 
    component: ComposantAuthentification 
  },
  
  // Routes protégées par authentification
  { 
    path: '', 
    component: ComposantLayout,
    canActivate: [AuthGuard], // 🛡️ Nécessite d'être connecté
    children: [
      { 
        path: '', 
        component: ComposantListeProduits 
      },
      { 
        path: 'favoris', 
        component: ComposantFavoris 
      },
      { 
        path: 'produit/:id', 
        component: ComposantDetailProduit 
      }
    ]
  },
  
  // Route admin (nécessite d'être connecté ET admin)
  { 
    path: 'ajouter-produit', 
    component: ComposantAjouterProduit,
    canActivate: [AdminGuard] // 🛡️ Nécessite d'être admin
  },
  
  // Redirection par défaut
  { 
    path: '**', 
    redirectTo: '' 
  }
];  