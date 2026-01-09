import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReservationsService } from '../../services/reservations.service';
import { CentersService, Center } from '../../services/centers.service';
import { FavoritesService } from '../../services/favorites.service';

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
  imports: [CommonModule, RouterLink, FormsModule],
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

  constructor(
    public authService: AuthService,
    private router: Router,
    private reservationsService: ReservationsService,
    private centersService: CentersService,
    private favoritesService: FavoritesService
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
        this.loadFavorites()
      ]);
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
          if (this.isReservationPast(res.date)) {
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
    return this.reservations.filter(r => !this.isReservationPast(r.date));
  }

  getPastReservations(): ReservationWithCenter[] {
    return this.reservations.filter(r => this.isReservationPast(r.date));
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

  isReservationPast(dateString: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse date string manually to avoid timezone issues
    const [y, m, d] = dateString.split('-').map(Number);
    const reservationDate = new Date(y, m - 1, d);
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
      } else {
        alert(result.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('An error occurred while cancelling the reservation');
    } finally {
      this.loading = false;
    }
  }

  canCancel(reservation: ReservationWithCenter): boolean {
    // Can only cancel if status is pending or confirmed, and not in the past
    if (reservation.status === 'cancelled') return false;
    return !this.isReservationPast(reservation.date);
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
      } else {
        alert('Failed to remove favorite');
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('An error occurred while removing the favorite');
    }
  }

  openReservationModal(center: Center) {
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
  }

  closeReservationModal() {
    this.showReservationModal = false;
    this.selectedCenterForReservation = null;
    this.reservationDate = '';
    this.reservationHour = '';
    this.reservationError = '';
  }

  async submitReservation() {
    if (!this.selectedCenterForReservation || !this.reservationDate || !this.reservationHour) {
      this.reservationError = 'Please fill in all fields';
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
        alert('Reservation created successfully!');
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
}


