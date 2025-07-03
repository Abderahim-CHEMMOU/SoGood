// composant-layout.component.ts - Version corrigée avec gestion connexion
import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { ComposantBarreLaterale } from '../components/composant-barre-laterale/composant-barre-laterale.component';
import { ComposantBarreRecherche } from '../components/composant-barre-recherche/composant-barre-recherche.component';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';
import { UtilisateurDTO } from '../models/utilisateur.dto';
import { Observable } from 'rxjs';
import { ProduitService } from '../services/produit.service';

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
  utilisateurConnecte$: Observable<UtilisateurDTO | null>;

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router,
    private produitService: ProduitService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('ComposantLayout chargé');
    
    // S'abonner à l'état de connexion
    this.utilisateurConnecte$ = this.authService.utilisateurConnecte$;
    
    // Détecter les changements pour le OnPush
    this.utilisateurConnecte$.subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  onRecherche(resultats: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Recherche émise:', resultats);
    this.produitService.mettreAJourProduitsFiltres(resultats);
    // Naviguer vers la liste des produits si on est sur le détail
    if (this.router.url.includes('/produit/')) {
      this.router.navigate(['/']);
    }
  }

  onFiltrerCategorie(produits: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Catégorie filtrée:', produits);
    this.produitService.mettreAJourProduitsFiltres(produits);
    // Naviguer vers la liste des produits si on est sur le détail
    if (this.router.url.includes('/produit/')) {
      this.router.navigate(['/']);
    }
  }

  deconnecterUtilisateur() {
    console.log('ComposantLayout: Déconnexion déclenchée');
    this.authService.deconnecterUtilisateur();
    this.router.navigate(['/authentification']);
  }

  allerVersConnexion() {
    console.log('ComposantLayout: Navigation vers connexion');
    this.router.navigate(['/authentification']);
  }

  // Méthode utilitaire pour vérifier l'état de connexion
  estConnecte(): boolean {
    return this.authService.estConnecte();
  }

  // Méthode pour obtenir le nom de l'utilisateur
  obtenirNomUtilisateur(): string {
    const user = this.authService.obtenirUtilisateurConnecte();
    return user ? user.username : '';
  }
}