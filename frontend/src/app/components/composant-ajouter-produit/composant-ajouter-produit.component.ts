import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ServiceProduitsAlimentaires } from '../../services/service-produits-alimentaires';
import { ServiceAuthentificationUtilisateur } from '../../services/service-authentification-utilisateur';

@Component({
  selector: 'app-composant-ajouter-produit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './composant-ajouter-produit.component.html',
  styleUrls: ['./composant-ajouter-produit.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComposantAjouterProduit {
  formulaireProduit!: FormGroup; // Utiliser ! pour indiquer qu'il sera initialisé
  chargementEnCours = false;
  estAdmin = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private produitService: ServiceProduitsAlimentaires,
    private authService: ServiceAuthentificationUtilisateur,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    // Vérifier que l'utilisateur est admin
    this.estAdmin = this.authService.estAdmin();
    
    if (!this.estAdmin) {
      this.snackBar.open('Accès refusé : privilèges administrateur requis', 'Fermer', {
        duration: 3000,
        panelClass: 'toaster-error'
      });
      this.router.navigate(['/']);
      return;
    }

    // Créer le formulaire
    this.formulaireProduit = this.fb.group({
      // Champs obligatoires
      product_name: ['', [Validators.required, Validators.minLength(2)]],
      brands: ['', [Validators.required]],
      
      // Informations nutritionnelles (pour 100g)
      energy_kcal_100g: [0, [Validators.min(0), Validators.max(1000)]],
      proteins_100g: [0, [Validators.min(0), Validators.max(100)]],
      carbohydrates_100g: [0, [Validators.min(0), Validators.max(100)]],
      sugars_100g: [0, [Validators.min(0), Validators.max(100)]],
      fat_100g: [0, [Validators.min(0), Validators.max(100)]],
      saturated_fat_100g: [0, [Validators.min(0), Validators.max(100)]],
      fiber_100g: [0, [Validators.min(0), Validators.max(100)]],
      salt_100g: [0, [Validators.min(0), Validators.max(50)]],
      
      // Scores
      nutriscore_score: [0, [Validators.min(-15), Validators.max(40)]],
      ecoscore_score: [0, [Validators.min(0), Validators.max(100)]],
      ecoscore_grade: [''],
      
      // Informations optionnelles
      quantity: [''],
      categories_en: [''],
      countries_en: [''],
      main_category_en: [''],
      food_groups_en: [''],
      
      // Additifs
      additives_n: [0, [Validators.min(0)]],
      additives_en: ['']
    });
  }

  onSubmit() {
    if (this.formulaireProduit.invalid) {
      this.marquerTousLesChamps();
      this.snackBar.open('Veuillez corriger les erreurs dans le formulaire', 'Fermer', {
        duration: 3000,
        panelClass: 'toaster-error'
      });
      return;
    }

    this.chargementEnCours = true;
    this.cdr.detectChanges();

    const formData = this.formulaireProduit.value;
    
    // Préparer les données pour l'API
    const produitData = {
      ...formData,
      // Champs de compatibilité
      name: formData.product_name,
      brand: formData.brands,
      categories: formData.categories_en,
      calories: formData.energy_kcal_100g,
      protein_100g: formData.proteins_100g,
      
      // Convertir les additifs en tableau si nécessaire
      additives: formData.additives_en ? formData.additives_en.split(',').map((a: string) => a.trim()) : []
    };

    console.log('📤 Données à envoyer:', produitData);

    this.produitService.ajouterProduit(produitData).subscribe({
      next: (response) => {
        console.log('✅ Produit ajouté avec succès:', response);
        
        this.snackBar.open(`Produit "${formData.product_name}" ajouté avec succès`, 'Fermer', {
          duration: 4000,
          panelClass: 'toaster-success'
        });
        
        // Retourner à la liste des produits
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'ajout:', error);
        
        let messageErreur = 'Erreur lors de l\'ajout du produit';
        if (error.status === 400) {
          messageErreur = 'Données invalides. Vérifiez le formulaire.';
        } else if (error.status === 403) {
          messageErreur = 'Accès refusé : privilèges administrateur requis';
        }
        
        this.snackBar.open(messageErreur, 'Fermer', {
          duration: 5000,
          panelClass: 'toaster-error'
        });
        
        this.chargementEnCours = false;
        this.cdr.detectChanges();
      }
    });
  }

  retournerALaListe() {
    this.router.navigate(['/']);
  }

  private marquerTousLesChamps() {
    Object.keys(this.formulaireProduit.controls).forEach(key => {
      this.formulaireProduit.get(key)?.markAsTouched();
    });
    this.cdr.detectChanges();
  }

  // Méthodes utilitaires pour la validation
  estChampsInvalide(nomChamp: string): boolean {
    const champ = this.formulaireProduit.get(nomChamp);
    return !!(champ && champ.invalid && (champ.dirty || champ.touched));
  }

  obtenirMessageErreur(nomChamp: string): string {
    const champ = this.formulaireProduit.get(nomChamp);
    if (champ?.errors) {
      if (champ.errors['required']) return 'Ce champ est obligatoire';
      if (champ.errors['minlength']) return `Minimum ${champ.errors['minlength'].requiredLength} caractères`;
      if (champ.errors['min']) return `Valeur minimum: ${champ.errors['min'].min}`;
      if (champ.errors['max']) return `Valeur maximum: ${champ.errors['max'].max}`;
    }
    return '';
  }
}