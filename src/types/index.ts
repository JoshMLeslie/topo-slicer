export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ElevationPoint {
  distance: number;
  elevation: number | null;
  lat: number;
  lng: number;
}

export interface LineCoords {
  start: Coordinate;
  end: Coordinate;
}

export type DrawMethod = 'drag' | 'points';

export type DistanceUnit = 'km' | 'mi';

export interface ElevationDataState {
  data: ElevationPoint[];
  loading: boolean;
  progress: number;
  error: string | null;
  isRefining: boolean;
}
