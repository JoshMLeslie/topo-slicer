Topographic Line Slicer Web App
A two-pane webapp that visualizes elevation profiles along lines drawn on a map.
Left Pane (Map):

Interactive map with topographic overlay
Click "Enable Draw Mode" button
Click and drag to draw a line
Shows your drawn line in blue

Right Pane (Elevation Profile):

2D graph showing distance (x-axis) vs elevation (y-axis)
Updates as you draw lines on the map

Progressive Loading:

Initial quick sample: ~15 points for immediate feedback
Progressive refinement: 3 iterations that add midpoints between existing samples
Dual loading bars at top of each pane show loading progress
Visual quality improves over ~2-3 seconds after drawing

Tech Stack:

Leaflet for mapping (from cdnjs.cloudflare.com)
OpenTopoData API for elevation data (NED10m dataset)
Recharts for graphing
React with hooks for state management

Key Features:

Haversine distance calculations for accurate ground distances
Rate-limit friendly API usage (starts coarse, refines gradually)
Real-time visual feedback during data refinement
