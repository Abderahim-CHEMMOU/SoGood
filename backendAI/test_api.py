# Test de l'API NutriScore

import requests
import json

# URL de base de l'API
BASE_URL = "http://localhost:8000"

def test_health():
    response = requests.get(f"{BASE_URL}/health")
    print("Health check:", response.json())

def test_create_product():
    product_data = {
        "name": "Coca Cola",
        "energy_100g": 180,
        "fat_100g": 0,
        "saturated_fat_100g": 0,
        "sugars_100g": 10.6,
        "salt_100g": 0,
        "fiber_100g": 0,
        "proteins_100g": 0,
        "fruits_vegetables_nuts_100g": 0,
        "category": "Boissons",
        "brand": "Coca Cola"
    }

    response = requests.post(f"{BASE_URL}/products/nutriscore", json=product_data)
    print("Create product:", response.json())
    return response.json()

if __name__ == "__main__":
    print("🧪 Test de l'API NutriScore")
    print("-" * 30)

    test_health()
    result = test_create_product()

    print(f"✅ Produit créé avec nutriscore: {result.get('nutriscore')}")