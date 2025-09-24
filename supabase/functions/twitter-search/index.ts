import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The Twitter Bearer Token must be set as a Supabase secret
const BEARER = Deno.env.get("TWITTER_BEARER_TOKEN");

async function twitterRecentSearch(query: string, max_results = 10, next_token: string | null = null) {
  const endpoint = "https://api.twitter.com/2/tweets/search/recent";

  const url = new URL(endpoint);
  url.searchParams.append("query", query);
  url.searchParams.append("max_results", String(Math.min(Math.max(10, max_results), 100)));
  url.searchParams.append("tweet.fields", "created_at,author_id,public_metrics,lang");
  url.searchParams.append("expansions", "author_id");
  url.searchParams.append("user.fields", "username,name,profile_image_url");

  if (next_token) {
    url.searchParams.append("pagination_token", next_token);
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${BEARER}`,
      "User-Agent": "SupabaseFunction/1.0",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw { response: { status: response.status, data } };
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!BEARER) {
    return new Response(
      JSON.stringify({ error: "Missing TWITTER_BEARER_TOKEN" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { q, max_results = 10, next_token = null } = await req.json();

    if (!q) {
      return new Response(
        JSON.stringify({ error: "Missing q (query) parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await twitterRecentSearch(String(q).trim().slice(0, 500), max_results, next_token);

    const users = (data.includes?.users || []).reduce((m: any, u: any) => {
      m[u.id] = u;
      return m;
    }, {});

    const tweets = (data.data || []).map((t: any) => ({
      id: t.id,
      text: t.text,
      created_at: t.created_at,
      lang: t.lang,
      metrics: t.public_metrics,
      author: users[t.author_id]
        ? {
            id: users[t.author_id].id,
            username: users[t.author_id].username,
            name: users[t.author_id].name,
            profile_image_url: users[t.author_id].profile_image_url,
          }
        : null,
    }));

    return new Response(
      JSON.stringify({ meta: data.meta || {}, tweets }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { message: err.message };
    console.error("Function error:", status, body);

    return new Response(
      JSON.stringify({ error: body }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
