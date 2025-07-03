const axios = require('axios');
const Product = require('../models/Product');
const ProductDTO = require('../dto/ProductDTO');

// Configuration FastAPI
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://fastapi-nutriscore:8000';
const FASTAPI_TIMEOUT = process.env.FASTAPI_TIMEOUT || 10000;

class ProductController {

  // GET /products - Liste paginée
  static async getAllProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const products = await Product.find()
        .skip((page - 1) * limit)
        .limit(limit);

      res.json(products.map(p => new ProductDTO(p)));
    } catch (error) {
      console.error('Error getting products:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /products/search?name=
  static async searchProducts(req, res) {
    try {
      const name = req.query.name?.toLowerCase();
      if (!name) return res.status(400).json({ error: 'Missing query ?name=' });

      const products = await Product.find({ 
        name: { $regex: name, $options: 'i' } 
      }).limit(20);

      res.json(products.map(p => new ProductDTO(p)));
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /products/controversial
  static async getControversialProducts(req, res) {
    try {
      const results = await Product.aggregate([
        {
          $project: {
            name: 1,
            brand: 1,
            additivesCount: { $size: "$additives" },
            nutriscore_score: 1,
            controversy_score: {
              $add: [
                { $size: "$additives" },
                {
                  $cond: {
                    if: { $gt: ["$nutriscore_score", 10] },
                    then: "$nutriscore_score",
                    else: 0
                  }
                }
              ]
            }
          }
        },
        { $sort: { controversy_score: -1 } },
        { $limit: 20 }
      ]);

      res.json(results);
    } catch (error) {
      console.error("Error getting controversial products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // GET /products/nutriscore/range?min=&max=
  static async getProductsByNutriscoreRange(req, res) {
    try {
      const minScore = parseFloat(req.query.min);
      const maxScore = parseFloat(req.query.max);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      if (isNaN(minScore) || isNaN(maxScore)) {
        return res.status(400).json({ 
          error: 'Invalid score range. Use ?min=X&max=Y' 
        });
      }

      if (minScore > maxScore) {
        return res.status(400).json({ 
          error: 'Min score cannot be greater than max score' 
        });
      }

      const products = await Product.find({
        nutriscore_score: { $gte: minScore, $lte: maxScore }
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ nutriscore_score: 1, product_name: 1 });

      const totalProducts = await Product.countDocuments({
        nutriscore_score: { $gte: minScore, $lte: maxScore }
      });

      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
        products: products.map(p => new ProductDTO(p)),
        search_criteria: { min_nutriscore: minScore, max_nutriscore: maxScore },
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_products: totalProducts,
          products_per_page: limit,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      });
    } catch (error) {
      console.error('Error in nutriscore range search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /products/nutriscore/:score
  static async getProductsByNutriscore(req, res) {
    try {
      const score = parseFloat(req.params.score);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      if (isNaN(score)) {
        return res.status(400).json({ error: 'Invalid nutriscore score' });
      }

      const products = await Product.find({ nutriscore_score: score })
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ product_name: 1 });

      const totalProducts = await Product.countDocuments({ nutriscore_score: score });
      const totalPages = Math.ceil(totalProducts / limit);

      res.json({
        products: products.map(p => new ProductDTO(p)),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_products: totalProducts,
          products_per_page: limit,
          has_next: page < totalPages,
          has_previous: page > 1
        }
      });
    } catch (error) {
      console.error('Error in nutriscore search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /products/:id
  static async getProductById(req, res) {
    try {
      const product = await Product.findById(req.params.id).lean();
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const { _id, __v, ...productData } = product;

      res.json({
        id: _id,
        ...productData
      });
    } catch (error) {
      console.error('Error getting product by ID:', error);
      res.status(400).json({ error: 'Invalid ID' });
    }
  }

  // 🔄 POST /products - REMPLACÉ : Prédire le NutriScore avec FastAPI
 
   static async predictNutriscore(req, res) {
      try {
        const {
          // Noms de produit
          name, product_name,
          // Marques  
          brand, brands,
          // Catégories
          category, categories_en,
          // Valeurs nutritionnelles OBLIGATOIRES pour prédiction
          energy_100g, energy_kcal_100g, calories,
          fat_100g, saturated_fat_100g, sugars_100g, salt_100g,
          fiber_100g, proteins_100g, protein_100g,
          fruits_vegetables_nuts_100g, fruits_vegetables_nuts_estimate_from_ingredients_100g,
          // Autres champs pour sauvegarde complète
          generic_name, quantity, origins_en, countries_en, traces_en,
          additives_n, additives_en, additives,
          ecoscore_score, ecoscore_grade, food_groups_en, main_category_en,
          cholesterol_100g, carbohydrates_100g, monounsaturated_fat_100g,
          polyunsaturated_fat_100g, trans_fat_100g, sodium_100g,
          vitamin_a_100g, vitamin_c_100g, potassium_100g, calcium_100g, iron_100g,
          nutrition_score_fr_100g
        } = req.body;
  
        // 🔄 Normalisation des champs (compatibilité)
        const productName = product_name || name;
        const brandValue = brands || brand;
        const categoryValue = categories_en || category;
        const energyValue = energy_kcal_100g || energy_100g || calories;
        const proteinValue = proteins_100g || protein_100g;
        const fruitsValue = fruits_vegetables_nuts_estimate_from_ingredients_100g || fruits_vegetables_nuts_100g || 0;
  
        // ✅ Validation des champs OBLIGATOIRES pour prédiction
        if (!productName) {
          return res.status(400).json({ error: 'product_name ou name requis' });
        }
  
        const requiredNutrients = [
          { field: 'energy_kcal_100g', value: energyValue },
          { field: 'fat_100g', value: fat_100g },
          { field: 'saturated_fat_100g', value: saturated_fat_100g },
          { field: 'sugars_100g', value: sugars_100g },
          { field: 'salt_100g', value: salt_100g },
          { field: 'fiber_100g', value: fiber_100g },
          { field: 'proteins_100g', value: proteinValue }
        ];
  
        for (const { field, value } of requiredNutrients) {
          if (value === undefined || value === null || isNaN(parseFloat(value))) {
            return res.status(400).json({
              error: `${field} est requis et doit être un nombre`,
              field: field
            });
          }
        }
  
        // 📦 Préparer les données pour FastAPI (PRÉDICTION UNIQUEMENT)
        const fastApiData = {
          name: productName,
          energy_100g: parseFloat(energyValue),
          fat_100g: parseFloat(fat_100g),
          saturated_fat_100g: parseFloat(saturated_fat_100g),
          sugars_100g: parseFloat(sugars_100g),
          salt_100g: parseFloat(salt_100g),
          fiber_100g: parseFloat(fiber_100g),
          proteins_100g: parseFloat(proteinValue),
          fruits_vegetables_nuts_100g: parseFloat(fruitsValue),
          category: categoryValue,
          brand: brandValue
        };
  
        console.log(`🔮 Prédiction NutriScore pour: ${productName}`);
  
        // 🚀 Appel FastAPI pour PRÉDICTION uniquement
        const response = await axios.post(
          `${FASTAPI_URL}/predict/nutriscore`,
          fastApiData,
          {
            timeout: FASTAPI_TIMEOUT,
            headers: { 'Content-Type': 'application/json' }
          }
        );
  
        const predictedNutriscore = response.data.nutriscore;
        console.log(`✅ NutriScore prédit: ${predictedNutriscore}`);
  
        // 💾 Sauvegarder en MongoDB au FORMAT EXACT requis
        const newProduct = new Product({
          // 🏷️ Champs principaux (format exact)
          product_name: productName,
          generic_name: generic_name || null,
          quantity: quantity || null,
          brands: brandValue || null,
          categories_en: categoryValue || null,
          origins_en: origins_en || null,
          countries_en: countries_en || "Unknown",
          traces_en: traces_en || null,
  
          // 🧪 Additifs
          additives_n: parseInt(additives_n) || 0,
          additives_en: additives_en || null,
          additives: Array.isArray(additives) ? additives : [],
  
          // 🎯 Scores (utilisation de la PRÉDICTION)
          nutriscore_score: predictedNutriscore,
          nutrition_score_fr_100g: nutrition_score_fr_100g || predictedNutriscore,
          ecoscore_score: ecoscore_score || null,
          ecoscore_grade: ecoscore_grade || "unknown",
  
          // 📂 Catégorisation
          food_groups_en: food_groups_en || null,
          main_category_en: main_category_en || categoryValue || null,
  
          // 🍎 Valeurs nutritionnelles pour 100g (format exact)
          energy_kcal_100g: parseFloat(energyValue),
          fat_100g: parseFloat(fat_100g),
          saturated_fat_100g: parseFloat(saturated_fat_100g),
          monounsaturated_fat_100g: parseFloat(monounsaturated_fat_100g) || 0,
          polyunsaturated_fat_100g: parseFloat(polyunsaturated_fat_100g) || 0,
          trans_fat_100g: parseFloat(trans_fat_100g) || 0,
          cholesterol_100g: parseFloat(cholesterol_100g) || 0,
          carbohydrates_100g: parseFloat(carbohydrates_100g) || 0,
          sugars_100g: parseFloat(sugars_100g),
          fiber_100g: parseFloat(fiber_100g),
          proteins_100g: parseFloat(proteinValue),
          salt_100g: parseFloat(salt_100g),
          sodium_100g: parseFloat(sodium_100g) || (parseFloat(salt_100g) * 0.4),
  
          // 💊 Vitamines et minéraux
          vitamin_a_100g: parseFloat(vitamin_a_100g) || 0,
          vitamin_c_100g: parseFloat(vitamin_c_100g) || 0,
          potassium_100g: parseFloat(potassium_100g) || 0,
          calcium_100g: parseFloat(calcium_100g) || 0,
          iron_100g: parseFloat(iron_100g) || 0,
  
          // 🥬 Fruits et légumes
          fruits_vegetables_nuts_estimate_from_ingredients_100g: parseFloat(fruitsValue),
  
          // 🔄 Champs de compatibilité (REQUIS dans votre format)
          name: productName,
          brand: brandValue || null,
          categories: categoryValue || null,
          calories: parseFloat(energyValue),
          protein_100g: parseFloat(proteinValue)
        });
  
        // 💾 Sauvegarder
        const savedProduct = await newProduct.save();
        console.log(`💾 Produit sauvegardé: ${savedProduct._id}`);
  
        // 📤 Réponse au FORMAT EXACT
        const { _id, __v, createdAt, updatedAt, ...productData } = savedProduct.toObject();
  
        res.status(201).json({
          id: _id,
          ...productData,
          createdAt: createdAt,
          updatedAt: updatedAt
        });
  
      } catch (error) {
        console.error('❌ Erreur createProduct:', error);
  
        if (error.name === 'ValidationError') {
          return res.status(400).json({
            error: 'Erreur de validation',
            details: Object.values(error.errors).map(err => err.message)
          });
        }
  
        if (error.code === 'ECONNREFUSED') {
          return res.status(503).json({
            error: 'Service de prédiction indisponible'
          });
        }
  
        if (error.response?.status) {
          return res.status(error.response.status).json({
            error: 'Erreur de prédiction',
            details: error.response.data?.detail || 'Erreur FastAPI'
          });
        }
  
        res.status(500).json({ error: 'Erreur interne du serveur' });
      }
    }

  // DELETE /products/:id - Supprimer un produit (Admin uniquement)
  static async deleteProduct(req, res) {
    try {
      const productId = req.params.id;

      // Validation de l'ID
      if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid product ID format' });
      }

      // Chercher le produit
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Supprimer le produit
      await Product.findByIdAndDelete(productId);

      // Log de l'action (optionnel mais recommandé)
      console.log(`🗑️  Product deleted by admin ${req.user.username}:`, {
        id: product._id,
        name: product.product_name || product.name,
        deletedBy: req.user.email
      });

      res.json({
        message: 'Product deleted successfully',
        deletedProduct: {
          id: product._id,
          name: product.product_name || product.name,
          brand: product.brands || product.brand,
          deletedAt: new Date().toISOString(),
          deletedBy: req.user.username
        }
      });

    } catch (error) {
      console.error('Error deleting product:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = ProductController;
