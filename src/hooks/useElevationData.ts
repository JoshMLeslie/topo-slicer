import { useState, useRef, useCallback } from 'react';
import type { ElevationPoint, LineCoords } from '../types';
import { fetchElevations, ElevationApiError } from '../utils/api';
import { interpolatePoints, calculateCumulativeDistances } from '../utils/geo';

interface UseElevationDataReturn {
  data: ElevationPoint[];
  loading: boolean;
  progress: number;
  error: string | null;
  isRefining: boolean;
  fetchForLine: (line: LineCoords) => Promise<void>;
  reset: () => void;
}

const INITIAL_SAMPLES = 15;
const REFINEMENT_ITERATIONS = 3;

export function useElevationData(): UseElevationDataReturn {
  const [data, setData] = useState<ElevationPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    isCancelledRef.current = true;
    setData([]);
    setLoading(false);
    setProgress(0);
    setError(null);
    setIsRefining(false);
  }, []);

  const fetchForLine = useCallback(async (line: LineCoords) => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    isCancelledRef.current = false;

    setLoading(true);
    setProgress(10);
    setError(null);
    setIsRefining(false);

    try {
      // Initial coarse sampling
      const coords = interpolatePoints(line.start, line.end, INITIAL_SAMPLES);
      const elevations = await fetchElevations(coords, abortController.signal);

      if (isCancelledRef.current) return;

      const distances = calculateCumulativeDistances(coords);
      let elevationData: ElevationPoint[] = coords.map((coord, i) => ({
        ...coord,
        distance: distances[i] ?? 0,
        elevation: elevations[i] ?? null,
      }));

      setData(elevationData);
      setProgress(50);
      setIsRefining(true);

      // Progressive refinement
      for (let iter = 0; iter < REFINEMENT_ITERATIONS; iter++) {
        if (isCancelledRef.current || abortController.signal.aborted) return;

        // Add midpoints
        const refined: ElevationPoint[] = [];
        for (let i = 0; i < elevationData.length - 1; i++) {
          const current = elevationData[i];
          const next = elevationData[i + 1];

          if (!current || !next) continue;

          refined.push(current);
          refined.push({
            lat: (current.lat + next.lat) / 2,
            lng: (current.lng + next.lng) / 2,
            distance: Math.round((current.distance + next.distance) / 2),
            elevation: null,
          });
        }
        const lastPoint = elevationData[elevationData.length - 1];
        if (lastPoint) {
          refined.push(lastPoint);
        }

        // Fetch elevations for new points
        const needsElevation = refined.filter((p) => p.elevation === null);
        if (needsElevation.length > 0) {
          const newElevations = await fetchElevations(
            needsElevation,
            abortController.signal
          );

          if (isCancelledRef.current || abortController.signal.aborted) return;

          let elevIdx = 0;
          for (const point of refined) {
            if (point.elevation === null) {
              point.elevation = newElevations[elevIdx++] ?? null;
            }
          }
        }

        elevationData = refined;
        setData([...elevationData]);
        setProgress(50 + ((iter + 1) / REFINEMENT_ITERATIONS) * 50);

        // Small delay between iterations to avoid hammering the API
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setIsRefining(false);
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    } catch (err) {
      if (isCancelledRef.current) return;

      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Elevation fetch error:', err);

      const message =
        err instanceof ElevationApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to fetch elevation data';

      setError(message);
      setLoading(false);
      setIsRefining(false);
      setProgress(0);
    }
  }, []);

  return {
    data,
    loading,
    progress,
    error,
    isRefining,
    fetchForLine,
    reset,
  };
}
