import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class LikeService {
  private readonly COOKIE_NAME = 'nutritracker_likes';
  private likedProductsSubject = new BehaviorSubject<string[]>(this.getLikedProductsFromCookie());
  public likedProducts$ = this.likedProductsSubject.asObservable();

  constructor(private snackBar: MatSnackBar) {}

  private getLikedProductsFromCookie(): string[] {
    try {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(this.COOKIE_NAME + '='));
      
      if (cookie) {
        const value = cookie.split('=')[1];
        return JSON.parse(decodeURIComponent(value));
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la lecture du cookie likes:', error);
      return [];
    }
  }

  private saveLikedProductsToCookie(likedProducts: string[]): void {
    try {
      const value = encodeURIComponent(JSON.stringify(likedProducts));
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // Expire dans 1 an
      document.cookie = `${this.COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cookie likes:', error);
    }
  }

  toggleLike(productId: string, productName: string): void {
    const currentLikes = this.likedProductsSubject.value;
    const isLiked = currentLikes.includes(productId);

    let newLikes: string[];
    if (isLiked) {
      // Retirer le like
      newLikes = currentLikes.filter(id => id !== productId);
      this.showToaster(`${productName} retiré des favoris`, 'error');
    } else {
      // Ajouter le like
      newLikes = [...currentLikes, productId];
      this.showToaster(`${productName} ajouté aux favoris`, 'success');
    }

    this.likedProductsSubject.next(newLikes);
    this.saveLikedProductsToCookie(newLikes);
  }

  isLiked(productId: string): boolean {
    return this.likedProductsSubject.value.includes(productId);
  }

  getLikedProducts(): string[] {
    return this.likedProductsSubject.value;
  }

  private showToaster(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: type === 'success' ? 'toaster-success' : 'toaster-error',
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}