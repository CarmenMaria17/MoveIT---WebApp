import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // <-- Import necesar pentru rutare
import { HeaderComponent } from './components/header/header.component'; // <-- Import componentă Header

@Component({
  selector: 'app-root',
  standalone: true, // <-- Acest lucru indică structura standalone
  imports: [RouterOutlet, HeaderComponent], // <-- Trebuie să listezi componentele/modulele folosite
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
}