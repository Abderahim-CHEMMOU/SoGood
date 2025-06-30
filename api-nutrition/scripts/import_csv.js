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
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

// Parse la chaîne des additifs en tableau
function parseAdditives(additiveStr) {
  return additiveStr
    ? additiveStr.split(',').map(a => a.trim()).filter(Boolean)
    : [];
}

let inserted = 0;
let rejected = 0;

fs.createReadStream('./data/food_data.csv')
  .pipe(csv.parse({ headers: true }))
  .on('data', async (row) => {
    try {
      const product = new Product({
        name: row.product_name?.trim() || 'Sans nom',
        brand: row.brands?.trim() || 'Inconnu',
        categories: row.categories_en?.trim() || '',
        calories: parseNumber(row['energy-kcal_100g']),
        saturated_fat_100g: parseNumber(row['saturated-fat_100g']),
        sugars_100g: parseNumber(row['sugars_100g']),
        salt_100g: parseNumber(row['salt_100g']),
        fiber_100g: parseNumber(row['fiber_100g']),
        protein_100g: parseNumber(row['proteins_100g']),
        nutriscore_score: parseNumber(row['nutriscore_score']),
        additives: parseAdditives(row['additives_en']),
      });

      // Vérifie qu’au moins une info nutritionnelle existe
      const hasNutritionInfo = [
        product.calories,
        product.saturated_fat_100g,
        product.sugars_100g,
        product.salt_100g,
        product.fiber_100g,
        product.protein_100g,
        product.nutriscore_score,
      ].some(val => val !== undefined);

      if (hasNutritionInfo) {
        await product.save();
        inserted++;
      } else {
        rejected++;
      }
    } catch (e) {
      console.error("❌ Import error:", e.message);
      rejected++;
    }
  })
  .on('end', () => {
    console.log(`✅ Import terminé ! Produits insérés : ${inserted}, ignorés : ${rejected}`);
    mongoose.disconnect();
  });
