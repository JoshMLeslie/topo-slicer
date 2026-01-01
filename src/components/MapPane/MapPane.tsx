import { useState, useCallback, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { SearchControlOptions } from 'leaflet-geosearch/lib/SearchControl.js';
import type { LeafletMouseEvent } from 'leaflet';
import type { Coordinate, DrawMethod } from '../../types';
import { LoadingBar } from '../LoadingBar';
import styles from './MapPane.module.scss';

interface MapPaneProps {
  onLineDrawn: (points: Coordinate[]) => void;
}

interface DrawingLayerProps {
  drawMode: boolean;
  drawMethod: DrawMethod;
  onLineDrawn: (points: Coordinate[]) => void;
  onDrawStart: () => void;
  onDrawEnd: () => void;
  tempPoints: Coordinate[];
  setTempPoints: React.Dispatch<React.SetStateAction<Coordinate[]>>;
  setFinalPoints: (points: Coordinate[]) => void;
}

function DrawingLayer({
  drawMode,
  drawMethod,
  onLineDrawn,
  onDrawStart,
  onDrawEnd,
  tempPoints,
  setTempPoints,
  setFinalPoints,
}: DrawingLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<Coordinate | null>(null);
  const [hoverPoint, setHoverPoint] = useState<Coordinate | null>(null);

  const map = useMapEvents({
    mousedown(e: LeafletMouseEvent) {
      if (!drawMode || drawMethod !== 'drag') return;

      map.dragging.disable();
      setIsDrawing(true);
      const start = { lat: e.latlng.lat, lng: e.latlng.lng };
      setDragStart(start);
      setTempPoints([start]);
      setFinalPoints([]);
      onDrawStart();
    },

    mousemove(e: LeafletMouseEvent) {
      if (!drawMode) return;

      if (drawMethod === 'drag' && isDrawing && dragStart) {
        setTempPoints([dragStart, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      } else if (drawMethod === 'points' && tempPoints.length > 0) {
        setHoverPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },

    mouseup(e: LeafletMouseEvent) {
      if (!drawMode || drawMethod !== 'drag' || !isDrawing || !dragStart) return;

      map.dragging.enable();
      setIsDrawing(false);

      const points: Coordinate[] = [
        dragStart,
        { lat: e.latlng.lat, lng: e.latlng.lng },
      ];

      setTempPoints([]);
      setFinalPoints(points);
      setDragStart(null);
      onDrawEnd();
      onLineDrawn(points);
    },

    click(e: LeafletMouseEvent) {
      if (!drawMode || drawMethod !== 'points') return;

      const newPoint = { lat: e.latlng.lat, lng: e.latlng.lng };

      if (tempPoints.length === 0) {
        onDrawStart();
      }

      setTempPoints((prev) => [...prev, newPoint]);
      setHoverPoint(null);
    },

    dblclick(e: LeafletMouseEvent) {
      if (!drawMode || drawMethod !== 'points' || tempPoints.length < 2) return;

      e.originalEvent.preventDefault();
      map.doubleClickZoom.disable();

      const finalPoints = [...tempPoints];
      setTempPoints([]);
      setFinalPoints(finalPoints);
      setHoverPoint(null);
      onDrawEnd();
      onLineDrawn(finalPoints);

      setTimeout(() => map.doubleClickZoom.enable(), 100);
    },

    contextmenu(e: LeafletMouseEvent) {
      if (!drawMode || drawMethod !== 'points' || tempPoints.length < 2) return;

      e.originalEvent.preventDefault();

      const finalPoints = [...tempPoints];
      setTempPoints([]);
      setFinalPoints(finalPoints);
      setHoverPoint(null);
      onDrawEnd();
      onLineDrawn(finalPoints);
    },
  });

  // Reset when draw mode or method changes
  useEffect(() => {
    if (!drawMode) {
      map.dragging.enable();
      setIsDrawing(false);
      setDragStart(null);
      setTempPoints([]);
      setHoverPoint(null);
    }
  }, [drawMode, drawMethod, map, setTempPoints]);

  return (
    <>
      {/* Show vertices in points mode */}
      {drawMethod === 'points' &&
        tempPoints.map((point, i) => (
          <CircleMarker
            key={i}
            center={[point.lat, point.lng]}
            radius={6}
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 1 }}
          />
        ))}

      {/* Hover preview line in points mode */}
      {drawMethod === 'points' && tempPoints.length > 0 && hoverPoint && (
        <Polyline
          positions={[
            [tempPoints[tempPoints.length - 1]!.lat, tempPoints[tempPoints.length - 1]!.lng],
            [hoverPoint.lat, hoverPoint.lng],
          ]}
          pathOptions={{ color: 'red', weight: 2, opacity: 0.5, dashArray: '5,5' }}
        />
      )}
    </>
  );
}

function SearchControl() {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      searchLabel: 'Search for a location...',
    } satisfies SearchControlOptions);

    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
}

export function MapPane({ onLineDrawn }: MapPaneProps) {
  const [drawMode, setDrawMode] = useState(false);
  const [drawMethod, setDrawMethod] = useState<DrawMethod>('drag');
  const [loading, setLoading] = useState(0);
  const [tempPoints, setTempPoints] = useState<Coordinate[]>([]);
  const [finalPoints, setFinalPoints] = useState<Coordinate[]>([]);

  const handleDrawStart = useCallback(() => {
    setLoading(30);
  }, []);

  const handleDrawEnd = useCallback(() => {
    setLoading(100);
    setTimeout(() => setLoading(0), 300);
  }, []);

  const handleToggleDrawMode = useCallback(() => {
    setDrawMode((prev) => {
      if (prev) {
        // Turning off - clear points
        setTempPoints([]);
      }
      return !prev;
    });
  }, []);

  const handleFinishPoints = useCallback(() => {
    if (tempPoints.length >= 2) {
      setFinalPoints(tempPoints);
      onLineDrawn(tempPoints);
      setTempPoints([]);
      handleDrawEnd();
    }
  }, [tempPoints, onLineDrawn, handleDrawEnd]);

  const handleClearPoints = useCallback(() => {
    setTempPoints([]);
    setFinalPoints([]);
  }, []);

  return (
    <div className={styles.container}>
      <LoadingBar progress={loading} color="blue" />

      <div className={styles.controls}>
        <div className={styles.buttonGroup}>
          <button
            onClick={handleToggleDrawMode}
            className={`${styles.button} ${drawMode ? styles.active : ''}`}
            aria-pressed={drawMode}
            aria-expanded={drawMode}
          >
            {drawMode ? 'Drawing Mode' : 'Enable Draw Mode'}
          </button>

          <div className={`${styles.methodToggle} ${drawMode ? styles.visible : ''}`}>
            <button
              onClick={() => setDrawMethod('drag')}
              className={`${styles.methodButton} ${drawMethod === 'drag' ? styles.selected : ''}`}
            >
              Drag
            </button>
            <button
              onClick={() => setDrawMethod('points')}
              className={`${styles.methodButton} ${drawMethod === 'points' ? styles.selected : ''}`}
            >
              Points
            </button>
          </div>

          {drawMode && drawMethod === 'points' && tempPoints.length >= 2 && (
            <div className={styles.pointsActions}>
              <button onClick={handleFinishPoints} className={styles.finishButton}>
                Finish ({tempPoints.length} pts)
              </button>
              <button onClick={handleClearPoints} className={styles.clearButton}>
                Clear
              </button>
            </div>
          )}
        </div>
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

        <SearchControl />

        <DrawingLayer
          drawMode={drawMode}
          drawMethod={drawMethod}
          onLineDrawn={onLineDrawn}
          onDrawStart={handleDrawStart}
          onDrawEnd={handleDrawEnd}
          tempPoints={tempPoints}
          setTempPoints={setTempPoints}
          setFinalPoints={setFinalPoints}
        />

        {/* Temp line while drawing */}
        {tempPoints.length >= 2 && (
          <Polyline
            positions={tempPoints.map((c) => [c.lat, c.lng] as [number, number])}
            pathOptions={{ color: 'red', weight: 3, opacity: 0.7 }}
          />
        )}

        {/* Final line */}
        {finalPoints.length >= 2 && tempPoints.length === 0 && (
          <Polyline
            positions={finalPoints.map((c) => [c.lat, c.lng] as [number, number])}
            pathOptions={{ color: 'blue', weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
