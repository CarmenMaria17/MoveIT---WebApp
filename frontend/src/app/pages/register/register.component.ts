import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  passwordMismatch: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  validatePasswords(): boolean {
    this.passwordMismatch = this.password !== this.confirmPassword;
    return !this.passwordMismatch;
  }

  async onRegister() {
    // Validate passwords match
    if (!this.validatePasswords()) {
      this.notificationService.error('Passwords do not match. Please try again.');
      return;
    }

    // Basic validation
    if (!this.username || !this.email || !this.password || !this.confirmPassword) {
      this.notificationService.warning('Please fill in all fields.');
      return;
    }

    if (this.password.length < 6) {
      this.notificationService.warning('Password must be at least 6 characters long.');
      return;
    }

    try {
      const result = await this.authService.register(this.username, this.email, this.password);
      if (result.success) {
        this.notificationService.success('Registration successful! Welcome to MoveIT.');
        this.router.navigate(['/home']);
      } else {
        this.notificationService.error(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      this.notificationService.error('An error occurred during registration. Please try again.');
      console.error('Registration error:', error);
    }
  }
}

