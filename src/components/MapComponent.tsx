import React from 'react';

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

interface MapComponentProps {
  reports: Report[];
  selectedReport: Report | null;
  onReportSelect: (report: Report) => void;
  center?: [number, number];
  zoom?: number;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  reports, 
  selectedReport, 
  onReportSelect,
  center = [25.7617, -80.1918],
  zoom = 6 
}) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg overflow-hidden">
      {/* Map Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Ocean Wave Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-200 to-transparent dark:from-blue-700 opacity-30">
        <div className="wave-animation"></div>
      </div>

      {/* Report Markers */}
      <div className="relative w-full h-full p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">Interactive Hazard Map</h3>
          <p className="text-sm text-muted-foreground">
            Displaying {reports.length} reports from the community
          </p>
        </div>

        {/* Simulated Map Markers */}
        <div className="grid grid-cols-3 gap-4 h-full">
          {reports.slice(0, 9).map((report, index) => {
            const isSelected = selectedReport?.id === report.id;
            return (
              <div
                key={report.id}
                className={`relative cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-110 z-10' : 'hover:scale-105'
                }`}
                onClick={() => onReportSelect(report)}
              >
                <div className={`
                  p-3 rounded-lg border-2 shadow-lg backdrop-blur-sm
                  ${isSelected ? 'border-primary bg-primary/10' : 'border-white/50 bg-white/30 dark:bg-gray-800/30'}
                  ${getStatusColor(report.status)} bg-opacity-20
                `}>
                  <div className="text-center">
                    <div className="text-2xl mb-1">{getHazardEmoji(report.hazard_type)}</div>
                    <div className={`
                      w-3 h-3 rounded-full mx-auto mb-1
                      ${getStatusColor(report.status)}
                      ${isSelected ? 'ring-2 ring-primary animate-pulse' : ''}
                    `}></div>
                    <p className="text-xs font-medium capitalize">
                      {report.hazard_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.location_name || 'Unknown Location'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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

        {/* Coordinates Display */}
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">
            Center: {center[0].toFixed(4)}, {center[1].toFixed(4)}
          </p>
        </div>
      </div>

      <style>{`
        .wave-animation {
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.3), transparent);
          height: 4px;
          animation: wave 3s ease-in-out infinite;
        }
        
        @keyframes wave {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;