import { supabase } from '@/integrations/supabase/client';

export interface PredictionRequest {
  latitude: number;
  longitude: number;
  location_name?: string;
}

export interface PredictionResult {
  predictions: Array<{
    hazard_type: string;
    risk_level: string;
    risk_score: number;
    latitude: number;
    longitude: number;
    location_name: string;
    prediction_timeframe: string;
    confidence_score: number;
    factors: Record<string, number>;
    status: string;
  }>;
  alerts: Array<{
    alert_level: string;
    message: string;
    affected_population: number;
    recommended_actions: string[];
    is_active: boolean;
  }>;
  timestamp: string;
}

export interface WeatherData {
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

class AIPredictionService {
  async generatePredictions(request: PredictionRequest): Promise<PredictionResult> {
    const { data, error } = await supabase.functions.invoke('ai-predictions', {
      body: request
    });

    if (error) {
      throw new Error(`Failed to generate predictions: ${error.message}`);
    }

    return data;
  }

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    const { data, error } = await supabase.functions.invoke('weather-data', {
      body: { latitude, longitude }
    });

    if (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }

    return data;
  }

  async getPredictions(filters?: {
    hazard_type?: string;
    risk_level?: string;
    status?: string;
  }) {
    try {
      let query = supabase.from('predictions').select('*');

      if (filters?.hazard_type) {
        query = query.eq('hazard_type', filters.hazard_type);
      }

      if (filters?.risk_level) {
        query = query.eq('risk_level', filters.risk_level);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Return empty array if table doesn't exist yet
        if (error.message.includes("relation \"public.predictions\" does not exist")) {
          console.warn("Predictions table not found - migrations may not be applied yet");
          return [];
        }
        throw new Error(`Failed to fetch predictions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.warn("Predictions table not available:", error);
      return []; // Return empty array instead of throwing
    }
  }

  async getAlerts(activeOnly = true) {
    try {
      let query = supabase.from('prediction_alerts').select('*');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Return empty array if table doesn't exist yet
        if (error.message.includes("relation \"public.prediction_alerts\" does not exist")) {
          console.warn("Prediction alerts table not found - migrations may not be applied yet");
          return [];
        }
        throw new Error(`Failed to fetch alerts: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.warn("Prediction alerts table not available:", error);
      return []; // Return empty array instead of throwing
    }
  }

  async acknowledgeAlert(alertId: string, userId: string) {
    const { error } = await supabase
      .from('prediction_alerts')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: userId,
        is_active: false
      })
      .eq('id', alertId);

    if (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  async savePrediction(prediction: any) {
    try {
      const { data, error } = await supabase
        .from('predictions')
        .insert(prediction)
        .select()
        .single();

      if (error) {
        if (error.message.includes("relation \"public.predictions\" does not exist")) {
          throw new Error("AI predictions feature not available - database tables not created yet");
        }
        throw new Error(`Failed to save prediction: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to save prediction:", error);
      throw error;
    }
  }

  async saveAlert(alert: any) {
    try {
      const { data, error } = await supabase
        .from('prediction_alerts')
        .insert(alert)
        .select()
        .single();

      if (error) {
        if (error.message.includes("relation \"public.prediction_alerts\" does not exist")) {
          throw new Error("AI alerts feature not available - database tables not created yet");
        }
        throw new Error(`Failed to save alert: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Failed to save alert:", error);
      throw error;
    }
  }
}

export const aiPredictionService = new AIPredictionService();