import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// supabase/functions/fetch_tweets/index.ts

// ⚠️ Replace this with your actual Twitter Bearer Token (keep it secret!)
const TWITTER_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAACsg4QEAAAAAeHe6qV7t3dQgAbLc77C5CZZBIr4%3DlcSN6tpBtEXqgyOJZuiAZ1mAdniYuvprjpZznlEofTVzx62NWl";

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
    // ✅ Better query for hazards
    const QUERY = "news lang:en -is:retweet";

const response = await fetch(
  `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(
    QUERY
  )}&tweet.fields=created_at,lang`,
  {
    headers: {
      Authorization: `Bearer ${TWITTER_TOKEN}`,
    },
  }
);

const data = await response.json();

console.log("Twitter API Response:", JSON.stringify(data, null, 2));

return new Response(JSON.stringify(data.data || []), {
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
