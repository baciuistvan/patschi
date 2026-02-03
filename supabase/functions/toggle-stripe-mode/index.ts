import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "GET") {
      // Get current Stripe mode
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "stripe_mode")
        .maybeSingle();

      if (error) {
        throw error;
      }

      const mode = data?.value || "test";

      return new Response(
        JSON.stringify({ mode }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (req.method === "POST") {
      // Toggle or set Stripe mode
      const { mode } = await req.json();

      // Validate mode
      if (mode && mode !== "test" && mode !== "live") {
        return new Response(
          JSON.stringify({ error: "Invalid mode. Must be 'test' or 'live'" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let newMode: string;

      if (mode) {
        // Set specific mode
        newMode = mode;
      } else {
        // Toggle current mode
        const { data: currentData } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "stripe_mode")
          .maybeSingle();

        const currentMode = currentData?.value || "test";
        newMode = currentMode === "test" ? "live" : "test";
      }

      // Update the setting
      const { error } = await supabase
        .from("settings")
        .upsert({
          key: "stripe_mode",
          value: newMode,
          description: "Stripe API mode: test or live",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "key"
        });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: newMode,
          message: `Stripe mode switched to ${newMode}`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error toggling Stripe mode:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to toggle Stripe mode" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
