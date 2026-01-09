import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CentersService, Center } from '../../services/centers.service';
import { FavoritesService } from '../../services/favorites.service';
import { ReservationsService } from '../../services/reservations.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-centers-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './centers-modal.component.html',
  styleUrls: ['./centers-modal.component.css']
})
export class CentersModalComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

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

  async ngOnInit() {
    if (this.isOpen) {
      await this.loadCenters();
    }
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      await this.loadCenters();
    }
  }

  async loadCenters() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.centers = await this.centersService.getCenters();
      
      if (this.centers.length === 0) {
        this.errorMessage = 'No centers found. Please try again later.';
      } else {
        this.filteredCenters = this.centers;
        
        // Load favorite statuses if user is logged in (don't block on this)
        if (this.authService.isAuthenticated()) {
          this.loadFavoriteStatuses().catch(err => {
            console.error('Error loading favorites:', err);
            // Don't show error for favorites, just continue
          });
        }
      }
    } catch (error) {
      console.error('Error loading centers:', error);
      this.errorMessage = 'Failed to load centers. Please try again or check your connection.';
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

    // Search locally on already loaded centers (no need to fetch again)
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
    // Set minimum date to today
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

  onClose() {
    this.closeModal.emit();
    this.searchTerm = '';
    this.filteredCenters = [];
    this.closeReservationForm();
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

