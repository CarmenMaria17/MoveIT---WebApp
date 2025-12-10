import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { Map } from './map/map';
import { AccountComponent } from './pages/account/account.component';

export const routes: Routes = [
  // Ruta implicită: redirecționează calea goală către 'home'
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Ruta principală a aplicației
  { path: 'home', component: HomeComponent },

  // Ruta pentru Login
  { path: 'login', component: LoginComponent },

  // Ruta pentru Register
  { path: 'register', component: RegisterComponent },

  // Ruta pentru Map
  { path: 'map', component: Map },

  // Ruta pentru Account
  { path: 'account', component: AccountComponent },

  // Opțional: Ruta pentru pagini 404
  // { path: '**', component: NotFoundComponent },
];