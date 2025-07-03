#!/bin/bash
echo "🚀 Démarrage de l'API NutriScore..."

# Vérifier si le modèle existe
if [ ! -f "models/nutriscore_model.pkl" ]; then
    echo "❌ Modèle non trouvé dans models/nutriscore_model.pkl"
    echo "Veuillez placer votre modèle dans le dossier models/"
    exit 1
fi

# Installer les dépendances
pip install -r requirements.txt

# Démarrer l'API
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
