const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: String,
  brand: String,
  categories: String,
  calories: Number, // energy-kcal_100g
  saturated_fat_100g: Number,
  sugars_100g: Number,
  salt_100g: Number,
  fiber_100g: Number,
  protein_100g: Number,
  nutriscore_score: Number,
  additives: [String],
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
