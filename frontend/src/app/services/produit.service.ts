import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProduitAlimentaireDTO } from '../models/produit-alimentaire.dto';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  private produitsFiltresSubject = new BehaviorSubject<ProduitAlimentaireDTO[]>([]);
  produitsFiltres$ = this.produitsFiltresSubject.asObservable();

  mettreAJourProduitsFiltres(produits: ProduitAlimentaireDTO[]) {
    console.log('ProduitService: Mise à jour des produits filtrés:', produits); // Débogage
    this.produitsFiltresSubject.next(produits);
  }
}