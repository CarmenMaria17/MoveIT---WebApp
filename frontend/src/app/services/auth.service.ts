import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User, onAuthStateChanged, updateProfile } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private currentUser: User | null = null;

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
    });
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      this.currentUser = userCredential.user;
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      this.currentUser = userCredential.user;
      
      // Update the user's display name
      if (this.currentUser) {
        await updateProfile(this.currentUser, { displayName: name });
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please enter a valid email.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  getCurrentUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}
