import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function now requires a Mistral API Key
const OPENWEATHER_API_KEY = Deno.env.get("VITE_OPENWEATHER_API_KEY");
const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!OPENWEATHER_API_KEY || !MISTRAL_API_KEY) {
      throw new Error("API keys for OpenWeatherMap and Mistral are not fully configured.");
    }

    const { latitude, longitude } = await req.json();
    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required.");
    }

    // Step 1: Fetch Weather Forecast Data (unchanged)
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();
    if (!forecastResponse.ok) throw new Error(forecastData.message || "Failed to fetch weather forecast");
    
    // Step 2: Build a Detailed Prompt for the AI Model (unchanged)
    const prompt = `
      You are an expert oceanographer. Based on the following 48-hour weather forecast data, analyze the potential for "Tropical Cyclone", "Storm Surge", and "High Surf Advisory".
      Return a valid JSON object with the following structure, and nothing else:
      {
        "forecast_summary": "A brief, one-sentence summary.",
        "hazards": [
          {"type": "Tropical Cyclone", "likelihood_percentage": <0-100>, "reasoning": "Brief reasoning based on wind and pressure."},
          {"type": "Storm Surge", "likelihood_percentage": <0-100>, "reasoning": "Brief reasoning based on wind speed and direction."},
          {"type": "High Surf Advisory", "likelihood_percentage": <0-100>, "reasoning": "Brief reasoning based on wind speed."}
        ]
      }
      Data: ${JSON.stringify(forecastData.list.slice(0, 16))}
    `;

    // --- Step 3: Call the Official Mistral AI API ---
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: "open-mistral-7b", // A powerful and cost-effective model from Mistral
        messages: [{ role: "user", content: prompt }],
        response_format: { "type": "json_object" },
      }),
    });

    if (!mistralResponse.ok) {
        const errorData = await mistralResponse.json();
        throw new Error(`Mistral API Error: ${errorData.message}`);
    }
    
    const aiData = await mistralResponse.json();
    const prediction = JSON.parse(aiData.choices[0].message.content);

    // Step 4: Return the AI's Prediction
    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Critical error in function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': "application/json" },
    });
  }
});

#-56.4,21.2