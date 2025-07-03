import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { ComposantBarreLaterale } from '../components/composant-barre-laterale/composant-barre-laterale.component';
import { ComposantBarreRecherche } from '../components/composant-barre-recherche/composant-barre-recherche.component';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';
import { ProduitService } from '../services/produit.service';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';
import { UtilisateurDTO } from '../models/utilisateur.dto';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
export class ComposantLayout implements OnInit, OnDestroy {
  utilisateurConnecte$: Observable<UtilisateurDTO | null>;
  private subscriptions: Subscription[] = [];
  private produitsEnAttente: ProduitAlimentaireDTO[] | null = null;

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
    const authSub = this.utilisateurConnecte$.subscribe((user) => {
      // Vérifier que l'utilisateur est bien connecté (protection supplémentaire)
      if (!user) {
        console.log('❌ Utilisateur déconnecté détecté dans le layout, redirection');
        this.router.navigate(['/authentification']);
      }
      this.cdr.detectChanges();
    });
    this.subscriptions.push(authSub);
  }

  ngOnInit() {
    // Vérification de sécurité au chargement
    const user = this.authService.obtenirUtilisateurConnecte();
    if (!user) {
      console.log('⚠️ Layout chargé sans utilisateur connecté, redirection');
      this.router.navigate(['/authentification']);
      return;
    }

    console.log(`✅ Layout chargé pour l'utilisateur: ${user.username} (${user.role})`);

    // S'abonner aux changements de route pour gérer les produits en attente
    const routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navigationEvent = event as NavigationEnd;
      console.log(`🛣️ Navigation terminée vers: ${navigationEvent.url}`);
      
      // Si on arrive sur la page principale et qu'on a des produits en attente
      if (navigationEvent.url === '/' && this.produitsEnAttente) {
        console.log(`📦 Application des produits en attente:`, this.produitsEnAttente.length);
        setTimeout(() => {
          this.produitService.mettreAJourProduitsFiltres(this.produitsEnAttente!);
          this.produitsEnAttente = null;
          this.cdr.detectChanges();
        }, 50);
      }
    });
    this.subscriptions.push(routerSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onRecherche(resultats: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Recherche émise:', resultats.length);
    
    if (this.router.url === '/') {
      // Si on est déjà sur la page principale, appliquer directement
      this.produitService.mettreAJourProduitsFiltres(resultats);
    } else {
      // Sinon, naviguer puis appliquer
      this.produitsEnAttente = resultats;
      this.router.navigate(['/']);
    }
  }

  onFiltrerCategorie(produits: ProduitAlimentaireDTO[]) {
    console.log('ComposantLayout: Catégorie filtrée:', produits.length);
    console.log('ComposantLayout: URL actuelle:', this.router.url);
    
    if (this.router.url === '/') {
      // Si on est déjà sur la page principale, appliquer directement
      console.log('📦 Application directe des produits filtrés');
      this.produitService.mettreAJourProduitsFiltres(produits);
    } else {
      // Sinon, stocker les produits en attente
      console.log('⏳ Stockage des produits en attente pour après navigation');
      this.produitsEnAttente = produits;
      // La navigation est déjà gérée dans la barre latérale
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

  allerVersAjoutProduit() {
    console.log('ComposantLayout: Navigation vers ajout produit');
    
    // Vérification supplémentaire côté component
    if (!this.authService.estAdmin()) {
      console.log('❌ Tentative d\'accès admin refusée');
      this.router.navigate(['/']);
      return;
    }
    
    this.router.navigate(['/ajouter-produit']);
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

  // Méthode pour vérifier si l'utilisateur est admin
  estAdmin(): boolean {
    return this.authService.estAdmin();
  }
}