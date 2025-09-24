import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

const WeatherIntegration: React.FC = () => {
  const { toast } = useToast();
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [loading, setLoading] = useState(true);

  const coastalLocations = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Kochi', lat: 9.9312, lng: 76.2673 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 }
  ];

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      const weatherPromises = coastalLocations.map(async (location) => {
        const { data, error } = await supabase.functions.invoke('weather-data', {
          body: {
            latitude: location.lat,
            longitude: location.lng
          }
        });

        if (error) throw error;
        return { location: location.name, data };
      });

      const results = await Promise.all(weatherPromises);
      const weatherMap: Record<string, WeatherData> = {};
      
      results.forEach(({ location, data }) => {
        weatherMap[location] = data;
      });

      setWeatherData(weatherMap);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load weather data",
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Weather Data...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {coastalLocations.map((location) => (
              <div key={location.name} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coastal Weather Monitoring</CardTitle>
          <CardDescription>
            Real-time weather conditions at key coastal locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coastalLocations.map((location) => {
              const data = weatherData[location.name];
              if (!data) return null;

              return (
                <Card key={location.name} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{location.name}</h3>
                      {getWeatherIcon(data.weather_condition)}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Temperature</span>
                        </div>
                        <span className="text-sm font-medium">{data.temperature}°C</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Cloud className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Humidity</span>
                        </div>
                        <span className="text-sm font-medium">{data.humidity}%</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Wind className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Wind</span>
                        </div>
                        <span className="text-sm font-medium">{data.wind_speed} m/s</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Gauge className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">Pressure</span>
                        </div>
                        <span className="text-sm font-medium">{data.pressure} hPa</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4 text-indigo-500" />
                          <span className="text-sm">Visibility</span>
                        </div>
                        <span className="text-sm font-medium">{data.visibility} km</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <Badge variant="outline" className="text-xs">
                        {data.weather_description}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherIntegration;