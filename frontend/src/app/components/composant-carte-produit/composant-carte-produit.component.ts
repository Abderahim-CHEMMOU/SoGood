import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LikeService } from '../../services/like.service';


@Component({
  selector: 'app-composant-carte-produit',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './composant-carte-produit.component.html',
  styleUrls: ['./composant-carte-produit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantCarteProduit {
  @Input() produit!: ProduitAlimentaireDTO;
   isLiked = false;

  constructor(private router: Router, private likeService: LikeService) {}

    ngOnInit() {
    this.isLiked = this.likeService.isLiked(this.produit.id);
    
    // S'abonner aux changements de likes
    this.likeService.likedProducts$.subscribe(likedProducts => {
      this.isLiked = likedProducts.includes(this.produit.id);
    });
  }

  toggleLike(event: Event) {
    event.stopPropagation(); // Empêche la navigation vers le détail
    this.likeService.toggleLike(this.produit.id, this.produit.nom);
  }

  obtenirCouleurNutriScore(): string {
    const score = this.produit.scoreNutriScore;
    if (score === undefined) return '#ffffff';
    if (score <= -2) return '#008000'; // A: Vert
    if (score <= 3) return '#90EE90'; // B: Vert clair
    if (score <= 11) return '#FFFF00'; // C: Jaune
    if (score <= 16) return '#FFA500'; // D: Orange
    return '#FF0000'; // E: Rouge
  }

  naviguerVersDetails() {
    console.log('Navigation vers produit:', this.produit.id); // Débogage
    this.router.navigate(['/produit', this.produit.id]);
  }
}