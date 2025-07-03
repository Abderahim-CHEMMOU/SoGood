import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, delay, map, throwError, tap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { 
  ProduitAlimentaireDTO, 
  ProductsResponse, 
  mapBackendToDTO, 
  ProduitAlimentaireDetailDTO, 
  mapBackendToDetailDTO,
  PredictionNutriScoreResponse,
  PredictionNutriScoreRequest,
  mapPredictionToDetailDTO
} from '../models/produit-alimentaire.dto';
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
    } else {
      // Utiliser l'endpoint général avec pagination
      params = params.set('page', page.toString()).set('limit', '20');
      console.log(`🔍 URL générale: ${url}?page=${page}&limit=20`);
    }
    
    const searchObservable = this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log(`🔍 Réponse brute du backend pour "${recherche}":`, response);
        
        // Le backend peut renvoyer soit un tableau, soit un objet avec products
        let products: any[] = [];
        
        if (Array.isArray(response)) {
          products = response;
        } else if (response && response.products && Array.isArray(response.products)) {
          products = response.products;
        } else {
          console.warn('⚠️ Format de réponse inattendu:', response);
          products = [];
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
    
    // Définir les ranges pour chaque catégorie selon le mapping du backend
    let minScore: number;
    let maxScore: number;
    
    switch (categorie) {
      case 'sains':
        minScore = -15; // Score le plus bas possible
        maxScore = 6;   // A+ (< 0), A (0-2), B (3-6)
        break;
      case 'moderes':
        minScore = 7;   // Début de C
        maxScore = 10;  // C (7-10)
        break;
      case 'dangereux':
        minScore = 11;  // D (11-14) et E (≥15)
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
      .set('limit', '50');
    
    const categoryObservable = this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log(`🏷️ Réponse brute backend pour ${categorie}:`, response);
        
        let products: any[] = [];
        
        if (Array.isArray(response)) {
          products = response;
        } else if (response && response.products && Array.isArray(response.products)) {
          products = response.products;
        } else {
          console.warn('⚠️ Format de réponse inattendu pour catégorie:', response);
          products = [];
        }
        
        // Mapper les données du backend vers le DTO
        const mappedProducts = products.map(product => mapBackendToDTO(product));
        
        console.log(`🏷️ Produits mappés pour ${categorie}: ${mappedProducts.length}`);
        
        return mappedProducts;
      }),
      catchError(error => {
        console.error(`❌ Erreur filtrage ${categorie}:`, error);
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
        this.http.get<any>(`${this.API_BASE_URL}${environment.api.endpoints.products}`, {
          params: new HttpParams()
            .set('page', pageActuelle.toString())
            .set('limit', '50')
        }).subscribe({
          next: (response) => {
            let products: any[] = [];
            let hasNext = false;
            
            if (Array.isArray(response)) {
              products = response;
              hasNext = products.length === 50;
            } else if (response && response.products) {
              products = response.products;
              hasNext = response.pagination ? response.pagination.hasNext : false;
            }
            
            const mappedProducts = products.map(product => mapBackendToDTO(product));
            tousLesProduits = [...tousLesProduits, ...mappedProducts];
            
            console.log(`📄 Page ${pageActuelle} chargée: ${mappedProducts.length} produits`);
            
            if (hasNext && mappedProducts.length > 0) {
              pageActuelle++;
              chargerPage();
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
    
    return throwError(() => new Error(messageErreur));
  }

  /**
   * Ajouter un produit avec prédiction NutriScore (Admin uniquement)
   * Cette méthode utilise l'endpoint de prédiction ET sauvegarde
   */
  ajouterProduit(produitData: any): Observable<ProduitAlimentaireDetailDTO> {
    console.log(`➕ Ajout d'un nouveau produit avec prédiction NutriScore:`, produitData);
    
    // Transformer les données du formulaire Angular vers le format attendu par l'API
    const predictionRequest: PredictionNutriScoreRequest = {
      // Noms (au moins un requis)
      product_name: produitData.product_name,
      name: produitData.name || produitData.product_name,
      
      // Marques
      brands: produitData.brands,
      brand: produitData.brand || produitData.brands,
      
      // Catégories
      categories_en: produitData.categories_en,
      category: produitData.category || produitData.categories_en,
      
      // Valeurs nutritionnelles OBLIGATOIRES
      energy_kcal_100g: produitData.energy_kcal_100g,
      calories: produitData.calories || produitData.energy_kcal_100g,
      fat_100g: produitData.fat_100g || 0,
      saturated_fat_100g: produitData.saturated_fat_100g || 0,
      sugars_100g: produitData.sugars_100g || 0,
      salt_100g: produitData.salt_100g || 0,
      fiber_100g: produitData.fiber_100g || 0,
      proteins_100g: produitData.proteins_100g,
      protein_100g: produitData.protein_100g || produitData.proteins_100g,
      
      // Fruits et légumes
      fruits_vegetables_nuts_100g: produitData.fruits_vegetables_nuts_100g,
      fruits_vegetables_nuts_estimate_from_ingredients_100g: produitData.fruits_vegetables_nuts_estimate_from_ingredients_100g,
      
      // Autres champs optionnels
      generic_name: produitData.generic_name,
      quantity: produitData.quantity,
      origins_en: produitData.origins_en,
      countries_en: produitData.countries_en,
      traces_en: produitData.traces_en,
      
      // Additifs
      additives_n: produitData.additives_n,
      additives_en: produitData.additives_en,
      additives: produitData.additives,
      
      // Scores additionnels
      ecoscore_score: produitData.ecoscore_score,
      ecoscore_grade: produitData.ecoscore_grade,
      nutrition_score_fr_100g: produitData.nutrition_score_fr_100g,
      
      // Catégorisation
      food_groups_en: produitData.food_groups_en,
      main_category_en: produitData.main_category_en,
      
      // Valeurs nutritionnelles étendues
      cholesterol_100g: produitData.cholesterol_100g,
      carbohydrates_100g: produitData.carbohydrates_100g,
      monounsaturated_fat_100g: produitData.monounsaturated_fat_100g,
      polyunsaturated_fat_100g: produitData.polyunsaturated_fat_100g,
      trans_fat_100g: produitData.trans_fat_100g,
      sodium_100g: produitData.sodium_100g,
      
      // Vitamines et minéraux
      vitamin_a_100g: produitData.vitamin_a_100g,
      vitamin_c_100g: produitData.vitamin_c_100g,
      potassium_100g: produitData.potassium_100g,
      calcium_100g: produitData.calcium_100g,
      iron_100g: produitData.iron_100g
    };
    
    // Nettoyer les valeurs undefined
    Object.keys(predictionRequest).forEach(key => {
      if (predictionRequest[key as keyof PredictionNutriScoreRequest] === undefined) {
        delete predictionRequest[key as keyof PredictionNutriScoreRequest];
      }
    });
    
    console.log('🔮 Données formatées pour la prédiction:', predictionRequest);
    
    return this.http.post<PredictionNutriScoreResponse>(`${this.API_BASE_URL}${environment.api.endpoints.products}`, predictionRequest)
      .pipe(
        map((response: PredictionNutriScoreResponse) => {
          console.log('✅ Produit ajouté avec prédiction NutriScore:', response);
          
          // Mapper la réponse directement vers notre DTO détaillé
          const mappedProduct = mapPredictionToDetailDTO(response);
          
          // Invalider le cache après ajout
          this.viderCacheProduits();
          
          return mappedProduct;
        }),
        catchError(error => {
          console.error('❌ Erreur lors de l\'ajout avec prédiction:', error);
          
          // Gestion spécifique des erreurs de prédiction
          if (error.status === 400) {
            const errorMessage = error.error?.error || 'Données invalides';
            const errorField = error.error?.field;
            if (errorField) {
              return throwError(() => new Error(`Erreur de validation: ${errorMessage} (champ: ${errorField})`));
            }
            return throwError(() => new Error(`Erreur de validation: ${errorMessage}`));
          } else if (error.status === 503) {
            return throwError(() => new Error('Service de prédiction indisponible'));
          }
          
          return this.gererErreurAPI(error);
        })
      );
  }

  /**
   * Supprimer un produit (Admin uniquement)
   */
  supprimerProduit(id: string): Observable<any> {
    console.log(`🗑️ Suppression du produit: ${id}`);
    
    return this.http.delete<any>(`${this.API_BASE_URL}${environment.api.endpoints.products}/${id}`)
      .pipe(
        tap(response => {
          console.log('✅ Produit supprimé:', response);
          // Invalider le cache après suppression
          this.viderCacheProduits();
        }),
        catchError(this.gererErreurAPI.bind(this))
      );
  }

  /**
   * Méthodes de gestion du cache
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
   * Préchargement intelligent
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
    
    // Précharger les catégories populaires
    setTimeout(() => {
      this.rechercherProduitsParCategorie('sains').subscribe();
      this.rechercherProduitsParCategorie('dangereux').subscribe();
    }, 1000);
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

            // Utiliser le mapping du backend pour les catégories
            if (produit.nutriscore_score <= 6) {
              parCategorie.sains++;
            } else if (produit.nutriscore_score <= 10) {
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
        return { min: -15, max: 6 };
      case 'moderes':
        return { min: 7, max: 10 };
      case 'dangereux':
        return { min: 11, max: 40 };
    }
  }

  /**
   * Méthode utilitaire pour obtenir le grade NutriScore à partir du score
   */
  obtenirGradeNutriScore(score: number): { grade: string; description: string } {
    if (score < 0) {
      return { grade: 'A+', description: 'Excellent produit' };
    } else if (score < 3) {
      return { grade: 'A', description: 'Très bon produit' };
    } else if (score < 7) {
      return { grade: 'B', description: 'Bon produit' };
    } else if (score < 11) {
      return { grade: 'C', description: 'Produit moyen' };
    } else if (score < 15) {
      return { grade: 'D', description: 'Produit de qualité médiocre' };
    } else {
      return { grade: 'E', description: 'Produit de très mauvaise qualité' };
    }
  }
}