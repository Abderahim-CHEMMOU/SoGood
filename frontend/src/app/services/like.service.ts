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
  private readonly LOCALSTORAGE_KEY = 'nutritracker_likes_direct'; // Clé directe pour localStorage
  
  private likedProductsSubject = new BehaviorSubject<string[]>([]);
  public likedProducts$ = this.likedProductsSubject.asObservable();

  constructor(
    private snackBar: MatSnackBar,
    private cacheService: CacheService
  ) {
    // Charger les favoris au démarrage
    this.loadLikedProducts();
  }

  private loadLikedProducts(): void {
    const likes = this.getLikedProductsFromStorage();
    console.log('📚 Favoris chargés au démarrage:', likes);
    this.likedProductsSubject.next([...likes]);
  }

  private getLikedProductsFromStorage(): string[] {
    try {
      // 1. D'abord essayer localStorage direct
      const directStorage = localStorage.getItem(this.LOCALSTORAGE_KEY);
      if (directStorage) {
        const likes = JSON.parse(directStorage);
        if (Array.isArray(likes)) {
          console.log('📱 Favoris depuis localStorage direct:', likes);
          return [...likes];
        }
      }

      // 2. Ensuite essayer le cache
      const cached = this.cacheService.get<string[]>(this.CACHE_KEY);
      if (cached && Array.isArray(cached)) {
        console.log('💾 Favoris depuis le cache:', cached);
        return [...cached];
      }

      // 3. Enfin essayer les cookies comme fallback
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(this.COOKIE_NAME + '='));
      
      if (cookie) {
        const value = cookie.split('=')[1];
        const likes = JSON.parse(decodeURIComponent(value));
        
        if (Array.isArray(likes)) {
          console.log('🍪 Favoris depuis les cookies:', likes);
          return [...likes];
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erreur lors de la lecture des favoris:', error);
      return [];
    }
  }

  private saveLikedProductsToStorage(likedProducts: string[]): void {
    try {
      const likesToSave = [...likedProducts];
      
      // 1. Sauvegarder directement dans localStorage (priorité)
      localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(likesToSave));
      console.log('📱 Favoris sauvegardés dans localStorage direct:', likesToSave);
      
      // 2. Sauvegarder dans le cache
      this.cacheService.set(this.CACHE_KEY, likesToSave, 24 * 60 * 60 * 1000); // 24h
      
      // 3. Sauvegarder dans les cookies (backup)
      const value = encodeURIComponent(JSON.stringify(likesToSave));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${this.COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
      
      console.log('💾 Favoris sauvegardés dans tous les systèmes');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des favoris:', error);
    }
  }

  toggleLike(productId: string, productName: string): void {
    const currentLikes = [...this.likedProductsSubject.value];
    const isLiked = currentLikes.includes(productId);

    let newLikes: string[];
    if (isLiked) {
      // Retirer le like
      newLikes = currentLikes.filter(id => id !== productId);
      this.showToaster(`${productName} retiré des favoris`, 'error');
      console.log(`💔 Produit retiré des favoris: ${productName} (${productId})`);
    } else {
      // Ajouter le like
      newLikes = [...currentLikes, productId];
      this.showToaster(`${productName} ajouté aux favoris`, 'success');
      console.log(`❤️ Produit ajouté aux favoris: ${productName} (${productId})`);
    }

    console.log('🔄 Favoris avant:', currentLikes);
    console.log('🔄 Favoris après:', newLikes);

    // Mettre à jour le subject
    this.likedProductsSubject.next(newLikes);
    
    // Sauvegarder
    this.saveLikedProductsToStorage(newLikes);
    
    // Invalider le cache des favoris
    this.cacheService.invalidatePattern('favorites_.*');
  }

  isLiked(productId: string): boolean {
    return this.likedProductsSubject.value.includes(productId);
  }

  getLikedProducts(): string[] {
    return [...this.likedProductsSubject.value];
  }

  private showToaster(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: type === 'success' ? 'toaster-success' : 'toaster-error',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // CORRECTION: Méthode pour vraiment nettoyer tout
  clearLikesCache(): void {
    console.log('🧹 Nettoyage complet du cache des favoris');
    
    // 1. Supprimer du localStorage direct
    localStorage.removeItem(this.LOCALSTORAGE_KEY);
    console.log('📱 localStorage direct nettoyé');
    
    // 2. Supprimer du cache
    this.cacheService.delete(this.CACHE_KEY);
    
    // 3. Supprimer des cookies
    document.cookie = `${this.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    // 4. Supprimer du localStorage du cache service
    try {
      const cacheData = localStorage.getItem('nutritracker_cache');
      if (cacheData) {
        const entries = JSON.parse(cacheData) as [string, any][];
        const filteredEntries = entries.filter(([key]) => key !== this.CACHE_KEY);
        localStorage.setItem('nutritracker_cache', JSON.stringify(filteredEntries));
        console.log('🗑️ Cache localStorage nettoyé');
      }
    } catch (error) {
      console.warn('Erreur nettoyage cache localStorage:', error);
    }
    
    // 5. Invalider les patterns de cache
    this.cacheService.invalidatePattern('favorites_.*');
    
    // 6. Réinitialiser le subject
    this.likedProductsSubject.next([]);
    
    console.log('✅ Cache des favoris complètement nettoyé');
  }

  // CORRECTION: Méthode pour forcer le rechargement
  refreshLikes(): void {
    console.log('🔄 Rechargement forcé des favoris');
    this.clearLikesCache();
    // Recharger depuis le stockage (qui devrait maintenant être vide)
    this.loadLikedProducts();
  }

  // Méthode pour déboguer les favoris
  debugLikes(): void {
    console.log('🔍 DEBUG - État des favoris:');
    console.log('  - Subject actuel:', this.likedProductsSubject.value);
    console.log('  - localStorage direct:', localStorage.getItem(this.LOCALSTORAGE_KEY));
    console.log('  - Cache:', this.cacheService.get(this.CACHE_KEY));
    console.log('  - Cookies:', document.cookie);
    
    // Vérifier le localStorage du cache
    try {
      const cacheData = localStorage.getItem('nutritracker_cache');
      if (cacheData) {
        const entries = JSON.parse(cacheData) as [string, any][];
        const likeEntry = entries.find(([key]) => key === this.CACHE_KEY);
        console.log('  - Cache dans localStorage:', likeEntry);
      }
    } catch (error) {
      console.warn('Erreur lecture cache localStorage:', error);
    }
  }

  // NOUVELLE MÉTHODE: Nettoyage spécifique pour Mac
  clearAllStorageForMac(): void {
    console.log('🍎 Nettoyage spécifique pour Mac');
    
    // 1. Vider tout le localStorage
    console.log('📱 Avant nettoyage localStorage:', Object.keys(localStorage));
    
    // Supprimer toutes les clés liées aux favoris
    const keysToRemove = [
      this.LOCALSTORAGE_KEY,
      'nutritracker_cache',
      'nutritracker_likes',
      'user_likes'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Supprimé: ${key}`);
    });
    
    // 2. Vider tous les cookies
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
    
    // 3. Vider le cache service
    this.cacheService.clear();
    
    // 4. Réinitialiser le subject
    this.likedProductsSubject.next([]);
    
    console.log('📱 Après nettoyage localStorage:', Object.keys(localStorage));
    console.log('✅ Nettoyage Mac terminé');
  }
}