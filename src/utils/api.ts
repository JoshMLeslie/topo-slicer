import type { Coordinate } from '../types';

const OPEN_TOPO_DATA_BASE = 'https://api.opentopodata.org/v1/ned10m';

function buildElevationUrl(locations: string): string {
  const apiUrl = `${OPEN_TOPO_DATA_BASE}?locations=${locations}`;

  if (import.meta.env.DEV) {
    // Proxied through Vite dev server
    return `/api/elevation?locations=${locations}`;
  }

  // In prod, use corsproxy.io (consider self-hosting for production use)
  return `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;
}

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
  const url = buildElevationUrl(locations);

  const response = await fetch(url, { signal });

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
