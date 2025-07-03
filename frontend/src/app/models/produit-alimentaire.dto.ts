// produit-alimentaire.dto.ts - Correction pour correspondre au backend
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
  
  // Estimation fruits/légumes
  fruits_vegetables_nuts_estimate_from_ingredients_100g?: number;
  
  // Métadonnées
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
    nutriscore_score: backendProduct.nutriscore_score
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
    categories_en: backendProduct.categories_en,
    categories: backendProduct.categories || backendProduct.categories_en,
    countries_en: backendProduct.countries_en,
    
    // Additifs
    additives_n: backendProduct.additives_n,
    additives_en: backendProduct.additives_en,
    additives: backendProduct.additives,
    
    // Scores
    nutriscore_score: backendProduct.nutriscore_score,
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
    
    // Métadonnées
    createdAt: backendProduct.createdAt,
    updatedAt: backendProduct.updatedAt
  };
}