require('dotenv').config(); // Charger les variables d'environnement
const mongoose = require('mongoose');
const User = require('../models/User');

// Connexion Mongo
const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/food';

const createAdmin = async () => {
  try {
    // Vérifier que toutes les variables d'environnement sont présentes
    const requiredEnvVars = {
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_EMAIL: process.env.ADMIN_EMAIL,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD
    };

    // Validation des variables d'environnement
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\n💡 Please add them to your .env file');
      process.exit(1);
    }

    // Connexion à MongoDB
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('📡 Connected to MongoDB');

    // Données admin depuis les variables d'environnement
    const adminData = {
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin'
    };

    // Vérifier si l'admin existe déjà
    const existingAdmin = await User.findOne({ 
      $or: [
        { email: adminData.email },
        { username: adminData.username }
      ]
    });

    if (existingAdmin) {
      console.log('❌ Admin with this email or username already exists');
      console.log(`   📧 Email: ${existingAdmin.email}`);
      console.log(`   👤 Username: ${existingAdmin.username}`);
      process.exit(1);
    }

    // Validation des données
    if (adminData.password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Créer l'admin
    const admin = new User(adminData);
    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log('👤 Username:', adminData.username);
    console.log('📧 Email:', adminData.email);
    console.log('🔐 Role: admin');
    console.log('⚠️  Password is set from environment variable');
    console.log('🚨 Please ensure your .env file is secure and not committed to git!');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('📋 Validation details:');
      Object.values(error.errors).forEach(err => {
        console.error(`   - ${err.path}: ${err.message}`);
      });
    }
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();