import { Component, EventEmitter, Output, ChangeDetectionStrategy } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ProduitAlimentaireDTO } from '../../models/produit-alimentaire.dto';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-composant-barre-recherche',
  standalone: true,
  imports: [MatInputModule, MatFormFieldModule, FormsModule],
  templateUrl: './composant-barre-recherche.component.html',
  styleUrls: ['./composant-barre-recherche.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantBarreRecherche {
  @Output() recherche = new EventEmitter<ProduitAlimentaireDTO[]>();
  termeRecherche = '';
  private sujetRecherche = new Subject<string>();

  constructor(private serviceProduits: ServiceProduitsAlimentaires) {
    this.sujetRecherche.pipe(debounceTime(300)).subscribe(terme => this.effectuerRecherche(terme));
  }

  onChangementRecherche(terme: string) {
    this.sujetRecherche.next(terme);
  }

  private effectuerRecherche(terme: string) {
    this.serviceProduits.rechercherProduits(terme).subscribe(produits => {
      this.recherche.emit(produits);
    });
  }
}