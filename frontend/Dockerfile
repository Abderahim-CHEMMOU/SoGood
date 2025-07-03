# Utiliser l'image Node.js officielle comme base
FROM node:18-alpine AS build

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration du package
COPY package.json package-lock.json ./

# Installer TOUTES les dépendances (dev + prod pour le build)
RUN npm ci

# Copier tout le code source
COPY . .

# Construire l'application Angular en mode production
RUN npm run build

# Étape 2: Servir l'application avec Nginx
FROM nginx:alpine

# Supprimer toutes les configurations par défaut
RUN rm -rf /etc/nginx/conf.d/*
RUN rm -f /etc/nginx/nginx.conf

# Copier notre configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/nginx.conf

# CORRECTION : Copier depuis dist/frontend/browser/ (le bon chemin !)
COPY --from=build /app/dist/frontend/browser/ /usr/share/nginx/html/

# Exposer le port 80
EXPOSE 80

# Commande par défaut pour démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]