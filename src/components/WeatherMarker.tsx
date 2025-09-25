import React from 'react';
import { Card } from '@/components/ui/card';
import { Cloud, Sun, CloudRain, Wind, Thermometer, Eye, Gauge } from 'lucide-react';

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

interface WeatherMarkerProps {
  location: string;
  data: WeatherData;
  isHovered: boolean;
}

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
      return <Sun className="h-6 w-6 text-yellow-500" />;
    case 'clouds':
      return <Cloud className="h-6 w-6 text-gray-500" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    default:
      return <Cloud className="h-6 w-6 text-gray-400" />;
  }
};

const WeatherMarker: React.FC<WeatherMarkerProps> = ({ location, data, isHovered }) => {
  if (!isHovered) {
    return (
      <div className="relative cursor-pointer group">
        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 shadow-lg
                      transform transition-transform duration-200 group-hover:scale-150 group-hover:bg-blue-400">
        </div>
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 
                      group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs font-medium bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded shadow-sm">
            {location}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="absolute z-50 p-3 min-w-[220px] bg-white/95 dark:bg-gray-800/95 shadow-xl 
                    transform -translate-x-1/2 -translate-y-full
                    animate-in fade-in duration-200">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2 border-b pb-2">
          <div>
            <h3 className="font-medium text-lg">{location}</h3>
            <p className="text-xs text-muted-foreground">{data.weather_description}</p>
          </div>
          {getWeatherIcon(data.weather_condition)}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <span className="text-sm">Temperature</span>
            </div>
            <span className="font-medium text-sm">{data.temperature}°C</span>
          </div>

          <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Humidity</span>
            </div>
            <span className="font-medium text-sm">{data.humidity}%</span>
          </div>

          <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-green-500" />
              <span className="text-sm">Wind Speed</span>
            </div>
            <span className="font-medium text-sm">{data.wind_speed} m/s</span>
          </div>

          <div className="flex items-center justify-between bg-muted/50 p-2 rounded">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-500" />
              <span className="text-sm">Visibility</span>
            </div>
            <span className="font-medium text-sm">{data.visibility} km</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default WeatherMarker;