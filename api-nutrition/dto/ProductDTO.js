class ProductDTO {
    constructor(product) {
      this.name = product.name;
      this.brand = product.brand;
      this.calories = product.calories;
      this.sugars = product.sugars_100g;
      this.salt = product.salt_100g;
      this.saturatedFat = product.saturated_fat_100g;
      this.fiber = product.fiber_100g;
      this.protein = product.protein_100g;
      this.nutriscore_score = product.nutriscore_score;
    }
  }
  module.exports = ProductDTO;
  