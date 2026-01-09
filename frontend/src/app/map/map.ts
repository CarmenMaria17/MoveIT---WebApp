import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import esriConfig from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Locate from '@arcgis/core/widgets/Locate';
import Search from '@arcgis/core/widgets/Search';

import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import * as route from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

import { CentersService, Center } from '../services/centers.service';
import { FavoritesService } from '../services/favorites.service';
import { ReservationsService } from '../services/reservations.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ReviewsModalComponent } from '../components/reviews-modal/reviews-modal.component';
import { inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, ReviewsModalComponent],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy {

  @ViewChild('mapViewNode', { static: true }) mapViewEl!: ElementRef;
  view!: MapView;

  stopGraphics: Graphic[] = [];
  routeGraphic: Graphic | null = null;
  directions: { text: string; distance: number }[] = [];

  categories: string[] = [
    'Fitness', 'Arte Marțiale', 'Baschet', 'Bodybuilding',
    'CrossFit', 'Dans', 'Escaladă', 'Padel',
    'Polisportiv', 'Squash', 'Stadion', 'Tenis',
    'Yoga', 'Înot', 'Pilates'
  ];

  selectedCategory: string = '';

  // Centers functionality
  centers: Center[] = [];
  filteredCenters: Center[] = [];
  searchTerm: string = '';
  selectedCenter: Center | null = null;
  showReservationForm: boolean = false;

  // Reservation form fields
  reservationDate: string = '';
  reservationHour: string = '';
  favoriteStatuses: Map<string | number, boolean> = new Map();
  availableSpots: number | null = null;
  totalCapacity: number | null = null;

  // Available hours (9 AM to 9 PM)
  availableHours: string[] = [];

  loading: boolean = false;
  errorMessage: string = '';

  // Reviews modal
  showReviewsModal: boolean = false;
  reviewsCenterId: string | null = null;
  reviewsCenterName: string = '';

  private firestore: Firestore = inject(Firestore);

  constructor(
    private centersService: CentersService,
    private favoritesService: FavoritesService,
    private reservationsService: ReservationsService,
    public authService: AuthService,
    private notificationService: NotificationService
  ) {
    // Generate hours from 09:00 to 21:00
    for (let hour = 9; hour <= 21; hour++) {
      this.availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
    }
  }

  async ngOnInit(): Promise<void> {
    this.initializeMap();
    await this.loadCenters();
  }

  initializeMap(): void {

    esriConfig.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurI2SVi81djFBXxVkYS2nQsgqrLCgmcTxwzj_E-v-LpeYG9bV_vJ5MIGXX3E_H5VNbEVKeRG_ccqh5nEs5MolbTyUyBpq5KUilaxvzbY6NJQLs2SshtRtDKykAZ2n1Z3CkTR-8HHn6LZ39IXSX9HYvJMjoSofMUVL8rNL2s8OS-to7i-0hAvHPaVr-sJiRAB2bCx6xCnEMi4GztV-5zO0f9o115NZ9NMIr8H5fuofIUoVAT1_L41SHFyZ";

    const webmap = new WebMap({
      portalItem: { id: "fe22e066a7c5443e8b22a9b1837fe5f1" }
    });

    this.view = new MapView({
      container: this.mapViewEl.nativeElement,
      map: webmap,
      zoom: 12,
      center: [26.1025, 44.4268]
    });

    // Locate
    this.view.ui.add(new Locate({ view: this.view }), "top-left");

    // Search
    this.view.ui.add(new Search({ view: this.view }), "top-right");

    this.view.when(() => {
      console.log("MAP READY");

      // Routing click handler
      this.view.on("click", (evt) => this.handleMapClick(evt));
    });
  }

  handleMapClick(event: any): void {
    if (!this.view) return;

    // When already have two stops, start a new selection with the latest click.
    if (this.stopGraphics.length >= 2) {
      this.resetStopsAndRoute();
      this.addStop("origin", event.mapPoint);
      return;
    }

    const stopType = this.stopGraphics.length === 0 ? "origin" : "destination";
    this.addStop(stopType, event.mapPoint);
  }

  addStop(type: string, point: any): void {
    // Any new stop invalidates a previously drawn route.
    this.clearRouteGraphic();
    this.directions = [];

    const symbol = new SimpleMarkerSymbol({
      color: type === "origin" ? "white" : "black",
      size: "10px",
      outline: { color: "black", width: 1 }
    });

    const graphic = new Graphic({
      geometry: point,
      symbol
    });

    this.stopGraphics.push(graphic);
    this.view.graphics.add(graphic);
  }

  clearRouteGraphic(): void {
    if (this.routeGraphic && this.view) {
      this.view.graphics.remove(this.routeGraphic);
    }
    this.routeGraphic = null;
  }

  resetStopsAndRoute(): void {
    if (this.view && this.stopGraphics.length) {
      this.view.graphics.removeMany(this.stopGraphics);
    }
    this.stopGraphics = [];
    this.directions = [];
    this.clearRouteGraphic();
  }

  async calculateRoute(): Promise<void> {
    const routeUrl =
      "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

    if (this.stopGraphics.length < 2) return;

    this.clearRouteGraphic();

    const params = new RouteParameters({
      stops: new FeatureSet({
        features: this.stopGraphics
      }),
      returnDirections: true
    });

    try {
      const result = await route.solve(routeUrl, params);

      const r = result.routeResults[0];
      if (!r || !r.route || !r.directions || !r.directions.features) {
        console.warn("No route or directions returned.");
        return;
      }

      // Add route line
      r.route.symbol = new SimpleLineSymbol({
        color: [5, 150, 255],
        width: 5
      });

      this.view.graphics.add(r.route);
      this.routeGraphic = r.route;

      // Extract directions
      const steps = r.directions.features;

      this.directions = steps.map((s: any) => ({
        text: s.attributes.text,
        distance: Math.round(s.attributes.length * 1609.34)
      }));

    } catch (err) {
      console.error("ROUTE ERROR:", err);
    }
  }

  filterByCategory(category: string): void {
    if (!this.view || !this.view.map) return;

    const layerFound = this.view.map.allLayers.find((l: any) =>
      l.title?.includes("SportsCenters")
    );

    if (!layerFound) {
      console.error("SportsCenters layer not found");
      return;
    }

    const featureLayer = layerFound as FeatureLayer;

    featureLayer.definitionExpression = category
      ? `Category = '${category}'`
      : "";
  }

  // Centers functionality methods
  async loadCenters() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.centers = await this.centersService.getCenters();

      if (this.centers.length === 0) {
        this.errorMessage = 'No centers found. Please try again later.';
      } else {
        this.filteredCenters = this.centers;

        // Load favorite statuses if user is logged in
        if (this.authService.isAuthenticated()) {
          this.loadFavoriteStatuses().catch(err => {
            console.error('Error loading favorites:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error loading centers:', error);
      this.errorMessage = 'Failed to load centers. Please try again.';
      this.centers = [];
      this.filteredCenters = [];
    } finally {
      this.loading = false;
    }
  }

  async loadFavoriteStatuses() {
    const favorites = await this.favoritesService.getUserFavorites();
    this.centers.forEach(center => {
      this.favoriteStatuses.set(center.id, favorites.includes(String(center.id)));
    });
  }

  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredCenters = this.centers;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredCenters = this.centers.filter(center =>
      center.name?.toLowerCase().includes(term) ||
      center.category?.toLowerCase().includes(term) ||
      center.address?.toLowerCase().includes(term)
    );
  }

  async toggleFavorite(center: Center) {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Please log in to add favorites');
      return;
    }

    const centerId = center.id;
    const isFavorite = this.favoriteStatuses.get(centerId) || false;

    try {
      if (isFavorite) {
        await this.favoritesService.removeFavorite(centerId);
        this.favoriteStatuses.set(centerId, false);
        this.notificationService.info('Removed from favorites');
      } else {
        await this.favoritesService.addFavorite(centerId);
        this.favoriteStatuses.set(centerId, true);
        this.notificationService.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this.notificationService.error('Failed to update favorite');
    }
  }

  isFavorite(centerId: string | number): boolean {
    return this.favoriteStatuses.get(centerId) || false;
  }

  async openReservationForm(center: Center) {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Please log in to make a reservation');
      return;
    }

    this.selectedCenter = center;
    this.showReservationForm = true;
    const today = new Date().toISOString().split('T')[0];
    this.reservationDate = today;
    this.reservationHour = '';
    this.availableSpots = null;
    this.totalCapacity = null;

    // Load center capacity
    await this.loadCenterCapacity();
  }

  closeReservationForm() {
    this.showReservationForm = false;
    this.selectedCenter = null;
    this.reservationDate = '';
    this.reservationHour = '';
    this.errorMessage = '';
    this.availableSpots = null;
    this.totalCapacity = null;
  }

  async loadCenterCapacity() {
    if (!this.selectedCenter) return;

    try {
      const centerRef = doc(this.firestore, 'centers', String(this.selectedCenter.id));
      const centerDoc = await getDoc(centerRef);

      if (centerDoc.exists()) {
        const centerData = centerDoc.data();
        this.totalCapacity = centerData['capacity'] || 1;
      }
    } catch (error) {
      console.error('Error loading center capacity:', error);
    }
  }

  async updateAvailableSpots() {
    if (!this.selectedCenter || !this.reservationDate || !this.reservationHour || !this.totalCapacity) {
      this.availableSpots = null;
      return;
    }

    try {
      const existingReservations = await this.reservationsService.getReservationsByCenterAndDateTime(
        String(this.selectedCenter.id),
        this.reservationDate,
        this.reservationHour
      );

      this.availableSpots = this.totalCapacity - existingReservations.length;
    } catch (error) {
      console.error('Error updating available spots:', error);
      this.availableSpots = null;
    }
  }

  async submitReservation() {
    if (!this.selectedCenter || !this.reservationDate || !this.reservationHour) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.errorMessage = 'Please log in to make a reservation';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const result = await this.reservationsService.createReservation({
        centerId: String(this.selectedCenter.id),
        date: this.reservationDate,
        hour: this.reservationHour,
        status: 'pending'
      });

      if (result.success) {
        this.notificationService.success('Reservation created successfully!');
        this.closeReservationForm();
      } else {
        this.errorMessage = result.error || 'Failed to create reservation';
      }
    } catch (error) {
      console.error('Reservation error:', error);
      this.errorMessage = 'An error occurred while creating the reservation';
    } finally {
      this.loading = false;
    }
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  openReviewsModal(center: Center) {
    this.reviewsCenterId = String(center.id);
    this.reviewsCenterName = center.name || 'Unknown Center';
    this.showReviewsModal = true;
  }

  closeReviewsModal() {
    this.showReviewsModal = false;
    this.reviewsCenterId = null;
    this.reviewsCenterName = '';
  }

  ngOnDestroy(): void {
    if (this.view) this.view.destroy();
  }
}
