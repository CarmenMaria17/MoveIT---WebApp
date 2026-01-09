import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservationsService } from '../../services/reservations.service';
import { CentersService, Center } from '../../services/centers.service';
import { FavoritesService } from '../../services/favorites.service';
import { ReviewsService } from '../../services/reviews.service';
import { ReviewsModalComponent } from '../../components/reviews-modal/reviews-modal.component';
import { NotificationService } from '../../services/notification.service';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

interface ReservationWithCenter {
  id: string;
  centerId: string;
  centerName: string;
  date: string;
  hour: string;
  status: string;
  createdAt?: any;
}

interface FavoriteCenter {
  centerId: string;
  center: Center;
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReviewsModalComponent],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent implements OnInit {
  reservations: ReservationWithCenter[] = [];
  favoriteCenters: FavoriteCenter[] = [];
  loading: boolean = false;
  loadingFavorites: boolean = false;
  viewMode: 'list' | 'calendar' = 'list';
  selectedMonth: Date = new Date();
  showCancelConfirm: boolean = false;
  reservationToCancel: ReservationWithCenter | null = null;

  // Reservation modal for favorites
  showReservationModal: boolean = false;
  selectedCenterForReservation: Center | null = null;
  reservationDate: string = '';
  reservationHour: string = '';
  availableHours: string[] = [];
  reservationError: string = '';
  availableSpots: number | null = null;
  totalCapacity: number | null = null;

  // Review modal
  showReviewModal: boolean = false;
  reservationToReview: ReservationWithCenter | null = null;
  reviewRating: number = 5;
  reviewComment: string = '';
  reviewError: string = '';
  reviewedReservations: Set<string> = new Set();

  // Reviews modal for viewing all reviews
  showReviewsModal: boolean = false;
  reviewsCenterId: string | null = null;
  reviewsCenterName: string = '';

  private firestore: Firestore = inject(Firestore);

  constructor(
    public authService: AuthService,
    private router: Router,
    private reservationsService: ReservationsService,
    private centersService: CentersService,
    private favoritesService: FavoritesService,
    private reviewsService: ReviewsService,
    private notificationService: NotificationService
  ) {
    // Generate hours from 09:00 to 21:00
    for (let hour = 9; hour <= 21; hour++) {
      this.availableHours.push(`${hour.toString().padStart(2, '0')}:00`);
    }
  }

  async ngOnInit() {
    if (this.authService.isAuthenticated()) {
      await Promise.all([
        this.loadReservations(),
        this.loadFavorites(),
        this.loadReviewedReservations()
      ]);
    }
  }

  async loadReviewedReservations() {
    try {
      const rawReservations = await this.reservationsService.getUserReservations();

      // Check which reservations have been reviewed
      for (const reservation of rawReservations) {
        const hasReview = await this.reviewsService.hasUserReviewedReservation(reservation.id);
        if (hasReview) {
          this.reviewedReservations.add(reservation.id);
        }
      }
    } catch (error) {
      console.error('Error loading reviewed reservations:', error);
    }
  }

  async loadReservations() {
    this.loading = true;
    try {
      const rawReservations = await this.reservationsService.getUserReservations();
      const centers = await this.centersService.getCenters();

      // Map reservations with center names and filter out cancelled ones
      this.reservations = rawReservations
        .filter((res: any) => res.status !== 'cancelled') // Filter out cancelled reservations
        .map((res: any) => {
          const center = centers.find(c => String(c.id) === String(res.centerId));
          // Auto-update status to completed if the reservation is in the past
          let status = res.status || 'pending';
          if (this.isReservationPast(res.date, res.hour)) {
            status = 'completed';
          }
          return {
            id: res.id,
            centerId: res.centerId,
            centerName: center?.name || `Center ${res.centerId}`,
            date: res.date,
            hour: res.hour,
            status: status,
            createdAt: res.createdAt
          };
        }).sort((a, b) => {
          // Sort by date, then by hour
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.hour.localeCompare(b.hour);
        });
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/home']);
  }

  toggleView() {
    this.viewMode = this.viewMode === 'list' ? 'calendar' : 'list';
  }

  getReservationsForDate(date: string): ReservationWithCenter[] {
    return this.reservations.filter(r => r.date === date);
  }

  getCurrentReservations(): ReservationWithCenter[] {
    return this.reservations.filter(r => !this.isReservationPast(r.date, r.hour));
  }

  getPastReservations(): ReservationWithCenter[] {
    return this.reservations.filter(r => this.isReservationPast(r.date, r.hour));
  }

  getReservationsForSelectedMonth(): ReservationWithCenter[] {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();

    return this.reservations.filter(r => {
      // Parse date string manually to avoid timezone issues
      const [y, m, d] = r.date.split('-').map(Number);
      const reservationDate = new Date(y, m - 1, d);
      return reservationDate.getFullYear() === year && reservationDate.getMonth() === month;
    });
  }

  getCalendarDays(): Date[] {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Date[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -i));
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }

  previousMonth() {
    this.selectedMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() - 1, 1);
  }

  nextMonth() {
    this.selectedMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 1);
  }

  formatDate(date: Date): string {
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  }

  isReservationPast(dateString: string, hourString?: string): boolean {
    const now = new Date();
    // Parse date string manually to avoid timezone issues
    const [y, m, d] = dateString.split('-').map(Number);
    const reservationDate = new Date(y, m - 1, d);

    // If hour is provided, include time in comparison
    if (hourString) {
      const [hour, minute] = hourString.split(':').map(Number);
      reservationDate.setHours(hour, minute || 0, 0, 0);
      return reservationDate < now;
    }

    // If no hour provided, just compare dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);
    return reservationDate < today;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'pending':
        return 'status-pending';
      case 'cancelled':
        return 'status-cancelled';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-pending';
    }
  }

  openCancelConfirm(reservation: ReservationWithCenter) {
    this.reservationToCancel = reservation;
    this.showCancelConfirm = true;
  }

  closeCancelConfirm() {
    this.showCancelConfirm = false;
    this.reservationToCancel = null;
  }

  async confirmCancel() {
    if (!this.reservationToCancel) return;

    this.loading = true;
    try {
      const result = await this.reservationsService.cancelReservation(this.reservationToCancel.id);
      if (result.success) {
        // Reload reservations to reflect the cancellation
        await this.loadReservations();
        this.closeCancelConfirm();
        this.notificationService.success('Reservation cancelled successfully!');
      } else {
        this.notificationService.error(result.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      this.notificationService.error('An error occurred while cancelling the reservation');
    } finally {
      this.loading = false;
    }
  }

  canCancel(reservation: ReservationWithCenter): boolean {
    // Can only cancel if status is pending or confirmed, and not in the past (including time)
    if (reservation.status === 'cancelled') return false;
    return !this.isReservationPast(reservation.date, reservation.hour);
  }

  async loadFavorites() {
    this.loadingFavorites = true;
    try {
      const favoriteIds = await this.favoritesService.getUserFavorites();
      const allCenters = await this.centersService.getCenters();
      
      // Map favorite IDs to center objects
      this.favoriteCenters = favoriteIds
        .map(centerId => {
          const center = allCenters.find(c => String(c.id) === centerId);
          return center ? { centerId, center } : null;
        })
        .filter((fc): fc is FavoriteCenter => fc !== null);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      this.loadingFavorites = false;
    }
  }

  async removeFavorite(centerId: string) {
    try {
      const success = await this.favoritesService.removeFavorite(centerId);
      if (success) {
        // Reload favorites to update the list
        await this.loadFavorites();
        this.notificationService.success('Favorite removed successfully!');
      } else {
        this.notificationService.error('Failed to remove favorite');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      this.notificationService.error('An error occurred while removing the favorite');
    }
  }

  async openReservationModal(center: Center) {
    this.selectedCenterForReservation = center;
    this.showReservationModal = true;
    // Set minimum date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.reservationDate = `${year}-${month}-${day}`;
    this.reservationHour = '';
    this.reservationError = '';
    this.availableSpots = null;
    this.totalCapacity = null;

    // Load center capacity
    await this.loadCenterCapacity();
  }

  closeReservationModal() {
    this.showReservationModal = false;
    this.selectedCenterForReservation = null;
    this.reservationDate = '';
    this.reservationHour = '';
    this.reservationError = '';
    this.availableSpots = null;
    this.totalCapacity = null;
  }

  async loadCenterCapacity() {
    if (!this.selectedCenterForReservation) return;

    try {
      const centerRef = doc(this.firestore, 'centers', String(this.selectedCenterForReservation.id));
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
    if (!this.selectedCenterForReservation || !this.reservationDate || !this.reservationHour || !this.totalCapacity) {
      this.availableSpots = null;
      return;
    }

    try {
      const existingReservations = await this.reservationsService.getReservationsByCenterAndDateTime(
        String(this.selectedCenterForReservation.id),
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
    if (!this.selectedCenterForReservation || !this.reservationDate || !this.reservationHour) {
      this.reservationError = 'Please fill in all fields';
      return;
    }

    // Validate that the reservation time is not in the past
    if (this.isReservationPast(this.reservationDate, this.reservationHour)) {
      this.reservationError = 'Cannot book a reservation for a time that has already passed';
      return;
    }

    this.loading = true;
    this.reservationError = '';

    try {
      const result = await this.reservationsService.createReservation({
        centerId: String(this.selectedCenterForReservation.id),
        date: this.reservationDate,
        hour: this.reservationHour,
        status: 'pending'
      });

      if (result.success) {
        this.notificationService.success('Reservation created successfully!');
        this.closeReservationModal();
        // Reload reservations to show the new one
        await this.loadReservations();
      } else {
        this.reservationError = result.error || 'Failed to create reservation';
      }
    } catch (error) {
      console.error('Reservation error:', error);
      this.reservationError = 'An error occurred while creating the reservation';
    } finally {
      this.loading = false;
    }
  }

  getMinDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Review functionality
  openReviewModal(reservation: ReservationWithCenter) {
    this.reservationToReview = reservation;
    this.showReviewModal = true;
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewError = '';
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.reservationToReview = null;
    this.reviewRating = 5;
    this.reviewComment = '';
    this.reviewError = '';
  }

  async submitReview() {
    if (!this.reservationToReview) return;

    if (this.reviewRating < 1 || this.reviewRating > 5) {
      this.reviewError = 'Please select a rating between 1 and 5 stars';
      return;
    }

    this.loading = true;
    this.reviewError = '';

    try {
      const result = await this.reviewsService.createReview({
        centerId: this.reservationToReview.centerId,
        reservationId: this.reservationToReview.id,
        rating: this.reviewRating,
        comment: this.reviewComment.trim()
      });

      if (result.success) {
        this.notificationService.success('Review submitted successfully!');
        this.reviewedReservations.add(this.reservationToReview.id);
        this.closeReviewModal();
      } else {
        this.reviewError = result.error || 'Failed to submit review';
      }
    } catch (error) {
      console.error('Review error:', error);
      this.reviewError = 'An error occurred while submitting the review';
    } finally {
      this.loading = false;
    }
  }

  canReview(reservation: ReservationWithCenter): boolean {
    // Can only review completed reservations that haven't been cancelled and haven't been reviewed yet
    return reservation.status === 'completed' && !this.reviewedReservations.has(reservation.id);
  }

  hasReviewed(reservation: ReservationWithCenter): boolean {
    return this.reviewedReservations.has(reservation.id);
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
}


