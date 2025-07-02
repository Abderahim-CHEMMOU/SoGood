const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Secret JWT (à mettre dans les variables d'environnement)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET should be at least 32 characters long');
  process.exit(1);
}

class AuthController {
  
  // Générer un token JWT
  static generateToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // POST /auth/register - Créer un compte
  static async register(req, res) {
    try {
      const { username, email, password, confirmPassword } = req.body;

      // Validation des champs
      if (!username || !email || !password) {
        return res.status(400).json({
          error: 'Username, email and password are required'
        });
      }

      // Vérifier que les mots de passe correspondent
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: 'Passwords do not match'
        });
      }

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User with this email or username already exists'
        });
      }

      // Créer le nouvel utilisateur
      const newUser = new User({
        username,
        email,
        password
      });

      await newUser.save();

      // Générer le token
      const token = AuthController.generateToken(newUser._id);

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: newUser.toSafeObject()
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          details: Object.values(error.errors).map(err => err.message)
        });
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /auth/login - Connexion
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation des champs
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // Trouver l'utilisateur
      const user = await User.findOne({ email });
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Vérifier le mot de passe
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Générer le token
      const token = AuthController.generateToken(user._id);

      res.json({
        message: 'Login successful',
        token,
        user: user.toSafeObject()
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST /auth/logout - Déconnexion
  static async logout(req, res) {
    try {
      // Note: Avec JWT, la déconnexion côté serveur est optionnelle
      // Le client doit supprimer le token de son stockage local
      
      res.json({
        message: 'Logout successful. Please remove the token from client storage.'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // GET /auth/me - Profil utilisateur
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: user.toSafeObject()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = AuthController;