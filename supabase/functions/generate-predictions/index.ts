import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Indian coastal locations only
    const indianCoastalLocations = [
      // West Coast - Arabian Sea
      { name: "Mumbai", lat: 19.076, lng: 72.8777 },
      { name: "Goa", lat: 15.2993, lng: 74.1240 },
      { name: "Mangalore", lat: 12.9141, lng: 74.8560 },
      { name: "Kochi", lat: 9.9312, lng: 76.2673 },
      { name: "Kozhikode", lat: 11.2588, lng: 75.7804 },
      { name: "Trivandrum", lat: 8.5241, lng: 76.9366 },
      
      // East Coast - Bay of Bengal
      { name: "Chennai", lat: 13.0827, lng: 80.2707 },
      { name: "Puducherry", lat: 11.9416, lng: 79.8083 },
      { name: "Cuddalore", lat: 11.7480, lng: 79.7714 },
      { name: "Nagapattinam", lat: 10.7656, lng: 79.8424 },
      { name: "Rameswaram", lat: 9.2876, lng: 79.3129 },
      { name: "Kanyakumari", lat: 8.0883, lng: 77.5385 },
      { name: "Tuticorin", lat: 8.7642, lng: 78.1348 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
      { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
      { name: "Kakinada", lat: 16.9891, lng: 82.2475 },
      { name: "Gopalpur", lat: 19.2644, lng: 84.8620 },
      { name: "Puri", lat: 19.8135, lng: 85.8312 },
      { name: "Paradip", lat: 20.3163, lng: 86.6114 },
      
      // Island Territories
      { name: "Port Blair", lat: 11.6234, lng: 92.7265 },
      { name: "Kavaratti", lat: 10.5667, lng: 72.6167 },
    ];

    const generatedPredictions = [];
    const generatedAlerts = [];

    for (const location of indianCoastalLocations) {
      try {
        // Generate prediction for this location
        const { data, error } = await supabase.functions.invoke('ai-predictions', {
          body: {
            latitude: location.lat,
            longitude: location.lng,
            location_name: location.name,
          },
        });

        if (error) {
          console.error(`Error generating prediction for ${location.name}:`, error);
          continue;
        }

        // Save predictions to database
        if (data.predictions && data.predictions.length > 0) {
          for (const prediction of data.predictions) {
            const { error: insertError } = await supabase
              .from('predictions')
              .upsert(prediction, { onConflict: 'latitude,longitude,hazard_type' });

            if (!insertError) {
              generatedPredictions.push(prediction);
            }
          }
        }

        // Save alerts to database
        if (data.alerts && data.alerts.length > 0) {
          for (const alert of data.alerts) {
            const { error: alertError } = await supabase
              .from('prediction_alerts')
              .insert(alert);

            if (!alertError) {
              generatedAlerts.push(alert);
            }
          }
        }

      } catch (error) {
        console.error(`Failed to process ${location.name}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated predictions for ${generatedPredictions.length} locations, created ${generatedAlerts.length} alerts`,
        predictions_generated: generatedPredictions.length,
        alerts_generated: generatedAlerts.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in generate-predictions function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});