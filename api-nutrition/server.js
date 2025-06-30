const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion MongoDB
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/food';

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connexion MongoDB réussie"))
.catch(err => {
  console.error("❌ Erreur de connexion MongoDB :", err.message);
  process.exit(1);
});

// Routes
app.use('/products', productRoutes);

// Route racine pour test
app.get('/', (req, res) => {
  res.send("🚀 API Nutrition - SoGood est en ligne !");
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Serveur Node lancé sur http://localhost:${PORT}`);
});
