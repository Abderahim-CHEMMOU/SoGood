import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  enablePersistence?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheSubject = new BehaviorSubject<Map<string, CacheEntry<any>>>(this.cache);
  public cache$ = this.cacheSubject.asObservable();
  
  private readonly config: Required<CacheConfig> = {
    maxSize: 100,
    defaultTTL: 5 * 60 * 1000, // 5 minutes par défaut
    enablePersistence: true
  };

  // Compteurs pour le hit rate (CORRECTION)
  private hitCount = 0;
  private missCount = 0;
  
  // Flag pour éviter les boucles de persistence
  private isPersisting = false;

  constructor() {
    this.loadFromPersistence();
    this.startCleanupInterval();
    
    // Sauvegarder périodiquement (CORRECTION: éviter les boucles)
    if (this.config.enablePersistence) {
      setInterval(() => {
        if (!this.isPersisting) {
          this.saveToPersistence();
        }
      }, 30000); // Toutes les 30 secondes
    }
  }

  /**
   * Met en cache une valeur avec une clé (CORRECTION: vérifier la taille AVANT)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.config.defaultTTL;
    const now = Date.now();
    
    // CORRECTION: Vérifier la taille AVANT d'ajouter
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl
    };

    this.cache.set(key, entry);
    this.emitCacheChange();
    
    console.log(`Cache SET: ${key} (expires: ${new Date(entry.expiresAt).toLocaleTimeString()})`);
  }

  /**
   * Récupère une valeur du cache (CORRECTION: compteurs hit/miss)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.missCount++; // CORRECTION: incrémenter miss
      console.log(`Cache MISS: ${key}`);
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > entry.expiresAt) {
      this.missCount++; // CORRECTION: incrémenter miss
      console.log(`Cache EXPIRED: ${key}`);
      this.delete(key);
      return null;
    }

    this.hitCount++; // CORRECTION: incrémenter hit
    console.log(`Cache HIT: ${key}`);
    return entry.data;
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emitCacheChange();
      console.log(`Cache DELETE: ${key}`);
    }
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.emitCacheChange();
    
    if (this.config.enablePersistence) {
      try {
        localStorage.removeItem('nutritracker_cache');
      } catch (error) {
        console.warn('Erreur lors de la suppression du cache persistant:', error);
      }
    }
    console.log('Cache CLEARED');
  }

  /**
   * Cache ou récupère le résultat d'un Observable
   */
  cacheObservable<T>(key: string, source: Observable<T>, ttlMs?: number): Observable<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return of(cached);
    }

    return source.pipe(
      tap(data => this.set(key, data, ttlMs))
    );
  }

  /**
   * Invalidation de cache par pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.emitCacheChange();
      console.log(`Cache INVALIDATED pattern: ${pattern} (${keysToDelete.length} entries)`);
    }
  }

  /**
   * Statistiques du cache (CORRECTION: calcul hit rate)
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    hitCount: number;
    missCount: number;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: timestamps.length ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length ? new Date(Math.max(...timestamps)) : null,
      hitCount: this.hitCount,
      missCount: this.missCount
    };
  }

  /**
   * Calcul du hit rate (CORRECTION)
   */
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? Math.round((this.hitCount / total) * 100) : 0;
  }

  /**
   * Émet les changements du cache (CORRECTION: éviter les boucles)
   */
  private emitCacheChange(): void {
    if (!this.isPersisting) {
      this.cacheSubject.next(this.cache);
    }
  }

  /**
   * Supprime l'entrée la plus ancienne
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`Cache EVICTED oldest: ${oldestKey}`);
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.emitCacheChange();
      console.log(`Cache CLEANUP: ${expiredKeys.length} expired entries removed`);
    }
  }

  /**
   * Démarre le nettoyage automatique
   */
  private startCleanupInterval(): void {
    setInterval(() => this.cleanup(), 60000); // Toutes les minutes
  }

  /**
   * Sauvegarde dans localStorage (CORRECTION: gestion d'erreurs)
   */
  private saveToPersistence(): void {
    if (!this.config.enablePersistence || this.isPersisting) return;

    this.isPersisting = true;
    
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem('nutritracker_cache', serialized);
      console.log(`Cache SAVED: ${this.cache.size} entries`);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache:', error);
      
      // Si localStorage est plein, vider le cache et réessayer
      if (error && typeof error === 'object' && 'name' in error && (error as any).name === 'QuotaExceededError') {
        console.log('Quota localStorage dépassé, nettoyage du cache...');
        this.cleanup();
        
        // Réessayer avec moins d'entrées
        try {
          const limitedEntries = Array.from(this.cache.entries()).slice(0, 50);
          const serialized = JSON.stringify(limitedEntries);
          localStorage.setItem('nutritracker_cache', serialized);
          console.log('Cache sauvegardé avec moins d\'entrées');
        } catch (retryError) {
          console.error('Impossible de sauvegarder le cache même avec moins d\'entrées:', retryError);
        }
      }
    } finally {
      this.isPersisting = false;
    }
  }

  /**
   * Charge depuis localStorage (CORRECTION: gestion d'erreurs)
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence) return;

    try {
      const serialized = localStorage.getItem('nutritracker_cache');
      if (serialized) {
        const entries = JSON.parse(serialized) as [string, CacheEntry<any>][];
        const now = Date.now();
        
        // Filtrer les entrées expirées et valider les données
        const validEntries = entries.filter(([key, entry]) => {
          if (!entry || typeof entry !== 'object') return false;
          if (!entry.expiresAt || !entry.timestamp) return false;
          return now <= entry.expiresAt;
        });
        
        this.cache = new Map(validEntries);
        this.cacheSubject.next(this.cache);
        
        console.log(`Cache LOADED: ${validEntries.length} entries from persistence`);
        
        // Si on a filtré des entrées, sauvegarder la version nettoyée
        if (validEntries.length < entries.length) {
          setTimeout(() => this.saveToPersistence(), 1000);
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du cache, réinitialisation:', error);
      
      // En cas d'erreur, nettoyer le localStorage corrompu
      try {
        localStorage.removeItem('nutritracker_cache');
      } catch (cleanupError) {
        console.error('Impossible de nettoyer le localStorage:', cleanupError);
      }
    }
  }

  /**
   * Méthodes utilitaires pour le debug
   */
  debugCache(): void {
    console.log('🔍 DEBUG Cache:', {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expired: Date.now() > entry.expiresAt,
        age: Math.round((Date.now() - entry.timestamp) / 1000) + 's'
      })),
      stats: this.getStats()
    });
  }

  /**
   * Réinitialise les compteurs de performance
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    console.log('📊 Stats cache réinitialisées');
  }
}