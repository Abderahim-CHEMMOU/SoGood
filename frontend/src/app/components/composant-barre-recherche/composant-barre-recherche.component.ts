import { Component, EventEmitter, Output, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { debounceTime, Subject, switchMap, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-composant-barre-recherche',
  standalone: true,
  imports: [MatInputModule, MatFormFieldModule, FormsModule],
  templateUrl: './composant-barre-recherche.component.html',
  styleUrls: ['./composant-barre-recherche.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantBarreRecherche implements OnDestroy {
  @Output() recherche = new EventEmitter<ProduitAlimentaireDTO[]>();
  termeRecherche = '';
  private sujetRecherche = new Subject<string>();
  private subscription?: Subscription;

  constructor(private serviceProduits: ServiceProduitsAlimentaires) {
    // Configuration de la recherche avec debounce et distinctUntilChanged
    this.subscription = this.sujetRecherche.pipe(
      debounceTime(500), // Attendre 500ms après la dernière frappe
      distinctUntilChanged(), // Éviter les doublons
      switchMap(terme => {
        console.log(`🔍 Recherche API pour: "${terme}"`);
        
        // Si le terme est vide, charger tous les produits
        if (!terme || terme.trim() === '') {
          return this.serviceProduits.rechercherProduits('', 1);
        }
        
        // Sinon, faire la recherche
        return this.serviceProduits.rechercherProduits(terme.trim(), 1);
      })
    ).subscribe({
      next: (produits) => {
        console.log(`✅ Résultats de recherche pour "${this.termeRecherche}":`, produits.length, 'produits');
        this.recherche.emit(produits);
      },
      error: (error) => {
        console.error('❌ Erreur recherche:', error);
        this.recherche.emit([]);
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onChangementRecherche(terme: string) {
    console.log(`🔍 Terme de recherche changé: "${terme}"`);
    this.sujetRecherche.next(terme);
  }

  // Méthode pour vider la recherche
  viderRecherche() {
    this.termeRecherche = '';
    this.sujetRecherche.next('');
  }
}