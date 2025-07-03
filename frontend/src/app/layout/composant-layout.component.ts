import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { ComposantBarreLaterale } from '../components/composant-barre-laterale/composant-barre-laterale.component';
import { ComposantBarreRecherche } from '../components/composant-barre-recherche/composant-barre-recherche.component';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';
import { ProduitService } from '../services/produit.service';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';

@Component({
  selector: 'app-composant-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatButtonModule,
    RouterOutlet,
    ComposantBarreLaterale,
    ComposantBarreRecherche,
  ],
  templateUrl: './composant-layout.component.html',
  styleUrls: ['./composant-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantLayout {
  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router,
    private produitService: ProduitService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('ComposantLayout chargé'); // Débogage
  }

  onRecherche(resultats: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Recherche émise:', resultats); // Débogage
    this.produitService.mettreAJourProduitsFiltres(resultats);
    // Naviguer vers la liste des produits si on est sur le détail
    if (this.router.url.includes('/produit/')) {
      this.router.navigate(['/']);
    }
  }

  onFiltrerCategorie(produits: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Catégorie filtrée:', produits); // Débogage
    this.produitService.mettreAJourProduitsFiltres(produits);
    // Naviguer vers la liste des produits si on est sur le détail
    if (this.router.url.includes('/produit/')) {
      this.router.navigate(['/']);
    }
  }

  deconnecterUtilisateur() {
    console.log('ComposantLayout: Déconnexion déclenchée'); // Débogage
    this.authService.deconnecterUtilisateur();
    this.router.navigate(['/authentification']);
  }
}