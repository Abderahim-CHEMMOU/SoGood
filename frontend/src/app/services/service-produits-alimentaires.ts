import { Injectable } from '@angular/core';
import { Observable, of, delay, map } from 'rxjs';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceProduitsAlimentaires {
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  
  constructor(
    private snackBar: MatSnackBar,
    private cacheService: CacheService
  ) {}

  private mockProduits: ProduitAlimentaireDTO[] = [
    { id: '1', nom: 'Pomme', marque: 'Nature', calories: 52, sucres: 10, sel: 0, graissesSaturees: 0, fibres: 2.4, proteines: 0.3, scoreNutriScore: -5 },
    { id: '2', nom: 'Banane', marque: 'Bio', calories: 89, sucres: 12, sel: 0, graissesSaturees: 0.1, fibres: 2.6, proteines: 1.1, scoreNutriScore: -2 },
    { id: '3', nom: 'Pizza', marque: 'Dr. Oetker', calories: 266, sucres: 4, sel: 1.2, graissesSaturees: 5, fibres: 1.5, proteines: 9, scoreNutriScore: 8 },
    { id: '4', nom: 'Chocolat', marque: 'Lindt', calories: 550, sucres: 50, sel: 0.1, graissesSaturees: 20, fibres: 3, proteines: 7, scoreNutriScore: 18 },
    { id: '5', nom: 'Soda', marque: 'Coca-Cola', calories: 140, sucres: 39, sel: 0.01, graissesSaturees: 0, fibres: 0, proteines: 0, scoreNutriScore: 20 },
    { id: '6', nom: 'Salade', marque: 'Fresh', calories: 15, sucres: 2, sel: 0.02, graissesSaturees: 0, fibres: 1.5, proteines: 1, scoreNutriScore: -8 },
    { id: '7', nom: 'Yaourt', marque: 'Danone', calories: 80, sucres: 8, sel: 0.1, graissesSaturees: 2, fibres: 0, proteines: 5, scoreNutriScore: -1 },
    { id: '8', nom: 'Burger', marque: 'McDo', calories: 540, sucres: 5, sel: 2.1, graissesSaturees: 15, fibres: 2, proteines: 25, scoreNutriScore: 15 }
  ];

  private validerDonneesProduit(produit: ProduitAlimentaireDTO): boolean {
    if (!produit.nom || typeof produit.nom !== 'string' || produit.nom.trim() === '') {
      this.snackBar.open('Nom du produit invalide', 'Fermer', { duration: 3000 });
      return false;
    }
    if (typeof produit.calories !== 'number' || produit.calories < 0 || isNaN(produit.calories)) {
      this.snackBar.open('Calories invalides', 'Fermer', { duration: 3000 });
      return false;
    }
    return true;
  }

  rechercherProduits(nom: string): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = `search_${nom.toLowerCase().trim()}`;
    
    // Utiliser la méthode cacheObservable correctement
    const searchObservable = of(null).pipe(
      delay(Math.random() * 500 + 200), // Simuler 200-700ms de latence
      map(() => {
        // Simuler une requête réseau avec délai
        console.log(`Recherche réseau pour: "${nom}"`);
        return this.mockProduits
          .filter(produit => this.validerDonneesProduit(produit) && 
            (!nom || produit.nom.toLowerCase().includes(nom.toLowerCase())))
          .slice(0, 20); // Limiter les résultats
      })
    );

    return this.cacheService.cacheObservable(cacheKey, searchObservable, this.CACHE_TTL);
  }

  obtenirProduitParId(id: string): Observable<ProduitAlimentaireDTO | null> {
    const cacheKey = `product_${id}`;
    
    // Utiliser la méthode cacheObservable correctement
    const productObservable = of(null).pipe(
      delay(Math.random() * 300 + 100), // Simuler 100-400ms de latence
      map(() => {
        console.log(`Chargement réseau du produit: ${id}`);
        return this.mockProduits.find(p => p.id === id) || null;
      })
    );

    return this.cacheService.cacheObservable(cacheKey, productObservable, this.CACHE_TTL);
  }

  obtenirTousLesProduits(): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = 'all_products';
    
    const allProductsObservable = of(null).pipe(
      delay(200), // Petite latence simulée
      map(() => this.mockProduits.filter(p => this.validerDonneesProduit(p)))
    );
    
    return this.cacheService.cacheObservable(cacheKey, allProductsObservable, this.CACHE_TTL);
  }

  rechercherProduitsParCategorie(categorie: 'sains' | 'moderes' | 'dangereux'): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = `category_${categorie}`;
    
    const categoryObservable = of(null).pipe(
      delay(Math.random() * 400 + 200),
      map(() => {
        console.log(`Chargement réseau de la catégorie: ${categorie}`);
        let produitsFiltres: ProduitAlimentaireDTO[] = [];

        if (categorie === 'sains') {
          produitsFiltres = this.mockProduits.filter(p => 
            this.validerDonneesProduit(p) && 
            p.scoreNutriScore !== undefined && 
            p.scoreNutriScore <= 3);
        } else if (categorie === 'moderes') {
          produitsFiltres = this.mockProduits.filter(p => 
            this.validerDonneesProduit(p) && 
            p.scoreNutriScore !== undefined && 
            p.scoreNutriScore > 3 && 
            p.scoreNutriScore <= 11);
        } else {
          produitsFiltres = this.mockProduits.filter(p => 
            this.validerDonneesProduit(p) && 
            p.scoreNutriScore !== undefined && 
            p.scoreNutriScore > 11);
        }

        return produitsFiltres;
      })
    );

    return this.cacheService.cacheObservable(cacheKey, categoryObservable, this.CACHE_TTL * 2);
  }

  // Méthodes de gestion du cache
  viderCacheProduits(): void {
    this.cacheService.invalidatePattern('(search_|product_|category_|all_products).*');
    console.log('Cache des produits vidé');
  }

  actualiserCache(): void {
    this.viderCacheProduits();
    // Recharger les données essentielles en cache
    this.obtenirTousLesProduits().subscribe();
    console.log('Cache des produits actualisé');
  }

  obtenirStatistiquesCache() {
    return this.cacheService.getStats();
  }

  // Préchargement intelligent
  prechargerDonneesEssentielles(): void {
    console.log('Préchargement des données essentielles...');
    
    // Précharger tous les produits
    this.obtenirTousLesProduits().subscribe();
    
    // Précharger les catégories populaires
    this.rechercherProduitsParCategorie('sains').subscribe();
    this.rechercherProduitsParCategorie('dangereux').subscribe();
    
    // Précharger les recherches vides (liste complète)
    this.rechercherProduits('').subscribe();
    
    console.log('Préchargement terminé');
  }
}