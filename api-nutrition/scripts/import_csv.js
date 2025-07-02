const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('fast-csv');
const Product = require('../models/Product');

// Connexion Mongo (Docker)
const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/food';

mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Fonction pour parser des nombres propres
function parseNumber(value) {
  if (!value || value === '' || value === 'null' || value === 'undefined') {
    return undefined;
  }
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

// Parse la chaîne des additifs en tableau
function parseAdditives(additiveStr) {
  return additiveStr
    ? additiveStr.split(',').map(a => a.trim()).filter(Boolean)
    : [];
}

// Fonction pour nettoyer les chaînes
function cleanString(value) {
  return value?.trim() || undefined;
}

let inserted = 0;
let rejected = 0;

fs.createReadStream('./data/food_data.csv')
  .pipe(csv.parse({ headers: true }))
  .on('data', async (row) => {
    try {
      const product = new Product({
        // Informations de base
        product_name: cleanString(row.product_name),
        generic_name: cleanString(row.generic_name),
        quantity: cleanString(row.quantity),
        brands: cleanString(row.brands),
        categories_en: cleanString(row.categories_en),
        origins_en: cleanString(row.origins_en),
        countries_en: cleanString(row.countries_en),
        traces_en: cleanString(row.traces_en),
        
        // Additifs
        additives_n: parseNumber(row.additives_n),
        additives_en: cleanString(row.additives_en),
        additives: parseAdditives(row.additives_en),
        
        // Scores nutritionnels
        nutriscore_score: parseNumber(row.nutriscore_score),
        nutrition_score_fr_100g: parseNumber(row['nutrition-score-fr_100g']),
        ecoscore_score: parseNumber(row.ecoscore_score),
        ecoscore_grade: cleanString(row.ecoscore_grade),
        
        // Catégories
        food_groups_en: cleanString(row.food_groups_en),
        main_category_en: cleanString(row.main_category_en),
        
        // Valeurs nutritionnelles pour 100g
        energy_kcal_100g: parseNumber(row['energy-kcal_100g']),
        fat_100g: parseNumber(row.fat_100g),
        saturated_fat_100g: parseNumber(row['saturated-fat_100g']),
        monounsaturated_fat_100g: parseNumber(row['monounsaturated-fat_100g']),
        polyunsaturated_fat_100g: parseNumber(row['polyunsaturated-fat_100g']),
        trans_fat_100g: parseNumber(row['trans-fat_100g']),
        cholesterol_100g: parseNumber(row.cholesterol_100g),
        carbohydrates_100g: parseNumber(row.carbohydrates_100g),
        sugars_100g: parseNumber(row.sugars_100g),
        fiber_100g: parseNumber(row.fiber_100g),
        proteins_100g: parseNumber(row.proteins_100g),
        salt_100g: parseNumber(row.salt_100g),
        sodium_100g: parseNumber(row.sodium_100g),
        
        // Vitamines et minéraux
        vitamin_a_100g: parseNumber(row['vitamin-a_100g']),
        vitamin_c_100g: parseNumber(row['vitamin-c_100g']),
        potassium_100g: parseNumber(row.potassium_100g),
        calcium_100g: parseNumber(row.calcium_100g),
        iron_100g: parseNumber(row.iron_100g),
        
        // Autres
        fruits_vegetables_nuts_estimate_from_ingredients_100g: parseNumber(row['fruits-vegetables-nuts-estimate-from-ingredients_100g']),
        
        // Champs pour compatibilité avec l'ancien modèle
        name: cleanString(row.product_name) || 'Sans nom',
        brand: cleanString(row.brands) || 'Inconnu',
        categories: cleanString(row.categories_en) || '',
        calories: parseNumber(row['energy-kcal_100g']),
        protein_100g: parseNumber(row.proteins_100g),
      });

      // Vérifie qu'au moins une info nutritionnelle existe
      const hasNutritionInfo = [
        product.energy_kcal_100g,
        product.fat_100g,
        product.saturated_fat_100g,
        product.carbohydrates_100g,
        product.sugars_100g,
        product.fiber_100g,
        product.proteins_100g,
        product.salt_100g,
        product.nutriscore_score,
        product.ecoscore_score,
      ].some(val => val !== undefined && val !== null);

      if (hasNutritionInfo) {
        await product.save();
        inserted++;
        
        // Afficher un log tous les 100 produits insérés
        if (inserted % 100 === 0) {
          console.log(`📊 ${inserted} produits insérés...`);
        }
      } else {
        rejected++;
      }
    } catch (e) {
      console.error("❌ Import error:", e.message);
      rejected++;
    }
  })
  .on('end', () => {
    console.log(`✅ Import terminé !`);
    console.log(`   📈 Produits insérés : ${inserted}`);
    console.log(`   📉 Produits ignorés : ${rejected}`);
    console.log(`   📊 Total traité : ${inserted + rejected}`);
    mongoose.disconnect();
  })
  .on('error', (error) => {
    console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
    mongoose.disconnect();
  });