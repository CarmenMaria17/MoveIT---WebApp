import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink],
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

  constructor(
    public authService: AuthService,
    private router: Router,
    private reservationsService: ReservationsService,
    private centersService: CentersService,
    private favoritesService: FavoritesService
  ) {}

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
      
      // Map reservations with center names
      this.reservations = rawReservations.map((res: any) => {
        const center = centers.find(c => String(c.objectId) === String(res.centerId));
        return {
          id: res.id,
          centerId: res.centerId,
          centerName: center?.name || `Center ${res.centerId}`,
          date: res.date,
          hour: res.hour,
          status: res.status || 'pending',
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

  getReservationsForSelectedMonth(): ReservationWithCenter[] {
    const year = this.selectedMonth.getFullYear();
    const month = this.selectedMonth.getMonth();
    
    return this.reservations.filter(r => {
      const reservationDate = new Date(r.date);
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
    return date.toISOString().split('T')[0];
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
    const reservationDate = new Date(dateString);
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
          const center = allCenters.find(c => String(c.objectId) === centerId);
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
}


