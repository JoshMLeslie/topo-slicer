import { useCallback } from 'react';
import type { Coordinate } from '../../types';
import { useElevationData } from '../../hooks/useElevationData';
import { MapPane } from '../MapPane';
import { ElevationProfile } from '../ElevationProfile';
import styles from './TopoSlicer.module.scss';

export function TopoSlicer() {
  const { data, loading, progress, error, isRefining, fetchForLine, reset } =
    useElevationData();

  const handleLineDrawn = useCallback(
    (points: Coordinate[]) => {
      fetchForLine(points);
    },
    [fetchForLine]
  );

  return (
    <div className={styles.container}>
      <div className={styles.mapPane}>
        <MapPane onLineDrawn={handleLineDrawn} onClear={reset} />
      </div>
      <div className={styles.profilePane}>
        <ElevationProfile
          data={data}
          loading={loading}
          progress={progress}
          isRefining={isRefining}
          error={error}
        />
      </div>
    </div>
  );
}
