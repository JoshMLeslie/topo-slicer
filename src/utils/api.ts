import type { Coordinate } from '../types';

// In dev, proxied through Vite to avoid CORS
// In prod, you'd need your own proxy or a CORS-friendly elevation API
const OPEN_TOPO_DATA_URL = import.meta.env.DEV
  ? '/api/elevation'
  : 'https://api.opentopodata.org/v1/ned10m';

export interface ElevationResult {
  elevation: number | null;
  location: {
    lat: number;
    lng: number;
  };
}

export interface OpenTopoDataResponse {
  results: Array<{
    elevation: number | null;
    location: {
      lat: number;
      lng: number;
    };
  }>;
  status: string;
  error?: string;
}

export class ElevationApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ElevationApiError';
  }
}

/**
 * Fetch elevations for an array of coordinates from OpenTopoData API
 * @throws {ElevationApiError} When the API request fails
 */
export async function fetchElevations(
  coords: Coordinate[],
  signal?: AbortSignal
): Promise<(number | null)[]> {
  if (coords.length === 0) {
    return [];
  }

  const locations = coords.map((c) => `${c.lat},${c.lng}`).join('|');

  const response = await fetch(`${OPEN_TOPO_DATA_URL}?locations=${locations}`, {
    signal,
  });

  if (!response.ok) {
    throw new ElevationApiError(
      `Elevation API returned ${response.status}`,
      response.status
    );
  }

  const data: OpenTopoDataResponse = await response.json();

  if (data.status !== 'OK') {
    throw new ElevationApiError(data.error ?? 'Unknown API error');
  }

  return data.results.map((r) => r.elevation);
}
