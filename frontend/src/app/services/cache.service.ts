import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  maxSize?: number; // Taille max du cache (nombre d'entrées)
  defaultTTL?: number; // TTL par défaut en millisecondes
  enablePersistence?: boolean; // Sauvegarder dans localStorage
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

  constructor() {
    this.loadFromPersistence();
    this.startCleanupInterval();
    
    // Sauvegarder périodiquement
    if (this.config.enablePersistence) {
      setInterval(() => this.saveToPersistence(), 30000); // Toutes les 30 secondes
    }
  }

  /**
   * Met en cache une valeur avec une clé
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.config.defaultTTL;
    const now = Date.now();
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl
    };

    // Vérifier la taille max du cache
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    this.cacheSubject.next(this.cache);
    
    console.log(`Cache SET: ${key} (expires: ${new Date(entry.expiresAt).toLocaleTimeString()})`);
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      console.log(`Cache MISS: ${key}`);
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > entry.expiresAt) {
      console.log(`Cache EXPIRED: ${key}`);
      this.delete(key);
      return null;
    }

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
    this.cache.delete(key);
    this.cacheSubject.next(this.cache);
    console.log(`Cache DELETE: ${key}`);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheSubject.next(this.cache);
    if (this.config.enablePersistence) {
      localStorage.removeItem('nutritracker_cache');
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
    
    keysToDelete.forEach(key => this.delete(key));
    console.log(`Cache INVALIDATED pattern: ${pattern} (${keysToDelete.length} entries)`);
  }

  /**
   * Statistiques du cache
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: timestamps.length ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length ? new Date(Math.max(...timestamps)) : null
    };
  }

  private hitCount = 0;
  private missCount = 0;

  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
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
      this.delete(oldestKey);
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

    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
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
   * Sauvegarde dans localStorage
   */
  private saveToPersistence(): void {
    if (!this.config.enablePersistence) return;

    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem('nutritracker_cache', serialized);
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde du cache:', error);
    }
  }

  /**
   * Charge depuis localStorage
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence) return;

    try {
      const serialized = localStorage.getItem('nutritracker_cache');
      if (serialized) {
        const entries = JSON.parse(serialized) as [string, CacheEntry<any>][];
        const now = Date.now();
        
        // Filtrer les entrées expirées
        const validEntries = entries.filter(([, entry]) => now <= entry.expiresAt);
        
        this.cache = new Map(validEntries);
        this.cacheSubject.next(this.cache);
        
        console.log(`Cache LOADED: ${validEntries.length} entries from persistence`);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement du cache:', error);
    }
  }
}