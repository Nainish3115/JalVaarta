CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Create prediction status enum  
CREATE TYPE public.prediction_status AS ENUM ('active', 'resolved', 'false_positive');

-- Create predictions table
CREATE TABLE public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hazard_type hazard_type NOT NULL,
  risk_level risk_level NOT NULL DEFAULT 'low',
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name TEXT,
  prediction_timeframe TEXT NOT NULL, -- '6h', '24h', '72h'
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  factors JSONB, -- Store prediction factors (weather, seismic, etc.)
  status prediction_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  actual_outcome TEXT -- What actually happened
);

-- Create prediction_alerts table
CREATE TABLE public.prediction_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  alert_level risk_level NOT NULL,
  message TEXT NOT NULL,
  affected_population INTEGER,
  recommended_actions TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id)
);

-- Create historical_weather table
CREATE TABLE public.historical_weather (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  wind_direction DECIMAL(5,1),
  pressure DECIMAL(7,2),
  precipitation DECIMAL(5,2),
  visibility DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_weather ENABLE ROW LEVEL SECURITY;

-- Create policies for predictions
CREATE POLICY "Anyone can view predictions" 
ON public.predictions 
FOR SELECT 
USING (true);

CREATE POLICY "Only analysts and managers can create predictions" 
ON public.predictions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst', 'disaster_manager')
  )
);

-- Create policies for prediction alerts
CREATE POLICY "Anyone can view prediction alerts" 
ON public.prediction_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Only analysts and managers can manage alerts" 
ON public.prediction_alerts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst', 'disaster_manager')
  )
);

-- Create policies for historical weather
CREATE POLICY "Anyone can view historical weather" 
ON public.historical_weather 
FOR SELECT 
USING (true);

CREATE POLICY "Only analysts and managers can manage weather data" 
ON public.historical_weather 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst', 'disaster_manager')
  )
);


CREATE INDEX idx_predictions_location ON public.predictions(latitude, longitude);
CREATE INDEX idx_predictions_hazard_type ON public.predictions(hazard_type);
CREATE INDEX idx_predictions_risk_level ON public.predictions(risk_level);
CREATE INDEX idx_predictions_created_at ON public.predictions(created_at DESC);
CREATE INDEX idx_weather_location_time ON public.historical_weather(latitude, longitude, timestamp);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_predictions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_predictions_updated_at_column();

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prediction_alerts;

-- Set replica identity for realtime
ALTER TABLE public.predictions REPLICA IDENTITY FULL;
ALTER TABLE public.prediction_alerts REPLICA IDENTITY FULL;

INSERT INTO public.predictions (hazard_type, risk_level, risk_score, latitude, longitude, location_name, prediction_timeframe, confidence_score, factors, status) VALUES
('tsunami', 'high', 78.5, 13.0827, 80.2707, 'Chennai Coast', '24h', 85.2, '{"seismic_activity": 0.8, "weather_conditions": 0.6, "historical_data": 0.7, "ocean_current": 0.9}', 'active'),
('flood', 'medium', 45.2, 22.5726, 88.3639, 'Kolkata Coastal Area', '72h', 72.1, '{"rainfall": 0.6, "river_level": 0.4, "tide_level": 0.5}', 'active'),
('storm_surge', 'critical', 92.3, 19.0760, 72.8777, 'Mumbai Coast', '6h', 88.7, '{"wind_speed": 0.95, "pressure_system": 0.9, "storm_track": 0.95}', 'active');

-- Insert sample alert data
INSERT INTO public.prediction_alerts (prediction_id, alert_level, message, affected_population, recommended_actions, is_active) VALUES
((SELECT id FROM public.predictions WHERE hazard_type = 'tsunami' LIMIT 1), 'high', 'High tsunami risk detected. Prepare evacuation procedures.', 2500000, ARRAY['Activate emergency response teams', 'Prepare evacuation routes', 'Monitor sea level sensors'], true),
((SELECT id FROM public.predictions WHERE hazard_type = 'storm_surge' LIMIT 1), 'critical', 'Critical storm surge risk. Immediate evacuation required.', 18000000, ARRAY['Issue immediate evacuation orders', 'Activate emergency shelters', 'Deploy rescue teams'], true);