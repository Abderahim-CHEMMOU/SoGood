import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ComposantBarreRecherche } from './components/composant-barre-recherche/composant-barre-recherche.component';
import { ComposantBarreLaterale } from './components/composant-barre-laterale/composant-barre-laterale.component';
import { ComposantCarteProduit } from './components/composant-carte-produit/composant-carte-produit.component';
import { ServiceAuthentificationUtilisateur } from './services/service-authentification-utilisateur';
import { Router, RouterOutlet } from '@angular/router';
import { ProduitAlimentaireDTO } from './models/produit-alimentaire.dto';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-composant-principal-application',
  standalone: true,
  imports: [MatSidenavModule, ComposantBarreRecherche, ComposantBarreLaterale, ComposantCarteProduit, MatButtonModule, CommonModule, RouterOutlet],
  templateUrl: './composant-principal-application.component.html',
  styleUrls: ['./composant-principal-application.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantPrincipalApplication {
  produitsFiltres: ProduitAlimentaireDTO[] = [];
  isRootRoute: boolean;

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router
  ) {
    this.isRootRoute = this.router.url === '/';
    console.log('ComposantPrincipalApplication chargé, isRootRoute:', this.isRootRoute); // Débogage
    this.router.events.subscribe(() => {
      this.isRootRoute = this.router.url === '/';
      console.log('URL changée, isRootRoute:', this.isRootRoute); // Débogage
    });
  }

  mettreAJourResultatsRecherche(resultats: ProduitAlimentaireDTO[]) {
    console.log('Produits reçus dans principal:', resultats); // Débogage
    this.produitsFiltres = resultats;
  }

  deconnecterUtilisateur() {
    console.log('Déconnexion déclenchée'); // Débogage
    this.authService.deconnecterUtilisateur();
    this.router.navigate(['/authentification']);
  }
}