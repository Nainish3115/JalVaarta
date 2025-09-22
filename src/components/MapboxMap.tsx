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

      // Add India coastline highlight - accurate Indian Ocean border
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
                  // Western coast (Arabian Sea) - Gujarat to Kerala
                  [68.1766, 23.7461], // Kutch, Gujarat
                  [69.6293, 22.7996], // Gujarat coast
                  [70.0577, 22.3039], // Porbandar
                  [70.4579, 21.5222], // Veraval
                  [72.0208, 21.1702], // Surat area
                  [72.8777, 19.0760], // Mumbai
                  [73.0169, 18.5204], // Pune coast
                  [73.8567, 15.2993], // Goa
                  [74.1240, 14.8546], // Karwar
                  [74.8560, 12.9716], // Mangalore
                  [75.7139, 11.2588], // Kozhikode, Kerala
                  [76.2673, 9.9312],  // Kochi
                  [76.5762, 8.5241],  // Trivandrum area
                  
                  // Southern tip - Kerala to Tamil Nadu
                  [77.5385, 8.0883],  // Kanyakumari region
                  [78.1348, 8.7642],  // Tuticorin area
                  
                  // Eastern coast (Bay of Bengal) - Tamil Nadu to West Bengal
                  [78.6569, 10.7905], // Thanjavur coast
                  [79.8083, 11.6643], // Puducherry
                  [80.2707, 13.0827], // Chennai
                  [80.1514, 14.4426], // Nellore area
                  [81.6296, 16.5062], // Kakinada
                  [82.2426, 17.6868], // Visakhapatnam
                  [84.6731, 17.7231], // Odisha border
                  [85.8245, 20.9517], // Bhubaneswar coast
                  [86.4269, 21.9270], // Balasore
                  [87.8550, 21.9497], // West Bengal border
                  [88.3639, 22.5726], // Kolkata area
                  [89.2519, 21.8069], // Sundarbans
                  
                  // Andaman and Nicobar Islands (separate feature for visibility)
                ]
              }
            },
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  // Andaman Islands coastline
                  [92.7519, 11.7401], // South Andaman
                  [92.6586, 12.0537], // Port Blair area
                  [92.9376, 12.5186], // Middle Andaman
                  [93.0403, 13.2309], // North Andaman
                ]
              }
            },
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  // Nicobar Islands coastline
                  [93.5804, 8.8302], // Great Nicobar
                  [93.5274, 9.1569], // Little Nicobar
                  [92.7597, 9.3439], // Car Nicobar
                ]
              }
            },
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  // Lakshadweep Islands
                  [71.6431, 10.5667], // Kavaratti
                  [72.1781, 11.8373], // Minicoy
                  [72.6369, 12.2840], // Agatti
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
          <svg width="500" height="400" viewBox="0 0 500 400" className="opacity-40">
            {/* India mainland outline - more accurate shape */}
            <path
              d="M120 100 L140 80 L160 75 L180 80 L200 85 L220 90 L240 100 L260 115 L280 130 L300 145 L320 165 L330 185 L335 205 L330 225 L320 245 L300 265 L280 280 L260 290 L240 295 L220 298 L200 300 L180 295 L160 285 L140 270 L125 250 L115 230 L110 210 L115 190 L120 170 L115 150 L120 130 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary/50"
            />
            
            {/* Detailed coastline highlighting the Indian Ocean border */}
            <path
              d="M120 100 C125 95, 135 85, 160 75 C180 78, 200 82, 240 100 C260 115, 280 130, 320 165 C330 185, 335 205, 330 225 C320 245, 300 265, 280 280 C260 290, 240 295, 220 298 C200 300, 180 295, 160 285 C140 270, 125 250, 115 230"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              className="animate-pulse"
              opacity="0.9"
            />
            
            {/* Western coast (Arabian Sea) */}
            <path
              d="M120 100 C125 110, 130 120, 135 140 C138 160, 140 180, 142 200 C145 220, 148 240, 155 260"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              className="animate-pulse"
              opacity="0.7"
            />
            
            {/* Eastern coast (Bay of Bengal) */}
            <path
              d="M320 165 C325 180, 330 195, 330 225 C328 245, 320 265, 300 280 C285 290, 270 295, 250 298"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="3"
              className="animate-pulse"
              opacity="0.7"
            />
            
            {/* Southern tip */}
            <path
              d="M155 260 C170 275, 185 285, 200 295 C220 300, 240 298, 250 298"
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              className="animate-pulse"
              opacity="0.8"
            />
            
            {/* Andaman & Nicobar Islands */}
            <g opacity="0.6">
              <circle cx="380" cy="200" r="3" fill="#3b82f6" className="animate-pulse" />
              <circle cx="385" cy="220" r="2" fill="#3b82f6" className="animate-pulse" />
              <circle cx="390" cy="240" r="2" fill="#3b82f6" className="animate-pulse" />
            </g>
            
            {/* Lakshadweep Islands */}
            <g opacity="0.6">
              <circle cx="80" cy="180" r="2" fill="#06b6d4" className="animate-pulse" />
              <circle cx="75" cy="190" r="1.5" fill="#06b6d4" className="animate-pulse" />
              <circle cx="85" cy="200" r="1.5" fill="#06b6d4" className="animate-pulse" />
            </g>
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