import { Component, Input, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { LikeService } from '../../services/like.service';
import { ServiceAuthentificationUtilisateur } from '../../services/service-authentification-utilisateur';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-composant-carte-produit',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './composant-carte-produit.component.html',
  styleUrls: ['./composant-carte-produit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantCarteProduit implements OnInit {
  @Input() produit!: ProduitAlimentaireDTO;
  isLiked = false;
  estAdmin = false;

  constructor(
    private router: Router,
    private likeService: LikeService,
    private authService: ServiceAuthentificationUtilisateur,
    private produitService: ServiceProduitsAlimentaires,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.isLiked = this.likeService.isLiked(this.produit.id);
    this.estAdmin = this.authService.estAdmin();
    
    // S'abonner aux changements de likes
    this.likeService.likedProducts$.subscribe(likedProducts => {
      this.isLiked = likedProducts.includes(this.produit.id);
    });
    
    // S'abonner aux changements d'authentification pour mettre à jour le statut admin
    this.authService.utilisateurConnecte$.subscribe(user => {
      this.estAdmin = user ? user.role === 'admin' : false;
    });
  }

  obtenirCouleurNutriScore(): string {
    const score = this.produit.nutriscore_score;
    if (score === undefined) return '#ffffff';
    if (score <= -2) return '#008000'; // A: Vert
    if (score <= 3) return '#90EE90'; // B: Vert clair
    if (score <= 11) return '#FFFF00'; // C: Jaune
    if (score <= 16) return '#FFA500'; // D: Orange
    return '#FF0000'; // E: Rouge
  }

  toggleLike(event: Event) {
    event.stopPropagation(); // Empêche la navigation vers le détail
    this.likeService.toggleLike(this.produit.id, this.produit.name);
  }

  supprimerProduit(event: Event) {
    event.stopPropagation(); // Empêche la navigation vers le détail
    
    if (!this.estAdmin) {
      this.snackBar.open('Accès refusé : privilèges administrateur requis', 'Fermer', {
        duration: 3000,
        panelClass: 'toaster-error'
      });
      return;
    }

    // Demander confirmation
    if (confirm(`Êtes-vous sûr de vouloir supprimer le produit "${this.produit.name}" ?\n\nCette action est irréversible.`)) {
      console.log(`🗑️ Suppression confirmée pour: ${this.produit.name} (${this.produit.id})`);
      
      this.produitService.supprimerProduit(this.produit.id).subscribe({
        next: (response) => {
          console.log('✅ Produit supprimé avec succès:', response);
          
          this.snackBar.open(`Produit "${this.produit.name}" supprimé avec succès`, 'Fermer', {
            duration: 4000,
            panelClass: 'toaster-success'
          });
          
          // Recharger la liste des produits après suppression
          // Emettre un événement pour recharger la liste ou rafraîchir la page
          window.location.reload();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          
          let messageErreur = 'Erreur lors de la suppression du produit';
          if (error.status === 403) {
            messageErreur = 'Accès refusé : privilèges administrateur requis';
          } else if (error.status === 404) {
            messageErreur = 'Produit non trouvé';
          }
          
          this.snackBar.open(messageErreur, 'Fermer', {
            duration: 5000,
            panelClass: 'toaster-error'
          });
        }
      });
    } else {
      console.log('🚫 Suppression annulée par l\'utilisateur');
    }
  }

  naviguerVersDetails() {
    console.log('Navigation vers produit:', this.produit.id);
    this.router.navigate(['/produit', this.produit.id]);
  }
}