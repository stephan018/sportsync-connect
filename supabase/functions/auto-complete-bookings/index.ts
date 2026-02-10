import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find confirmed bookings where class ended more than 2 hours ago
    // We combine booking_date + end_time to compare against now() - 2 hours
    const { data: bookings, error: fetchError } = await supabase
      .from("bookings")
      .select("id, booking_date, end_time, status")
      .eq("status", "confirmed");

    if (fetchError) throw fetchError;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const toComplete = (bookings || []).filter((b) => {
      const endDateTime = new Date(`${b.booking_date}T${b.end_time}`);
      return endDateTime < twoHoursAgo;
    });

    if (toComplete.length === 0) {
      return new Response(
        JSON.stringify({ message: "No bookings to complete", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = toComplete.map((b) => b.id);

    const { error: updateError, count } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .in("id", ids);

    if (updateError) throw updateError;

    console.log(`Auto-completed ${ids.length} bookings:`, ids);

    return new Response(
      JSON.stringify({ message: "Bookings auto-completed", count: ids.length, ids }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error auto-completing bookings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
