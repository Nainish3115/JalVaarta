// src/components/PredictionAlerts.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';

// Interfaces
interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  weather_condition: string;
}

interface Alert {
  id: string;
  alert_level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affected_population: number;
  recommended_actions: string[];
  is_active: boolean;
  created_at: string;
  acknowledged_at?: string;
}

// Badge helper
const getAlertBadge = (level: Alert['alert_level']) => {
  const colorMap: Record<Alert['alert_level'], string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return <Badge className={colorMap[level]}>{level.toUpperCase()}</Badge>;
};

const PredictionAlerts: React.FC<{ detailed?: boolean }> = ({ detailed = false }) => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prediction engine
  const generateAlertsFromWeather = (weather: WeatherData): Alert[] => {
    const newAlerts: Alert[] = [];
    const timestamp = new Date().toISOString();

    if (weather.temperature > 38) {
      newAlerts.push({
        id: `heatwave-${timestamp}`,
        alert_level: 'high',
        message: `Extreme Heatwave Warning: Temperatures reaching ${weather.temperature}°C.`,
        affected_population: 1500000,
        recommended_actions: [
          'Stay hydrated',
          'Avoid outdoor activities during peak hours',
          'Check on vulnerable individuals',
        ],
        is_active: true,
        created_at: timestamp,
      });
    }

    if (weather.wind_speed > 25) {
      newAlerts.push({
        id: `highwind-${timestamp}`,
        alert_level: 'medium',
        message: `High Wind Advisory: Gusts reaching ${weather.wind_speed} m/s. Secure loose objects.`,
        affected_population: 800000,
        recommended_actions: [
          'Secure outdoor furniture',
          'Avoid travel if possible',
          'Beware of falling debris',
        ],
        is_active: true,
        created_at: timestamp,
      });
    }

    if (weather.precipitation > 50) {
      newAlerts.push({
        id: `floodwatch-${timestamp}`,
        alert_level: 'critical',
        message: `Flood Watch: Intense rainfall (${weather.precipitation}mm/hr) detected. Low-lying areas at risk.`,
        affected_population: 500000,
        recommended_actions: [
          'Move to higher ground',
          'Do not walk or drive through floodwaters',
          'Prepare an emergency kit',
        ],
        is_active: true,
        created_at: timestamp,
      });
    }

    return newAlerts;
  };

  // Fetch & Predict
  useEffect(() => {
    const fetchAndPredict = async () => {
      try {
        if (!navigator.geolocation) {
          throw new Error('Geolocation is not supported by your browser.');
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const { latitude, longitude } = position.coords;

        const { data: weatherData, error: weatherError } = (await supabase.functions.invoke('weather-data', {
          body: { latitude, longitude },
        })) as { data: WeatherData; error: any };

        if (weatherError) throw weatherError;

        const generatedAlerts = generateAlertsFromWeather(weatherData);
        setAlerts(generatedAlerts);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        console.error('Error in prediction process:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndPredict();
  }, []);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts((currentAlerts) =>
      currentAlerts.map((a) =>
        a.id === alertId ? { ...a, is_active: false, acknowledged_at: new Date().toISOString() } : a
      )
    );
    toast({
      title: 'Alert Acknowledged',
      description: 'This alert has been hidden for your current session.',
    });
  };

  const activeAlerts = alerts.filter((a) => a.is_active);

  // Rendering
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p>Fetching live weather and generating predictions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
          Live Prediction Alerts
        </CardTitle>
        <CardDescription>AI-generated alerts based on current weather conditions</CardDescription>
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Clear</h3>
            <p className="text-muted-foreground">
              No active high-risk alerts based on current weather data.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-orange-200 bg-orange-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getAlertBadge(alert.alert_level)}
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                </div>
                <p className="text-sm font-medium mb-3">{alert.message}</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {alert.recommended_actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionAlerts;
