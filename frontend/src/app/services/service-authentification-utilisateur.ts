import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { UtilisateurDTO } from '../models/utilisateur.dto';

@Injectable({
  providedIn: 'root'
})
export class ServiceAuthentificationUtilisateur {
  private utilisateurs: UtilisateurDTO[] = [
    { id: '1', email: 'test1@example.com', token: 'fake-jwt-token-1' },
    { id: '2', email: 'test2@example.com', token: 'fake-jwt-token-2' },
    { id: '3', email: 'test3@example.com', token: 'fake-jwt-token-3' },
    { id: '4', email: 'test4@example.com', token: 'fake-jwt-token-4' },
    { id: '5', email: 'test5@example.com', token: 'fake-jwt-token-5' }
  ];

  private utilisateurConnecte: UtilisateurDTO | null = this.utilisateurs[0]; // Utilisateur connecté par défaut

  connecterUtilisateur(email: string, motDePasse: string): Observable<UtilisateurDTO> {
    const utilisateur = this.utilisateurs.find(u => u.email === email && motDePasse === 'password');
    if (utilisateur) {
      this.utilisateurConnecte = utilisateur;
      return of(utilisateur);
    }
    throw new Error('Identifiants incorrects');
  }

  inscrireUtilisateur(email: string, motDePasse: string): Observable<UtilisateurDTO> {
    if (email.includes('@')) {
      const nouvelUtilisateur: UtilisateurDTO = { id: `${this.utilisateurs.length + 1}`, email, token: `fake-jwt-token-${this.utilisateurs.length + 1}` };
      this.utilisateurs.push(nouvelUtilisateur);
      this.utilisateurConnecte = nouvelUtilisateur;
      return of(nouvelUtilisateur);
    }
    throw new Error('Email invalide');
  }

  obtenirUtilisateurConnecte(): UtilisateurDTO | null {
    return this.utilisateurConnecte;
  }

  deconnecterUtilisateur(): void {
    this.utilisateurConnecte = null;
  }
}