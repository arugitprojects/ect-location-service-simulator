import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LocationResponse } from './models/location-response.model';
import { LocationService } from './services/location.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent {
  private locationService = inject(LocationService);

  imsi = '262011234567890';
  loading = false;
  error = '';
  result: LocationResponse | null = null;
  lastRequest = '';

  findLocation(): void {
    this.error = '';
    this.result = null;
    this.loading = true;
    this.lastRequest = new Date().toLocaleTimeString();

    this.locationService.findLocation(this.imsi).subscribe({
      next: value => {
        this.result = value;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error ?? 'Location request failed';
        this.loading = false;
      }
    });
  }

  useExample(value: string): void {
    this.imsi = value;
    this.findLocation();
  }
}
