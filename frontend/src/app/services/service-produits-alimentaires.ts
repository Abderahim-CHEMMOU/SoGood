import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ServiceProduitsAlimentaires {
  constructor(private snackBar: MatSnackBar) {}

  private mockProduits: ProduitAlimentaireDTO[] = [
    { id: '1', nom: 'Pomme', marque: 'Nature', calories: 52, sucres: 10, sel: 0, graissesSaturees: 0, fibres: 2.4, proteines: 0.3, scoreNutriScore: -5 },
    { id: '2', nom: 'Banane', marque: 'Bio', calories: 89, sucres: 12, sel: 0, graissesSaturees: 0.1, fibres: 2.6, proteines: 1.1, scoreNutriScore: -2 },
    { id: '3', nom: 'Pizza', marque: 'Dr. Oetker', calories: 266, sucres: 4, sel: 1.2, graissesSaturees: 5, fibres: 1.5, proteines: 9, scoreNutriScore: 8 },
    { id: '4', nom: 'Chocolat', marque: 'Lindt', calories: 550, sucres: 50, sel: 0.1, graissesSaturees: 20, fibres: 3, proteines: 7, scoreNutriScore: 18 },
    { id: '5', nom: 'Soda', marque: 'Coca-Cola', calories: 140, sucres: 39, sel: 0.01, graissesSaturees: 0, fibres: 0, proteines: 0, scoreNutriScore: 20 }
  ];

  private validerDonneesProduit(produit: ProduitAlimentaireDTO): boolean {
    if (!produit.nom || typeof produit.nom !== 'string' || produit.nom.trim() === '') {
      this.snackBar.open('Nom du produit invalide', 'Fermer', { duration: 3000 });
      return false;
    }
    if (typeof produit.calories !== 'number' || produit.calories < 0 || isNaN(produit.calories)) {
      this.snackBar.open('Calories invalides', 'Fermer', { duration: 3000 });
      return false;
    }
    return true;
  }

  rechercherProduits(nom: string): Observable<ProduitAlimentaireDTO[]> {
    const produitsFiltres = this.mockProduits
      .filter(produit => this.validerDonneesProduit(produit) && (!nom || produit.nom.toLowerCase().includes(nom.toLowerCase())))
      .slice(0, 5);
    return of(produitsFiltres);
  }

  obtenirProduitParId(id: string): Observable<ProduitAlimentaireDTO | null> {
    const produit = this.mockProduits.find(p => p.id === id) || null;
    return of(produit);
  }
}