import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response("Missing slug", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: teacher, error } = await supabase
      .from("profiles")
      .select("full_name, sport, bio, avatar_url, hourly_rate, average_rating, total_reviews")
      .eq("slug", slug)
      .eq("role", "teacher")
      .maybeSingle();

    if (error || !teacher) {
      return new Response("Teacher not found", { status: 404 });
    }

    // Get the app URL from environment or use default
    const appUrl = Deno.env.get("APP_URL") || "https://proffx.app";
    const profileUrl = `${appUrl}/profe/${slug}`;
    const ogImage = teacher.avatar_url || "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=630&fit=crop";
    const title = `${teacher.full_name} - Profesor de ${teacher.sport || "Deportes"} | ProffX`;
    const description = teacher.bio
      ? teacher.bio.substring(0, 155) + (teacher.bio.length > 155 ? "..." : "")
      : `Reserva clases de ${teacher.sport || "deportes"} con ${teacher.full_name}. ⭐ ${Number(teacher.average_rating).toFixed(1)} (${teacher.total_reviews} reseñas) · $${Number(teacher.hourly_rate)}/hora`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${profileUrl}">
  <meta property="og:site_name" content="ProffX">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- Redirect to actual SPA -->
  <meta http-equiv="refresh" content="0;url=${profileUrl}">
  <link rel="canonical" href="${profileUrl}">
</head>
<body>
  <p>Redirigiendo a <a href="${profileUrl}">${teacher.full_name} en ProffX</a>...</p>
  <script>window.location.replace("${profileUrl}");</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("OG Error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
