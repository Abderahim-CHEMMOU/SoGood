import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { LikeService } from '../../services/like.service';


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
   isLiked = false;
  private currentProduct: ProduitAlimentaireDTO | null = null;

  constructor(
     private route: ActivatedRoute,
    private router: Router,
    private serviceProduits: ServiceProduitsAlimentaires,
    private likeService: LikeService
  ) {
    console.log('ComposantDetailProduit: Initialisation'); // Débogage
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ComposantDetailProduit: ID reçu:', id); // Débogage
    if (!id) {
      console.error('ComposantDetailProduit: Aucun ID fourni dans l\'URL');
      this.produit$ = of(null);
    } else {
      this.produit$ = this.serviceProduits.obtenirProduitParId(id);
      this.produit$.subscribe(produit => {
        console.log('ComposantDetailProduit: Produit récupéré:', produit); // Débogage
      });
    }
  }

    ngOnInit() {
    this.produit$.subscribe(produit => {
      this.currentProduct = produit;
      if (produit) {
        this.isLiked = this.likeService.isLiked(produit.id);
      }
    });

    // S'abonner aux changements de likes
    this.likeService.likedProducts$.subscribe(likedProducts => {
      if (this.currentProduct) {
        this.isLiked = likedProducts.includes(this.currentProduct.id);
      }
    });
  }

  toggleLike() {
    if (this.currentProduct) {
      this.likeService.toggleLike(this.currentProduct.id, this.currentProduct.nom);
    }
  }

  obtenirCouleurNutriScore(produit: ProduitAlimentaireDTO | null): string {
    if (!produit || produit.scoreNutriScore === undefined) {
      console.log('ComposantDetailProduit: Produit ou score non défini:', produit); // Débogage
      return '#ffffff';
    }
    const score = produit.scoreNutriScore;
    console.log('ComposantDetailProduit: Score Nutri-Score:', score); // Débogage
    if (score <= -2) return '#008000'; // A: Vert
    if (score <= 3) return '#90EE90'; // B: Vert clair
    if (score <= 11) return '#FFFF00'; // C: Jaune
    if (score <= 16) return '#FFA500'; // D: Orange
    return '#FF0000'; // E: Rouge
  }

  retournerALaListe() {
    console.log('ComposantDetailProduit: Retour à la liste'); // Débogage
    this.router.navigate(['/']);
  }
}