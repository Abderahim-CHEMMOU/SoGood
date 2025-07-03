export interface ProduitAlimentaireDTO {
  id: string;
  nom: string;
  marque: string;
  calories: number;
  sucres: number;
  sel: number;
  graissesSaturees: number;
  fibres: number;
  proteines: number;
  scoreNutriScore?: number;
}