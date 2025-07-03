import { Injectable } from '@angular/core';
import { ServiceProduitsAlimentaires } from './service-produits-alimentaires';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitializerService {
  constructor(
    private produitsService: ServiceProduitsAlimentaires,
    private cacheService: CacheService
  ) {}

  async initialize(): Promise<void> {
    console.log('🚀 Initialisation de l\'application...');
    
    try {
      // Afficher les stats du cache au démarrage
      const stats = this.cacheService.getStats();
      console.log('📊 Stats cache initial:', stats);
      
      // Précharger les données essentielles
      await this.preloadEssentialData();
      
      // Configurer le préchargement intelligent
      this.setupIntelligentPreloading();
      
      console.log('✅ Application initialisée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation:', error);
    }
  }

  private async preloadEssentialData(): Promise<void> {
    console.log('📥 Préchargement des données essentielles...');
    
    // Lancer le préchargement en arrière-plan
    this.produitsService.prechargerDonneesEssentielles();
    
    // Attendre un court délai pour ne pas bloquer l'UI
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private setupIntelligentPreloading(): void {
    console.log('🧠 Configuration du préchargement intelligent...');
    
    // Précharger plus de données après le chargement initial
    setTimeout(() => {
      this.preloadSecondaryData();
    }, 2000);
    
    // Actualiser le cache périodiquement
    setInterval(() => {
      this.refreshStaleData();
    }, 5 * 60 * 1000); // Toutes les 5 minutes
  }

  private preloadSecondaryData(): void {
    console.log('📥 Préchargement des données secondaires...');
    
    // Précharger les catégories moins populaires
    this.produitsService.rechercherProduitsParCategorie('moderes').subscribe();
    
    // Précharger quelques recherches communes
    const commonSearches = ['chocolat', 'fruit', 'légume', 'yaourt'];
    commonSearches.forEach(search => {
      this.produitsService.rechercherProduits(search).subscribe();
    });
  }

  private refreshStaleData(): void {
    const stats = this.cacheService.getStats();
    console.log('🔄 Actualisation des données (Stats cache):', stats);
    
    // Si le cache devient trop volumineux, le nettoyer
    if (stats.size > stats.maxSize * 0.8) {
      console.log('🧹 Nettoyage du cache (80% de capacité atteinte)');
      this.produitsService.viderCacheProduits();
    }
  }

  // Méthodes utilitaires pour le debug
  getCacheStats() {
    return this.cacheService.getStats();
  }

  clearAllCache(): void {
    this.cacheService.clear();
    console.log('🗑️ Tout le cache a été vidé');
  }

  forceRefresh(): void {
    this.produitsService.actualiserCache();
    console.log('🔄 Actualisation forcée du cache');
  }
}