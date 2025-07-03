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
import { ProduitAlimentaireDetailDTO } from '../../models/produit-alimentaire.dto';

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
  formulaireProduit!: FormGroup;
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

    // Créer le formulaire avec les champs requis par l'API NutriScore
    this.formulaireProduit = this.fb.group({
      // Champs obligatoires pour l'API NutriScore
      product_name: ['', [Validators.required, Validators.minLength(2)]],
      brands: ['', [Validators.required]],
      
      // Valeurs nutritionnelles obligatoires pour la prédiction (pour 100g)
      energy_kcal_100g: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
      fat_100g: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      saturated_fat_100g: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      sugars_100g: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      salt_100g: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
      fiber_100g: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      proteins_100g: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      
      // Champs optionnels pour la prédiction
      fruits_vegetables_nuts_100g: [0, [Validators.min(0), Validators.max(100)]],
      categories_en: [''],
      
      // Autres champs du formulaire (optionnels pour sauvegarde complète)
      generic_name: [''],
      quantity: [''],
      origins_en: [''],
      countries_en: [''],
      traces_en: [''],
      main_category_en: [''],
      food_groups_en: [''],
      carbohydrates_100g: [0, [Validators.min(0), Validators.max(100)]],
      
      // Valeurs nutritionnelles étendues
      cholesterol_100g: [0, [Validators.min(0), Validators.max(1000)]],
      monounsaturated_fat_100g: [0, [Validators.min(0), Validators.max(100)]],
      polyunsaturated_fat_100g: [0, [Validators.min(0), Validators.max(100)]],
      trans_fat_100g: [0, [Validators.min(0), Validators.max(100)]],
      sodium_100g: [0, [Validators.min(0), Validators.max(5000)]],
      
      // Vitamines et minéraux
      vitamin_a_100g: [0, [Validators.min(0), Validators.max(10000)]],
      vitamin_c_100g: [0, [Validators.min(0), Validators.max(1000)]],
      potassium_100g: [0, [Validators.min(0), Validators.max(10000)]],
      calcium_100g: [0, [Validators.min(0), Validators.max(2000)]],
      iron_100g: [0, [Validators.min(0), Validators.max(100)]],
      
      // Scores (nutriscore_score sera calculé par l'API)
      ecoscore_score: [0, [Validators.min(0), Validators.max(100)]],
      ecoscore_grade: [''],
      nutrition_score_fr_100g: [0, [Validators.min(-15), Validators.max(40)]],
      
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
    
    // Préparer les données pour l'API de prédiction NutriScore
    const produitData = {
      // Champs obligatoires pour l'API
      product_name: formData.product_name,
      brands: formData.brands,
      energy_kcal_100g: parseFloat(formData.energy_kcal_100g) || 0,
      fat_100g: parseFloat(formData.fat_100g) || 0,
      saturated_fat_100g: parseFloat(formData.saturated_fat_100g) || 0,
      sugars_100g: parseFloat(formData.sugars_100g) || 0,
      salt_100g: parseFloat(formData.salt_100g) || 0,
      fiber_100g: parseFloat(formData.fiber_100g) || 0,
      proteins_100g: parseFloat(formData.proteins_100g) || 0,
      
      // Champs optionnels pour la prédiction
      fruits_vegetables_nuts_100g: parseFloat(formData.fruits_vegetables_nuts_100g) || 0,
      categories_en: formData.categories_en || null,
      
      // Autres champs pour sauvegarde complète
      generic_name: formData.generic_name || null,
      quantity: formData.quantity || null,
      origins_en: formData.origins_en || null,
      countries_en: formData.countries_en || null,
      traces_en: formData.traces_en || null,
      main_category_en: formData.main_category_en || null,
      food_groups_en: formData.food_groups_en || null,
      carbohydrates_100g: parseFloat(formData.carbohydrates_100g) || 0,
      
      // Valeurs nutritionnelles étendues
      cholesterol_100g: parseFloat(formData.cholesterol_100g) || 0,
      monounsaturated_fat_100g: parseFloat(formData.monounsaturated_fat_100g) || 0,
      polyunsaturated_fat_100g: parseFloat(formData.polyunsaturated_fat_100g) || 0,
      trans_fat_100g: parseFloat(formData.trans_fat_100g) || 0,
      sodium_100g: parseFloat(formData.sodium_100g) || 0,
      
      // Vitamines et minéraux
      vitamin_a_100g: parseFloat(formData.vitamin_a_100g) || 0,
      vitamin_c_100g: parseFloat(formData.vitamin_c_100g) || 0,
      potassium_100g: parseFloat(formData.potassium_100g) || 0,
      calcium_100g: parseFloat(formData.calcium_100g) || 0,
      iron_100g: parseFloat(formData.iron_100g) || 0,
      
      // Scores additionnels
      ecoscore_score: parseFloat(formData.ecoscore_score) || 0,
      ecoscore_grade: formData.ecoscore_grade || null,
      nutrition_score_fr_100g: parseFloat(formData.nutrition_score_fr_100g) || null,
      
      // Additifs
      additives_n: parseInt(formData.additives_n) || 0,
      additives_en: formData.additives_en || null,
      
      // Convertir les additifs en tableau si nécessaire
      additives: formData.additives_en ? formData.additives_en.split(',').map((a: string) => a.trim()) : []
    };

    console.log('📤 Données à envoyer à l\'API NutriScore:', produitData);

    this.produitService.ajouterProduit(produitData).subscribe({
      next: (produitCree: ProduitAlimentaireDetailDTO) => {
        console.log('✅ Produit ajouté avec succès et NutriScore calculé:', produitCree);
        
        // Créer un message de succès détaillé avec les informations de prédiction
        const messageDetaille = this.creerMessageToasterAvecPrediction(produitCree);
        
        this.snackBar.open(messageDetaille, 'Voir le produit', {
          duration: 10000, // Plus long pour afficher toutes les informations
          panelClass: 'toaster-success-detailed',
          horizontalPosition: 'center',
          verticalPosition: 'top'
        }).onAction().subscribe(() => {
          // Si l'utilisateur clique sur "Voir le produit"
          this.router.navigate(['/produit', produitCree.id]);
        });
        
        // Redirection automatique après 5 secondes
        setTimeout(() => {
          this.router.navigate(['/produit', produitCree.id]);
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'ajout:', error);
        
        let messageErreur = 'Erreur lors de l\'ajout du produit';
        
        // Gestion spécifique des erreurs de l'API NutriScore
        if (error.message.includes('Erreur de validation')) {
          messageErreur = error.message;
        } else if (error.message.includes('Service de prédiction')) {
          messageErreur = 'Le service de prédiction NutriScore est indisponible.';
        } else if (error.message.includes('400')) {
          messageErreur = 'Données invalides. Vérifiez les valeurs nutritionnelles.';
        } else if (error.message.includes('403')) {
          messageErreur = 'Accès refusé : privilèges administrateur requis';
        } else if (error.message.includes('503')) {
          messageErreur = 'Service de prédiction temporairement indisponible.';
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
      if (champ.errors['required']) return 'Ce champ est obligatoire pour calculer le NutriScore';
      if (champ.errors['minlength']) return `Minimum ${champ.errors['minlength'].requiredLength} caractères`;
      if (champ.errors['min']) return `Valeur minimum: ${champ.errors['min'].min}`;
      if (champ.errors['max']) return `Valeur maximum: ${champ.errors['max'].max}`;
    }
    return '';
  }

  // Méthode pour créer un message de toaster avec les informations de prédiction
  private creerMessageToasterAvecPrediction(produit: ProduitAlimentaireDetailDTO): string {
    let message = `✅ PRODUIT CRÉÉ AVEC SUCCÈS !\n\n`;
    message += `📦 Nom: ${produit.product_name}\n`;
    message += `🏪 Marque: ${produit.brands}\n`;
    message += `⚡ Calories: ${produit.energy_kcal_100g} kcal/100g\n`;
    message += `🥩 Protéines: ${produit.proteins_100g}g/100g\n`;
    message += `🍯 Sucres: ${produit.sugars_100g}g/100g\n`;
    message += `🧂 Sel: ${produit.salt_100g}g/100g\n`;
    message += `🫒 Matières grasses: ${produit.fat_100g}g/100g\n`;
    message += `🌾 Fibres: ${produit.fiber_100g}g/100g\n`;
    
    // Informations de prédiction NutriScore
    if (produit.nutriscore_score !== undefined) {
      message += `\n🤖 NUTRISCORE CALCULÉ PAR IA:\n`;
      message += `📊 Score: ${produit.nutriscore_score.toFixed(2)}\n`;
      
      // Calculer le grade à partir du score
      const gradeInfo = this.calculerGradeNutriScore(produit.nutriscore_score);
      message += `🏆 Grade: ${gradeInfo.grade}\n`;
      message += `📝 Évaluation: ${gradeInfo.description}\n`;
    }
    
    if (produit.categories_en) {
      message += `\n🏷️ Catégorie: ${produit.categories_en}\n`;
    }
    
    if (produit.fruits_vegetables_nuts_estimate_from_ingredients_100g) {
      message += `🥬 Fruits/Légumes/Noix: ${produit.fruits_vegetables_nuts_estimate_from_ingredients_100g}%\n`;
    }
    
    // Informations additionnelles
    if (produit.quantity) {
      message += `📏 Quantité: ${produit.quantity}\n`;
    }
    
    if (produit.additives_n && produit.additives_n > 0) {
      message += `⚗️ Additifs: ${produit.additives_n} détecté(s)\n`;
    }
    
    if (produit.ecoscore_score && produit.ecoscore_score > 0) {
      message += `🌍 Eco-Score: ${produit.ecoscore_score}/100\n`;
    }
    
    // Métadonnées
    message += `\n🆔 ID: ${produit.id}\n`;
    
    if (produit.createdAt) {
      const dateCreation = new Date(produit.createdAt);
      message += `📅 Créé le: ${dateCreation.toLocaleString('fr-FR')}\n`;
    }
    
    message += `\n🔄 Redirection dans 5 secondes...`;
    
    return message;
  }

  // Méthode pour calculer le grade NutriScore côté client (pour information)
  private calculerGradeNutriScore(score: number): { grade: string; description: string } {
    if (score < 0) {
      return { grade: 'A+', description: 'Excellent produit' };
    } else if (score < 3) {
      return { grade: 'A', description: 'Très bon produit' };
    } else if (score < 7) {
      return { grade: 'B', description: 'Bon produit' };
    } else if (score < 11) {
      return { grade: 'C', description: 'Produit moyen' };
    } else if (score < 15) {
      return { grade: 'D', description: 'Produit de qualité médiocre' };
    } else {
      return { grade: 'E', description: 'Produit de très mauvaise qualité' };
    }
  }
}