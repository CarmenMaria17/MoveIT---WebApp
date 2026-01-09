import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

export interface Center {
  id: string;
  name?: string;
  category?: string;
  address?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  private firestore: Firestore = inject(Firestore);

  async getCenters(): Promise<Center[]> {
    try {
      const centersCollection = collection(this.firestore, 'centers');
      const snapshot = await getDocs(centersCollection);

      const centers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Center[];

      return centers;
    } catch (error) {
      console.error('Error fetching centers from Firestore:', error);
      return [];
    }
  }

  async searchCenters(searchTerm: string, centers?: Center[]): Promise<Center[]> {
    try {
      // Use provided centers if available, otherwise fetch
      const allCenters = centers || await this.getCenters();
      const term = searchTerm.toLowerCase();
      
      return allCenters.filter(center => 
        center.name?.toLowerCase().includes(term) ||
        center.category?.toLowerCase().includes(term) ||
        center.address?.toLowerCase().includes(term)
      );
    } catch (error) {
      console.error('Error searching centers:', error);
      return [];
    }
  }
}

