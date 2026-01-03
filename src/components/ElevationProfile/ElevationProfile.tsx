import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Mountain } from 'lucide-react';
import type { DistanceUnit, ElevationPoint } from '../../types';
import { LoadingBar } from '../LoadingBar';
import styles from './ElevationProfile.module.scss';

interface ElevationProfileProps {
  data: ElevationPoint[];
  loading: boolean;
  progress: number;
  isRefining: boolean;
  error: string | null;
  onHoverPoint?: (point: ElevationPoint | null) => void;
  distanceUnit: DistanceUnit;
}

const METERS_TO_FEET = 3.28084;
const METERS_TO_MILES = 0.000621371;

function formatDistance(meters: number, unit: DistanceUnit): string {
  if (unit === 'mi') {
    const miles = meters * METERS_TO_MILES;
    if (miles >= 1) {
      return `${miles.toFixed(2)} mi`;
    }
    return `${Math.round(meters * METERS_TO_FEET)} ft`;
  }
  // km
  if (meters >= 5000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export function ElevationProfile({
  data,
  loading: _loading,
  progress,
  isRefining,
  error,
  onHoverPoint,
  distanceUnit,
}: ElevationProfileProps) {
  const hasData = data.length > 0;
  const maxDistance = hasData ? data[data.length - 1]?.distance ?? 0 : 0;

  // Determine if we should use large units (km/mi) vs small units (m/ft)
  const useLargeUnit = distanceUnit === 'mi'
    ? maxDistance * METERS_TO_MILES >= 1
    : maxDistance >= 5000;

  return (
    <div className={styles.container}>
      <LoadingBar progress={progress} color="green" />

      <div className={styles.content}>
        <header className={styles.header}>
          <Mountain className={styles.icon} size={28} />
          <h2 className={styles.title}>Elevation Profile</h2>
          {isRefining && <span className={styles.refining}>Refining...</span>}
        </header>

        {error && (
          <div className={styles.error}>
            <p>Failed to load elevation data: {error}</p>
          </div>
        )}

        {hasData ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                onMouseMove={(state) => {
                  if (state?.activePayload?.[0]?.payload) {
                    onHoverPoint?.(state.activePayload[0].payload as ElevationPoint);
                  }
                }}
                onMouseLeave={() => onHoverPoint?.(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="distance"
                  tickFormatter={(value: number) => {
                    if (distanceUnit === 'mi') {
                      return useLargeUnit
                        ? `${(value * METERS_TO_MILES).toFixed(1)}`
                        : `${Math.round(value * METERS_TO_FEET)}`;
                    }
                    return useLargeUnit
                      ? `${(value / 1000).toFixed(1)}`
                      : `${Math.round(value)}`;
                  }}
                  label={{
                    value: distanceUnit === 'mi'
                      ? (useLargeUnit ? 'Distance (mi)' : 'Distance (ft)')
                      : (useLargeUnit ? 'Distance (km)' : 'Distance (m)'),
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#9CA3AF',
                  }}
                  stroke="#9CA3AF"
                />
                <YAxis
                  label={{
                    value: 'Elevation (m)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#9CA3AF',
                  }}
                  stroke="#9CA3AF"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number) => [
                    `${value?.toFixed(1) ?? 'N/A'} m`,
                    'Elevation',
                  ]}
                  labelFormatter={(label: number) => `Distance: ${formatDistance(label, distanceUnit)}`}
                />
                <Line
                  type="monotone"
                  dataKey="elevation"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={styles.empty}>
            <Mountain size={64} className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              Draw a line on the map to see elevation profile
            </p>
            <p className={styles.emptyHint}>
              Enable draw mode and click &amp; drag
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
