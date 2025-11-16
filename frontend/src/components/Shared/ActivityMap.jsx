import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import polyline from 'polyline-encoded';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const ActivityMap = ({ summaryPolyline, height = '300px', className = '' }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!summaryPolyline || !mapRef.current) return;

    try {
      // Decode polyline
      const coordinates = polyline.decode(summaryPolyline);
      
      // Convert to [lat, lng] format for Leaflet
      const positions = coordinates.map(coord => [coord[0], coord[1]]);
      
      if (positions.length === 0) return;

      // Initialize map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          scrollWheelZoom: false,
          dragging: true,
          zoomControl: true,
        });

        // Add OpenStreetMap tiles (FREE)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      // Clear existing layers
      mapInstanceRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polyline || layer instanceof L.Marker) {
          mapInstanceRef.current.removeLayer(layer);
        }
      });

      // Draw route
      const routeLine = L.polyline(positions, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(mapInstanceRef.current);

      // Add start marker
      const startIcon = L.divIcon({
        html: `<div style="background-color: #10B981; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      
      L.marker(positions[0], { icon: startIcon })
        .bindPopup('<strong>Start</strong>')
        .addTo(mapInstanceRef.current);

      // Add end marker
      const endIcon = L.divIcon({
        html: `<div style="background-color: #EF4444; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      
      L.marker(positions[positions.length - 1], { icon: endIcon })
        .bindPopup('<strong>Finish</strong>')
        .addTo(mapInstanceRef.current);

      // Fit bounds to show entire route
      mapInstanceRef.current.fitBounds(routeLine.getBounds(), {
        padding: [20, 20],
      });

    } catch (error) {
      console.error('Error rendering map:', error);
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [summaryPolyline]);

  if (!summaryPolyline) {
    return (
      <div 
        className={`bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          <p className="text-sm text-gray-500">No route data</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className={`rounded-lg ${className}`}
      style={{ height, width: '100%' }}
    />
  );
};

export default ActivityMap;