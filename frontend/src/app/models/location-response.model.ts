export interface SubscriberLocation {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  cellId: string;
  technology: string;
}

export interface Subscriber {
  imsi: string;
  status: string;
}

/** Response returned by the Location Server for POST /api/location. */
export interface LocationResponse {
  imsi: string;
  location: SubscriberLocation;
  subscriber: Subscriber;
  source: string;
  protocol: string;
  latencyMs: number;
}

export interface LocationRequest {
  imsi: string;
}
