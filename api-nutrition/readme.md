# Commandes importantes

```bash
# démarrer le backend
docker-compose up -d --build

# créer un compte admin
docker exec -it api-nutrition node scripts/createAdmin.js

# importer les données depuis le csv vers mongoDB
docker exec -it api-nutrition node scripts/import_csv.js
```