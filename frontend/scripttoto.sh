#!/bin/bash

echo "🔍 DIAGNOSTIC COMPLET - PROBLÈME NGINX"
echo "======================================="

echo ""
echo "1. VÉRIFICATION DU BUILD LOCAL"
echo "------------------------------"
echo "Testons le build Angular en local d'abord..."

if [ -f "package.json" ]; then
    echo "✅ package.json trouvé"
    echo "📦 Contenu du script build:"
    grep -A 2 -B 2 '"build"' package.json
else
    echo "❌ package.json non trouvé - êtes-vous dans le bon dossier ?"
    exit 1
fi

echo ""
echo "2. BUILD ANGULAR LOCAL"
echo "----------------------"
echo "Exécution de: npm run build"
npm run build

echo ""
echo "3. ANALYSE DU DOSSIER DIST"
echo "--------------------------"
echo "📁 Contenu de dist/:"
if [ -d "dist" ]; then
    find dist -type f -name "*.html" | head -5
    echo ""
    echo "🗂️ Structure complète de dist/:"
    tree dist/ 2>/dev/null || find dist -type d
    echo ""
    echo "📄 Fichiers dans dist/:"
    ls -la dist/
    
    if [ -d "dist/frontend" ]; then
        echo ""
        echo "📁 Contenu de dist/frontend/:"
        ls -la dist/frontend/
    elif [ -d "dist/browser" ]; then
        echo ""
        echo "📁 Contenu de dist/browser/:"
        ls -la dist/browser/
    fi
else
    echo "❌ Dossier dist/ n'existe pas après le build"
    exit 1
fi

echo ""
echo "4. VÉRIFICATION ANGULAR.JSON"
echo "-----------------------------"
echo "📋 Configuration outputPath:"
grep -A 5 -B 2 "outputPath" angular.json

echo ""
echo "5. TEST DU SERVEUR LOCAL"
echo "------------------------"
echo "🌐 Test avec un serveur HTTP simple..."
if command -v python3 &> /dev/null; then
    echo "Démarrage serveur Python sur port 8080..."
    echo "Allez sur http://localhost:8080 pour tester"
    echo "Appuyez sur Ctrl+C pour arrêter"
    cd dist/frontend 2>/dev/null || cd dist/browser 2>/dev/null || cd dist
    python3 -m http.server 8080
elif command -v php &> /dev/null; then
    echo "Démarrage serveur PHP sur port 8080..."
    cd dist/frontend 2>/dev/null || cd dist/browser 2>/dev/null || cd dist
    php -S localhost:8080
else
    echo "❌ Ni Python ni PHP disponible pour tester"
    echo "📁 Mais voici le contenu du dossier à servir:"
    cd dist/frontend 2>/dev/null || cd dist/browser 2>/dev/null || cd dist
    pwd
    ls -la
fi