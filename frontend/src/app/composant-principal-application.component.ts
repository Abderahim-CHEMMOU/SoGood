import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ComposantBarreRecherche } from './components/composant-barre-recherche/composant-barre-recherche.component';
import { ComposantBarreLaterale } from './components/composant-barre-laterale/composant-barre-laterale.component';
import { ComposantCarteProduit } from './components/composant-carte-produit/composant-carte-produit.component';
import { ServiceAuthentificationUtilisateur } from './services/service-authentification-utilisateur';
import { Router } from '@angular/router';
import { ProduitAlimentaireDTO } from './models/produit-alimentaire.dto';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-composant-principal-application',
  standalone: true,
  imports: [MatSidenavModule, ComposantBarreRecherche, ComposantBarreLaterale, ComposantCarteProduit, MatButtonModule, CommonModule],
  templateUrl: './composant-principal-application.component.html',
  styleUrls: ['./composant-principal-application.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantPrincipalApplication {
  produitsFiltres: ProduitAlimentaireDTO[] = [];

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router
  ) {}

  mettreAJourResultatsRecherche(resultats: ProduitAlimentaireDTO[]) {
    console.log('Produits reçus dans principal:', resultats); // Débogage
    this.produitsFiltres = resultats;
  }

  deconnecterUtilisateur() {
    this.authService.deconnecterUtilisateur();
    this.router.navigate(['/authentification']);
  }
}