/**
 * Prayer times proxy — fetches from namoz-vaqti.uz server-side to avoid CORS.
 *
 * GET /functions/v1/prayer-times?region=namangan-shahri&period=2026-09
 *
 * Returns the raw JSON from the upstream API with CORS headers attached.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const API_BASE = "https://namoz-vaqti.uz/index.php";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const region = url.searchParams.get("region");
    const period = url.searchParams.get("period");
    const lang = url.searchParams.get("lang") || "lotin";
    const format = url.searchParams.get("format") || "json";

    if (!region || !period) {
      return new Response(
        JSON.stringify({ error: "region and period are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiUrl = `${API_BASE}?format=${format}&lang=${lang}&period=${period}&region=${encodeURIComponent(region)}`;

    const apiRes = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    if (!apiRes.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream API error: ${apiRes.status}` }),
        { status: apiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await apiRes.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
