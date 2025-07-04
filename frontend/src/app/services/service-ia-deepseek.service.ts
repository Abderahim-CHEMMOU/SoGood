import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ProduitAlimentaireDetailDTO } from '../models/produit-alimentaire.dto';
import { CacheService } from './cache.service';

export interface AnalyseIA {
  produitId: string;
  analyse: string;
  recommandation: 'excellent' | 'bon' | 'modere' | 'eviter';
  pointsForts: string[];
  pointsFaibles: string[];
  conseil: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceIADeepSeek {
  private readonly DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly DEEPSEEK_API_KEY = 'sk-sk'; 
  private readonly CACHE_TTL = 30 * 24 * 60 * 60 * 1000; 

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {}

  /**
   * Analyser un produit avec l'IA DeepSeek
   */
  analyserProduit(produit: ProduitAlimentaireDetailDTO): Observable<AnalyseIA> {
    const cacheKey = `ia_analyse_${produit.id}`;
    
    console.log(`🤖 Demande d'analyse IA pour: ${produit.name}`);
    
    // Vérifier d'abord le cache
    const cached = this.cacheService.get<AnalyseIA>(cacheKey);
    if (cached) {
      console.log('🎯 Analyse IA récupérée depuis le cache');
      return of(cached);
    }

    // Si pas en cache, faire l'appel à l'API
    if (this.DEEPSEEK_API_KEY === 'sk-sk') {
      console.log('🔑 Mode démo - API Key DeepSeek non configurée');
      return this.genererAnalyseDemonstration(produit);
    }

    return this.appellerDeepSeekAPI(produit).pipe(
      map(response => this.traiterReponseIA(response, produit)),
      tap(analyse => {
        // Mettre en cache le résultat
        this.cacheService.set(cacheKey, analyse, this.CACHE_TTL);
        console.log('💾 Analyse IA mise en cache pour 30 jours');
      }),
      catchError(error => {
        console.error('❌ Erreur API DeepSeek:', error);
        // En cas d'erreur, retourner une analyse de démonstration
        return this.genererAnalyseDemonstration(produit);
      })
    );
  }

  /**
   * Appeler l'API DeepSeek
   */
  private appellerDeepSeekAPI(produit: ProduitAlimentaireDetailDTO): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.DEEPSEEK_API_KEY}`
    });

    const prompt = this.construirePrompt(produit);

    const body = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert nutritionniste qui analyse les produits alimentaires. Réponds en français de manière claire et structurée.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    };

    return this.http.post(this.DEEPSEEK_API_URL, body, { headers });
  }

  /**
   * Construire le prompt pour l'IA
   */
  private construirePrompt(produit: ProduitAlimentaireDetailDTO): string {
    return `
Analyse ce produit alimentaire en tant qu'expert nutritionniste :

PRODUIT : ${produit.name}
MARQUE : ${produit.brand}
QUANTITÉ : ${produit.quantity || 'Non spécifié'}

INFORMATIONS NUTRITIONNELLES (pour 100g) :
- Calories : ${produit.calories || 'Non spécifié'} kcal
- Protéines : ${produit.proteins_100g || produit.protein || 'Non spécifié'} g
- Glucides : ${produit.carbohydrates_100g || 'Non spécifié'} g
- Sucres : ${produit.sugars || 'Non spécifié'} g
- Matières grasses : ${produit.fat_100g || 'Non spécifié'} g
- Graisses saturées : ${produit.saturatedFat || 'Non spécifié'} g
- Fibres : ${produit.fiber || 'Non spécifié'} g
- Sel : ${produit.salt || 'Non spécifié'} g

SCORES :
- Nutri-Score : ${produit.nutriscore_score || 'Non calculé'}
- Eco-Score : ${produit.ecoscore_score || 'Non calculé'} (Grade: ${produit.ecoscore_grade || 'Non spécifié'})

ADDITIFS :
- Nombre d'additifs : ${produit.additives_n || 0}
- Liste : ${produit.additives_en || 'Aucun additif spécifié'}

AUTRES INFORMATIONS :
- Catégories : ${produit.categories || 'Non spécifié'}
- Pays d'origine : ${produit.countries_en || 'Non spécifié'}

Réponds au format JSON avec cette structure exacte :
{
  "analyse": "Une analyse détaillée du produit (200-300 mots)",
  "recommandation": "excellent|bon|modere|eviter",
  "pointsForts": ["point fort 1", "point fort 2", "point fort 3"],
  "pointsFaibles": ["point faible 1", "point faible 2"],
  "conseil": "Un conseil personnalisé pour le consommateur"
}

Analyse en tenant compte :
1. Des valeurs nutritionnelles
2. De la présence d'additifs
3. Du Nutri-Score et Eco-Score
4. De l'équilibre nutritionnel global
`;
  }

  /**
   * Traiter la réponse de l'IA
   */
  private traiterReponseIA(response: any, produit: ProduitAlimentaireDetailDTO): AnalyseIA {
    try {
      const content = response.choices[0].message.content;
      const parsedContent = JSON.parse(content);

      return {
        produitId: produit.id,
        analyse: parsedContent.analyse,
        recommandation: parsedContent.recommandation,
        pointsForts: parsedContent.pointsForts || [],
        pointsFaibles: parsedContent.pointsFaibles || [],
        conseil: parsedContent.conseil,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('❌ Erreur parsing réponse IA:', error);
      throw new Error('Erreur lors du traitement de la réponse IA');
    }
  }

  /**
   * Générer une analyse de démonstration (quand l'API n'est pas disponible)
   */
  private genererAnalyseDemonstration(produit: ProduitAlimentaireDetailDTO): Observable<AnalyseIA> {
    console.log('🎭 Génération d\'une analyse de démonstration');

    const score = produit.nutriscore_score;
    let recommandation: 'excellent' | 'bon' | 'modere' | 'eviter';
    let analyse: string;
    let pointsForts: string[];
    let pointsFaibles: string[];
    let conseil: string;

    // Logique basée sur le Nutri-Score
    if (score !== undefined) {
      if (score <= -2) {
        recommandation = 'excellent';
        analyse = `Le produit "${produit.name}" présente un excellent profil nutritionnel avec un Nutri-Score de ${score}. Les valeurs nutritionnelles sont bien équilibrées avec ${produit.calories || 0} kcal pour 100g, un taux de protéines de ${produit.protein || produit.proteins_100g || 0}g et des sucres limités à ${produit.sugars || 0}g. Ce produit s'inscrit parfaitement dans une alimentation saine et équilibrée.`;
        pointsForts = ['Excellent Nutri-Score', 'Profil nutritionnel équilibré', 'Faible teneur en sucres'];
        pointsFaibles = ['Aucun point faible majeur identifié'];
        conseil = 'Ce produit peut être consommé régulièrement dans le cadre d\'une alimentation équilibrée.';
      } else if (score <= 3) {
        recommandation = 'bon';
        analyse = `Le produit "${produit.name}" affiche un bon profil nutritionnel avec un Nutri-Score de ${score}. Avec ${produit.calories || 0} kcal pour 100g et ${produit.protein || produit.proteins_100g || 0}g de protéines, il constitue un choix alimentaire satisfaisant. Attention cependant au taux de sel (${produit.salt || 0}g) et de sucres (${produit.sugars || 0}g).`;
        pointsForts = ['Bon Nutri-Score', 'Apport protéique correct', 'Calories modérées'];
        pointsFaibles = ['Teneur en sel à surveiller', 'Présence de sucres ajoutés'];
        conseil = 'Produit recommandé en consommation modérée, idéal dans le cadre d\'une alimentation variée.';
      } else if (score <= 11) {
        recommandation = 'modere';
        analyse = `Le produit "${produit.name}" présente une qualité nutritionnelle modérée avec un Nutri-Score de ${score}. Les ${produit.calories || 0} kcal pour 100g et la composition nutritionnelle nécessitent une attention particulière. Le taux de sucres (${produit.sugars || 0}g) et de graisses saturées (${produit.saturatedFat || 0}g) peuvent être préoccupants en cas de consommation excessive.`;
        pointsForts = ['Apport énergétique', 'Source de protéines'];
        pointsFaibles = ['Nutri-Score modéré', 'Teneur élevée en sucres', 'Graisses saturées importantes'];
        conseil = 'À consommer avec modération dans le cadre d\'une alimentation équilibrée et d\'une activité physique régulière.';
      } else {
        recommandation = 'eviter';
        analyse = `Le produit "${produit.name}" présente un profil nutritionnel défavorable avec un Nutri-Score de ${score}. Les ${produit.calories || 0} kcal pour 100g, associées à des teneurs élevées en sucres (${produit.sugars || 0}g), sel (${produit.salt || 0}g) et graisses saturées (${produit.saturatedFat || 0}g), en font un produit à éviter en consommation régulière.`;
        pointsForts = ['Apport énergétique rapide'];
        pointsFaibles = ['Nutri-Score défavorable', 'Excès de sucres', 'Trop de sel', 'Graisses saturées élevées'];
        conseil = 'Produit à éviter ou à consommer très occasionnellement. Privilégiez des alternatives plus saines.';
      }
    } else {
      // Pas de Nutri-Score disponible
      recommandation = 'modere';
      analyse = `L'analyse du produit "${produit.name}" est limitée par l'absence de Nutri-Score. Basé sur les informations disponibles (${produit.calories || 0} kcal, ${produit.protein || produit.proteins_100g || 0}g de protéines), ce produit nécessite une évaluation plus approfondie.`;
      pointsForts = ['Composition à étudier', 'Informations partielles disponibles'];
      pointsFaibles = ['Absence de Nutri-Score', 'Données nutritionnelles incomplètes'];
      conseil = 'Consultez les informations complètes sur l\'emballage avant consommation.';
    }

    // Ajouter des points sur les additifs
    if (produit.additives_n && produit.additives_n > 0) {
      pointsFaibles.push(`Présence de ${produit.additives_n} additif(s)`);
    }

    const analyseDemo: AnalyseIA = {
      produitId: produit.id,
      analyse,
      recommandation,
      pointsForts,
      pointsFaibles,
      conseil,
      timestamp: Date.now()
    };

    // Mettre en cache même l'analyse de démo
    const cacheKey = `ia_analyse_${produit.id}`;
    this.cacheService.set(cacheKey, analyseDemo, this.CACHE_TTL);

    return of(analyseDemo);
  }

  /**
   * Supprimer l'analyse d'un produit du cache
   */
  supprimerAnalyseCache(produitId: string): void {
    const cacheKey = `ia_analyse_${produitId}`;
    this.cacheService.delete(cacheKey);
    console.log(`🗑️ Analyse IA supprimée du cache pour le produit ${produitId}`);
  }

  /**
   * Vider tout le cache des analyses IA
   */
  viderCacheAnalyses(): void {
    this.cacheService.invalidatePattern('ia_analyse_.*');
    console.log('🗑️ Cache des analyses IA vidé');
  }

  /**
   * Obtenir les statistiques du cache IA
   */
  obtenirStatsCacheIA(): { analyses: number; tailleMoyenne: number } {
    const stats = this.cacheService.getStats();
    const cacheEntries = Array.from((this.cacheService as any).cache.keys())
      .filter(key => (typeof key === 'string') && key.startsWith('ia_analyse_'));
    
    return {
      analyses: cacheEntries.length,
      tailleMoyenne: cacheEntries.length > 0 ? Math.round(stats.size / cacheEntries.length) : 0
    };
  }
}