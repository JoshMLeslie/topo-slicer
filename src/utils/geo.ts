import type { Coordinate } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Generate evenly spaced points between two coordinates
 */
export function interpolatePoints(
  start: Coordinate,
  end: Coordinate,
  numPoints: number
): Coordinate[] {
  const points: Coordinate[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    });
  }

  return points;
}

/**
 * Calculate cumulative distances for an array of coordinates
 * @returns Array of distances in meters from the start point
 */
export function calculateCumulativeDistances(coords: Coordinate[]): number[] {
  const distances: number[] = [0];
  let cumulative = 0;

  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    if (prev && curr) {
      cumulative += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      distances.push(Math.round(cumulative));
    }
  }

  return distances;
}
