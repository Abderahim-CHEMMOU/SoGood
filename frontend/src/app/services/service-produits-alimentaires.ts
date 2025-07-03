import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, map, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProduitAlimentaireDTO, ProductsResponse, mapBackendToDTO, ProduitAlimentaireDetailDTO, mapBackendToDetailDTO } from '../models/produit-alimentaire.dto';
import { CacheService } from './cache.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServiceProduitsAlimentaires {
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly API_BASE_URL = environment.api.baseUrl;
  
  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Rechercher des produits avec pagination
   */
  rechercherProduits(recherche: string = '', page: number = 1): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = `search_${recherche.toLowerCase().trim()}_page_${page}`;
    
    console.log(`🔍 Recherche produits: "${recherche}", page: ${page}`);
    
    // Si on a un terme de recherche, utiliser l'endpoint /products/search
    // Sinon utiliser l'endpoint général /products
    let url = `${this.API_BASE_URL}${environment.api.endpoints.products}`;
    let params = new HttpParams();
    
    if (recherche && recherche.trim()) {
      // Utiliser l'endpoint de recherche spécifique
      url = `${this.API_BASE_URL}${environment.api.endpoints.products}/search`;
      params = params.set('name', recherche.trim());
      console.log(`🔍 URL de recherche: ${url}?name=${recherche.trim()}`);
      console.log(`🔍 Terme de recherche envoyé: "${recherche.trim()}" (longueur: ${recherche.trim().length})`);
    } else {
      // Utiliser l'endpoint général avec pagination
      params = params.set('page', page.toString()).set('limit', '20');
      console.log(`🔍 URL générale: ${url}?page=${page}&limit=20`);
    }
    
    const searchObservable = this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log(`🔍 Réponse brute du backend pour "${recherche}":`, response);
        console.log(`🔍 Type de réponse:`, typeof response, Array.isArray(response));
        
        // Le backend peut renvoyer soit un tableau, soit un objet avec products
        let products: any[] = [];
        
        if (Array.isArray(response)) {
          // Si c'est un tableau direct
          products = response;
          console.log(`📦 Tableau direct reçu: ${products.length} produits`);
        } else if (response && response.products && Array.isArray(response.products)) {
          // Si c'est un objet avec products
          products = response.products;
          console.log(`📦 Objet avec products reçu: ${products.length} produits`);
        } else {
          console.warn('⚠️ Format de réponse inattendu:', response);
          products = [];
        }
        
        // Afficher les premiers résultats pour déboguer
        if (products.length > 0) {
          console.log(`📦 Premiers produits trouvés:`, products.slice(0, 3).map(p => ({ 
            id: p.id, 
            name: p.name, 
            brand: p.brand 
          })));
        }
        
        // Mapper les données du backend vers le DTO
        const mappedProducts = products.map(product => mapBackendToDTO(product));
        
        console.log(`📦 Produits mappés pour "${recherche}" (page ${page}):`, mappedProducts.length);
        
        return mappedProducts;
      }),
      catchError(this.gererErreurAPI.bind(this))
    );

    return this.cacheService.cacheObservable(cacheKey, searchObservable, this.CACHE_TTL);
  }

  /**
   * Obtenir un produit par son ID
   */
  obtenirProduitParId(id: string): Observable<ProduitAlimentaireDetailDTO | null> {
    const cacheKey = `product_${id}`;
    
    console.log(`🔍 Recherche produit par ID: ${id}`);
    
    const productObservable = this.http.get<any>(`${this.API_BASE_URL}${environment.api.endpoints.products}/${id}`)
      .pipe(
        map(response => {
          console.log('🔍 Réponse produit par ID:', response);
          
          if (!response) {
            return null;
          }
          
          const mappedProduct = mapBackendToDetailDTO(response);
          console.log(`📦 Produit détaillé mappé:`, mappedProduct);
          return mappedProduct;
        }),
        catchError(error => {
          if (error.status === 404) {
            console.log(`❌ Produit non trouvé: ${id}`);
            return of(null);
          }
          return this.gererErreurAPI(error);
        })
      );

    return this.cacheService.cacheObservable(cacheKey, productObservable, this.CACHE_TTL);
  }

  /**
   * Obtenir tous les produits (toutes les pages)
   */
  obtenirTousLesProduits(): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = 'all_products';
    
    // Vérifier d'abord le cache
    const cached = this.cacheService.get<ProduitAlimentaireDTO[]>(cacheKey);
    if (cached) {
      console.log('📦 Tous les produits depuis le cache');
      return of(cached);
    }

    // Charger récursivement toutes les pages
    return this.chargerToutesLesPages().pipe(
      map(products => {
        console.log(`📦 Tous les produits chargés: ${products.length} produits`);
        this.cacheService.set(cacheKey, products, this.CACHE_TTL);
        return products;
      }),
      catchError(this.gererErreurAPI.bind(this))
    );
  }

  /**
   * Rechercher des produits par catégorie nutritionnelle
   */
  rechercherProduitsParCategorie(categorie: 'sains' | 'moderes' | 'dangereux'): Observable<ProduitAlimentaireDTO[]> {
    const cacheKey = `category_${categorie}`;
    
    console.log(`🏷️ Recherche par catégorie: ${categorie}`);
    
    // Définir les ranges pour chaque catégorie
    let minScore: number;
    let maxScore: number;
    
    switch (categorie) {
      case 'sains':
        minScore = -15; // Score le plus bas possible
        maxScore = 3;   // A et B
        break;
      case 'moderes':
        minScore = 4;   // Juste après B
        maxScore = 11;  // C
        break;
      case 'dangereux':
        minScore = 12;  // Juste après C
        maxScore = 40;  // Score le plus haut possible
        break;
    }
    
    console.log(`🏷️ Range pour ${categorie}: min=${minScore}, max=${maxScore}`);
    
    // Utiliser l'endpoint nutriscore/range du backend
    const url = `${this.API_BASE_URL}${environment.api.endpoints.products}/nutriscore/range`;
    const params = new HttpParams()
      .set('min', minScore.toString())
      .set('max', maxScore.toString())
      .set('page', '1')
      .set('limit', '50'); // Plus de résultats pour cette catégorie
    
    console.log(`🔍 URL catégorie: ${url}?min=${minScore}&max=${maxScore}&page=1&limit=50`);
    
    const categoryObservable = this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log(`🏷️ Réponse brute backend pour ${categorie}:`, response);
        console.log(`🏷️ URL appelée: ${url}?min=${minScore}&max=${maxScore}&page=1&limit=50`);
        
        let products: any[] = [];
        
        if (Array.isArray(response)) {
          products = response;
          console.log(`📊 Réponse format tableau: ${products.length} produits`);
        } else if (response && response.products && Array.isArray(response.products)) {
          products = response.products;
          console.log(`📊 Réponse format objet: ${products.length} produits`);
          console.log(`📊 Pagination info:`, response.pagination);
          console.log(`📊 Search criteria:`, response.search_criteria);
        } else {
          console.warn('⚠️ Format de réponse inattendu pour catégorie:', response);
          products = [];
        }
        
        // Vérifier les scores des produits reçus
        console.log(`📊 Vérification des scores reçus pour ${categorie}:`);
        products.forEach((product, index) => {
          if (index < 5) { // Afficher les 5 premiers seulement
            console.log(`  - ${product.name}: score ${product.nutriscore_score}`);
          }
        });
        
        // Mapper les données du backend vers le DTO
        const mappedProducts = products.map(product => mapBackendToDTO(product));
        
        console.log(`🏷️ Produits mappés pour ${categorie}: ${mappedProducts.length}`);
        console.log(`📊 Scores après mapping:`, mappedProducts.slice(0, 5).map(p => ({ 
          name: p.name, 
          score: p.nutriscore_score 
        })));
        
        return mappedProducts;
      }),
      catchError(error => {
        console.error(`❌ Erreur filtrage ${categorie}:`, error);
        console.error(`❌ URL qui a échoué: ${url}?min=${minScore}&max=${maxScore}&page=1&limit=50`);
        return this.gererErreurAPI(error);
      })
    );

    return this.cacheService.cacheObservable(cacheKey, categoryObservable, this.CACHE_TTL * 2);
  }

  /**
   * Charger toutes les pages de produits
   */
  private chargerToutesLesPages(): Observable<ProduitAlimentaireDTO[]> {
    return new Observable(observer => {
      let tousLesProduits: ProduitAlimentaireDTO[] = [];
      let pageActuelle = 1;

      const chargerPage = () => {
        // Utiliser l'endpoint général pour charger toutes les pages
        this.http.get<any>(`${this.API_BASE_URL}${environment.api.endpoints.products}`, {
          params: new HttpParams()
            .set('page', pageActuelle.toString())
            .set('limit', '50') // Plus de produits par page pour optimiser
        }).subscribe({
          next: (response) => {
            console.log(`🔍 Réponse page ${pageActuelle}:`, response);
            
            let products: any[] = [];
            let hasNext = false;
            
            if (Array.isArray(response)) {
              products = response;
              hasNext = products.length === 50; // Si on a le max, il y a peut-être une page suivante
            } else if (response && response.products) {
              products = response.products;
              hasNext = response.pagination ? response.pagination.hasNext : false;
            }
            
            const mappedProducts = products.map(product => mapBackendToDTO(product));
            tousLesProduits = [...tousLesProduits, ...mappedProducts];
            
            console.log(`📄 Page ${pageActuelle} chargée: ${mappedProducts.length} produits`);
            
            if (hasNext && mappedProducts.length > 0) {
              pageActuelle++;
              chargerPage(); // Récursion pour la page suivante
            } else {
              console.log(`✅ Toutes les pages chargées: ${tousLesProduits.length} produits au total`);
              observer.next(tousLesProduits);
              observer.complete();
            }
          },
          error: (error) => {
            console.error(`❌ Erreur chargement page ${pageActuelle}:`, error);
            observer.error(error);
          }
        });
      };

      chargerPage();
    });
  }

  /**
   * Gestion des erreurs API
   */
  private gererErreurAPI(error: HttpErrorResponse): Observable<never> {
    let messageErreur = 'Erreur lors du chargement des produits';
    
    if (error.status === 0) {
      messageErreur = 'Impossible de contacter le serveur';
    } else if (error.status === 401) {
      messageErreur = 'Non autorisé - Veuillez vous reconnecter';
    } else if (error.status === 404) {
      messageErreur = 'Produit non trouvé';
    } else if (error.status === 500) {
      messageErreur = 'Erreur serveur, veuillez réessayer';
    }
    
    console.error('❌ Erreur API produits:', messageErreur, error);
    console.error('❌ Détails erreur:', error.error);
    
    return throwError(() => new Error(messageErreur));
  }

  /**
   * Méthodes de gestion du cache (conservées)
   */
  viderCacheProduits(): void {
    this.cacheService.invalidatePattern('(search_|product_|category_|all_products).*');
    console.log('🗑️ Cache des produits vidé');
  }

  actualiserCache(): void {
    this.viderCacheProduits();
    // Recharger les données essentielles en cache
    this.obtenirTousLesProduits().subscribe();
    console.log('🔄 Cache des produits actualisé');
  }

  obtenirStatistiquesCache() {
    return this.cacheService.getStats();
  }

  /**
   * Préchargement intelligent adapté à la vraie API
   */
  prechargerDonneesEssentielles(): void {
    console.log('📥 Préchargement des données essentielles...');
    
    // Précharger la première page de produits
    this.rechercherProduits('', 1).subscribe({
      next: (produits) => {
        console.log('✅ Préchargement première page:', produits.length, 'produits');
      },
      error: (error) => {
        console.error('❌ Erreur préchargement:', error);
      }
    });
    
    // Précharger les catégories populaires (après un délai)
    setTimeout(() => {
      this.rechercherProduitsParCategorie('sains').subscribe();
      this.rechercherProduitsParCategorie('dangereux').subscribe();
    }, 1000);
    
    console.log('✅ Préchargement lancé');
  }

  /**
   * Obtenir les statistiques des produits
   */
  obtenirStatistiquesProduits(): Observable<{
    total: number;
    parCategorie: Record<string, number>;
    moyenneNutriScore: number;
  }> {
    return this.obtenirTousLesProduits().pipe(
      map(produits => {
        const parCategorie = {
          sains: 0,
          moderes: 0,
          dangereux: 0,
          sanScore: 0
        };

        let totalScore = 0;
        let produitsAvecScore = 0;

        produits.forEach(produit => {
          if (produit.nutriscore_score !== undefined) {
            totalScore += produit.nutriscore_score;
            produitsAvecScore++;

            if (produit.nutriscore_score <= 3) {
              parCategorie.sains++;
            } else if (produit.nutriscore_score <= 11) {
              parCategorie.moderes++;
            } else {
              parCategorie.dangereux++;
            }
          } else {
            parCategorie.sanScore++;
          }
        });

        return {
          total: produits.length,
          parCategorie,
          moyenneNutriScore: produitsAvecScore > 0 ? totalScore / produitsAvecScore : 0
        };
      })
    );
  }

  /**
   * Méthode utilitaire pour obtenir le range de score d'une catégorie
   */
  obtenirRangeCategorie(categorie: 'sains' | 'moderes' | 'dangereux'): { min: number; max: number } {
    switch (categorie) {
      case 'sains':
        return { min: -15, max: 3 };
      case 'moderes':
        return { min: 4, max: 11 };
      case 'dangereux':
        return { min: 12, max: 40 };
    }
  }
}