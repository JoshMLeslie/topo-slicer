import type { LeafletMouseEvent } from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { SearchControlOptions } from 'leaflet-geosearch/lib/SearchControl.js';
import { useCallback, useEffect, useState } from 'react';
import {
	CircleMarker,
	MapContainer,
	Marker,
	Polyline,
	Popup,
	TileLayer,
	useMap,
	useMapEvents,
} from 'react-leaflet';
import type { Coordinate, DrawMethod } from '../../types';
import { fetchElevations } from '../../utils/api';
import { haversineDistance } from '../../utils/geo';
import { LoadingBar } from '../LoadingBar';
import styles from './MapPane.module.scss';

interface SpotElevation {
	coord: Coordinate;
	elevation: number | null;
	loading: boolean;
}

const MIN_LINE_DISTANCE_METERS = 100;

function calculatePolylineLength(points: Coordinate[]): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]!;
		const curr = points[i]!;
		total += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
	}
	return total;
}

interface MapPaneProps {
	onLineDrawn: (points: Coordinate[]) => void;
	onClear: () => void;
}

interface DrawingLayerProps {
	drawMode: boolean;
	drawMethod: DrawMethod;
	onLineDrawn: (points: Coordinate[]) => void;
	onSpotElevation: (point: Coordinate) => void;
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
	onSpotElevation,
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
			const start = {lat: e.latlng.lat, lng: e.latlng.lng};
			setDragStart(start);
			setTempPoints([start]);
			setFinalPoints([]);
			onDrawStart();
		},

		mousemove(e: LeafletMouseEvent) {
			if (!drawMode) return;

			if (drawMethod === 'drag' && isDrawing && dragStart) {
				setTempPoints([dragStart, {lat: e.latlng.lat, lng: e.latlng.lng}]);
			} else if (drawMethod === 'points' && tempPoints.length > 0) {
				setHoverPoint({lat: e.latlng.lat, lng: e.latlng.lng});
			}
		},

		mouseup(e: LeafletMouseEvent) {
			if (!drawMode || drawMethod !== 'drag' || !isDrawing || !dragStart)
				return;

			map.dragging.enable();
			setIsDrawing(false);

			const points: Coordinate[] = [
				dragStart,
				{lat: e.latlng.lat, lng: e.latlng.lng},
			];

			const distance = calculatePolylineLength(points);
			if (distance < MIN_LINE_DISTANCE_METERS) {
				setTempPoints([]);
				setDragStart(null);
				return;
			}

			setTempPoints([]);
			setFinalPoints(points);
			setDragStart(null);
			onDrawEnd();
			onLineDrawn(points);
		},

		click(e: LeafletMouseEvent) {
			if (!drawMode || drawMethod !== 'points') return;

			const newPoint = {lat: e.latlng.lat, lng: e.latlng.lng};

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

			const distance = calculatePolylineLength(tempPoints);
			if (distance < MIN_LINE_DISTANCE_METERS) {
				setTimeout(() => map.doubleClickZoom.enable(), 100);
				return;
			}

			const finalPoints = [...tempPoints];
			setTempPoints([]);
			setFinalPoints(finalPoints);
			setHoverPoint(null);
			onDrawEnd();
			onLineDrawn(finalPoints);

			setTimeout(() => map.doubleClickZoom.enable(), 100);
		},

		contextmenu(e: LeafletMouseEvent) {
			if (!drawMode || drawMethod !== 'points' || tempPoints.length < 1) return;

			e.originalEvent.preventDefault();

			// Single point - spot elevation
			if (tempPoints.length === 1) {
				onSpotElevation(tempPoints[0]!);
				setTempPoints([]);
				setHoverPoint(null);
				onDrawEnd();
				return;
			}

			const distance = calculatePolylineLength(tempPoints);
			if (distance < MIN_LINE_DISTANCE_METERS) {
				return;
			}

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
						pathOptions={{color: 'red', fillColor: 'red', fillOpacity: 1}}
					/>
				))}

			{/* Hover preview line in points mode */}
			{drawMethod === 'points' && tempPoints.length > 0 && hoverPoint && (
				<Polyline
					positions={[
						[
							tempPoints[tempPoints.length - 1]!.lat,
							tempPoints[tempPoints.length - 1]!.lng,
						],
						[hoverPoint.lat, hoverPoint.lng],
					]}
					pathOptions={{
						color: 'red',
						weight: 2,
						opacity: 0.5,
						dashArray: '5,5',
					}}
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

export function MapPane({onLineDrawn, onClear}: MapPaneProps) {
	const [drawMode, setDrawMode] = useState(false);
	const [drawMethod, setDrawMethod] = useState<DrawMethod>('drag');
	const [loading, setLoading] = useState(0);
	const [tempPoints, setTempPoints] = useState<Coordinate[]>([]);
	const [finalPoints, setFinalPoints] = useState<Coordinate[]>([]);
	const [spotElevation, setSpotElevation] = useState<SpotElevation | null>(null);

	const handleDrawStart = useCallback(() => {
		setLoading(30);
		setSpotElevation(null);
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

	const handleSpotElevation = useCallback(async (point: Coordinate) => {
		setSpotElevation({ coord: point, elevation: null, loading: true });
		setTempPoints([]);
		try {
			const elevations = await fetchElevations([point]);
			setSpotElevation({ coord: point, elevation: elevations[0] ?? null, loading: false });
		} catch {
			setSpotElevation({ coord: point, elevation: null, loading: false });
		}
	}, []);

	const handleFinishPoints = useCallback(() => {
		if (tempPoints.length === 1) {
			// Single point - show spot elevation
			handleSpotElevation(tempPoints[0]!);
			handleDrawEnd();
			return;
		}
		if (
			tempPoints.length >= 2 &&
			calculatePolylineLength(tempPoints) >= MIN_LINE_DISTANCE_METERS
		) {
			setFinalPoints(tempPoints);
			onLineDrawn(tempPoints);
			setTempPoints([]);
			handleDrawEnd();
		}
	}, [tempPoints, onLineDrawn, handleDrawEnd, handleSpotElevation]);

	const handleClearPoints = useCallback(() => {
		setTempPoints([]);
		setFinalPoints([]);
		setSpotElevation(null);
		onClear();
	}, [onClear]);

	// ESC key handler: clear points -> disable draw mode -> clear drawing
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Escape') return;

			if (drawMode) {
				if (tempPoints.length > 0) {
					setTempPoints([]);
				} else {
					setDrawMode(false);
				}
			} else if (finalPoints.length > 0 || spotElevation) {
				handleClearPoints();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [drawMode, tempPoints.length, finalPoints.length, spotElevation, handleClearPoints]);

	return (
		<div className={styles.container}>
			<LoadingBar progress={loading} color="blue" />

			<div className={styles.controls}>
				<div className={styles.buttonGroup}>
					<div className={styles.mainRow}>
						<button
							onClick={handleClearPoints}
							className={`${styles.clearCircle} ${
								finalPoints.length > 0 || spotElevation ? styles.visible : ''
							}`}
							aria-label="Clear drawing"
						>
							×
						</button>
						<button
							onClick={handleToggleDrawMode}
							className={`${styles.button} ${drawMode ? styles.active : ''}`}
							aria-pressed={drawMode}
							aria-expanded={drawMode}
						>
							{drawMode ? 'Drawing Mode' : 'Enable Draw Mode'}
						</button>
					</div>

					<div
						className={`${styles.methodToggle} ${
							drawMode ? styles.visible : ''
						}`}
					>
						<button
							onClick={() => setDrawMethod('drag')}
							className={`${styles.methodButton} ${
								drawMethod === 'drag' ? styles.selected : ''
							}`}
						>
							Drag
						</button>
						<button
							onClick={() => setDrawMethod('points')}
							className={`${styles.methodButton} ${
								drawMethod === 'points' ? styles.selected : ''
							}`}
						>
							Points
						</button>
					</div>

					{drawMode && drawMethod === 'points' && tempPoints.length >= 1 && (
						<div className={styles.pointsActions}>
							<button
								onClick={handleFinishPoints}
								className={styles.finishButton}
							>
								{tempPoints.length === 1 ? 'Get Elevation' : `Finish (${tempPoints.length} pts)`}
							</button>
							<button
								onClick={handleClearPoints}
								className={styles.clearButton}
							>
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
					onSpotElevation={handleSpotElevation}
					onDrawStart={handleDrawStart}
					onDrawEnd={handleDrawEnd}
					tempPoints={tempPoints}
					setTempPoints={setTempPoints}
					setFinalPoints={setFinalPoints}
				/>

				{/* Temp line while drawing */}
				{tempPoints.length >= 2 && (
					<Polyline
						positions={tempPoints.map(
							(c) => [c.lat, c.lng] as [number, number]
						)}
						pathOptions={{color: 'red', weight: 3, opacity: 0.7}}
					/>
				)}

				{/* Final line */}
				{finalPoints.length >= 2 && tempPoints.length === 0 && (
					<Polyline
						positions={finalPoints.map(
							(c) => [c.lat, c.lng] as [number, number]
						)}
						pathOptions={{color: 'blue', weight: 4}}
					/>
				)}

				{/* Spot elevation marker */}
				{spotElevation && (
					<Marker
						position={[spotElevation.coord.lat, spotElevation.coord.lng]}
						eventHandlers={{
							add: (e) => {
								e.target.openPopup();
							},
						}}
					>
						<Popup>
							{spotElevation.loading ? (
								<span>Loading...</span>
							) : spotElevation.elevation !== null ? (
								<span><strong>{spotElevation.elevation.toFixed(1)} m</strong></span>
							) : (
								<span>Elevation unavailable</span>
							)}
						</Popup>
					</Marker>
				)}
			</MapContainer>
		</div>
	);
}
