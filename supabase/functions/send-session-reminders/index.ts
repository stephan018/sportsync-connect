import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("es-ES", options);
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(":");
  return `${hours}:${minutes}`;
};

const getReminderEmailContent = (
  booking: any,
  teacherName: string,
  studentName: string,
  sport: string,
  isForTeacher: boolean
) => {
  const sessionDate = formatDate(booking.booking_date);
  const sessionTime = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;

  if (isForTeacher) {
    return {
      subject: `⏰ Recordatorio: Sesión mañana con ${studentName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎯 ProffX</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">⏰ Recordatorio de Sesión</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Tienes una sesión programada para mañana</p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Hola <strong>${teacherName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Te recordamos que mañana tienes una sesión de <strong>${sport || 'entrenamiento'}</strong> con <strong>${studentName}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📅 Detalles de la Sesión</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Estudiante</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${studentName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Horario</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Precio</td>
                <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">$${booking.total_price}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 16px; color: #374151;">¡Prepárate para una gran sesión! 💪</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              Este email fue enviado automáticamente por ProffX.<br>
              Si tienes alguna pregunta, contacta al estudiante a través del chat de la plataforma.
            </p>
          </div>
        </div>
      `,
    };
  } else {
    return {
      subject: `⏰ Recordatorio: Tu sesión con ${teacherName} es mañana`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎯 ProffX</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">⏰ ¡No olvides tu sesión!</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Tu entrenamiento está programado para mañana</p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">Hola <strong>${studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Te recordamos que mañana tienes una sesión de <strong>${sport || 'entrenamiento'}</strong> con tu profesor <strong>${teacherName}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📅 Detalles de la Sesión</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Profesor</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${teacherName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Deporte</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sport || 'Entrenamiento'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Horario</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Precio</td>
                <td style="padding: 8px 0; color: #10b981; font-weight: 600; text-align: right;">$${booking.total_price}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              💡 <strong>Consejo:</strong> Llega unos minutos antes para prepararte y calentar adecuadamente.
            </p>
          </div>
          
          <p style="font-size: 16px; color: #374151;">¡Nos vemos mañana! 🏆</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 13px; margin: 0;">
              Este email fue enviado automáticamente por ProffX.<br>
              Si necesitas cancelar o reprogramar, hazlo desde la app con al menos 24 horas de anticipación.
            </p>
          </div>
        </div>
      `,
    };
  }
};

async function sendEmail(to: string, subject: string, html: string) {
  console.log(`Sending email to ${to}: ${subject}`);
  
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "ProffX <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = await res.json();
  console.log(`Email sent successfully to ${to}:`, result.id);
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Starting session reminders job ===");
  console.log("Current time:", new Date().toISOString());

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate tomorrow's date range
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`Looking for bookings on: ${tomorrowStr}`);

    // Find all confirmed bookings for tomorrow that haven't been reminded
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        teacher:profiles!bookings_teacher_id_fkey(id, full_name, user_id, sport),
        student:profiles!bookings_student_id_fkey(id, full_name, user_id)
      `)
      .eq("booking_date", tomorrowStr)
      .in("status", ["confirmed", "pending"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw new Error("Failed to fetch bookings");
    }

    console.log(`Found ${bookings?.length || 0} bookings for tomorrow`);

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No bookings to remind", emailsSent: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let emailsSent = 0;
    const errors: string[] = [];

    for (const booking of bookings) {
      console.log(`Processing booking ${booking.id} for ${booking.booking_date}`);
      
      try {
        // Get user emails from auth.users
        const { data: teacherUser } = await supabaseClient.auth.admin.getUserById(
          booking.teacher.user_id
        );
        const { data: studentUser } = await supabaseClient.auth.admin.getUserById(
          booking.student.user_id
        );

        const teacherEmail = teacherUser?.user?.email;
        const studentEmail = studentUser?.user?.email;

        console.log(`Teacher: ${teacherEmail}, Student: ${studentEmail}`);

        const emailPromises = [];

        // Send reminder to teacher
        if (teacherEmail) {
          const teacherContent = getReminderEmailContent(
            booking,
            booking.teacher.full_name,
            booking.student.full_name,
            booking.teacher.sport,
            true
          );
          emailPromises.push(
            sendEmail(teacherEmail, teacherContent.subject, teacherContent.html)
              .then(() => { emailsSent++; })
              .catch((err) => { 
                console.error(`Failed to send to teacher ${teacherEmail}:`, err);
                errors.push(`Teacher ${teacherEmail}: ${err.message}`);
              })
          );
        }

        // Send reminder to student
        if (studentEmail) {
          const studentContent = getReminderEmailContent(
            booking,
            booking.teacher.full_name,
            booking.student.full_name,
            booking.teacher.sport,
            false
          );
          emailPromises.push(
            sendEmail(studentEmail, studentContent.subject, studentContent.html)
              .then(() => { emailsSent++; })
              .catch((err) => { 
                console.error(`Failed to send to student ${studentEmail}:`, err);
                errors.push(`Student ${studentEmail}: ${err.message}`);
              })
          );
        }

        await Promise.all(emailPromises);
      } catch (bookingError: any) {
        console.error(`Error processing booking ${booking.id}:`, bookingError);
        errors.push(`Booking ${booking.id}: ${bookingError.message}`);
      }
    }

    console.log(`=== Session reminders completed ===`);
    console.log(`Emails sent: ${emailsSent}`);
    if (errors.length > 0) {
      console.log(`Errors: ${errors.length}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        bookingsProcessed: bookings.length,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-session-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
