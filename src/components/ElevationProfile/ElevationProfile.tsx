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
import type { ElevationPoint } from '../../types';
import { LoadingBar } from '../LoadingBar';
import styles from './ElevationProfile.module.scss';

interface ElevationProfileProps {
  data: ElevationPoint[];
  loading: boolean;
  progress: number;
  isRefining: boolean;
  error: string | null;
}

export function ElevationProfile({
  data,
  loading: _loading,
  progress,
  isRefining,
  error,
}: ElevationProfileProps) {
  const hasData = data.length > 0;

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
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="distance"
                  label={{
                    value: 'Distance (m)',
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
                  labelFormatter={(label: number) => `Distance: ${label} m`}
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
