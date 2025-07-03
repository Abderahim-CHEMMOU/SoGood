export const environment = {
  production: true,
  api: {
    // En production Docker, le backend sera accessible via le proxy Nginx
    baseUrl: '/api', // Nginx redirigera /api/* vers le backend
    endpoints: {
      auth: {
        login: '/auth/login',
        register: '/auth/register'
      },
      products: '/products'
    }
  },
  openai: {
    // En production, utilisez des variables d'environnement sécurisées
    apiKey: 'DEMO_MODE', // Mode démo en production
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  cache: {
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    aiAnalysisTTL: 7 * 24 * 60 * 60 * 1000 // 7 jours pour les analyses AI
  }
};