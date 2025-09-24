import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    // OpenWeatherMap API call (API key must be set in Supabase env vars)
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

    if (!OPENWEATHER_API_KEY) {
      throw new Error("OpenWeatherMap API key not configured");
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const response = await fetch(weatherUrl);
    const weatherData = await response.json();

    if (weatherData.cod !== 200) {
      throw new Error(weatherData.message || "Weather API error");
    }

    const processedData = {
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      pressure: weatherData.main.pressure,
      wind_speed: weatherData.wind.speed,
      wind_direction: weatherData.wind.deg,
      visibility: weatherData.visibility / 1000, // Convert to km
      precipitation: weatherData.rain?.["1h"] || weatherData.snow?.["1h"] || 0,
      weather_condition: weatherData.weather[0].main,
      weather_description: weatherData.weather[0].description,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
