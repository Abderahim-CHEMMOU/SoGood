import { Component, ChangeDetectionStrategy } from '@angular/core';
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
  emailConnexion = '';
  motDePasseConnexion = '';
  emailInscription = '';
  motDePasseInscription = '';

  constructor(
    private authService: ServiceAuthentificationUtilisateur,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  connecterUtilisateur() {
    this.authService.connecterUtilisateur(this.emailConnexion, this.motDePasseConnexion)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.snackBar.open('Erreur de connexion', 'Fermer', { duration: 3000 })
      });
  }

  inscrireUtilisateur() {
    this.authService.inscrireUtilisateur(this.emailInscription, this.motDePasseInscription)
      .subscribe({
        next: () => this.router.navigate(['/']),
        error: () => this.snackBar.open('Erreur d\'inscription', 'Fermer', { duration: 3000 })
      });
  }

  retournerAccueil() {
  this.router.navigate(['/']);
}
}