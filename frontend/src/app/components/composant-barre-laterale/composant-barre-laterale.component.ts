// composant-barre-laterale.component.ts - Version corrigée avec ranges
import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-composant-barre-laterale',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './composant-barre-laterale.component.html',
  styleUrls: ['./composant-barre-laterale.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantBarreLaterale {
  @Output() filtrerCategorie = new EventEmitter<ProduitAlimentaireDTO[]>();

  constructor(
    private serviceProduits: ServiceProduitsAlimentaires,
    private router: Router
  ) {}

  naviguerVersFavoris() {
    console.log('🎯 Navigation vers favoris');
    this.router.navigate(['/favoris']);
  }

  filtrerParCategorie(categorie: 'sains' | 'moderes' | 'dangereux') {
    const range = this.serviceProduits.obtenirRangeCategorie(categorie);
    console.log(`🏷️ Filtrage par catégorie: ${categorie} (score ${range.min} à ${range.max})`);
    
    // Naviguer d'abord vers la page principale si on n'y est pas
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
    
    // Utiliser le service pour filtrer par catégorie avec l'API
    this.serviceProduits.rechercherProduitsParCategorie(categorie).subscribe({
      next: (produitsFiltres) => {
        console.log(`✅ Produits filtrés pour ${categorie}:`, produitsFiltres.length);
        console.log(`📊 Scores des produits:`, produitsFiltres.slice(0, 5).map(p => ({ 
          name: p.name, 
          score: p.nutriscore_score 
        })));
        this.filtrerCategorie.emit(produitsFiltres);
      },
      error: (error) => {
        console.error(`❌ Erreur filtrage ${categorie}:`, error);
        this.filtrerCategorie.emit([]);
      }
    });
  }

  // Méthode utilitaire pour obtenir la description du range
  obtenirDescriptionCategorie(categorie: 'sains' | 'moderes' | 'dangereux'): string {
    const range = this.serviceProduits.obtenirRangeCategorie(categorie);
    
    switch (categorie) {
      case 'sains':
        return `Produits Sains (Score ${range.min} à ${range.max})`;
      case 'moderes':
        return `Produits Modérés (Score ${range.min} à ${range.max})`;
      case 'dangereux':
        return `Produits Dangereux (Score ${range.min} à ${range.max})`;
    }
  }
}