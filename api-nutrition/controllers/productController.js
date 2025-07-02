const Product = require('../models/Product');
const ProductDTO = require('../dto/ProductDTO');

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

  // POST /products
  static async createProduct(req, res) {
    try {
      const {
        product_name, brands, categories_en, energy_kcal_100g,
        fat_100g, saturated_fat_100g, sugars_100g, salt_100g,
        fiber_100g, proteins_100g, nutriscore_score,
        // Autres champs...
        generic_name, quantity, origins_en, countries_en,
        traces_en, additives_n, additives_en, additives,
        nutrition_score_fr_100g, ecoscore_score, ecoscore_grade,
        food_groups_en, main_category_en, monounsaturated_fat_100g,
        polyunsaturated_fat_100g, trans_fat_100g, cholesterol_100g,
        carbohydrates_100g, sodium_100g, vitamin_a_100g,
        vitamin_c_100g, potassium_100g, calcium_100g, iron_100g,
        fruits_vegetables_nuts_estimate_from_ingredients_100g,
        name, brand, categories, calories, protein_100g
      } = req.body;

      if (!product_name && !name) {
        return res.status(400).json({ 
          error: 'Product name is required (product_name or name)' 
        });
      }

      const newProduct = new Product({
        product_name: product_name || name,
        generic_name, quantity,
        brands: brands || brand,
        categories_en: categories_en || categories,
        origins_en, countries_en, traces_en,
        additives_n, additives_en,
        additives: Array.isArray(additives) ? additives : [],
        nutriscore_score, nutrition_score_fr_100g,
        ecoscore_score, ecoscore_grade,
        food_groups_en, main_category_en,
        energy_kcal_100g: energy_kcal_100g || calories,
        fat_100g, saturated_fat_100g, monounsaturated_fat_100g,
        polyunsaturated_fat_100g, trans_fat_100g, cholesterol_100g,
        carbohydrates_100g, sugars_100g, fiber_100g,
        proteins_100g: proteins_100g || protein_100g,
        salt_100g, sodium_100g, vitamin_a_100g, vitamin_c_100g,
        potassium_100g, calcium_100g, iron_100g,
        fruits_vegetables_nuts_estimate_from_ingredients_100g,
        // Compatibilité
        name: product_name || name,
        brand: brands || brand,
        categories: categories_en || categories,
        calories: energy_kcal_100g || calories,
        protein_100g: proteins_100g || protein_100g,
      });

      const savedProduct = await newProduct.save();

      res.status(201).json({
        message: 'Product created successfully',
        product: new ProductDTO(savedProduct)
      });

    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: Object.values(error.errors).map(err => err.message)
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
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