import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { UtilisateurDTO, LoginRequest, RegisterRequest, AuthResponse } from '../models/utilisateur.dto';
import { environment } from '../../environments/environment';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceAuthentificationUtilisateur {
  private readonly TOKEN_KEY = 'nutritracker_token';
  private readonly USER_KEY = 'nutritracker_user';
  private readonly API_BASE_URL = environment.api.baseUrl;

  private utilisateurConnecteSubject = new BehaviorSubject<UtilisateurDTO | null>(this.getStoredUser());
  public utilisateurConnecte$ = this.utilisateurConnecteSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {
    console.log('🔐 Service d\'authentification initialisé');
    // Vérifier la validité du token au démarrage
    this.verifierTokenValide();
  }

  /**
   * Connexion utilisateur
   */
  connecterUtilisateur(email: string, password: string): Observable<AuthResponse> {
    const loginData: LoginRequest = { email, password };
    
    console.log('🔑 Tentative de connexion pour:', email);
    
    return this.http.post<AuthResponse>(`${this.API_BASE_URL}${environment.api.endpoints.auth.login}`, loginData)
      .pipe(
        tap(response => {
          console.log('✅ Connexion réussie:', response.user.username);
          this.sauvegarderSession(response);
        }),
        catchError(this.gererErreurAuth.bind(this))
      );
  }

  /**
   * Inscription utilisateur
   */
  inscrireUtilisateur(username: string, email: string, password: string, confirmPassword: string): Observable<AuthResponse> {
    const registerData: RegisterRequest = { username, email, password, confirmPassword };
    
    console.log('📝 Tentative d\'inscription pour:', email);
    
    return this.http.post<AuthResponse>(`${this.API_BASE_URL}${environment.api.endpoints.auth.register}`, registerData)
      .pipe(
        tap(response => {
          console.log('✅ Inscription réussie:', response.user.username);
          this.sauvegarderSession(response);
        }),
        catchError(this.gererErreurAuth.bind(this))
      );
  }

  /**
   * Déconnexion utilisateur
   */
  deconnecterUtilisateur(): void {
    console.log('🚪 Déconnexion de l\'utilisateur');
    
    // Supprimer les données locales
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Vider les caches
    this.cacheService.clear();
    
    // Mettre à jour le state
    this.utilisateurConnecteSubject.next(null);
    
    console.log('✅ Déconnexion terminée');
  }

  /**
   * Obtenir l'utilisateur connecté
   */
  obtenirUtilisateurConnecte(): UtilisateurDTO | null {
    return this.utilisateurConnecteSubject.value;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  estConnecte(): boolean {
    return this.obtenirUtilisateurConnecte() !== null && this.obtenirToken() !== null;
  }

  /**
   * Obtenir le token JWT
   */
  obtenirToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Vérifier si l'utilisateur est admin
   */
  estAdmin(): boolean {
    const user = this.obtenirUtilisateurConnecte();
    return user?.role === 'admin';
  }

  /**
   * Sauvegarder la session après connexion/inscription
   */
  private sauvegarderSession(response: AuthResponse): void {
    try {
      // Sauvegarder le token
      localStorage.setItem(this.TOKEN_KEY, response.token);
      
      // Sauvegarder les données utilisateur
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      
      // Mettre à jour le state
      this.utilisateurConnecteSubject.next(response.user);
      
      console.log('💾 Session sauvegardée pour:', response.user.username);
    } catch (error) {
      console.error('❌ Erreur sauvegarde session:', error);
    }
  }

  /**
   * Récupérer l'utilisateur stocké localement
   */
  private getStoredUser(): UtilisateurDTO | null {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      const token = localStorage.getItem(this.TOKEN_KEY);
      
      if (userJson && token) {
        const user = JSON.parse(userJson) as UtilisateurDTO;
        console.log('👤 Utilisateur récupéré du localStorage:', user.username);
        return user;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Erreur récupération utilisateur stocké:', error);
      return null;
    }
  }

  /**
   * Vérifier la validité du token (optionnel - peut être amélioré avec un endpoint de vérification)
   */
  private verifierTokenValide(): void {
    const token = this.obtenirToken();
    const user = this.getStoredUser();
    
    if (token && user) {
      try {
        // Décoder le JWT pour vérifier l'expiration (basique)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
          console.log('⏰ Token expiré, déconnexion automatique');
          this.deconnecterUtilisateur();
        } else {
          console.log('✅ Token valide, utilisateur maintenu connecté');
        }
      } catch (error) {
        console.warn('⚠️ Erreur vérification token:', error);
        this.deconnecterUtilisateur();
      }
    }
  }

  /**
   * Gestion des erreurs d'authentification
   */
  private gererErreurAuth(error: HttpErrorResponse): Observable<never> {
    let messageErreur = 'Erreur de connexion';
    
    if (error.error?.message) {
      messageErreur = error.error.message;
    } else if (error.status === 401) {
      messageErreur = 'Email ou mot de passe incorrect';
    } else if (error.status === 409) {
      messageErreur = 'Cet email est déjà utilisé';
    } else if (error.status === 400) {
      messageErreur = 'Données invalides';
    } else if (error.status === 0) {
      messageErreur = 'Impossible de contacter le serveur';
    }
    
    console.error('❌ Erreur authentification:', messageErreur, error);
    return throwError(() => new Error(messageErreur));
  }

  /**
   * Rafraîchir les données utilisateur (optionnel)
   */
  rafraichirUtilisateur(): Observable<UtilisateurDTO> {
    // Si vous avez un endpoint pour récupérer les données utilisateur actuelles
    // return this.http.get<UtilisateurDTO>(`${this.API_BASE_URL}/auth/me`);
    
    // Pour l'instant, retourner l'utilisateur actuel
    const user = this.obtenirUtilisateurConnecte();
    if (user) {
      return new Observable(observer => {
        observer.next(user);
        observer.complete();
      });
    } else {
      return throwError(() => new Error('Aucun utilisateur connecté'));
    }
  }
}