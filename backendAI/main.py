from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
import json
import os
from typing import Optional

app = FastAPI(
    title="API NutriScore - SoGood",
    description="API pour prédire le NutriScore des produits alimentaires",
    version="1.0.0"
)

# Variables globales
model_pipeline = None
model_metadata = None

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

class PredictionResponse(BaseModel):
    nutriscore: float
    status: str = "success"

@app.on_event("startup")
async def startup_event():
    global model_pipeline, model_metadata

    try:
        # Charger le pipeline complet du modèle
        print("📦 Chargement du pipeline modèle...")
        model_pipeline = joblib.load('models/realistic_model_20250703_085529.joblib')
        print("✅ Pipeline modèle chargé avec succès")
        print(f"📋 Features attendues: {len(model_pipeline['feature_names'])}")

        # Charger les métadonnées
        try:
            with open('models/realistic_model_20250703_085529_metadata.json', 'r') as f:
                model_metadata = json.load(f)
            print("✅ Métadonnées chargées avec succès")
        except Exception as e:
            print(f"⚠️ Impossible de charger les métadonnées: {e}")
            model_metadata = {}

    except Exception as e:
        print(f"❌ Erreur lors du chargement: {e}")
        raise e

def calculate_missing_features(data: ProductData):
    """Calcule les features manquantes à partir des données de base"""
    carbohydrates = max(0, 100 - data.fat_100g - data.proteins_100g - data.fiber_100g - 5)
    energy_density = data.energy_100g / 100.0
    sugar_carb_ratio = data.sugars_100g / max(carbohydrates, 1)
    sat_fat_total_ratio = data.saturated_fat_100g / max(data.fat_100g, 1)
    positive_nutrients = data.fiber_100g + data.proteins_100g + (data.fruits_vegetables_nuts_100g / 10)
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
        return {'target_enc': 2.5, 'freq': 0.10}

def prepare_full_features(data: ProductData) -> np.ndarray:
    """Prépare toutes les 20 features pour le modèle"""
    try:
        calculated = calculate_missing_features(data)
        cat_defaults = get_category_defaults(data.category)

        features = [
            0,  # additives_n
            data.energy_100g,
            data.fat_100g,
            data.saturated_fat_100g,
            calculated['carbohydrates_100g'],
            data.sugars_100g,
            data.fiber_100g,
            data.fruits_vegetables_nuts_100g,
            1 if data.fiber_100g == 0 else 0,
            cat_defaults['target_enc'],
            cat_defaults['freq'],
            cat_defaults['target_enc'],
            cat_defaults['freq'],
            cat_defaults['target_enc'],
            cat_defaults['freq'],
            calculated['energy_density'],
            calculated['sugar_carb_ratio'],
            calculated['sat_fat_total_ratio'],
            calculated['positive_nutrients'],
            calculated['negative_nutrients']
        ]

        return np.array([features])

    except Exception as e:
        print(f"❌ Erreur lors de la préparation des features: {e}")
        raise e

@app.get("/")
async def root():
    return {"message": "🚀 API NutriScore - SoGood (Prédiction uniquement)"}

@app.get("/health")
async def health_check():
    model_loaded = model_pipeline is not None and 'model' in model_pipeline
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "model_features_count": len(model_pipeline['feature_names']) if model_pipeline else 0,
        "model_metadata": model_metadata
    }

@app.post("/predict/nutriscore", response_model=PredictionResponse)
async def predict_nutriscore_only(product: ProductData):
    """🎯 SEULEMENT prédire le NutriScore - pas de sauvegarde"""
    try:
        # Préparer les features
        features = prepare_full_features(product)

        # Faire la prédiction
        model = model_pipeline['model']
        prediction = model.predict(features)

        nutriscore = float(prediction[0]) if isinstance(prediction, np.ndarray) else float(prediction)

        print(f"🎯 Prédiction NutriScore pour '{product.name}': {nutriscore:.3f}")

        return PredictionResponse(nutriscore=nutriscore)

    except Exception as e:
        print(f"❌ Erreur lors de la prédiction: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur de prédiction: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
