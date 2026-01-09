import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, query, where, addDoc, Timestamp, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

export interface Review {
  centerId: string;
  reservationId: string;
  userId: string;
  rating: number; // 1-5 stars
  comment?: string;
  createdAt?: any;
}

export interface ReviewWithUser {
  id: string;
  centerId: string;
  reservationId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  private firestore: Firestore = inject(Firestore);

  constructor(private authService: AuthService) {}

  async createReview(review: Omit<Review, 'userId' | 'createdAt'>): Promise<{ success: boolean; error?: string }> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return { success: false, error: 'User must be logged in to leave a review' };
    }

    try {
      // Validate rating
      if (review.rating < 1 || review.rating > 5) {
        return { success: false, error: 'Rating must be between 1 and 5 stars' };
      }

      // Check if user already reviewed this reservation
      const existingReview = await this.getReviewByReservation(review.reservationId);
      if (existingReview) {
        return { success: false, error: 'You have already reviewed this reservation' };
      }

      // Create the review document
      const reviewData = {
        centerId: review.centerId,
        reservationId: review.reservationId,
        userId: user.uid,
        rating: review.rating,
        comment: review.comment || '',
        createdAt: Timestamp.now()
      };

      // Add review to Firestore
      await addDoc(collection(this.firestore, 'comments'), reviewData);

      // Calculate and update center's average rating
      const allReviews = await this.getReviewsByCenter(review.centerId);
      const ratings = allReviews.map(r => r.rating);
      const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      // Update center document with new rating
      const centerRef = doc(this.firestore, 'centers', review.centerId);
      await updateDoc(centerRef, {
        rating: averageRating,
        reviewCount: ratings.length
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error creating review:', error);
      return { success: false, error: error.message || 'Failed to create review' };
    }
  }

  async getReviewByReservation(reservationId: string): Promise<any | null> {
    try {
      const reviewsRef = collection(this.firestore, 'comments');
      const q = query(reviewsRef, where('reservationId', '==', reservationId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    } catch (error) {
      console.error('Error getting review:', error);
      return null;
    }
  }

  async getReviewsByCenter(centerId: string): Promise<any[]> {
    try {
      const reviewsRef = collection(this.firestore, 'comments');
      const q = query(reviewsRef, where('centerId', '==', centerId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting reviews:', error);
      return [];
    }
  }

  async hasUserReviewedReservation(reservationId: string): Promise<boolean> {
    const review = await this.getReviewByReservation(reservationId);
    return review !== null;
  }

  async getReviewsWithUserNames(centerId: string): Promise<ReviewWithUser[]> {
    try {
      const reviews = await this.getReviewsByCenter(centerId);

      // Fetch user names for each review
      const reviewsWithUsers = await Promise.all(
        reviews.map(async (review) => {
          let userName = 'Unknown User';

          try {
            const userDoc = await getDoc(doc(this.firestore, 'users', review.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userName = userData['username'] || userData['email'] || 'Unknown User';
            }
          } catch (error) {
            console.error('Error fetching user:', error);
          }

          return {
            id: review.id,
            centerId: review.centerId,
            reservationId: review.reservationId,
            userId: review.userId,
            userName: userName,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt
          };
        })
      );

      return reviewsWithUsers;
    } catch (error) {
      console.error('Error getting reviews with user names:', error);
      return [];
    }
  }
}
