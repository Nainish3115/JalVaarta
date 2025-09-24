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
  center = [77.2090, 28.6139], // New Delhi coordinates
  zoom = 5 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [alertZones, setAlertZones] = useState<Array<{
    center: [number, number];
    radius: number;
    reportCount: number;
    reports: Report[];
  }>>([]);

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

  // Alert zone calculation (unchanged)
  useEffect(() => {
    const calculateAlertZones = () => {
      const verifiedReports = reports.filter(r => r.status === 'verified');
      const zones: Array<{
        center: [number, number];
        radius: number;
        reportCount: number;
        reports: Report[];
      }> = [];
      const RADIUS_KM = 50;
      const processedReports = new Set<string>();

      verifiedReports.forEach(report => {
        if (processedReports.has(report.id)) return;
        const nearbyReports = verifiedReports.filter(otherReport => {
          if (processedReports.has(otherReport.id) || report.id === otherReport.id) return false;
          const lat1 = report.latitude * Math.PI / 180;
          const lat2 = otherReport.latitude * Math.PI / 180;
          const deltaLat = (otherReport.latitude - report.latitude) * Math.PI / 180;
          const deltaLng = (otherReport.longitude - report.longitude) * Math.PI / 180;
          const a = Math.sin(deltaLat/2) ** 2 +
                   Math.cos(lat1) * Math.cos(lat2) *
                   Math.sin(deltaLng/2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
          allReports.forEach(r => processedReports.add(r.id));
        }
      });
      setAlertZones(zones);
    };
    calculateAlertZones();
  }, [reports]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;
    if (map.current) return;

    if (mapboxToken === 'demo') return;

    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // ✅ Add India districts from gadm41_IND_3.json
      map.current.addSource('india-districts', {
        type: 'geojson',
        data: '/india_coastline.geojson'
      });

      map.current.addLayer({
        id: 'india-districts-fill',
        type: 'fill',
        source: 'india-districts',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.1
        }
      });

      map.current.addLayer({
        id: 'india-districts-outline',
        type: 'line',
        source: 'india-districts',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 5
        }
      });

      // Report markers
      reports.forEach(report => {
        const el = document.createElement('div');
        el.className = 'report-marker';
        el.style.width = '20px';
        el.style.height = '20px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        switch (report.status) {
          case 'verified': el.style.backgroundColor = '#22c55e'; break;
          case 'pending': el.style.backgroundColor = '#eab308'; break;
          case 'rejected': el.style.backgroundColor = '#ef4444'; break;
          default: el.style.backgroundColor = '#6b7280';
        }
        el.addEventListener('click', () => onReportSelect(report));
        new mapboxgl.Marker(el).setLngLat([report.longitude, report.latitude]).addTo(map.current!);
      });

      // Alert zones
      alertZones.forEach((zone, index) => {
        map.current!.addSource(`alert-zone-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { reportCount: zone.reportCount },
            geometry: { type: 'Point', coordinates: zone.center }
          }
        });
        map.current!.addLayer({
          id: `alert-zone-circle-${index}`,
          type: 'circle',
          source: `alert-zone-${index}`,
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
          id: `alert-zone-label-${index}`,
          type: 'symbol',
          source: `alert-zone-${index}`,
          layout: {
            'text-field': `⚠️ ALERT ZONE\n${zone.reportCount} verified reports`,
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
      });

      // AI Prediction zones
      predictionZones.forEach((zone, index) => {
        const riskColor = zone.riskLevel === 'critical' ? '#dc2626' :
                         zone.riskLevel === 'high' ? '#ea580c' :
                         zone.riskLevel === 'medium' ? '#ca8a04' : '#16a34a';
        
        map.current!.addSource(`prediction-zone-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { riskLevel: zone.riskLevel, riskScore: zone.riskScore },
            geometry: { type: 'Point', coordinates: zone.center }
          }
        });
        
        map.current!.addLayer({
          id: `prediction-zone-circle-${index}`,
          type: 'circle',
          source: `prediction-zone-${index}`,
          paint: {
            'circle-radius': { stops: [[0, 0], [20, zone.radius / 500]] },
            'circle-color': riskColor,
            'circle-opacity': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': riskColor,
            'circle-stroke-opacity': 0.8
          }
        });
        
        map.current!.addLayer({
          id: `prediction-zone-label-${index}`,
          type: 'symbol',
          source: `prediction-zone-${index}`,
          layout: {
            'text-field': `🤖 AI: ${zone.riskLevel.toUpperCase()}\n${zone.riskScore}% risk`,
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-offset': [0, 0]
          },
          paint: {
            'text-color': riskColor,
            'text-halo-color': '#ffffff',
            'text-halo-width': 1
          }
        });
      });
    });

    return () => { map.current?.remove(); };
  }, [mapboxToken, reports, predictionZones, center, zoom, onReportSelect, alertZones]);

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

  // Demo mode block unchanged...

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
          <p className="text-sm text-muted-foreground line-clamp-2">
            {selectedReport.description}
          </p>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;