import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name: string = '';
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  passwordMismatch: boolean = false;

  constructor(private router: Router, private authService: AuthService) {}

  validatePasswords(): boolean {
    this.passwordMismatch = this.password !== this.confirmPassword;
    return !this.passwordMismatch;
  }

  async onRegister() {
    // Validate passwords match
    if (!this.validatePasswords()) {
      alert('Passwords do not match. Please try again.');
      return;
    }

    // Basic validation
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }

    if (this.password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      const result = await this.authService.register(this.name, this.email, this.password);
      if (result.success) {
        alert('Registration successful! Welcome to MoveIT.');
        this.router.navigate(['/home']);
      } else {
        alert(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      alert('An error occurred during registration. Please try again.');
      console.error('Registration error:', error);
    }
  }
}

