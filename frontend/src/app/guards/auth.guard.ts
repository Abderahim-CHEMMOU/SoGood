import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isConnected = this.authService.estConnecte();
    const currentUrl = state.url;

    console.log(`🛡️ AuthGuard - URL: ${currentUrl}, Connecté: ${isConnected}`);

    if (isConnected) {
      console.log('✅ Utilisateur connecté, accès autorisé');
      return true;
    } else {
      console.log('❌ Utilisateur non connecté, redirection vers /authentification');
      this.router.navigate(['/authentification'], { 
        queryParams: { returnUrl: currentUrl } 
      });
      return false;
    }
  }
}