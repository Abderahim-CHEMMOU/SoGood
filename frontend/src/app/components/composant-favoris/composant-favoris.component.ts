import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComposantCarteProduit } from '../composant-carte-produit/composant-carte-produit.component';
import { LikeService } from '../../services/like.service';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-composant-favoris',
  standalone: true,
  imports: [CommonModule, ComposantCarteProduit],
  templateUrl: './composant-favoris.component.html',
  styleUrls: ['./composant-favoris.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantFavoris implements OnInit, OnDestroy {
  produitsFavoris: ProduitAlimentaireDTO[] = [];
  chargementEnCours = false;
  showDebugInfo = false;
  debugInfo = {
    directStorage: '',
    cache: '',
    cookies: ''
  };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private likeService: LikeService,
    private serviceProduits: ServiceProduitsAlimentaires,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🏠 ComposantFavoris: Initialisation');
    
    // S'abonner aux changements de favoris
    const likesSubscription = this.likeService.likedProducts$.pipe(
      switchMap(likedProductIds => {
        console.log('❤️ Favoris mis à jour:', likedProductIds);
        
        if (likedProductIds.length === 0) {
          return of([]); // Retourner un tableau vide si aucun favori
        }
        
        this.chargementEnCours = true;
        this.cdr.detectChanges();
        
        // Charger chaque produit individuellement
        const productObservables = likedProductIds.map(id => 
          this.serviceProduits.obtenirProduitParId(id).pipe(
            map(product => product ? this.convertToDTO(product) : null),
            catchError(error => {
              console.error(`❌ Erreur chargement produit ${id}:`, error);
              return of(null);
            })
          )
        );
        
        return forkJoin(productObservables).pipe(
          map(products => products.filter(p => p !== null) as ProduitAlimentaireDTO[])
        );
      })
    ).subscribe({
      next: (produits) => {
        console.log('✅ Produits favoris chargés:', produits.length);
        this.produitsFavoris = produits;
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement favoris:', error);
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.push(likesSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Convertir les produits détaillés en DTO simple
  private convertToDTO(product: any): ProduitAlimentaireDTO {
    return {
      id: product.id,
      name: product.name || product.product_name,
      brand: product.brand || product.brands,
      calories: product.calories || product.energy_kcal_100g || 0,
      sugars: product.sugars || product.sugars_100g || 0,
      salt: product.salt || product.salt_100g || 0,
      saturatedFat: product.saturatedFat || product.saturated_fat_100g || 0,
      fiber: product.fiber || product.fiber_100g,
      protein: product.protein || product.proteins_100g || product.protein_100g || 0,
      nutriscore_score: product.nutriscore_score
    };
  }

  // Méthode pour optimiser le rendu
  trackByProductId(index: number, product: ProduitAlimentaireDTO): string {
    return product.id;
  }

  // Méthodes de débogage et gestion
  debugFavoris() {
    console.log('🔍 DEBUG Favoris:');
    console.log('  - Produits affichés:', this.produitsFavoris.length);
    console.log('  - Détails:', this.produitsFavoris);
    this.likeService.debugLikes();
    
    // Mettre à jour les infos de debug pour l'affichage
    this.debugInfo = {
      directStorage: localStorage.getItem('nutritracker_likes_direct') || 'null',
      cache: JSON.stringify(this.likeService.getLikedProducts()),
      cookies: document.cookie
    };
    
    this.showDebugInfo = true;
    this.cdr.detectChanges();
  }

  actualiserFavoris() {
    console.log('🔄 Actualisation forcée des favoris');
    this.chargementEnCours = true;
    this.showDebugInfo = false;
    this.cdr.detectChanges();
    
    // Déclencher un rechargement en forçant la re-émission
    this.likeService.refreshLikes();
  }

  viderFavoris() {
    if (confirm('Êtes-vous sûr de vouloir vider tous vos favoris ?')) {
      console.log('🗑️ Suppression de tous les favoris');
      this.likeService.clearLikesCache();
      this.showDebugInfo = false;
    }
  }

  // NOUVELLE MÉTHODE: Nettoyage spécifique pour Mac
  nettoyageMac() {
    if (confirm('🍎 Nettoyage complet pour Mac\n\nCela va supprimer TOUS les favoris et le cache. Continuer ?')) {
      console.log('🍎 Nettoyage Mac déclenché');
      
      // Utiliser la méthode spécifique Mac
      this.likeService.clearAllStorageForMac();
      
      // Réinitialiser l'affichage
      this.produitsFavoris = [];
      this.showDebugInfo = false;
      this.chargementEnCours = false;
      this.cdr.detectChanges();
      
      // Forcer le rechargement de la page après un délai
      setTimeout(() => {
        if (confirm('Rechargement de la page recommandé. Continuer ?')) {
          window.location.reload();
        }
      }, 1000);
    }
  }
}