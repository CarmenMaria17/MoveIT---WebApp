import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReviewsService, ReviewWithUser } from '../../services/reviews.service';

@Component({
  selector: 'app-reviews-modal',
  imports: [CommonModule],
  templateUrl: './reviews-modal.component.html',
  styleUrl: './reviews-modal.component.css'
})
export class ReviewsModalComponent implements OnChanges {
  @Input() centerId: string | null = null;
  @Input() centerName: string = '';
  @Input() show: boolean = false;
  @Output() closeModal = new EventEmitter<void>();

  reviews: ReviewWithUser[] = [];
  loading: boolean = false;

  constructor(private reviewsService: ReviewsService) {}

  async ngOnChanges() {
    if (this.show && this.centerId) {
      await this.loadReviews();
    }
  }

  async loadReviews() {
    if (!this.centerId) return;

    this.loading = true;
    try {
      this.reviews = await this.reviewsService.getReviewsWithUserNames(this.centerId);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      this.loading = false;
    }
  }

  close() {
    this.closeModal.emit();
  }

  getStarsArray(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i < rating ? 1 : 0);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  }
}
