import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private testUser = {
    email: 'abc',
    password: 'abc'
  };

  private authenticated = false;
  private currentUserEmail: string | null = null;

  constructor() { }

  login(email: string, password: string): boolean {
    if (email === this.testUser.email && password === this.testUser.password) {
      this.authenticated = true;
      this.currentUserEmail = email;
      return true;
    }
    return false;
  }

  logout(): void {
    this.authenticated = false;
    this.currentUserEmail = null;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCurrentUserEmail(): string | null {
    return this.currentUserEmail;
  }
}
