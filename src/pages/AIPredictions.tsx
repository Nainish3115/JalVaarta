import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  MapPin, 
  Clock,
  Activity,
  Zap,
  CloudRain
} from 'lucide-react';
import RiskAssessmentChart from '@/components/RiskAssessmentChart';
import PredictionAlerts from '@/components/PredictionAlerts';
import WeatherIntegration from '@/components/WeatherIntegration';

interface Prediction {
  id: string;
  hazard_type: string;
  risk_level: string;
  risk_score: number;
  latitude: number;
  longitude: number;
  location_name: string;
  prediction_timeframe: string;
  confidence_score: number;
  factors: any;
  status: string;
  created_at: string;
}

interface Alert {
  id: string;
  prediction_id: string;
  alert_level: string;
  message: string;
  affected_population: number;
  recommended_actions: string[];
  is_active: boolean;
  created_at: string;
}

const AIPredictions = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    fetchPredictions();
    fetchAlerts();
    
    // Set up realtime subscriptions
    const predictionsChannel = supabase
      .channel('predictions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, 
        () => fetchPredictions())
      .subscribe();

    const alertsChannel = supabase
      .channel('alerts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prediction_alerts' }, 
        () => fetchAlerts())
      .subscribe();

    return () => {
      predictionsChannel.unsubscribe();
      alertsChannel.unsubscribe();
    };
  }, []);

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        // Return empty array if table doesn't exist yet
        if (error.message.includes("relation \"public.predictions\" does not exist")) {
          console.warn("Predictions table not found - migrations may not be applied yet");
          setPredictions([]);
          return;
        }
        throw new Error(`Failed to fetch predictions: ${error.message}`);
      }
      setPredictions(data || []);
    } catch (error) {
      console.warn("Predictions table not available:", error);
      setPredictions([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('prediction_alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        // Return empty array if table doesn't exist yet
        if (error.message.includes("relation \"public.prediction_alerts\" does not exist")) {
          console.warn("Prediction alerts table not found - migrations may not be applied yet");
          setAlerts([]);
          return;
        }
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }
      setAlerts(data || []);
    } catch (error) {
      console.warn("Prediction alerts table not available:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (level: string) => {
    const variants = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    
    return (
      <Badge className={variants[level as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {level.toUpperCase()}
      </Badge>
    );
  };

  const generatePrediction = async () => {
    try {
      const coastalLocations = [
        { name: "Mumbai", lat: 19.076, lng: 72.8777 },
        { name: "Chennai", lat: 13.0827, lng: 80.2707 },
        { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
        { name: "Kochi", lat: 9.9312, lng: 76.2673 },
        { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
      ];

      for (const location of coastalLocations) {
        const { data, error } = await supabase.functions.invoke(
          "ai-predictions",
          {
            body: {
              latitude: location.lat,
              longitude: location.lng,
              location_name: location.name,
            },
          }
        );

        if (error) throw error;

        if (data?.predictions?.length) {
          try {
            const { data: insertedPredictions, error: insertError } =
              await supabase.from("predictions").insert(data.predictions).select();

            if (insertError) {
              if (insertError.message.includes("relation \"public.predictions\" does not exist")) {
                throw new Error("AI predictions feature not available - database tables not created yet. Please run: supabase db push");
              }
              throw insertError;
            }

            if (data.alerts?.length && insertedPredictions?.length) {
              const predictionId = insertedPredictions[0].id;
              const alertsToInsert = data.alerts.map((a: any) => ({
                ...a,
                prediction_id: predictionId,
              }));

              const { error: alertError } = await supabase
                .from("prediction_alerts")
                .insert(alertsToInsert);
                
              if (alertError) {
                console.warn("Failed to save alerts:", alertError);
                // Don't throw here - predictions were saved successfully
              }
            }
          } catch (dbError: any) {
            if (dbError.message.includes("relation \"public.predictions\" does not exist")) {
              throw new Error("AI predictions feature not available - database tables not created yet. Please run: supabase db push");
            }
            throw dbError;
          }
        }
      }

      toast({
        title: "Predictions Generated",
        description:
          "AI predictions have been updated for coastal regions",
      });

      fetchPredictions();
      fetchAlerts();
    } catch (error: any) {
      console.error("Error generating predictions:", error);
      
      let errorMessage = "Failed to generate predictions";
      if (error.message.includes("database tables not created yet")) {
        errorMessage = error.message;
      } else if (error.message.includes("relation") && error.message.includes("does not exist")) {
        errorMessage = "AI features not available - database tables not created yet. Please run: supabase db push";
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  const activeAlerts = alerts.filter((a) => a.is_active);
  const highRiskPredictions = predictions.filter((p) =>
    ["high", "critical"].includes(p.risk_level)
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Brain className="h-8 w-8 animate-pulse text-primary mx-auto mb-2" />
            <p>Loading AI predictions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="relative">
            <Brain className="h-10 w-10 text-primary" />
            <Zap className="h-5 w-5 text-accent absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Hazard Predictions</h1>
            <p className="text-muted-foreground">
              Machine learning-powered risk assessment and early warning system
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Predictions</p>
                  <p className="text-2xl font-bold">{predictions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">High Risk Areas</p>
                  <p className="text-2xl font-bold">{highRiskPredictions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                  <p className="text-2xl font-bold">{activeAlerts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CloudRain className="h-8 w-8 text-cyan-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Weather Monitored</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generate Predictions Button */}
        {(profile?.role === 'analyst' || profile?.role === 'disaster_manager') && (
          <Button onClick={generatePrediction} className="mb-6">
            <Brain className="h-4 w-4 mr-2" />
            Generate New Predictions
          </Button>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="weather">Weather</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAssessmentChart predictions={predictions} />
            <PredictionAlerts alerts={alerts} />
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Risk Predictions</CardTitle>
              <CardDescription>
                AI-generated risk assessments for coastal regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <div key={prediction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{prediction.location_name}</span>
                          {getRiskBadge(prediction.risk_level)}
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-muted-foreground capitalize">
                            {prediction.hazard_type.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {prediction.prediction_timeframe}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {prediction.confidence_score.toFixed(1)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{prediction.risk_score}%</div>
                      <Progress value={prediction.risk_score} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <PredictionAlerts alerts={alerts} detailed={true} />
        </TabsContent>

        <TabsContent value="weather" className="space-y-6">
          <WeatherIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPredictions;