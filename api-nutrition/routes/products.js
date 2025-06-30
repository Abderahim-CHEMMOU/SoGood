const express = require('express');
const Product = require('../models/Product');
const ProductDTO = require('../dto/ProductDTO');

const router = express.Router();

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const products = await Product.find()
    .skip((page - 1) * limit)
    .limit(limit);

  res.json(products.map(p => new ProductDTO(p)));
});

router.get('/search', async (req, res) => {
  const name = req.query.name?.toLowerCase();
  if (!name) return res.status(400).json({ error: 'Missing query ?name=' });

  const products = await Product.find({ name: { $regex: name, $options: 'i' } }).limit(20);
  res.json(products.map(p => new ProductDTO(p)));
});

router.get('/controversial', async (req, res) => {
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
                  if: { $gt: ["$nutriscore_score", 10] }, // plus le nutriscore est haut, pire c'est
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
  } catch (err) {
    console.error("Erreur /controversial :", err);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Route pour recherche par plage de nutriscore
router.get('/nutriscore/range', async (req, res) => {
  try {
    const minScore = parseFloat(req.query.min);
    const maxScore = parseFloat(req.query.max);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Validation des scores
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
    
    // Recherche avec plage de scores
    const products = await Product.find({
      nutriscore_score: { 
        $gte: minScore, 
        $lte: maxScore 
      }
    })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ nutriscore_score: 1, product_name: 1 });
    
    const totalProducts = await Product.countDocuments({
      nutriscore_score: { 
        $gte: minScore, 
        $lte: maxScore 
      }
    });
    
    const totalPages = Math.ceil(totalProducts / limit);
    
    res.json({
      products: products.map(p => new ProductDTO(p)),
      search_criteria: {
        min_nutriscore: minScore,
        max_nutriscore: maxScore
      },
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_products: totalProducts,
        products_per_page: limit,
        has_next: page < totalPages,
        has_previous: page > 1
      }
    });
  } catch (e) {
    console.error('Error in nutriscore range search:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/nutriscore/:score', async (req, res) => {
  try {
    const score = parseFloat(req.params.score);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Validation du score
    if (isNaN(score)) {
      return res.status(400).json({ error: 'Invalid nutriscore score' });
    }
    
    // Recherche avec pagination
    const products = await Product.find({ nutriscore_score: score })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ product_name: 1 }); // Tri par nom de produit
    
    // Compter le total pour la pagination
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
  } catch (e) {
    console.error('Error in nutriscore search:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Convertir _id en id et nettoyer la réponse
    const { _id, __v, ...productData } = product;
    
    res.json({
      id: _id,
      ...productData
    });
  } catch (e) {
    res.status(400).json({ error: 'Invalid ID' });
  }
});

// Ajouter cette route dans /routes/products.js

router.post('/', async (req, res) => {
  try {
    const {
      // Informations de base
      product_name,
      generic_name,
      quantity,
      brands,
      categories_en,
      origins_en,
      countries_en,
      traces_en,
      
      // Additifs
      additives_n,
      additives_en,
      additives,
      
      // Scores nutritionnels
      nutriscore_score,
      nutrition_score_fr_100g,
      ecoscore_score,
      ecoscore_grade,
      
      // Catégories
      food_groups_en,
      main_category_en,
      
      // Valeurs nutritionnelles pour 100g
      energy_kcal_100g,
      fat_100g,
      saturated_fat_100g,
      monounsaturated_fat_100g,
      polyunsaturated_fat_100g,
      trans_fat_100g,
      cholesterol_100g,
      carbohydrates_100g,
      sugars_100g,
      fiber_100g,
      proteins_100g,
      salt_100g,
      sodium_100g,
      
      // Vitamines et minéraux
      vitamin_a_100g,
      vitamin_c_100g,
      potassium_100g,
      calcium_100g,
      iron_100g,
      
      // Autres
      fruits_vegetables_nuts_estimate_from_ingredients_100g,
      
      // Champs de compatibilité (optionnels)
      name,
      brand,
      categories,
      calories,
      protein_100g
    } = req.body;

    // Validation des champs obligatoires
    if (!product_name && !name) {
      return res.status(400).json({ 
        error: 'Product name is required (product_name or name)' 
      });
    }

    // Créer le nouveau produit
    const newProduct = new Product({
      // Informations de base
      product_name: product_name || name,
      generic_name,
      quantity,
      brands: brands || brand,
      categories_en: categories_en || categories,
      origins_en,
      countries_en,
      traces_en,
      
      // Additifs
      additives_n,
      additives_en,
      additives: Array.isArray(additives) ? additives : [],
      
      // Scores nutritionnels
      nutriscore_score,
      nutrition_score_fr_100g,
      ecoscore_score,
      ecoscore_grade,
      
      // Catégories
      food_groups_en,
      main_category_en,
      
      // Valeurs nutritionnelles pour 100g
      energy_kcal_100g: energy_kcal_100g || calories,
      fat_100g,
      saturated_fat_100g,
      monounsaturated_fat_100g,
      polyunsaturated_fat_100g,
      trans_fat_100g,
      cholesterol_100g,
      carbohydrates_100g,
      sugars_100g,
      fiber_100g,
      proteins_100g: proteins_100g || protein_100g,
      salt_100g,
      sodium_100g,
      
      // Vitamines et minéraux
      vitamin_a_100g,
      vitamin_c_100g,
      potassium_100g,
      calcium_100g,
      iron_100g,
      
      // Autres
      fruits_vegetables_nuts_estimate_from_ingredients_100g,
      
      // Champs pour compatibilité
      name: product_name || name,
      brand: brands || brand,
      categories: categories_en || categories,
      calories: energy_kcal_100g || calories,
      protein_100g: proteins_100g || protein_100g,
    });

    // Sauvegarder le produit
    const savedProduct = await newProduct.save();

    // Retourner le produit créé avec un DTO
    res.status(201).json({
      message: 'Product created successfully',
      product: new ProductDTO(savedProduct)
    });

  } catch (error) {
    console.error('Error creating product:', error);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
