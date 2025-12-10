import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CentersModalComponent } from '../../components/centers-modal/centers-modal.component';

@Component({
  selector: 'app-home',
  imports: [CentersModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  showCentersModal: boolean = false;

  constructor(private router: Router) {}

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  openCentersModal() {
    this.showCentersModal = true;
  }

  closeCentersModal() {
    this.showCentersModal = false;
  }
}
