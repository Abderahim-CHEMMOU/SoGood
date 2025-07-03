export const environment = {
  production: false,
  api: {
    baseUrl: 'http://localhost:3000',
    endpoints: {
      auth: {
        login: '/auth/login',
        register: '/auth/register'
      },
      products: '/products'
    }
  },
  openai: {
    // ⚠️ ATTENTION : NE JAMAIS mettre une vraie clé API ici !
    // C'est visible par tous dans le navigateur
    apiKey: 'DEMO_MODE', // Mode démo - utilise l'analyse locale
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  cache: {
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    aiAnalysisTTL: 7 * 24 * 60 * 60 * 1000 // 7 jours pour les analyses AI
  }
};