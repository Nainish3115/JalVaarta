import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Google Gemini API key not configured in Supabase secrets.");
    }

    const { weatherData } = await req.json();
    if (!weatherData) {
      throw new Error("weatherData is required in the request body.");
    }

    const prompt = `
      You are an ocean hazard prediction AI. Given weather data (temp, humidity, wind speed, pressure, condition), 
      predict the likelihood of the following 9 hazards within the next 48 hours. 

      Always return ALL 9 hazards, even if risk is negligible. 
      For negligible risk, assign a percentage between 1-5%. 
      Percentages must be integers between 1 and 100, never 0, and must add up to <= 100 individually (not total).

      Hazards:
      1. High Surf Advisory
      2. Rip Currents
      3. Tsunami
      4. Storm Surge
      5. Coastal Flooding
      6. Tropical Cyclone / Hurricane
      7. Strong Winds / Gale
      8. Lightning at Sea
      9. Dense Fog

      Format output strictly as JSON:
      {
        "forecast_summary": "short natural language summary",
        "hazards": [
          { "type": "High Surf Advisory", "likelihood_percentage": 78, "reasoning": "..." },
          { "type": "Rip Currents", "likelihood_percentage": 45, "reasoning": "..." },
          { "type": "Tsunami", "likelihood_percentage": 2, "reasoning": "..." },
          { "type": "Storm Surge", "likelihood_percentage": 12, "reasoning": "..." },
          { "type": "Coastal Flooding", "likelihood_percentage": 25, "reasoning": "..." },
          { "type": "Tropical Cyclone / Hurricane", "likelihood_percentage": 1, "reasoning": "..." },
          { "type": "Strong Winds / Gale", "likelihood_percentage": 33, "reasoning": "..." },
          { "type": "Lightning at Sea", "likelihood_percentage": 17, "reasoning": "..." },
          { "type": "Dense Fog", "likelihood_percentage": 5, "reasoning": "..." }
        ]
      }

      Weather Data:
      ${JSON.stringify(weatherData)}
    `;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      throw new Error(`Gemini API Error: ${errorData?.error?.message || geminiResponse.statusText}`);
    }

    const aiData = await geminiResponse.json();

    // Safely extract JSON text
    let rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    rawText = rawText.replace(/```json|```/g, "").trim();

    // Extract the first {...} JSON block if Gemini adds extra text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON found in Gemini response.");

    const prediction = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Critical error in function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
