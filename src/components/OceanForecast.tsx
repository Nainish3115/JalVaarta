import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, MapPin, Loader2, Wand2 } from 'lucide-react';

// Interfaces to match the JSON output from the OpenAI model
interface Hazard {
  type: string;
  likelihood_percentage: number;
  reasoning: string;
}

interface ForecastData {
  forecast_summary: string;
  hazards: Hazard[];
}

const OceanForecast = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default coordinates set to a coastal area for easy testing
  const [latitude, setLatitude] = useState('18.3');  // Example: Philippines
  const [longitude, setLongitude] = useState('122.1'); // Example: Philippines

  const handleFetchForecast = async () => {
    if (!latitude || !longitude) {
      setError("Please enter both latitude and longitude.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setForecast(null);

    try {
      // ✅ FIX: function name must match the folder name in supabase/functions
      const { data, error } = await supabase.functions.invoke<ForecastData>('ocean_forecast', {
        body: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      });

      if (error) throw error;
      if (!data) throw new Error("No forecast data returned from function.");

      setForecast(data);

    } catch (err: any) {
      setError(err.message || "Failed to generate forecast.");
      console.error("Forecast function error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (percentage: number) => {
    if (percentage >= 75) return "bg-red-500";
    if (percentage >= 50) return "bg-orange-500";
    if (percentage >= 25) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wand2 className="h-5 w-5 mr-2 text-primary" />
          AI-Powered Ocean Hazard Forecast
        </CardTitle>
        <CardDescription>
          Enter GPS coordinates to get a 48-hour predictive forecast from an AI model.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Input section for coordinates */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-6 p-4 border rounded-lg bg-muted/50">
          <Input 
            type="text" 
            placeholder="Latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="flex-1"
          />
          <Input 
            type="text" 
            placeholder="Longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleFetchForecast} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Get Forecast
          </Button>
        </div>

        {/* Display area for results */}
        {isLoading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-muted-foreground">AI is analyzing the forecast data...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-destructive">
             <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
             <p>Error: {error}</p>
          </div>
        )}
        
        {/* Render the forecast from the AI */}
        {forecast && (
          <div>
            <div className="p-4 bg-muted rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-1">Forecast Summary</h3>
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
                  <Progress 
                    value={hazard.likelihood_percentage} 
                    className={`w-full ${getRiskColor(hazard.likelihood_percentage)}`} 
                  />
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
