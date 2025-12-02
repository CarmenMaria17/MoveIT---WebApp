import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component'; 
// Importă toate componentele pagină pe care le-ai generat

export const routes: Routes = [
  // Ruta implicită: redirecționează calea goală către 'home'
  { path: '', redirectTo: 'home', pathMatch: 'full' }, 
  
  // Ruta principală a aplicației GIS
  { path: 'home', component: HomeComponent }, 
  
  // Poți adăuga ruta pentru Login/Admin, necesară pentru cerința de roluri
  // { path: 'admin', component: AdminComponent },
  
  // Opțional: Ruta pentru pagini 404
  // { path: '**', component: NotFoundComponent }, 
];