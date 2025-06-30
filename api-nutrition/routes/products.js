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

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(new ProductDTO(product));
  } catch (e) {
    res.status(400).json({ error: 'Invalid ID' });
  }
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


module.exports = router;
