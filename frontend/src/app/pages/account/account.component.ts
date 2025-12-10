import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css'
})
export class AccountComponent {
  constructor(public authService: AuthService, private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/home']);
  }
}

