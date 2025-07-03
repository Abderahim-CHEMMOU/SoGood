import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComposantCarteProduit } from '../composant-carte-produit/composant-carte-produit.component';
import { LikeService } from '../../services/like.service';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { Subscription, combineLatest } from 'rxjs';

@Component({
  selector: 'app-composant-favoris',
  standalone: true,
  imports: [CommonModule, ComposantCarteProduit],
  template: `
    <div class="favoris-container">
      <div class="favoris-header">
        <h1>❤️ Mes Favoris</h1>
        <p class="favoris-subtitle" *ngIf="produitsFavoris.length > 0">
          {{ produitsFavoris.length }} produit{{ produitsFavoris.length > 1 ? 's' : '' }} en favoris
        </p>
      </div>
      
      <div class="favoris-content">
        <div class="produits-grid" *ngIf="produitsFavoris.length > 0">
          <app-composant-carte-produit 
            *ngFor="let produit of produitsFavoris" 
            [produit]="produit">
          </app-composant-carte-produit>
        </div>
        
        <div class="empty-state" *ngIf="produitsFavoris.length === 0">
          <div class="empty-icon">💔</div>
          <h2>Aucun favori pour le moment</h2>
          <p>Ajoutez des produits à vos favoris en cliquant sur le cœur !</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .favoris-container {
      width: 100%;
      height: 100%;
      padding: var(--space-6);
    }

    .favoris-header {
      margin-bottom: var(--space-8);
      text-align: center;
      
      h1 {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-3);
      }
      
      .favoris-subtitle {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        margin: 0;
      }
    }

    .favoris-content {
      width: 100%;
    }

    .produits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: var(--space-6);
      padding: var(--space-4) 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-16) var(--space-8);
      text-align: center;
      
      .empty-icon {
        font-size: 80px;
        margin-bottom: var(--space-6);
        opacity: 0.5;
      }
      
      h2 {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
        margin-bottom: var(--space-4);
      }
      
      p {
        font-size: var(--font-size-lg);
        color: var(--color-text-secondary);
        margin: 0;
        max-width: 400px;
        line-height: 1.5;
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .favoris-container {
        padding: var(--space-4);
      }
      
      .favoris-header h1 {
        font-size: var(--font-size-2xl);
      }
      
      .produits-grid {
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
      
      .empty-state {
        padding: var(--space-12) var(--space-4);
        
        .empty-icon {
          font-size: 60px;
        }
        
        h2 {
          font-size: var(--font-size-xl);
        }
        
        p {
          font-size: var(--font-size-base);
        }
      }
    }

    // Animation d'entrée
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .favoris-container {
      animation: fadeInUp 0.4s ease-out;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantFavoris implements OnInit, OnDestroy {
  produitsFavoris: ProduitAlimentaireDTO[] = [];
  private subscription?: Subscription;

  constructor(
    private likeService: LikeService,
    private serviceProduits: ServiceProduitsAlimentaires,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Combiner les likes avec tous les produits pour filtrer les favoris
    this.subscription = combineLatest([
      this.likeService.likedProducts$,
      this.serviceProduits.rechercherProduits('') // Récupère tous les produits
    ]).subscribe(([likedProductIds, allProducts]) => {
      this.produitsFavoris = allProducts.filter(produit => 
        likedProductIds.includes(produit.id)
      );
      console.log('Produits favoris mis à jour:', this.produitsFavoris);
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}