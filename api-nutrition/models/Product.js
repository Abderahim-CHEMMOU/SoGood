const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  // Informations de base
  product_name: String,
  generic_name: String,
  quantity: String,
  brands: String,
  categories_en: String,
  origins_en: String,
  countries_en: String,
  traces_en: String,
  
  // Additifs
  additives_n: Number,
  additives_en: String,
  additives: [String], // garder pour compatibilité
  
  // Scores nutritionnels
  nutriscore_score: Number,
  nutrition_score_fr_100g: Number,
  ecoscore_score: Number,
  ecoscore_grade: String,
  
  // Catégories
  food_groups_en: String,
  main_category_en: String,
  
  // Valeurs nutritionnelles pour 100g
  energy_kcal_100g: Number,
  fat_100g: Number,
  saturated_fat_100g: Number,
  monounsaturated_fat_100g: Number,
  polyunsaturated_fat_100g: Number,
  trans_fat_100g: Number,
  cholesterol_100g: Number,
  carbohydrates_100g: Number,
  sugars_100g: Number,
  fiber_100g: Number,
  proteins_100g: Number,
  salt_100g: Number,
  sodium_100g: Number,
  
  // Vitamines et minéraux
  vitamin_a_100g: Number,
  vitamin_c_100g: Number,
  potassium_100g: Number,
  calcium_100g: Number,
  iron_100g: Number,
  
  // Autres
  fruits_vegetables_nuts_estimate_from_ingredients_100g: Number,
  
  // Champs existants pour compatibilité
  name: String,
  brand: String,
  categories: String,
  calories: Number,
  protein_100g: Number,
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);