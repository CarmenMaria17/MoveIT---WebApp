import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, deleteDoc, getDocs, query, where, getDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private firestore: Firestore = inject(Firestore);
  
  constructor(private authService: AuthService) {}

  async addFavorite(centerId: string | number): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be logged in to add favorites');
    }

    try {
      const favoriteRef = doc(this.firestore, 'favorites', `${user.uid}_${centerId}`);
      await setDoc(favoriteRef, {
        userId: user.uid,
        centerId: String(centerId),
        createdAt: new Date()
      });
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      return false;
    }
  }

  async removeFavorite(centerId: string | number): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      throw new Error('User must be logged in to remove favorites');
    }

    try {
      const favoriteRef = doc(this.firestore, 'favorites', `${user.uid}_${centerId}`);
      await deleteDoc(favoriteRef);
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      return false;
    }
  }

  async isFavorite(centerId: string | number): Promise<boolean> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }

    try {
      const favoriteRef = doc(this.firestore, 'favorites', `${user.uid}_${centerId}`);
      const favoriteSnap = await getDoc(favoriteRef);
      return favoriteSnap.exists();
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  async getUserFavorites(): Promise<string[]> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return [];
    }

    try {
      const favoritesRef = collection(this.firestore, 'favorites');
      const q = query(favoritesRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => doc.data()['centerId']);
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  }
}

