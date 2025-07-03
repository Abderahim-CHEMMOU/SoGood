import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComposantCarteProduit } from '../composant-carte-produit/composant-carte-produit.component';
import { ProduitService } from '../../services/produit.service';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-composant-liste-produits',
  standalone: true,
  imports: [CommonModule, ComposantCarteProduit],
  template: `
    <div class="produits-liste">
      <h2>Produits</h2>
      <app-composant-carte-produit *ngFor="let produit of produitsFiltres" [produit]="produit"></app-composant-carte-produit>
      <p *ngIf="produitsFiltres.length === 0">Aucun produit trouvé.</p>
    </div>
  `,
  styles: [`
    .produits-liste {
      margin-top: 20px;
    }

    .produits-liste h2 {
      font-size: 1.5em;
      margin-bottom: 10px;
    }

    .produits-liste app-composant-carte-produit {
      display: block;
      margin: 10px auto;
      max-width: 500px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantListeProduits implements OnInit, OnDestroy {
  produitsFiltres: ProduitAlimentaireDTO[] = [];
  private subscription?: Subscription;

  constructor(
    private produitService: ProduitService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subscription = this.produitService.produitsFiltres$.subscribe(produits => {
      console.log('ComposantListeProduits: Produits filtrés reçus:', produits);
      this.produitsFiltres = produits;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}