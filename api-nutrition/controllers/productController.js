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
        name,
        product_name,
        energy_100g,
        energy_kcal_100g,
        fat_100g,
        saturated_fat_100g,
        sugars_100g,
        salt_100g,
        fiber_100g,
        proteins_100g,
        fruits_vegetables_nuts_100g,
        fruits_vegetables_nuts_estimate_from_ingredients_100g,
        category,
        categories_en,
        brand,
        brands
      } = req.body;

      // 🔄 Mapping des champs (compatibilité avec votre structure existante)
      const productName = name || product_name;
      const energyValue = energy_100g || energy_kcal_100g;
      const fruitsValue = fruits_vegetables_nuts_100g || fruits_vegetables_nuts_estimate_from_ingredients_100g || 0;
      const categoryValue = category || categories_en;
      const brandValue = brand || brands;

      // 📋 Validation des champs obligatoires
      const requiredFields = [
        { field: 'name', value: productName },
        { field: 'energy_100g', value: energyValue },
        { field: 'fat_100g', value: fat_100g },
        { field: 'saturated_fat_100g', value: saturated_fat_100g },
        { field: 'sugars_100g', value: sugars_100g },
        { field: 'salt_100g', value: salt_100g },
        { field: 'fiber_100g', value: fiber_100g },
        { field: 'proteins_100g', value: proteins_100g }
      ];

      for (const { field, value } of requiredFields) {
        if (value === undefined || value === null) {
          return res.status(400).json({
            error: `Le champ ${field} est obligatoire`,
            field: field
          });
        }
      }

      // 🔢 Validation des valeurs numériques
      const numericFields = [
        { field: 'energy_100g', value: energyValue },
        { field: 'fat_100g', value: fat_100g },
        { field: 'saturated_fat_100g', value: saturated_fat_100g },
        { field: 'sugars_100g', value: sugars_100g },
        { field: 'salt_100g', value: salt_100g },
        { field: 'fiber_100g', value: fiber_100g },
        { field: 'proteins_100g', value: proteins_100g },
        { field: 'fruits_vegetables_nuts_100g', value: fruitsValue }
      ];

      for (const { field, value } of numericFields) {
        if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          return res.status(400).json({
            error: `Le champ ${field} doit être un nombre positif`,
            field: field,
            value: value
          });
        }
      }

      // 📦 Préparer les données pour l'API FastAPI
      const fastApiData = {
        name: productName,
        energy_100g: parseFloat(energyValue),
        fat_100g: parseFloat(fat_100g),
        saturated_fat_100g: parseFloat(saturated_fat_100g),
        sugars_100g: parseFloat(sugars_100g),
        salt_100g: parseFloat(salt_100g),
        fiber_100g: parseFloat(fiber_100g),
        proteins_100g: parseFloat(proteins_100g),
        fruits_vegetables_nuts_100g: parseFloat(fruitsValue),
        category: categoryValue || null,
        brand: brandValue || null
      };

      console.log(`🔮 Prédiction NutriScore pour: ${productName} (utilisateur: ${req.userId})`);

      // 🚀 Appel à l'API FastAPI
      const response = await axios.post(
        `${FASTAPI_URL}/products/nutriscore`,
        fastApiData,
        {
          timeout: FASTAPI_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // 📊 Traitement de la réponse
      const { nutriscore, id: fastapiId, created_at } = response.data;

      // 🏷️ Catégoriser le NutriScore (compatible avec votre échelle existante)
      let nutriscoreGrade;
      let nutriscoreDescription;

      if (nutriscore < 0) {
        nutriscoreGrade = 'A+';
        nutriscoreDescription = 'Excellent produit';
      } else if (nutriscore < 3) {
        nutriscoreGrade = 'A';
        nutriscoreDescription = 'Très bon produit';
      } else if (nutriscore < 7) {
        nutriscoreGrade = 'B';
        nutriscoreDescription = 'Bon produit';
      } else if (nutriscore < 11) {
        nutriscoreGrade = 'C';
        nutriscoreDescription = 'Produit moyen';
      } else if (nutriscore < 15) {
        nutriscoreGrade = 'D';
        nutriscoreDescription = 'Produit de qualité médiocre';
      } else {
        nutriscoreGrade = 'E';
        nutriscoreDescription = 'Produit de très mauvaise qualité';
      }

      // 📤 Réponse dans le format de votre API existante
      res.status(201).json({
        message: 'NutriScore prédit avec succès',
        product: {
          // Données compatibles avec votre ProductDTO
          id: fastapiId,
          product_name: productName,
          name: productName,
          brands: brandValue,
          brand: brandValue,
          categories_en: categoryValue,
          category: categoryValue,
          nutriscore_score: nutriscore,
          nutriscore_grade: nutriscoreGrade,
          nutriscore_description: nutriscoreDescription,

          // Valeurs nutritionnelles
          energy_kcal_100g: fastApiData.energy_100g,
          fat_100g: fastApiData.fat_100g,
          saturated_fat_100g: fastApiData.saturated_fat_100g,
          sugars_100g: fastApiData.sugars_100g,
          salt_100g: fastApiData.salt_100g,
          fiber_100g: fastApiData.fiber_100g,
          proteins_100g: fastApiData.proteins_100g,
          fruits_vegetables_nuts_estimate_from_ingredients_100g: fastApiData.fruits_vegetables_nuts_100g,

          // Métadonnées
          predicted_at: created_at,
          predicted_by_user: req.userId,
          source: 'fastapi_prediction'
        }
      });

    } catch (error) {
      console.error('❌ Erreur lors de la prédiction NutriScore:', error);

      // 🚨 Gestion spécifique des erreurs d'API
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Service de prédiction temporairement indisponible',
          details: 'Impossible de contacter l\'API FastAPI'
        });
      }

      if (error.response) {
        return res.status(error.response.status || 500).json({
          error: 'Erreur de prédiction',
          details: error.response.data?.detail || error.response.data || 'Erreur inconnue',
          api_status: error.response.status
        });
      }

      if (error.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'Service de prédiction non trouvé',
          details: 'URL de l\'API FastAPI incorrecte'
        });
      }

      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Timeout de prédiction',
          details: 'La prédiction a pris trop de temps'
        });
      }

      res.status(500).json({
        error: 'Erreur interne du serveur',
        details: 'Une erreur inattendue s\'est produite lors de la prédiction'
      });
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
