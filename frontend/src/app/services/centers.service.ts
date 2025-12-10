import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import Query from '@arcgis/core/rest/support/Query';

export interface Center {
  objectId: number;
  name?: string;
  category?: string;
  address?: string;
  geometry?: any;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CentersService {
  private featureLayerUrl = `${environment.arcgisMapUrl}/0`;

  async getCenters(): Promise<Center[]> {
    // TODO: Replace with real Firebase/ArcGIS data later
    // For now, return mock test data
    return new Promise((resolve) => {
      // Simulate async loading
      setTimeout(() => {
        const mockCenters: Center[] = [
          {
            objectId: 1,
            name: 'Fitness World',
            category: 'Fitness',
            address: 'Strada Victoriei 10, București'
          },
          {
            objectId: 2,
            name: 'Yoga Studio Zen',
            category: 'Yoga',
            address: 'Bulevardul Unirii 25, București'
          },
          {
            objectId: 3,
            name: 'Tennis Club Elite',
            category: 'Tenis',
            address: 'Calea Floreasca 100, București'
          },
          {
            objectId: 4,
            name: 'CrossFit Power',
            category: 'CrossFit',
            address: 'Strada Dorobanți 50, București'
          },
          {
            objectId: 5,
            name: 'Swimming Academy',
            category: 'Înot',
            address: 'Bulevardul Aviatorilor 15, București'
          },
          {
            objectId: 6,
            name: 'Basketball Arena',
            category: 'Baschet',
            address: 'Strada Calea Vitan 200, București'
          },
          {
            objectId: 7,
            name: 'Martial Arts Dojo',
            category: 'Arte Marțiale',
            address: 'Bulevardul Iuliu Maniu 50, București'
          },
          {
            objectId: 8,
            name: 'Bodybuilding Gym Pro',
            category: 'Bodybuilding',
            address: 'Strada Barbu Văcărescu 150, București'
          },
          {
            objectId: 9,
            name: 'Dance Studio Moves',
            category: 'Dans',
            address: 'Calea Griviței 80, București'
          },
          {
            objectId: 10,
            name: 'Padel Court Center',
            category: 'Padel',
            address: 'Bulevardul Expoziției 30, București'
          },
          {
            objectId: 11,
            name: 'Squash Club',
            category: 'Squash',
            address: 'Strada Amzei 20, București'
          },
          {
            objectId: 12,
            name: 'Climbing Wall Extreme',
            category: 'Escaladă',
            address: 'Calea Rahovei 250, București'
          },
          {
            objectId: 13,
            name: 'Pilates Studio',
            category: 'Pilates',
            address: 'Bulevardul Magheru 30, București'
          },
          {
            objectId: 14,
            name: 'National Stadium Complex',
            category: 'Stadion',
            address: 'Bulevardul Basarabia 37-39, București'
          },
          {
            objectId: 15,
            name: 'MultiSport Center',
            category: 'Polisportiv',
            address: 'Strada Nerva Traian 20, București'
          }
        ];
        resolve(mockCenters);
      }, 500); // Small delay to simulate async operation
    });

    /* 
    // Original code for fetching from ArcGIS Feature Layer - uncomment when ready
    try {
      const featureLayer = new FeatureLayer({
        url: this.featureLayerUrl
      });

      await featureLayer.load();

      const query = new Query();
      query.where = '1=1';
      query.outFields = ['*'];
      query.returnGeometry = false;

      const result = await featureLayer.queryFeatures(query);
      
      return result.features.map(feature => ({
        objectId: feature.attributes.OBJECTID || feature.attributes.objectId,
        name: feature.attributes.Name || feature.attributes.name || 'Unnamed Center',
        category: feature.attributes.Category || feature.attributes.category || '',
        address: feature.attributes.Address || feature.attributes.address || '',
        geometry: feature.geometry,
        ...feature.attributes
      }));
    } catch (error) {
      console.error('Error fetching centers:', error);
      return [];
    }
    */
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

