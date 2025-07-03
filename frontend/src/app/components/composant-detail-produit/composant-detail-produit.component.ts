// composant-detail-produit.component.ts - Version corrigée avec détails complets
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ServiceAuthentificationUtilisateur } from '../../services/service-authentification-utilisateur';
import { ProduitAlimentaireDetailDTO } from '../../models/produit-alimentaire.dto';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { LikeService } from '../../services/like.service';

@Component({
  selector: 'app-composant-detail-produit',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatExpansionModule, CommonModule],
  templateUrl: './composant-detail-produit.component.html',
  styleUrls: ['./composant-detail-produit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantDetailProduit implements OnInit {
  produit$: Observable<ProduitAlimentaireDetailDTO | null>;
  isLiked = false;
  estAdmin = false;
  private currentProduct: ProduitAlimentaireDetailDTO | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceProduits: ServiceProduitsAlimentaires,
    private authService: ServiceAuthentificationUtilisateur,
    private likeService: LikeService,
    private snackBar: MatSnackBar
  ) {
    console.log('ComposantDetailProduit: Initialisation');
    const id = this.route.snapshot.paramMap.get('id');
    console.log('ComposantDetailProduit: ID reçu:', id);
    
    if (!id) {
      console.error('ComposantDetailProduit: Aucun ID fourni dans l\'URL');
      this.produit$ = of(null);
    } else {
      this.produit$ = this.serviceProduits.obtenirProduitParId(id);
      this.produit$.subscribe(produit => {
        console.log('ComposantDetailProduit: Produit récupéré:', produit);
      });
    }
  }

  ngOnInit() {
    this.estAdmin = this.authService.estAdmin();
    
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
    
    // S'abonner aux changements d'authentification
    this.authService.utilisateurConnecte$.subscribe(user => {
      this.estAdmin = user ? user.role === 'admin' : false;
    });
  }

  toggleLike() {
    if (this.currentProduct) {
      this.likeService.toggleLike(this.currentProduct.id, this.currentProduct.name);
    }
  }

  supprimerProduit() {
    if (!this.currentProduct) return;
    
    if (!this.estAdmin) {
      this.snackBar.open('Accès refusé : privilèges administrateur requis', 'Fermer', {
        duration: 3000,
        panelClass: 'toaster-error'
      });
      return;
    }

    // Demander confirmation
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${this.currentProduct.name}" ?\n\nCette action est irréversible.`)) {
      console.log(`🗑️ Suppression confirmée pour: ${this.currentProduct.name} (${this.currentProduct.id})`);
      
      this.serviceProduits.supprimerProduit(this.currentProduct.id).subscribe({
        next: (response) => {
          console.log('✅ Produit supprimé avec succès:', response);
          
          this.snackBar.open(`Produit "${this.currentProduct!.name}" supprimé avec succès`, 'Fermer', {
            duration: 4000,
            panelClass: 'toaster-success'
          });
          
          // Retourner à la liste après suppression
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          
          let messageErreur = 'Erreur lors de la suppression du produit';
          if (error.status === 403) {
            messageErreur = 'Accès refusé : privilèges administrateur requis';
          } else if (error.status === 404) {
            messageErreur = 'Produit non trouvé';
          }
          
          this.snackBar.open(messageErreur, 'Fermer', {
            duration: 5000,
            panelClass: 'toaster-error'
          });
        }
      });
    }
  }

  obtenirCouleurNutriScore(produit: ProduitAlimentaireDetailDTO | null): string {
    if (!produit || produit.nutriscore_score === undefined) {
      return '#f5f5f5';
    }
    const score = produit.nutriscore_score;
    if (score <= -2) return '#00A651'; // A: Vert foncé
    if (score <= 3) return '#85C442'; // B: Vert clair
    if (score <= 11) return '#FCDB02'; // C: Jaune
    if (score <= 16) return '#FF8300'; // D: Orange
    return '#E63E11'; // E: Rouge
  }

  obtenirGradeNutriScore(score: number): string {
    if (score <= -2) return 'A';
    if (score <= 3) return 'B';
    if (score <= 11) return 'C';
    if (score <= 16) return 'D';
    return 'E';
  }

  obtenirCouleurEcoScore(grade: string): string {
    switch (grade?.toLowerCase()) {
      case 'a': return '#00A651';
      case 'b': return '#85C442';
      case 'c': return '#FCDB02';
      case 'd': return '#FF8300';
      case 'e': return '#E63E11';
      default: return '#f5f5f5';
    }
  }

  formatCategories(categories: string): string[] {
    return categories ? categories.split(',').map(cat => cat.trim()) : [];
  }

  formatAdditives(additives: string[]): string[] {
    return additives ? additives.slice(0, 5) : []; // Limiter à 5 additifs pour l'affichage
  }

  retournerALaListe() {
    console.log('ComposantDetailProduit: Retour à la liste');
    this.router.navigate(['/']);
  }

  // Méthodes utilitaires pour l'affichage
  hasNutritionalInfo(produit: ProduitAlimentaireDetailDTO): boolean {
    return !!(produit.calories || produit.proteins_100g || produit.carbohydrates_100g || 
              produit.fat_100g || produit.salt_100g || produit.sugars_100g);
  }

  hasScores(produit: ProduitAlimentaireDetailDTO): boolean {
    return !!(produit.nutriscore_score !== undefined || produit.ecoscore_score || produit.ecoscore_grade);
  }

  hasAdditives(produit: ProduitAlimentaireDetailDTO): boolean {
    return !!(produit.additives && produit.additives.length > 0);
  }

  getFormattedValue(value: number | undefined, unit: string = ''): string {
    if (value === undefined || value === null) return 'Non spécifié';
    return `${value}${unit}`;
  }
}