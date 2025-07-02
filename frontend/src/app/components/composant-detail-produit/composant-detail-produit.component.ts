import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-composant-detail-produit',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, CommonModule],
  templateUrl: './composant-detail-produit.component.html',
  styleUrls: ['./composant-detail-produit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantDetailProduit {
  produit$: Observable<ProduitAlimentaireDTO | null>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceProduits: ServiceProduitsAlimentaires
  ) {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.produit$ = this.serviceProduits.obtenirProduitParId(id);
  }

  obtenirCouleurNutriScore(produit: ProduitAlimentaireDTO | null): string {
    if (!produit || produit.scoreNutriScore === undefined) return '#ffffff';
    const score = produit.scoreNutriScore;
    if (score <= -2) return '#008000'; // A: Vert
    if (score <= 3) return '#90EE90'; // B: Vert clair
    if (score <= 11) return '#FFFF00'; // C: Jaune
    if (score <= 16) return '#FFA500'; // D: Orange
    return '#FF0000'; // E: Rouge
  }

  retournerALaListe() {
    this.router.navigate(['/']);
  }
}