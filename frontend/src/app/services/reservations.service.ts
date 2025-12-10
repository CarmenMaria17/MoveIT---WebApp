import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface Reservation {
  centerId: string;
  date: string; // ISO date string
  hour: string; // Hour in format "HH:mm"
  status: string; // e.g., "pending", "confirmed", "cancelled"
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationsService {
  private firestore: Firestore = inject(Firestore);
  
  constructor(private authService: AuthService) {}

  async createReservation(reservation: Omit<Reservation, 'userId'>): Promise<{ success: boolean; error?: string }> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return { success: false, error: 'User must be logged in to make reservations' };
    }

    try {
      // Helper function to check if two hours overlap (including adjacent hours)
      const hoursOverlap = (hour1: string, hour2: string): boolean => {
        const h1 = parseInt(hour1.split(':')[0]);
        const h2 = parseInt(hour2.split(':')[0]);
        // Check if hours are the same or adjacent (overlap by at least 1 hour)
        return Math.abs(h1 - h2) <= 1;
      };

      // Check if user already has overlapping reservations on the same date
      const userReservations = await this.getUserReservations();
      const reservationsOnSameDate = userReservations.filter(
        (r: any) => r.date === reservation.date && 
                   (r.status === 'pending' || r.status === 'confirmed') &&
                   hoursOverlap(r.hour, reservation.hour)
      );

      if (reservationsOnSameDate.length > 0) {
        const existingReservation = reservationsOnSameDate[0];
        return { 
          success: false, 
          error: `You already have a reservation at ${existingReservation.hour} on this date. Reservations cannot overlap or be adjacent.` 
        };
      }

      // Check if reservation already exists for this center, date, and hour
      const existingReservations = await this.getReservationsByCenterAndDateTime(
        reservation.centerId,
        reservation.date,
        reservation.hour
      );

      if (existingReservations.length > 0) {
        return { success: false, error: 'This time slot is already reserved' };
      }

      const reservationData = {
        ...reservation,
        userId: user.uid,
        status: 'pending',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(this.firestore, 'reservations'), reservationData);
      return { success: true };
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      return { success: false, error: error.message || 'Failed to create reservation' };
    }
  }

  async getReservationsByCenterAndDateTime(centerId: string, date: string, hour: string): Promise<any[]> {
    try {
      const reservationsRef = collection(this.firestore, 'reservations');
      const q = query(
        reservationsRef,
        where('centerId', '==', centerId),
        where('date', '==', date),
        where('hour', '==', hour),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting reservations:', error);
      return [];
    }
  }

  async getUserReservations(): Promise<any[]> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return [];
    }

    try {
      const reservationsRef = collection(this.firestore, 'reservations');
      const q = query(reservationsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user reservations:', error);
      return [];
    }
  }

  async cancelReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return { success: false, error: 'User must be logged in to cancel reservations' };
    }

    try {
      const reservationRef = doc(this.firestore, 'reservations', reservationId);
      await updateDoc(reservationRef, {
        status: 'cancelled',
        cancelledAt: Timestamp.now()
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      return { success: false, error: error.message || 'Failed to cancel reservation' };
    }
  }
}

