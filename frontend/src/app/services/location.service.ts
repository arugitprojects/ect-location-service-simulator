import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { LocationRequest, LocationResponse } from '../models/location-response.model';

/**
 * Owns all REST communication with the Location Server. The Angular app never
 * talks to the UDM directly — it only ever calls this application-facing API.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api';

  findLocation(imsi: string): Observable<LocationResponse> {
    const body: LocationRequest = { imsi };
    return this.http.post<LocationResponse>(`${this.baseUrl}/location`, body);
  }
}
