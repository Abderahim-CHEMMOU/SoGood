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

  private getProduits(): ProduitAlimentaireDTO[] {
    return (this.serviceProduits as any).mockProduits || [];
  }

  naviguerVersFavoris() {
    console.log('Navigation vers favoris');
    this.router.navigate(['/favoris']);
  }

  filtrerParCategorie(categorie: 'sains' | 'moderes' | 'dangereux') {
    // Naviguer d'abord vers la page principale si on n'y est pas
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
    
    const produits = this.getProduits();
    let produitsFiltres: ProduitAlimentaireDTO[] = [];

    if (categorie === 'sains') {
      produitsFiltres = produits.filter(p => p.scoreNutriScore !== undefined && p.scoreNutriScore <= 3);
    } else if (categorie === 'moderes') {
      produitsFiltres = produits.filter(p => p.scoreNutriScore !== undefined && p.scoreNutriScore > 3 && p.scoreNutriScore <= 11);
    } else {
      produitsFiltres = produits.filter(p => p.scoreNutriScore !== undefined && p.scoreNutriScore > 11);
    }

    console.log(`Produits filtrés pour ${categorie}:`, produitsFiltres);
    this.filtrerCategorie.emit(produitsFiltres);
  }
}