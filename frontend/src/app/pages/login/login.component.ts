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

  onLogin() {
    if (this.authService.login(this.email, this.password)) {
      alert('Login successful! Welcome to MoveIT.');
      this.router.navigate(['/home']);
    } else {
      alert('Invalid credentials. Please try:\nEmail: test@moveit.com\nPassword: password123');
    }
  }
}
