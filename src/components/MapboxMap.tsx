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
  predictionZones?: Array<{
    center: [number, number];
    radius: number;
    riskLevel: string;
    riskScore: number;
    predictions: any[];
  }>;
  selectedReport: Report | null;
  onReportSelect: (report: Report) => void;
  center?: [number, number];
  zoom?: number;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  reports,
  predictionZones = [],
  selectedReport,
  onReportSelect,
  center = [77.209, 28.6139], // Default: New Delhi
  zoom = 5
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [alertZones, setAlertZones] = useState<
    Array<{ center: [number, number]; radius: number; reportCount: number; reports: Report[] }>
  >([]);
  const weatherMarkersRef = useRef<mapboxgl.Marker[]>([]);

  interface WeatherData {
    temperature: number;
    humidity: number;
    pressure: number;
    wind_speed: number;
    wind_direction: number;
    visibility: number;
    precipitation: number;
    weather_condition: string;
    weather_description: string;
    timestamp: string;
  }

  const coastalLocations = [
    { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
    { name: 'Panaji', lat: 15.4909, lng: 73.8278 },
    { name: 'Mangalore', lat: 12.9141, lng: 74.856 },
    { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
    { name: 'Trivandrum', lat: 8.5241, lng: 76.9366 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 }
  ];

  const [weatherDataMap, setWeatherDataMap] = useState<Record<string, WeatherData>>({});

  // 🔑 Fetch Mapbox token
  useEffect(() => {
    const getMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          console.error('Mapbox token not found:', error);
          setMapboxToken('demo');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
        setMapboxToken('demo');
      }
    };
    getMapboxToken();
  }, []);

  // 🌦 Fetch weather data
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const results = await Promise.all(
          coastalLocations.map(async (loc) => {
            const { data, error } = await supabase.functions.invoke('weather-data', {
              body: { latitude: loc.lat, longitude: loc.lng }
            });
            if (error) throw error;
            return { name: loc.name, data } as { name: string; data: WeatherData };
          })
        );
        const map: Record<string, WeatherData> = {};
        results.forEach(({ name, data }) => {
          if (data) map[name] = data;
        });
        setWeatherDataMap(map);
      } catch (err) {
        console.error('Error fetching weather data:', err);
      }
    };
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ⚠️ Calculate alert zones
  useEffect(() => {
    const calculateAlertZones = () => {
      const verifiedReports = reports.filter((r) => r.status === 'verified');
      const zones: Array<{ center: [number, number]; radius: number; reportCount: number; reports: Report[] }> = [];
      const RADIUS_KM = 50;
      const processedReports = new Set<string>();

      verifiedReports.forEach((report) => {
        if (processedReports.has(report.id)) return;
        const nearbyReports = verifiedReports.filter((otherReport) => {
          if (processedReports.has(otherReport.id) || report.id === otherReport.id) return false;
          const lat1 = (report.latitude * Math.PI) / 180;
          const lat2 = (otherReport.latitude * Math.PI) / 180;
          const deltaLat = ((otherReport.latitude - report.latitude) * Math.PI) / 180;
          const deltaLng = ((otherReport.longitude - report.longitude) * Math.PI) / 180;
          const a =
            Math.sin(deltaLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = 6371 * c;
          return distance <= RADIUS_KM;
        });
        if (nearbyReports.length >= 1) {
          const allReports = [report, ...nearbyReports];
          const centerLat = allReports.reduce((sum, r) => sum + r.latitude, 0) / allReports.length;
          const centerLng = allReports.reduce((sum, r) => sum + r.longitude, 0) / allReports.length;
          zones.push({
            center: [centerLng, centerLat],
            radius: RADIUS_KM * 1000,
            reportCount: allReports.length,
            reports: allReports
          });
          allReports.forEach((r) => processedReports.add(r.id));
        }
      });
      setAlertZones(zones);
    };
    calculateAlertZones();
  }, [reports]);

  // 🗺 Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    if (map.current) return;

    if (mapboxToken === 'demo') return;

    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('india-districts', {
        type: 'geojson',
        data: '/india_coastline.geojson'
      });

      map.current.addLayer({
        id: 'india-districts-fill',
        type: 'fill',
        source: 'india-districts',
        paint: { 'fill-color': '#e3f2fd', 'fill-opacity': 0.3 }
      });

      map.current.addLayer({
        id: 'india-districts-outline',
        type: 'line',
        source: 'india-districts',
        paint: { 'line-color': '#1976d2', 'line-width': 2 }
      });

      // 📍 Report markers
      reports.forEach((report) => {
        const el = document.createElement('div');
        el.className = 'report-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
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
        el.addEventListener('click', () => onReportSelect(report));
        new mapboxgl.Marker(el).setLngLat([report.longitude, report.latitude]).addTo(map.current!);
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, reports, center, zoom, onReportSelect]);

  // 🔴 Render alert zones dynamically
  useEffect(() => {
    if (!map.current) return;

    alertZones.forEach((zone, index) => {
      const sourceId = `alert-zone-${index}`;
      const circleLayerId = `alert-zone-circle-${index}`;
      const labelLayerId = `alert-zone-label-${index}`;

      if (!map.current!.getSource(sourceId)) {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { reportCount: zone.reportCount },
            geometry: { type: 'Point', coordinates: zone.center }
          }
        });

        map.current!.addLayer({
          id: circleLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': { stops: [[0, 0], [20, zone.radius / 500]] },
            'circle-color': '#ff4444',
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ff4444',
            'circle-stroke-opacity': 0.8
          }
        });

        map.current!.addLayer({
          id: labelLayerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': `⚠ ALERT ZONE\n${zone.reportCount} verified reports`,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-offset': [0, 0]
          },
          paint: {
            'text-color': '#ff4444',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
          }
        });
      }
    });
  }, [alertZones]);

  // 🌤 Weather markers
  useEffect(() => {
    if (!map.current) return;

    weatherMarkersRef.current.forEach((m) => m.remove());
    weatherMarkersRef.current = [];

    coastalLocations.forEach((loc) => {
      const data = weatherDataMap[loc.name];
      if (!data) return;

      const el = document.createElement('div');
      el.style.width = '18px';
      el.style.height = '18px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 10px rgba(0,0,0,0.35)';
      el.style.cursor = 'pointer';

      const updatedAt = (() => {
        try {
          return new Date(data.timestamp).toLocaleString();
        } catch {
          return '';
        }
      })();

      const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
        .setLngLat([loc.lng, loc.lat])
        .setHTML(
          `<div style="min-width:220px;max-width:260px;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);overflow:hidden">
            <div style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between">
              <div>
                <div style="font-weight:800;font-size:14px;color:#111827">${loc.name}</div>
                <div style="margin-top:2px;font-size:11px;color:#6b7280">Updated ${updatedAt}</div>
              </div>
              <div style="font-size:12px;background:#eff6ff;color:#1d4ed8;padding:4px 8px;border-radius:999px;border:1px solid #dbeafe;white-space:nowrap">
                ${data.weather_description}
              </div>
            </div>
            <div style="padding:0 12px 12px;font-size:12px;color:#374151">
              <strong>Temp:</strong> ${data.temperature}°C • 
              <strong>Humidity:</strong> ${data.humidity}% • 
              <strong>Wind:</strong> ${data.wind_speed} m/s
            </div>
          </div>`
        );

      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());

      const marker = new mapboxgl.Marker(el).setLngLat([loc.lng, loc.lat]).addTo(map.current!);
      weatherMarkersRef.current.push(marker);
    });
  }, [weatherDataMap]);

  const getHazardEmoji = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tsunami':
        return '🌊';
      case 'flood':
        return '🌊';
      case 'high_waves':
        return '🌊';
      case 'storm_surge':
        return '⛈';
      case 'abnormal_sea_behavior':
        return '❓';
      default:
        return '⚠';
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg shadow-lg" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-background/5 rounded-lg" />
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
          <p className="text-sm text-muted-foreground line-clamp-2">{selectedReport.description}</p>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;