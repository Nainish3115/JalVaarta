-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('citizen', 'analyst', 'disaster_manager');

-- Create enum for hazard types
CREATE TYPE public.hazard_type AS ENUM ('tsunami', 'flood', 'high_waves', 'storm_surge', 'abnormal_sea_behavior');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'verified', 'rejected');

-- Create enum for sentiment
CREATE TYPE public.sentiment_type AS ENUM ('positive', 'negative', 'neutral');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'citizen',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hazard_type hazard_type NOT NULL,
  description TEXT NOT NULL,
  media_url TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create social_media_posts table
CREATE TABLE public.social_media_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  hazard_type hazard_type,
  sentiment sentiment_type NOT NULL DEFAULT 'neutral',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policies for reports
CREATE POLICY "Anyone can view reports" 
ON public.reports 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
ON public.reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Analysts and managers can verify reports" 
ON public.reports 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst', 'disaster_manager')
  )
);

-- Create policies for social media posts
CREATE POLICY "Anyone can view social media posts" 
ON public.social_media_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Only analysts can manage social media posts" 
ON public.social_media_posts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('analyst', 'disaster_manager')
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 
    'citizen'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('hazard-media', 'hazard-media', true);

-- Create storage policies
CREATE POLICY "Anyone can view hazard media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'hazard-media');

CREATE POLICY "Authenticated users can upload hazard media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'hazard-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'hazard-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_media_posts;

-- Set replica identity for realtime
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.social_media_posts REPLICA IDENTITY FULL;

-- Insert demo social media posts
INSERT INTO public.social_media_posts (source, content, hazard_type, sentiment, latitude, longitude, location_name) VALUES
('Twitter', 'Huge waves hitting the coastline near Miami Beach! Stay safe everyone #tsunami #alert', 'high_waves', 'negative', 25.7617, -80.1918, 'Miami Beach, FL'),
('Instagram', 'Beautiful sunset over calm waters at Santa Monica', null, 'positive', 34.0195, -118.4912, 'Santa Monica, CA'),
('Facebook', 'Water levels rising rapidly in downtown area. Emergency services on scene', 'flood', 'negative', 40.7128, -74.0060, 'New York, NY'),
('Twitter', 'Storm surge warning issued for coastal areas. Please evacuate if advised #stormsurge', 'storm_surge', 'negative', 29.7604, -95.3698, 'Houston, TX'),
('Instagram', 'The ocean is acting really strange today, never seen currents like this', 'abnormal_sea_behavior', 'neutral', 37.7749, -122.4194, 'San Francisco, CA');