from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import joblib
import numpy as np
import pandas as pd
import json
import os
from datetime import datetime
from typing import Optional

app = FastAPI(
    title="API NutriScore - SoGood",
    description="API pour prédire le NutriScore des produits alimentaires",
    version="1.0.0"
)

# Variables globales
model_pipeline = None
model_metadata = None
db = None

class ProductData(BaseModel):
    name: str
    energy_100g: float
    fat_100g: float
    saturated_fat_100g: float
    sugars_100g: float
    salt_100g: float
    fiber_100g: float
    proteins_100g: float
    fruits_vegetables_nuts_100g: float
    category: Optional[str] = None
    brand: Optional[str] = None

class ProductResponse(BaseModel):
    id: str
    name: str
    nutriscore: float
    created_at: str
    category: Optional[str] = None
    brand: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    global model_pipeline, model_metadata, db

    try:
        # Charger le pipeline complet du modèle
        print("📦 Chargement du pipeline modèle...")
        model_pipeline = joblib.load('models/realistic_model_20250703_085529.joblib')
        print("✅ Pipeline modèle chargé avec succès")
        print(f"📋 Features attendues: {len(model_pipeline['feature_names'])}")
        print("⚠️ SCALER DÉSACTIVÉ pour de meilleures prédictions")

        # Charger les métadonnées
        try:
            with open('models/realistic_model_20250703_085529_metadata.json', 'r') as f:
                model_metadata = json.load(f)
            print("✅ Métadonnées chargées avec succès")
        except Exception as e:
            print(f"⚠️ Impossible de charger les métadonnées: {e}")
            model_metadata = {}

        # Connexion MongoDB
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017/nutrition")
        client = AsyncIOMotorClient(mongo_url)
        db = client.food
        print("✅ Connexion MongoDB établie")

    except Exception as e:
        print(f"❌ Erreur lors du chargement: {e}")
        raise e

def calculate_missing_features(data: ProductData):
    """Calcule les features manquantes à partir des données de base"""

    # Calculer carbohydrates si pas fourni (estimation)
    carbohydrates = max(0, 100 - data.fat_100g - data.proteins_100g - data.fiber_100g - 5)  # -5 pour eau/cendres

    # Features calculées
    energy_density = data.energy_100g / 100.0
    sugar_carb_ratio = data.sugars_100g / max(carbohydrates, 1)  # éviter division par 0
    sat_fat_total_ratio = data.saturated_fat_100g / max(data.fat_100g, 1)

    # Positive nutrients (fiber, proteins, fruits)
    positive_nutrients = data.fiber_100g + data.proteins_100g + (data.fruits_vegetables_nuts_100g / 10)

    # Negative nutrients (energy, fat, sugar, salt)
    negative_nutrients = (data.energy_100g / 50) + (data.fat_100g * 2) + data.sugars_100g + (data.salt_100g * 100)

    return {
        'carbohydrates_100g': carbohydrates,
        'energy_density': energy_density,
        'sugar_carb_ratio': sugar_carb_ratio,
        'sat_fat_total_ratio': sat_fat_total_ratio,
        'positive_nutrients': positive_nutrients,
        'negative_nutrients': negative_nutrients
    }

def get_category_defaults(category: str = None):
    """Retourne des valeurs par défaut pour les encodages de catégories"""

    # Valeurs moyennes pour différentes catégories
    category_defaults = {
        'Boissons': {'target_enc': 2.5, 'freq': 0.15},
        'Snacks': {'target_enc': 4.2, 'freq': 0.12},
        'Légumes': {'target_enc': 1.2, 'freq': 0.08},
        'Fruits': {'target_enc': 1.0, 'freq': 0.06},
        'Produits laitiers': {'target_enc': 2.8, 'freq': 0.10},
        'Céréales': {'target_enc': 3.0, 'freq': 0.09},
    }

    if category and category in category_defaults:
        return category_defaults[category]
    else:
        # Valeurs par défaut neutres
        return {'target_enc': 2.5, 'freq': 0.10}

def prepare_full_features(data: ProductData) -> np.ndarray:
    """Prépare toutes les 20 features pour le modèle (SANS SCALER)"""
    try:
        # Features calculées
        calculated = calculate_missing_features(data)

        # Encodages de catégories
        cat_defaults = get_category_defaults(data.category)

        # Construire toutes les features dans l'ordre exact du modèle
        features = [
            0,  # additives_n (pas d'info, défaut 0)
            data.energy_100g,  # energy-kcal_100g
            data.fat_100g,  # fat_100g
            data.saturated_fat_100g,  # saturated-fat_100g
            calculated['carbohydrates_100g'],  # carbohydrates_100g
            data.sugars_100g,  # sugars_100g
            data.fiber_100g,  # fiber_100g
            data.fruits_vegetables_nuts_100g,  # fruits-vegetables-nuts-estimate-from-ingredients_100g
            1 if data.fiber_100g == 0 else 0,  # fiber_missing
            cat_defaults['target_enc'],  # categories_en_target_enc
            cat_defaults['freq'],  # categories_en_freq
            cat_defaults['target_enc'],  # food_groups_en_target_enc (même que categories)
            cat_defaults['freq'],  # food_groups_en_freq
            cat_defaults['target_enc'],  # main_category_en_target_enc
            cat_defaults['freq'],  # main_category_en_freq
            calculated['energy_density'],  # energy_density
            calculated['sugar_carb_ratio'],  # sugar_carb_ratio
            calculated['sat_fat_total_ratio'],  # sat_fat_total_ratio
            calculated['positive_nutrients'],  # positive_nutrients
            calculated['negative_nutrients']  # negative_nutrients
        ]

        # Convertir en array numpy SANS SCALER
        features_array = np.array([features])

        print(f"🔍 Features préparées: énergie={data.energy_100g}, sucres={data.sugars_100g}, catégorie={data.category}")

        return features_array

    except Exception as e:
        print(f"❌ Erreur lors de la préparation des features: {e}")
        raise e

def predict_nutriscore(data: ProductData) -> float:
    """Prédit le NutriScore en utilisant le modèle SANS SCALER"""
    try:
        # Préparer toutes les features (sans scaler)
        features = prepare_full_features(data)

        # Faire la prédiction avec le modèle
        model = model_pipeline['model']
        prediction = model.predict(features)

        # Retourner la prédiction
        result = float(prediction[0]) if isinstance(prediction, np.ndarray) else float(prediction)

        print(f"🎯 Prédiction NutriScore: {result:.3f}")

        return result

    except Exception as e:
        print(f"❌ Erreur lors de la prédiction: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {e}")

@app.get("/")
async def root():
    return {"message": "🚀 API NutriScore - SoGood est en ligne ! (Sans scaler pour de meilleures prédictions)"}

@app.get("/health")
async def health_check():
    model_loaded = model_pipeline is not None and 'model' in model_pipeline

    # Test de connexion MongoDB
    mongodb_connected = False
    try:
        await db.admin.command('ping')
        mongodb_connected = True
    except:
        pass

    return {
        "status": "healthy" if model_loaded and mongodb_connected else "degraded",
        "model_loaded": model_loaded,
        "model_features_count": len(model_pipeline['feature_names']) if model_pipeline else 0,
        "scaler_enabled": False,
        "model_metadata": model_metadata,
        "mongodb_connected": mongodb_connected
    }

@app.post("/products/nutriscore", response_model=ProductResponse)
async def create_product_with_nutriscore(product: ProductData):
    try:
        # Prédire le NutriScore
        nutriscore = predict_nutriscore(product)

        # Préparer le document pour MongoDB
        product_doc = {
            "name": product.name,
            "nutriscore": nutriscore,
            "nutritional_values": {
                "energy_100g": product.energy_100g,
                "fat_100g": product.fat_100g,
                "saturated_fat_100g": product.saturated_fat_100g,
                "sugars_100g": product.sugars_100g,
                "salt_100g": product.salt_100g,
                "fiber_100g": product.fiber_100g,
                "proteins_100g": product.proteins_100g,
                "fruits_vegetables_nuts_100g": product.fruits_vegetables_nuts_100g
            },
            "category": product.category,
            "brand": product.brand,
            "created_at": datetime.utcnow().isoformat()
        }

        # Insérer dans MongoDB
        result = await db.products.insert_one(product_doc)

        return ProductResponse(
            id=str(result.inserted_id),
            name=product.name,
            nutriscore=nutriscore,
            created_at=product_doc["created_at"],
            category=product.category,
            brand=product.brand
        )

    except Exception as e:
        print(f"❌ Erreur complète: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du produit: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)