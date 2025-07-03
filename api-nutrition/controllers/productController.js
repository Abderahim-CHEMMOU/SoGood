const axios = require('axios');
const Product = require('../models/Product');

// Configuration de l'API FastAPI
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://fastapi-nutriscore:8000';
const FASTAPI_TIMEOUT = process.env.FASTAPI_TIMEOUT || 10000;

class ProductController {

  // 🆕 POST /products/nutriscore/predict - Prédire le NutriScore avec FastAPI
  static async predictNutriscore(req, res) {
    try {
      const {
        name,
        energy_100g,
        fat_100g,
        saturated_fat_100g,
        sugars_100g,
        salt_100g,
        fiber_100g,
        proteins_100g,
        fruits_vegetables_nuts_100g,
        category,
        brand
      } = req.body;

      // 📋 Validation des champs obligatoires
      const requiredFields = [
        'name', 'energy_100g', 'fat_100g', 'saturated_fat_100g',
        'sugars_100g', 'salt_100g', 'fiber_100g', 'proteins_100g',
        'fruits_vegetables_nuts_100g'
      ];

      for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null) {
          return res.status(400).json({
            error: `Le champ ${field} est obligatoire`,
            field: field
          });
        }
      }

      // 🔢 Validation des valeurs numériques
      const numericFields = [
        'energy_100g', 'fat_100g', 'saturated_fat_100g', 'sugars_100g',
        'salt_100g', 'fiber_100g', 'proteins_100g', 'fruits_vegetables_nuts_100g'
      ];

      for (const field of numericFields) {
        if (isNaN(parseFloat(req.body[field])) || parseFloat(req.body[field]) < 0) {
          return res.status(400).json({
            error: `Le champ ${field} doit être un nombre positif`,
            field: field,
            value: req.body[field]
          });
        }
      }

      // 📦 Préparer les données pour l'API FastAPI
      const fastApiData = {
        name,
        energy_100g: parseFloat(energy_100g),
        fat_100g: parseFloat(fat_100g),
        saturated_fat_100g: parseFloat(saturated_fat_100g),
        sugars_100g: parseFloat(sugars_100g),
        salt_100g: parseFloat(salt_100g),
        fiber_100g: parseFloat(fiber_100g),
        proteins_100g: parseFloat(proteins_100g),
        fruits_vegetables_nuts_100g: parseFloat(fruits_vegetables_nuts_100g),
        category: category || null,
        brand: brand || null
      };

      console.log(`🔮 Prédiction NutriScore pour: ${name} (utilisateur: ${req.userId})`);

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

      // 🏷️ Catégoriser le NutriScore
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

      // 💾 Optionnel : Sauvegarder aussi dans votre base Node.js
      // (vous pouvez commenter cette partie si vous ne voulez pas de doublon)

      // 📤 Réponse enrichie
      res.status(201).json({
        success: true,
        message: 'NutriScore prédit avec succès',
        data: {
          // Données d'origine
          product: fastApiData,

          // Résultats de prédiction
          nutriscore: {
            value: nutriscore,
            grade: nutriscoreGrade,
            description: nutriscoreDescription
          },

          // Métadonnées
          fastapi_id: fastapiId,
          predicted_at: created_at,
          predicted_by_user: req.userId
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
        // L'API FastAPI a répondu avec une erreur
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

      // 🔄 Timeout
      if (error.code === 'ECONNABORTED') {
        return res.status(408).json({
          error: 'Timeout de prédiction',
          details: 'La prédiction a pris trop de temps'
        });
      }

      // Erreur générique
      res.status(500).json({
        error: 'Erreur interne du serveur',
        details: 'Une erreur inattendue s\'est produite lors de la prédiction'
      });
    }
  }

  // 📝 Méthodes existantes (à adapter selon votre modèle Product)

  // GET /products - Récupérer tous les produits
  static async getAllProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const products = await Product.find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Product.countDocuments();

      res.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Erreur getAllProducts:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // GET /products/search - Rechercher des produits
  static async searchProducts(req, res) {
    try {
      const { q, category, brand } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          error: 'Le terme de recherche doit contenir au moins 2 caractères'
        });
      }

      const searchQuery = {
        $and: [
          {
            $or: [
              { name: { $regex: q.trim(), $options: 'i' } },
              { brand: { $regex: q.trim(), $options: 'i' } }
            ]
          }
        ]
      };

      if (category) {
        searchQuery.$and.push({ category: { $regex: category, $options: 'i' } });
      }

      if (brand) {
        searchQuery.$and.push({ brand: { $regex: brand, $options: 'i' } });
      }

      const products = await Product.find(searchQuery).limit(50);

      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } catch (error) {
      console.error('Erreur searchProducts:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // GET /products/controversial - Produits controversés
  static async getControversialProducts(req, res) {
    try {
      // Exemple : produits avec un nutriscore élevé mais populaires
      const products = await Product.find({
        nutriscore: { $gt: 10 }
      }).sort({ nutriscore: -1 }).limit(20);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Erreur getControversialProducts:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // GET /products/nutriscore/range - Produits par gamme de nutriscore
  static async getProductsByNutriscoreRange(req, res) {
    try {
      const { min = 0, max = 20 } = req.query;

      const products = await Product.find({
        nutriscore: {
          $gte: parseFloat(min),
          $lte: parseFloat(max)
        }
      }).sort({ nutriscore: 1 });

      res.json({
        success: true,
        data: products,
        range: { min: parseFloat(min), max: parseFloat(max) }
      });
    } catch (error) {
      console.error('Erreur getProductsByNutriscoreRange:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // GET /products/nutriscore/:score - Produits par score exact
  static async getProductsByNutriscore(req, res) {
    try {
      const score = parseFloat(req.params.score);
      const tolerance = parseFloat(req.query.tolerance) || 0.5;

      const products = await Product.find({
        nutriscore: {
          $gte: score - tolerance,
          $lte: score + tolerance
        }
      });

      res.json({
        success: true,
        data: products,
        target_score: score,
        tolerance: tolerance
      });
    } catch (error) {
      console.error('Erreur getProductsByNutriscore:', error);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // POST /products - Créer un produit
  static async createProduct(req, res) {
    try {
      const product = new Product({
        ...req.body,
        created_by: req.userId
      });

      await product.save();

      res.status(201).json({
        success: true,
        message: 'Produit créé avec succès',
        data: product
      });
    } catch (error) {
      console.error('Erreur createProduct:', error);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Erreur de validation',
          details: Object.values(error.errors).map(err => err.message)
        });
      }

      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // GET /products/:id - Récupérer un produit par ID
  static async getProductById(req, res) {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Erreur getProductById:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de produit invalide'
        });
      }

      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }

  // DELETE /products/:id - Supprimer un produit (admin seulement)
  static async deleteProduct(req, res) {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);

      if (!product) {
        return res.status(404).json({
          error: 'Produit non trouvé'
        });
      }

      res.json({
        success: true,
        message: 'Produit supprimé avec succès',
        data: product
      });
    } catch (error) {
      console.error('Erreur deleteProduct:', error);

      if (error.name === 'CastError') {
        return res.status(400).json({
          error: 'ID de produit invalide'
        });
      }

      res.status(500).json({ error: 'Erreur interne du serveur' });
    }
  }
}

module.exports = ProductController;