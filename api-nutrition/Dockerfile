FROM node:18

# Définir le dossier de travail
WORKDIR /app

# Copier package.json et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste du code
COPY . .

# Exposer le port de l'API
EXPOSE 3000

# Lancer le serveur Node
CMD ["node", "server.js"]
