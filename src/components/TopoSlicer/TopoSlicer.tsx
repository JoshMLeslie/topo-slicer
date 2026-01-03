import { useCallback, useState } from 'react';
import type { Coordinate, ElevationPoint } from '../../types';
import { useElevationData } from '../../hooks/useElevationData';
import { MapPane } from '../MapPane';
import { ElevationProfile } from '../ElevationProfile';
import styles from './TopoSlicer.module.scss';

export function TopoSlicer() {
  const { data, loading, progress, error, isRefining, fetchForLine, reset } =
    useElevationData();
  const [hoveredPoint, setHoveredPoint] = useState<ElevationPoint | null>(null);

  const handleLineDrawn = useCallback(
    (points: Coordinate[]) => {
      fetchForLine(points);
    },
    [fetchForLine]
  );

  const handleClear = useCallback(() => {
    reset();
    setHoveredPoint(null);
  }, [reset]);

  return (
    <div className={styles.container}>
      <div className={styles.mapPane}>
        <MapPane
          onLineDrawn={handleLineDrawn}
          onClear={handleClear}
          hoveredPoint={hoveredPoint}
        />
      </div>
      <div className={styles.profilePane}>
        <ElevationProfile
          data={data}
          loading={loading}
          progress={progress}
          isRefining={isRefining}
          error={error}
          onHoverPoint={setHoveredPoint}
        />
      </div>
    </div>
  );
}
