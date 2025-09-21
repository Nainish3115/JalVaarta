import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface Report {
  id: string;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  status: string;
  created_at: string;
  media_url?: string;
  profiles: {
    name: string;
  } | null;
}

interface MapboxMapProps {
  reports: Report[];
  selectedReport: Report | null;
  onReportSelect: (report: Report) => void;
  center?: [number, number];
  zoom?: number;
}

const MapboxMap: React.FC<MapboxMapProps> = ({ 
  reports, 
  selectedReport, 
  onReportSelect,
  center = [77.2090, 28.6139], // New Delhi coordinates
  zoom = 5 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  useEffect(() => {
    // Get Mapbox token from Supabase secrets
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          console.error('Mapbox token not found:', error);
          // Fallback to demo mode
          setMapboxToken('demo');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        setMapboxToken('demo');
      }
    };

    getMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    if (map.current) return; // Initialize map only once

    if (mapboxToken === 'demo') {
      // Demo mode - show India outline without real map
      return;
    }

    // Initialize Mapbox map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add India coastline data and styling
    map.current.on('load', () => {
      if (!map.current) return;

      // Add India coastline highlight
      map.current.addSource('india-coastline', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  // Simplified India coastline coordinates
                  [68.1766, 23.7461], // Gujarat coast
                  [72.8777, 19.0760], // Mumbai
                  [75.7139, 11.2588], // Kerala coast
                  [78.4867, 17.3850], // Andhra coast
                  [80.2707, 13.0827], // Tamil Nadu coast
                  [85.8245, 20.9517], // Odisha coast
                  [88.3639, 22.5726], // West Bengal coast
                  [92.9376, 11.7401], // Andaman coast
                ]
              }
            }
          ]
        }
      });

      map.current.addLayer({
        id: 'india-coastline-highlight',
        type: 'line',
        source: 'india-coastline',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8
        }
      });

      // Add report markers
      reports.forEach(report => {
        const el = document.createElement('div');
        el.className = 'report-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        
        // Color based on status
        switch (report.status) {
          case 'verified':
            el.style.backgroundColor = '#22c55e';
            break;
          case 'pending':
            el.style.backgroundColor = '#eab308';
            break;
          case 'rejected':
            el.style.backgroundColor = '#ef4444';
            break;
          default:
            el.style.backgroundColor = '#6b7280';
        }

        el.addEventListener('click', () => {
          onReportSelect(report);
        });

        new mapboxgl.Marker(el)
          .setLngLat([report.longitude, report.latitude])
          .addTo(map.current!);
      });
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, reports, center, zoom, onReportSelect]);

  const getHazardEmoji = (type: string) => {
    switch (type) {
      case 'tsunami': return '🌊';
      case 'flood': return '🌊';
      case 'high_waves': return '🌊';
      case 'storm_surge': return '⛈️';
      case 'abnormal_sea_behavior': return '❓';
      default: return '⚠️';
    }
  };

  if (mapboxToken === 'demo') {
    // Demo mode - India outline view
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg overflow-hidden">
        {/* India Map Outline */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="400" height="300" viewBox="0 0 400 300" className="opacity-30">
            <path
              d="M150 50 L200 40 L250 60 L300 80 L320 120 L310 160 L280 200 L250 220 L200 240 L150 230 L120 200 L100 160 L110 120 L130 80 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-primary"
            />
            {/* Coastline highlight */}
            <path
              d="M150 50 L200 40 L250 60 L300 80 L320 120 M320 120 L310 160 L280 200 L250 220 L200 240 L150 230 L120 200"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              className="animate-pulse"
            />
          </svg>
        </div>

        {/* Report markers for demo */}
        <div className="absolute inset-0">
          {reports.slice(0, 6).map((report, index) => {
            const positions = [
              { top: '20%', left: '60%' }, // Gujarat
              { top: '40%', left: '55%' }, // Maharashtra
              { top: '70%', left: '45%' }, // Kerala
              { top: '60%', left: '65%' }, // Tamil Nadu
              { top: '30%', left: '75%' }, // Odisha
              { top: '20%', left: '80%' }, // West Bengal
            ];
            
            const position = positions[index] || positions[0];
            const isSelected = selectedReport?.id === report.id;
            
            return (
              <div
                key={report.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-125 z-10' : 'hover:scale-110'
                }`}
                style={{ top: position.top, left: position.left }}
                onClick={() => onReportSelect(report)}
              >
                <div className={`
                  w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm
                  ${report.status === 'verified' ? 'bg-green-500' : 
                    report.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}
                  ${isSelected ? 'ring-2 ring-primary animate-pulse' : ''}
                `}>
                  {getHazardEmoji(report.hazard_type)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Map info */}
        <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
          <h4 className="text-sm font-medium mb-2">India Coastal Regions</h4>
          <p className="text-xs text-muted-foreground">Interactive map showing ocean hazard reports</p>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-3 shadow-lg">
          <h4 className="text-sm font-medium mb-2">Status Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Verified</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Pending</span>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Rejected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/5 rounded-lg" />
      
      {/* Selected report info */}
      {selectedReport && (
        <div className="absolute top-4 right-4 bg-white/95 dark:bg-gray-800/95 rounded-lg p-4 shadow-lg max-w-xs">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{getHazardEmoji(selectedReport.hazard_type)}</span>
            <div>
              <h4 className="font-medium capitalize">
                {selectedReport.hazard_type.replace('_', ' ')}
              </h4>
              <p className="text-xs text-muted-foreground">
                {selectedReport.location_name || 'Unknown Location'}
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {selectedReport.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;