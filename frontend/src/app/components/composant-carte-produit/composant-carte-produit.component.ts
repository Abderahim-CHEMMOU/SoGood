import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

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