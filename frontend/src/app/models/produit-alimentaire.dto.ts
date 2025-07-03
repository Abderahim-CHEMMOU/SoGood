// produit-alimentaire.dto.ts - Adapté pour l'API NutriScore
export interface ProduitAlimentaireDTO {
  id: string;
  name: string;
  brand: string;
  calories: number;
  sugars: number;
  salt: number;
  saturatedFat: number;
  fiber?: number;
  protein: number;
  nutriscore_score?: number;
  nutriscore_grade?: string;
  nutriscore_description?: string;
}

// Interface étendue pour les détails complets d'un produit
export interface ProduitAlimentaireDetailDTO {
  id: string;
  product_name: string;
  name: string;
  brand: string;
  brands: string;
  quantity?: string;
  categories_en?: string;
  categories?: string;
  countries_en?: string;
  
  // Additifs
  additives_n?: number;
  additives_en?: string;
  additives?: string[];
  
  // Scores
  nutriscore_score?: number;
  nutriscore_grade?: string;
  nutriscore_description?: string;
  nutrition_score_fr_100g?: number;
  ecoscore_score?: number;
  ecoscore_grade?: string;
  
  // Catégories
  food_groups_en?: string;
  main_category_en?: string;
  
  // Valeurs nutritionnelles
  energy_kcal_100g?: number;
  calories: number;
  fat_100g?: number;
  saturated_fat_100g?: number;
  saturatedFat: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  sugars: number;
  fiber_100g?: number;
  fiber?: number;
  proteins_100g?: number;
  protein_100g?: number;
  protein: number;
  salt_100g?: number;
  salt: number;
  sodium_100g?: number;

  // Valeurs nutritionnelles étendues
  cholesterol_100g?: number;
  monounsaturated_fat_100g?: number;
  polyunsaturated_fat_100g?: number;
  trans_fat_100g?: number;

  // Vitamines et minéraux
  vitamin_a_100g?: number;
  vitamin_c_100g?: number;
  potassium_100g?: number;
  calcium_100g?: number;
  iron_100g?: number;
  
  // Estimation fruits/légumes
  fruits_vegetables_nuts_estimate_from_ingredients_100g?: number;
  
  // Métadonnées
  predicted_at?: string;
  predicted_by_user?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  products: ProduitAlimentaireDTO[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Interface pour la réponse de prédiction NutriScore (nouveau format)
export interface PredictionNutriScoreResponse {
  id: string;
  product_name: string;
  generic_name?: string;
  quantity?: string;
  brands?: string;
  categories_en?: string;
  origins_en?: string;
  countries_en?: string;
  traces_en?: string;
  
  // Additifs
  additives_n?: number;
  additives_en?: string;
  additives?: string[];
  
  // Scores (avec prédiction)
  nutriscore_score: number;
  nutrition_score_fr_100g?: number;
  ecoscore_score?: number;
  ecoscore_grade?: string;
  
  // Catégorisation
  food_groups_en?: string;
  main_category_en?: string;
  
  // Valeurs nutritionnelles complètes
  energy_kcal_100g: number;
  fat_100g: number;
  saturated_fat_100g: number;
  monounsaturated_fat_100g?: number;
  polyunsaturated_fat_100g?: number;
  trans_fat_100g?: number;
  cholesterol_100g?: number;
  carbohydrates_100g?: number;
  sugars_100g: number;
  fiber_100g: number;
  proteins_100g: number;
  salt_100g: number;
  sodium_100g?: number;
  
  // Vitamines et minéraux
  vitamin_a_100g?: number;
  vitamin_c_100g?: number;
  potassium_100g?: number;
  calcium_100g?: number;
  iron_100g?: number;
  
  // Fruits et légumes
  fruits_vegetables_nuts_estimate_from_ingredients_100g?: number;
  
  // Champs de compatibilité
  name: string;
  brand?: string;
  categories?: string;
  calories: number;
  protein_100g?: number;
  
  // Métadonnées MongoDB
  createdAt: string;
  updatedAt: string;
}

// Interface pour la requête de prédiction NutriScore (nouveau format)
export interface PredictionNutriScoreRequest {
  // Noms (au moins un requis)
  product_name?: string;
  name?: string;
  
  // Marques (optionnel)
  brands?: string;
  brand?: string;
  
  // Catégories (optionnel)
  categories_en?: string;
  category?: string;
  
  // Valeurs nutritionnelles OBLIGATOIRES
  energy_kcal_100g?: number;
  energy_100g?: number;
  calories?: number;
  fat_100g: number;
  saturated_fat_100g: number;
  sugars_100g: number;
  salt_100g: number;
  fiber_100g: number;
  proteins_100g?: number;
  protein_100g?: number;
  
  // Fruits et légumes
  fruits_vegetables_nuts_100g?: number;
  fruits_vegetables_nuts_estimate_from_ingredients_100g?: number;
  
  // Autres champs optionnels pour sauvegarde complète
  generic_name?: string;
  quantity?: string;
  origins_en?: string;
  countries_en?: string;
  traces_en?: string;
  
  // Additifs
  additives_n?: number;
  additives_en?: string;
  additives?: string[];
  
  // Scores additionnels
  ecoscore_score?: number;
  ecoscore_grade?: string;
  nutrition_score_fr_100g?: number;
  
  // Catégorisation
  food_groups_en?: string;
  main_category_en?: string;
  
  // Valeurs nutritionnelles étendues
  cholesterol_100g?: number;
  carbohydrates_100g?: number;
  monounsaturated_fat_100g?: number;
  polyunsaturated_fat_100g?: number;
  trans_fat_100g?: number;
  sodium_100g?: number;
  
  // Vitamines et minéraux
  vitamin_a_100g?: number;
  vitamin_c_100g?: number;
  potassium_100g?: number;
  calcium_100g?: number;
  iron_100g?: number;
}

// Interface pour les données brutes du backend
export interface BackendProductData {
  id: string;
  name: string;
  brand: string;
  calories: number;
  sugars: number;
  salt: number;
  saturatedFat: number;
  fiber?: number;
  protein: number;
  nutriscore_score?: number;
  nutriscore_grade?: string;
  nutriscore_description?: string;
}

// Fonction utilitaire pour mapper les données du backend vers DTO simple
export function mapBackendToDTO(backendProduct: any): ProduitAlimentaireDTO {
  return {
    id: backendProduct.id || backendProduct._id,
    name: backendProduct.name || backendProduct.product_name || 'Nom non disponible',
    brand: backendProduct.brand || backendProduct.brands || 'Marque non disponible',
    calories: backendProduct.calories || backendProduct.energy_kcal_100g || 0,
    sugars: backendProduct.sugars || backendProduct.sugars_100g || 0,
    salt: backendProduct.salt || backendProduct.salt_100g || 0,
    saturatedFat: backendProduct.saturatedFat || backendProduct.saturated_fat_100g || 0,
    fiber: backendProduct.fiber || backendProduct.fiber_100g,
    protein: backendProduct.protein || backendProduct.proteins_100g || backendProduct.protein_100g || 0,
    nutriscore_score: backendProduct.nutriscore_score,
    nutriscore_grade: backendProduct.nutriscore_grade,
    nutriscore_description: backendProduct.nutriscore_description
  };
}

// Fonction utilitaire pour mapper les données détaillées du backend
export function mapBackendToDetailDTO(backendProduct: any): ProduitAlimentaireDetailDTO {
  return {
    id: backendProduct.id || backendProduct._id,
    product_name: backendProduct.product_name || backendProduct.name || 'Nom non disponible',
    name: backendProduct.name || backendProduct.product_name || 'Nom non disponible',
    brand: backendProduct.brand || backendProduct.brands || 'Marque non disponible',
    brands: backendProduct.brands || backendProduct.brand || 'Marque non disponible',
    quantity: backendProduct.quantity,
    categories_en: backendProduct.categories_en || backendProduct.category,
    categories: backendProduct.categories || backendProduct.categories_en || backendProduct.category,
    countries_en: backendProduct.countries_en,
    
    // Additifs
    additives_n: backendProduct.additives_n,
    additives_en: backendProduct.additives_en,
    additives: backendProduct.additives,
    
    // Scores
    nutriscore_score: backendProduct.nutriscore_score,
    nutriscore_grade: backendProduct.nutriscore_grade,
    nutriscore_description: backendProduct.nutriscore_description,
    nutrition_score_fr_100g: backendProduct.nutrition_score_fr_100g,
    ecoscore_score: backendProduct.ecoscore_score,
    ecoscore_grade: backendProduct.ecoscore_grade,
    
    // Catégories
    food_groups_en: backendProduct.food_groups_en,
    main_category_en: backendProduct.main_category_en,
    
    // Valeurs nutritionnelles
    energy_kcal_100g: backendProduct.energy_kcal_100g,
    calories: backendProduct.calories || backendProduct.energy_kcal_100g || 0,
    fat_100g: backendProduct.fat_100g,
    saturated_fat_100g: backendProduct.saturated_fat_100g,
    saturatedFat: backendProduct.saturatedFat || backendProduct.saturated_fat_100g || 0,
    carbohydrates_100g: backendProduct.carbohydrates_100g,
    sugars_100g: backendProduct.sugars_100g,
    sugars: backendProduct.sugars || backendProduct.sugars_100g || 0,
    fiber_100g: backendProduct.fiber_100g,
    fiber: backendProduct.fiber || backendProduct.fiber_100g,
    proteins_100g: backendProduct.proteins_100g,
    protein_100g: backendProduct.protein_100g,
    protein: backendProduct.protein || backendProduct.proteins_100g || backendProduct.protein_100g || 0,
    salt_100g: backendProduct.salt_100g,
    salt: backendProduct.salt || backendProduct.salt_100g || 0,
    sodium_100g: backendProduct.sodium_100g,
    
    // Estimation fruits/légumes
    fruits_vegetables_nuts_estimate_from_ingredients_100g: backendProduct.fruits_vegetables_nuts_estimate_from_ingredients_100g,
    
    // Métadonnées de prédiction
    predicted_at: backendProduct.predicted_at,
    predicted_by_user: backendProduct.predicted_by_user,
    source: backendProduct.source,
    
    // Métadonnées générales
    createdAt: backendProduct.createdAt,
    updatedAt: backendProduct.updatedAt
  };
}

// Fonction pour mapper une réponse de prédiction vers ProduitAlimentaireDetailDTO
export function mapPredictionToDetailDTO(predictionResponse: PredictionNutriScoreResponse): ProduitAlimentaireDetailDTO {
  return {
    id: predictionResponse.id,
    product_name: predictionResponse.product_name,
    name: predictionResponse.name,
    brand: predictionResponse.brand || predictionResponse.brands || 'Marque non disponible',
    brands: predictionResponse.brands || predictionResponse.brand || 'Marque non disponible',
    quantity: predictionResponse.quantity || undefined,
    categories_en: predictionResponse.categories_en || undefined,
    categories: predictionResponse.categories || predictionResponse.categories_en || undefined,
    countries_en: predictionResponse.countries_en || undefined,
    
    // Additifs
    additives_n: predictionResponse.additives_n || undefined,
    additives_en: predictionResponse.additives_en || undefined,
    additives: predictionResponse.additives || undefined,
    
    // Scores (avec prédiction)
    nutriscore_score: predictionResponse.nutriscore_score,
    nutrition_score_fr_100g: predictionResponse.nutrition_score_fr_100g || undefined,
    ecoscore_score: predictionResponse.ecoscore_score || undefined,
    ecoscore_grade: predictionResponse.ecoscore_grade || undefined,
    
    // Catégorisation
    food_groups_en: predictionResponse.food_groups_en || undefined,
    main_category_en: predictionResponse.main_category_en || undefined,
    
    // Valeurs nutritionnelles
    energy_kcal_100g: predictionResponse.energy_kcal_100g || undefined,
    calories: predictionResponse.calories,
    fat_100g: predictionResponse.fat_100g || undefined,
    saturated_fat_100g: predictionResponse.saturated_fat_100g || undefined,
    saturatedFat: predictionResponse.saturated_fat_100g,
    carbohydrates_100g: predictionResponse.carbohydrates_100g || undefined,
    sugars_100g: predictionResponse.sugars_100g || undefined,
    sugars: predictionResponse.sugars_100g,
    fiber_100g: predictionResponse.fiber_100g || undefined,
    fiber: predictionResponse.fiber_100g || undefined,
    proteins_100g: predictionResponse.proteins_100g || undefined,
    protein_100g: predictionResponse.protein_100g || undefined,
    protein: predictionResponse.proteins_100g,
    salt_100g: predictionResponse.salt_100g || undefined,
    salt: predictionResponse.salt_100g,
    sodium_100g: predictionResponse.sodium_100g || undefined,
    
    // Valeurs nutritionnelles étendues
    cholesterol_100g: predictionResponse.cholesterol_100g || undefined,
    monounsaturated_fat_100g: predictionResponse.monounsaturated_fat_100g || undefined,
    polyunsaturated_fat_100g: predictionResponse.polyunsaturated_fat_100g || undefined,
    trans_fat_100g: predictionResponse.trans_fat_100g || undefined,
    
    // Vitamines et minéraux
    vitamin_a_100g: predictionResponse.vitamin_a_100g || undefined,
    vitamin_c_100g: predictionResponse.vitamin_c_100g || undefined,
    potassium_100g: predictionResponse.potassium_100g || undefined,
    calcium_100g: predictionResponse.calcium_100g || undefined,
    iron_100g: predictionResponse.iron_100g || undefined,
    
    // Fruits et légumes
    fruits_vegetables_nuts_estimate_from_ingredients_100g: predictionResponse.fruits_vegetables_nuts_estimate_from_ingredients_100g || undefined,
    
    // Métadonnées MongoDB
    createdAt: predictionResponse.createdAt || undefined,
    updatedAt: predictionResponse.updatedAt || undefined
  };
}