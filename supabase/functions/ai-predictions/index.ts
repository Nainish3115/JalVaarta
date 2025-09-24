import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PredictionFactors {
  seismic_activity: number;
  weather_conditions: number;
  historical_data: number;
  ocean_current: number;
  rainfall: number;
  elevation: number;
  population_density: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, location_name } = await req.json();

    // Base prediction factors with random variation
    const predictionFactors: PredictionFactors = {
      seismic_activity: Math.random() * 0.8,
      weather_conditions: Math.random() * 0.7,
      historical_data: Math.random() * 0.6,
      ocean_current: Math.random() * 0.9,
      rainfall: Math.random() * 0.5,
      elevation: Math.random() * 0.3,
      population_density: Math.random() * 0.4,
    };

    // India-specific coastal location adjustments
    switch (location_name) {
      // High-risk zones (historical tsunami/flood prone)
      case "Chennai":
      case "Cuddalore":
      case "Nagapattinam":
      case "Rameswaram":
        predictionFactors.historical_data = 0.85; // 2004 tsunami impact
        predictionFactors.seismic_activity = 0.7;
        predictionFactors.ocean_current = 0.8;
        break;

      case "Kanyakumari":
      case "Tuticorin":
      case "Kochi":
        predictionFactors.historical_data = 0.75;
        predictionFactors.seismic_activity = 0.6;
        predictionFactors.ocean_current = 0.9;
        break;

      case "Port Blair":
      case "Kavaratti":
        predictionFactors.historical_data = 0.8; // Island vulnerability
        predictionFactors.weather_conditions = 0.8; // Cyclone prone
        predictionFactors.ocean_current = 0.9;
        break;

      // Medium-risk zones
      case "Mumbai":
      case "Goa":
        predictionFactors.historical_data = 0.6;
        predictionFactors.weather_conditions = 0.7; // Monsoon flooding
        predictionFactors.population_density = 0.8;
        break;

      case "Kolkata":
      case "Visakhapatnam":
        predictionFactors.historical_data = 0.5;
        predictionFactors.rainfall = 0.7; // Heavy rainfall
        predictionFactors.weather_conditions = 0.6;
        break;

      case "Mangalore":
      case "Kozhikode":
        predictionFactors.historical_data = 0.4;
        predictionFactors.weather_conditions = 0.8; // Southwest monsoon
        predictionFactors.ocean_current = 0.7;
        break;

      // Lower-risk zones
      default:
        // Keep random values for other locations
        break;
    }

    // Calculate tsunami risk
    const tsunamiRisk =
      ((predictionFactors.seismic_activity || 0) * 0.4 +
        (predictionFactors.weather_conditions || 0) * 0.3 +
        (predictionFactors.historical_data || 0) * 0.2 +
        (predictionFactors.ocean_current || 0) * 0.1) *
      100;

    // Calculate flood risk
    const floodRisk =
      ((predictionFactors.rainfall || 0) * 0.5 +
        (predictionFactors.weather_conditions || 0) * 0.3 +
        (predictionFactors.elevation || 0) * 0.1 +
        (predictionFactors.population_density || 0) * 0.1) *
      100;

    // Determine primary hazard and risk
    const primaryHazard = tsunamiRisk > floodRisk ? "tsunami" : "flood";
    const primaryRisk = Math.max(tsunamiRisk, floodRisk);

    const riskLevel =
      primaryRisk > 80
        ? "critical"
        : primaryRisk > 60
        ? "high"
        : primaryRisk > 30
        ? "medium"
        : "low";

    const predictions = [
      {
        hazard_type: primaryHazard,
        risk_level: riskLevel,
        risk_score: Math.round(primaryRisk * 100) / 100,
        latitude,
        longitude,
        location_name,
        prediction_timeframe: "24h",
        confidence_score: 75 + Math.random() * 20, // 75-95%
        factors: predictionFactors,
        status: "active",
      },
    ];

    const alerts: any[] = [];
    if (primaryRisk > 60) {
      alerts.push({
        alert_level: riskLevel,
        message: `${riskLevel.toUpperCase()} ${primaryHazard} risk detected at ${location_name}. Immediate action required.`,
        affected_population: Math.floor(predictionFactors.population_density * 100000),
        recommended_actions: [
          "Evacuate low-lying areas",
          "Prepare emergency supplies",
          "Monitor local authorities",
          "Follow evacuation routes"
        ],
        timestamp: new Date().toISOString(),
        is_active: true,
      });
    }

    return new Response(
      JSON.stringify({
        predictions,
        alerts,
        weather_data: {
          temperature: 25 + Math.random() * 10,
          humidity: 60 + Math.random() * 30,
          wind_speed: Math.random() * 20,
          pressure: 1000 + Math.random() * 50,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-predictions function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});