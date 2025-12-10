import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  async onLogin() {
    try {
      const success = await this.authService.login(this.email, this.password);
      if (success) {
        alert('Login successful! Welcome to MoveIT.');
        this.router.navigate(['/home']);
      } else {
        alert('Invalid credentials. Please check your email and password.');
      }
    } catch (error) {
      alert('An error occurred during login. Please try again.');
      console.error('Login error:', error);
    }
  }
}
