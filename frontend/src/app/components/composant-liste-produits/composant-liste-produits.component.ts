import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComposantCarteProduit } from '../composant-carte-produit/composant-carte-produit.component';
import { ProduitService } from '../../services/produit.service';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-composant-liste-produits',
  standalone: true,
  imports: [CommonModule, ComposantCarteProduit],
  template: `
    <div *ngIf="chargementEnCours">Chargement...</div>
    <div *ngIf="!chargementEnCours && produitsFiltres.length === 0">Aucun produit trouvé.</div>
    <div *ngIf="!chargementEnCours && produitsFiltres.length > 0">
      <app-composant-carte-produit
        *ngFor="let produit of produitsFiltres"
        [produit]="produit">
      </app-composant-carte-produit>
    </div>
  `,
  styleUrls: ['./composant-liste-produits.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantListeProduits implements OnInit, OnDestroy {
  produitsFiltres: ProduitAlimentaireDTO[] = [];
  chargementEnCours = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private produitService: ProduitService,
    private serviceProduitsAlimentaires: ServiceProduitsAlimentaires,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🏠 ComposantListeProduits: Initialisation');
    
    // S'abonner aux produits filtrés du ProduitService
    const filteredSub = this.produitService.produitsFiltres$.subscribe(produits => {
      console.log('📦 ComposantListeProduits: Produits filtrés reçus:', produits.length);
      this.produitsFiltres = produits;
      this.cdr.detectChanges();
    });

    // Charger tous les produits au démarrage
    this.chargerTousLesProduits();
    
    this.subscriptions.push(filteredSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private chargerTousLesProduits() {
    console.log('🔄 Chargement de tous les produits...');
    this.chargementEnCours = true;
    this.cdr.detectChanges();

    const loadSub = this.serviceProduitsAlimentaires.rechercherProduits('', 1).subscribe({
      next: (produits) => {
        console.log('✅ Produits chargés:', produits.length);
        this.produitService.mettreAJourProduitsFiltres(produits);
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement produits:', error);
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      }
    });

    this.subscriptions.push(loadSub);
  }
}