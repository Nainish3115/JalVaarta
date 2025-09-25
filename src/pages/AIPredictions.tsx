import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, Loader2, Wand2, MapPin, Cloud, Droplets, Wind, Gauge, Search 
} from 'lucide-react';

// Interfaces for the data structures
interface Hazard {
  type: string;
  likelihood_percentage: number;
  reasoning: string;
}
interface ForecastData {
  forecast_summary: string;
  hazards: Hazard[];
}
interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  pressure: number;
  condition: string;
  location_name: string;
}

const OceanForecast = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // This is the main function that orchestrates the data fetching
  const getPredictionForCoords = async (latitude: number, longitude: number) => {
    setIsLoading(true);
    setError(null);
    setForecast(null);
    setWeather(null);

    try {
      // Step 1: Fetch current weather data from your 'weather-data' function
      const { data: weatherData, error: weatherError } = await supabase.functions.invoke<WeatherData>('weather-data', {
        body: { latitude, longitude },
      });
      if (weatherError) throw weatherError;
      setWeather(weatherData);

      // Step 2: Send the fetched weather data to the 'gemini-prediction' function
      const { data: predictionData, error: predictionError } = await supabase.functions.invoke<ForecastData>('gemini-prediction', {
        body: { weatherData }, // Pass the weather data as input
      });
      if (predictionError) throw predictionError;
      setForecast(predictionData);

    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI HANDLERS ---
  const handleUseMyLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      getPredictionForCoords(position.coords.latitude, position.coords.longitude);
    } catch {
      setError("Unable to access your location. Try searching by city name instead.");
    }
  };

  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setIsLoading(true);
    try {
      // Use OpenWeatherMap on the client-side just to get coordinates for a city name
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(search)}&appid=${
          import.meta.env.VITE_OPENWEATHER_API_KEY
        }`
      );
      if (!res.ok) throw new Error("City not found. Please check the spelling.");
      const json = await res.json();
      getPredictionForCoords(json.coord.lat, json.coord.lon);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wand2 className="h-5 w-5 mr-2 text-primary" />
          AI-Powered Ocean Hazard Forecast
        </CardTitle>
        <CardDescription>
          Get AI hazard predictions for any coastal city or your current location.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* --- Input Section --- */}
        <div className="p-4 border rounded-lg bg-muted/50 mb-6">
          <form onSubmit={handleCitySearch} className="flex gap-2 mb-2">
            <Input
              placeholder="Search by city name (e.g., Mumbai, Tokyo)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" disabled={isLoading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center text-sm text-muted-foreground my-2">OR</div>
          <Button onClick={handleUseMyLocation} disabled={isLoading} className="w-full">
            <MapPin className="mr-2 h-4 w-4" />
            Use My Current Location
          </Button>
        </div>

        {/* --- Display Section --- */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Fetching weather and generating AI forecast...</p>
          </div>
        )}
        {error && (
          <div className="text-center py-8 text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        )}
        
        {weather && (
          <div className="p-4 bg-gray-800 rounded-lg mb-6 text-gray-100">
            <h3 className="font-semibold text-lg mb-3 flex items-center">
              <Cloud className="h-5 w-5 mr-2 text-blue-400" />
              Current Weather for {weather.location_name || 'your location'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2" title="Temperature"><Gauge className="h-4 w-4" /><span>{weather.temperature}°C</span></div>
              <div className="flex items-center gap-2" title="Humidity"><Droplets className="h-4 w-4 text-blue-400" /><span>{weather.humidity}%</span></div>
              <div className="flex items-center gap-2" title="Wind Speed"><Wind className="h-4 w-4" /><span>{weather.wind_speed} m/s</span></div>
              <div className="flex items-center gap-2" title="Pressure"><Gauge className="h-4 w-4" /><span>{weather.pressure} hPa</span></div>
            </div>
          </div>
        )}

        {forecast && (
          <div>
            <div className="p-4 bg-muted rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-1">AI Forecast Summary</h3>
              <p className="text-muted-foreground">{forecast.forecast_summary}</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Hazard Likelihood (48 Hours)</h3>
              {forecast.hazards.map((hazard) => (
                <div key={hazard.type} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{hazard.type}</h4>
                    <span className="font-bold text-lg">{hazard.likelihood_percentage}%</span>
                  </div>
                  <Progress value={hazard.likelihood_percentage} />
                  <p className="text-sm text-muted-foreground mt-2">{hazard.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OceanForecast;