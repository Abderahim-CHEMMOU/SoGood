import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(ServiceAuthentificationUtilisateur);
  
  // Récupérer le token JWT
  const token = authService.obtenirToken();
  
  console.log('🔐 Intercepteur fonctionnel - URL:', req.url);
  console.log('🔐 Intercepteur fonctionnel - Token disponible:', !!token);
  
  // Si on a un token et que la requête va vers notre API
  if (token && req.url.includes('localhost:3000')) {
    console.log('✅ Ajout du token JWT à la requête:', req.url);
    console.log('🔑 Token (début):', token.substring(0, 50) + '...');
    
    // Cloner la requête et ajouter l'en-tête Authorization
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return next(authReq);
  }
  
  // Pour les requêtes d'authentification (login/register), pas besoin de token
  if (req.url.includes('/auth/')) {
    console.log('🔓 Requête d\'authentification, pas de token requis');
    return next(req);
  }
  
  console.log('⚠️ Requête sans token:', req.url);
  return next(req);
};