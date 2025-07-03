import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class LikeService {
  private readonly COOKIE_NAME = 'nutritracker_likes';
  private readonly CACHE_KEY = 'user_likes';
  private likedProductsSubject = new BehaviorSubject<string[]>(this.getLikedProductsFromStorage());
  public likedProducts$ = this.likedProductsSubject.asObservable();

  constructor(
    private snackBar: MatSnackBar,
    private cacheService: CacheService
  ) {
    // Charger depuis le cache au démarrage
    this.loadFromCache();
  }

  private getLikedProductsFromStorage(): string[] {
    try {
      // D'abord essayer le cache
      const cached = this.cacheService.get<string[]>(this.CACHE_KEY);
      if (cached) {
        console.log('Likes chargés depuis le cache');
        return cached;
      }

      // Puis les cookies comme fallback
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(this.COOKIE_NAME + '='));
      
      if (cookie) {
        const value = cookie.split('=')[1];
        const likes = JSON.parse(decodeURIComponent(value));
        // Mettre en cache pour les prochaines fois
        this.cacheService.set(this.CACHE_KEY, likes, 24 * 60 * 60 * 1000); // 24h
        return likes;
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la lecture des likes:', error);
      return [];
    }
  }

  private saveLikedProductsToStorage(likedProducts: string[]): void {
    try {
      // Sauvegarder dans le cache (prioritaire)
      this.cacheService.set(this.CACHE_KEY, likedProducts, 24 * 60 * 60 * 1000); // 24h
      
      // Sauvegarder dans les cookies (backup)
      const value = encodeURIComponent(JSON.stringify(likedProducts));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // Expire dans 1 an
      document.cookie = `${this.COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
      
      console.log('Likes sauvegardés (cache + cookies)');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des likes:', error);
    }
  }

  private loadFromCache(): void {
    const cached = this.cacheService.get<string[]>(this.CACHE_KEY);
    if (cached) {
      this.likedProductsSubject.next(cached);
    }
  }

  toggleLike(productId: string, productName: string): void {
    const currentLikes = this.likedProductsSubject.value;
    const isLiked = currentLikes.includes(productId);

    let newLikes: string[];
    if (isLiked) {
      // Retirer le like
      newLikes = currentLikes.filter(id => id !== productId);
      this.showToaster(`${productName} retiré des favoris`, 'error');
    } else {
      // Ajouter le like
      newLikes = [...currentLikes, productId];
      this.showToaster(`${productName} ajouté aux favoris`, 'success');
    }

    this.likedProductsSubject.next(newLikes);
    this.saveLikedProductsToStorage(newLikes);
    
    // Invalider le cache des favoris pour forcer le rechargement
    this.cacheService.invalidatePattern('favorites_.*');
  }

  isLiked(productId: string): boolean {
    return this.likedProductsSubject.value.includes(productId);
  }

  getLikedProducts(): string[] {
    return this.likedProductsSubject.value;
  }

  private showToaster(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: type === 'success' ? 'toaster-success' : 'toaster-error',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Méthodes pour la gestion du cache
  clearLikesCache(): void {
    this.cacheService.delete(this.CACHE_KEY);
    this.cacheService.invalidatePattern('favorites_.*');
  }

  refreshLikes(): void {
    this.clearLikesCache();
    const freshLikes = this.getLikedProductsFromStorage();
    this.likedProductsSubject.next(freshLikes);
  }
}