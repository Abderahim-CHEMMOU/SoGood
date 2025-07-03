import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ServiceAuthentificationUtilisateur } from '../../services/service-authentification-utilisateur';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-composant-authentification',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatTabsModule, MatSnackBarModule, FormsModule, CommonModule],
  templateUrl: './composant-authentification.component.html',
  styleUrls: ['./composant-authentification.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantAuthentification {
  // Données de connexion
  emailConnexion = '';
  motDePasseConnexion = '';
  
  // Données d'inscription
  usernameInscription = '';
  emailInscription = '';
  motDePasseInscription = '';
  confirmationMotDePasse = '';
  
  // États de chargement
  chargementConnexion = false;
  chargementInscription = false;

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  connecterUtilisateur() {
    if (!this.emailConnexion || !this.motDePasseConnexion) {
      this.snackBar.open('Veuillez remplir tous les champs', 'Fermer', { duration: 3000 });
      return;
    }

    this.chargementConnexion = true;
    this.cdr.detectChanges();

    this.authService.connecterUtilisateur(this.emailConnexion, this.motDePasseConnexion)
      .subscribe({
        next: (response) => {
          console.log('✅ Connexion réussie:', response.user.username);
          this.snackBar.open(`Bienvenue ${response.user.username} !`, 'Fermer', { 
            duration: 3000,
            panelClass: 'toaster-success'
          });
          this.router.navigate(['/']);
        },
        error: (error) => {
          console.error('❌ Erreur connexion:', error);
          this.snackBar.open(error.message || 'Erreur de connexion', 'Fermer', { 
            duration: 5000,
            panelClass: 'toaster-error'
          });
          this.chargementConnexion = false;
          this.cdr.detectChanges();
        }
      });
  }

  inscrireUtilisateur() {
    // Validation
    if (!this.usernameInscription || !this.emailInscription || !this.motDePasseInscription || !this.confirmationMotDePasse) {
      this.snackBar.open('Veuillez remplir tous les champs', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.motDePasseInscription !== this.confirmationMotDePasse) {
      this.snackBar.open('Les mots de passe ne correspondent pas', 'Fermer', { duration: 3000 });
      return;
    }

    if (this.motDePasseInscription.length < 6) {
      this.snackBar.open('Le mot de passe doit contenir au moins 6 caractères', 'Fermer', { duration: 3000 });
      return;
    }

    this.chargementInscription = true;
    this.cdr.detectChanges();

    this.authService.inscrireUtilisateur(
      this.usernameInscription,
      this.emailInscription,
      this.motDePasseInscription,
      this.confirmationMotDePasse
    ).subscribe({
      next: (response) => {
        console.log('✅ Inscription réussie:', response.user.username);
        this.snackBar.open(`Compte créé avec succès ! Bienvenue ${response.user.username} !`, 'Fermer', { 
          duration: 3000,
          panelClass: 'toaster-success'
        });
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('❌ Erreur inscription:', error);
        this.snackBar.open(error.message || 'Erreur d\'inscription', 'Fermer', { 
          duration: 5000,
          panelClass: 'toaster-error'
        });
        this.chargementInscription = false;
        this.cdr.detectChanges();
      }
    });
  }

  retournerAccueil() {
    this.router.navigate(['/']);
  }
}