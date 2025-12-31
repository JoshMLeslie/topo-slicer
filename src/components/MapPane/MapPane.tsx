import { useState, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMapEvents,
} from 'react-leaflet';
import type { LatLng, LeafletMouseEvent } from 'leaflet';
import type { LineCoords, Coordinate } from '../../types';
import { LoadingBar } from '../LoadingBar';
import styles from './MapPane.module.scss';

interface MapPaneProps {
  onLineDrawn: (line: LineCoords) => void;
}

interface DrawingLayerProps {
  drawMode: boolean;
  onLineDrawn: (line: LineCoords) => void;
  onDrawStart: () => void;
  onDrawEnd: () => void;
  setTempLine: (line: [Coordinate, Coordinate] | null) => void;
  setFinalLine: (line: [Coordinate, Coordinate] | null) => void;
}

function DrawingLayer({
  drawMode,
  onLineDrawn,
  onDrawStart,
  onDrawEnd,
  setTempLine,
  setFinalLine,
}: DrawingLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);

  const map = useMapEvents({
    mousedown(e: LeafletMouseEvent) {
      if (!drawMode) return;

      map.dragging.disable();
      setIsDrawing(true);
      setStartPoint(e.latlng);
      setTempLine(null);
      setFinalLine(null);
      onDrawStart();
    },

    mousemove(e: LeafletMouseEvent) {
      if (!drawMode || !isDrawing || !startPoint) return;

      setTempLine([
        { lat: startPoint.lat, lng: startPoint.lng },
        { lat: e.latlng.lat, lng: e.latlng.lng },
      ]);
    },

    mouseup(e: LeafletMouseEvent) {
      if (!drawMode || !isDrawing || !startPoint) return;

      map.dragging.enable();
      setIsDrawing(false);

      const line: LineCoords = {
        start: { lat: startPoint.lat, lng: startPoint.lng },
        end: { lat: e.latlng.lat, lng: e.latlng.lng },
      };

      setTempLine(null);
      setFinalLine([line.start, line.end]);
      setStartPoint(null);
      onDrawEnd();
      onLineDrawn(line);
    },
  });

  // Re-enable dragging when draw mode is turned off
  useEffect(() => {
    if (!drawMode) {
      map.dragging.enable();
      setIsDrawing(false);
      setStartPoint(null);
    }
  }, [drawMode, map]);

  return null;
}

export function MapPane({ onLineDrawn }: MapPaneProps) {
  const [drawMode, setDrawMode] = useState(false);
  const [loading, setLoading] = useState(0);
  const [tempLine, setTempLine] = useState<[Coordinate, Coordinate] | null>(null);
  const [finalLine, setFinalLine] = useState<[Coordinate, Coordinate] | null>(null);

  const handleDrawStart = useCallback(() => {
    setLoading(30);
  }, []);

  const handleDrawEnd = useCallback(() => {
    setLoading(100);
    setTimeout(() => setLoading(0), 300);
  }, []);

  const handleToggleDrawMode = useCallback(() => {
    setDrawMode((prev) => !prev);
  }, []);

  return (
    <div className={styles.container}>
      <LoadingBar progress={loading} color="blue" />

      <div className={styles.controls}>
        <button
          onClick={handleToggleDrawMode}
          className={`${styles.button} ${drawMode ? styles.active : ''}`}
          aria-pressed={drawMode}
        >
          {drawMode ? 'Drawing Mode (Click & Drag)' : 'Enable Draw Mode'}
        </button>
      </div>

      <MapContainer
        center={[40.7128, -74.006]}
        zoom={10}
        className={`${styles.map} ${drawMode ? styles.drawing : ''}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <TileLayer
          attribution='Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          opacity={0.5}
        />

        <DrawingLayer
          drawMode={drawMode}
          onLineDrawn={onLineDrawn}
          onDrawStart={handleDrawStart}
          onDrawEnd={handleDrawEnd}
          setTempLine={setTempLine}
          setFinalLine={setFinalLine}
        />

        {tempLine && (
          <Polyline
            positions={tempLine.map((c) => [c.lat, c.lng] as [number, number])}
            pathOptions={{ color: 'red', weight: 3, opacity: 0.7 }}
          />
        )}

        {finalLine && (
          <Polyline
            positions={finalLine.map((c) => [c.lat, c.lng] as [number, number])}
            pathOptions={{ color: 'blue', weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
