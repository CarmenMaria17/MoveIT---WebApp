import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { Map } from './map/map';

export const routes: Routes = [
  // Ruta implicită: redirecționează calea goală către 'home'
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Ruta principală a aplicației
  { path: 'home', component: HomeComponent },

  // Ruta pentru Login
  { path: 'login', component: LoginComponent },

  // Ruta pentru Map
  { path: 'map', component: Map },

  // Opțional: Ruta pentru pagini 404
  // { path: '**', component: NotFoundComponent },
];