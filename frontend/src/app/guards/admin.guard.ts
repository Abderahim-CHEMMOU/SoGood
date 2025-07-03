import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServiceAuthentificationUtilisateur } from '../services/service-authentification-utilisateur';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const isConnected = this.authService.estConnecte();
    const isAdmin = this.authService.estAdmin();
    const user = this.authService.obtenirUtilisateurConnecte();
    const currentUrl = state.url;

    console.log(`🛡️ AdminGuard - URL: ${currentUrl}`);
    console.log(`👤 Utilisateur: ${user?.username || 'Non connecté'}`);
    console.log(`🔐 Connecté: ${isConnected}, Admin: ${isAdmin}`);

    if (!isConnected) {
      console.log('❌ Utilisateur non connecté, redirection vers /authentification');
      this.snackBar.open('Veuillez vous connecter pour accéder à cette page', 'Fermer', {
        duration: 4000,
        panelClass: 'toaster-error'
      });
      
      this.router.navigate(['/authentification'], { 
        queryParams: { returnUrl: currentUrl } 
      });
      return false;
    }

    if (!isAdmin) {
      console.log('❌ Utilisateur connecté mais pas admin, accès refusé');
      this.snackBar.open('Accès refusé : privilèges administrateur requis', 'Fermer', {
        duration: 4000,
        panelClass: 'toaster-error'
      });
      
      this.router.navigate(['/']);
      return false;
    }

    console.log('✅ Utilisateur admin connecté, accès autorisé');
    return true;
  }
}