import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  eventType: "created" | "confirmed" | "cancelled" | "rescheduled";
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(":");
  return `${hours}:${minutes}`;
};

const generateIcsContent = (booking: any, teacherName: string, studentName: string) => {
  // Parse date and times
  const [year, month, day] = booking.booking_date.split("-");
  const [startH, startM] = booking.start_time.split(":");
  const [endH, endM] = booking.end_time.split(":");
  
  const dtStart = `${year}${month}${day}T${startH}${startM}00`;
  const dtEnd = `${year}${month}${day}T${endH}${endM}00`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ProffX//Booking//ES
BEGIN:VEVENT
UID:${booking.id}@proffx.app
DTSTAMP:${now}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:Sesión de entrenamiento - ProffX
DESCRIPTION:Sesión con ${teacherName} y ${studentName}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
};

const generateGoogleCalendarUrl = (booking: any, teacherName: string) => {
  const [year, month, day] = booking.booking_date.split("-");
  const [startH, startM] = booking.start_time.split(":");
  const [endH, endM] = booking.end_time.split(":");
  
  const dtStart = `${year}${month}${day}T${startH}${startM}00`;
  const dtEnd = `${year}${month}${day}T${endH}${endM}00`;
  
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Sesión con ${teacherName} - ProffX`,
    dates: `${dtStart}/${dtEnd}`,
    details: `Sesión de entrenamiento deportivo con ${teacherName} a través de ProffX.`,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const getCalendarButtons = (booking: any, teacherName: string, studentName: string) => {
  const googleUrl = generateGoogleCalendarUrl(booking, teacherName);
  const icsContent = generateIcsContent(booking, teacherName, studentName);
  const icsDataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  
  return `
    <div style="margin: 20px 0;">
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">📅 Agregar a tu calendario:</p>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="${googleUrl}" target="_blank" style="display: inline-block; background: #4285f4; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Google Calendar
        </a>
        <a href="${icsDataUri}" download="proffx-session.ics" style="display: inline-block; background: #374151; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
          📎 Descargar .ics
        </a>
      </div>
    </div>
  `;
};

const getWhatsAppButton = (teacherName: string) => {
  const message = encodeURIComponent(`¡Hola ${teacherName}! Te escribo desde ProffX por una sesión que tenemos agendada.`);
  return `
    <div style="margin: 15px 0;">
      <a href="https://wa.me/?text=${message}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
        💬 Abrir WhatsApp
      </a>
    </div>
  `;
};

const getEmailContent = (
  eventType: string,
  booking: any,
  teacherName: string,
  studentName: string,
  isForTeacher: boolean
) => {
  const sessionDate = formatDate(booking.booking_date);
  const sessionTime = `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`;
  const calendarButtons = getCalendarButtons(booking, teacherName, studentName);
  const whatsAppButton = getWhatsAppButton(isForTeacher ? studentName : teacherName);

  // Previous booking info for rescheduled events
  const previousDate = booking.previous_date ? formatDate(booking.previous_date) : null;
  const previousTime = booking.previous_start_time && booking.previous_end_time
    ? `${formatTime(booking.previous_start_time)} - ${formatTime(booking.previous_end_time)}`
    : null;

  const sessionDetailsBlock = `
    <div style="background: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Detalles de la Sesión</h3>
      <table style="width: 100%; border-collapse: collapse;">
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
  `;

  const footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 13px; margin: 0;">Saludos,<br>El equipo de ProffX</p>
    </div>
  `;

  const wrapper = (content: string) => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #10b981; margin: 0; font-size: 28px;">🎯 ProffX</h1>
      </div>
      ${content}
      ${footer}
    </div>
  `;

  const templates: Record<string, Record<string, { subject: string; html: string }>> = {
    created: {
      teacher: {
        subject: "📅 Nueva Solicitud de Reserva",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">📅 ¡Nueva Solicitud de Reserva!</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Un estudiante quiere entrenar contigo</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${teacherName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Tienes una nueva solicitud de reserva de <strong>${studentName}</strong>.</p>
          ${sessionDetailsBlock}
          ${whatsAppButton}
          <p style="font-size: 16px; color: #374151;">Inicia sesión en tu panel para confirmar o gestionar esta reserva.</p>
        `),
      },
      student: {
        subject: "✅ Solicitud de Reserva Enviada",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">✅ ¡Solicitud Enviada!</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Tu reserva está pendiente de confirmación</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Tu solicitud de reserva con <strong>${teacherName}</strong> ha sido enviada correctamente.</p>
          ${sessionDetailsBlock}
          ${whatsAppButton}
          <p style="font-size: 16px; color: #374151;">Recibirás otro email cuando tu profesor confirme la sesión.</p>
        `),
      },
    },
    confirmed: {
      teacher: {
        subject: "✅ Reserva Confirmada",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">✅ ¡Reserva Confirmada!</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">La sesión está agendada</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${teacherName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Has confirmado la reserva con <strong>${studentName}</strong>.</p>
          ${sessionDetailsBlock}
          ${calendarButtons}
          ${whatsAppButton}
          <p style="font-size: 16px; color: #374151;">¡La sesión está programada! Nos vemos allí 💪</p>
        `),
      },
      student: {
        subject: "🎉 ¡Tu Reserva está Confirmada!",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">🎉 ¡Excelente Noticia!</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Tu reserva ha sido confirmada</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;"><strong>${teacherName}</strong> ha confirmado tu reserva.</p>
          ${sessionDetailsBlock}
          ${calendarButtons}
          ${whatsAppButton}
          <p style="font-size: 16px; color: #374151;">¡Prepárate para tu sesión! 🏆</p>
        `),
      },
    },
    cancelled: {
      teacher: {
        subject: "❌ Reserva Cancelada",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">❌ Reserva Cancelada</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Una sesión ha sido cancelada</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${teacherName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">La reserva con <strong>${studentName}</strong> ha sido cancelada.</p>
          <div style="background: #fef2f2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Detalles de la Sesión Cancelada</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Horario</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionTime}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 16px; color: #374151;">Este horario ahora está disponible para otras reservas.</p>
        `),
      },
      student: {
        subject: "❌ Reserva Cancelada",
        html: wrapper(`
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; font-size: 22px;">❌ Reserva Cancelada</h2>
            <p style="margin: 0; opacity: 0.9; font-size: 16px;">Tu sesión ha sido cancelada</p>
          </div>
          <p style="font-size: 16px; color: #374151;">Hola <strong>${studentName}</strong>,</p>
          <p style="font-size: 16px; color: #374151;">Tu reserva con <strong>${teacherName}</strong> ha sido cancelada.</p>
          <div style="background: #fef2f2; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #ef4444;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 Detalles de la Sesión Cancelada</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Horario</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${sessionTime}</td>
              </tr>
            </table>
          </div>
          <p style="font-size: 16px; color: #374151;">Puedes explorar otras sesiones disponibles en nuestra plataforma.</p>
        `),
      },
    },
  };

  const template = templates[eventType];
  return isForTeacher ? template.teacher : template.student;
};

async function sendEmail(to: string, subject: string, html: string) {
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
    throw new Error(`Failed to send email: ${error}`);
  }

  return res.json();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received booking notification request");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { bookingId, eventType }: NotificationRequest = await req.json();
    console.log(`Processing ${eventType} notification for booking ${bookingId}`);

    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        teacher:profiles!bookings_teacher_id_fkey(id, full_name, user_id),
        student:profiles!bookings_student_id_fkey(id, full_name, user_id)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    console.log("Booking data:", JSON.stringify(booking, null, 2));

    const { data: teacherUser } = await supabaseClient.auth.admin.getUserById(
      booking.teacher.user_id
    );
    const { data: studentUser } = await supabaseClient.auth.admin.getUserById(
      booking.student.user_id
    );

    const teacherEmail = teacherUser?.user?.email;
    const studentEmail = studentUser?.user?.email;

    console.log(`Sending emails to teacher: ${teacherEmail}, student: ${studentEmail}`);

    const results = [];

    if (teacherEmail) {
      const teacherContent = getEmailContent(
        eventType,
        booking,
        booking.teacher.full_name,
        booking.student.full_name,
        true
      );
      try {
        const result = await sendEmail(teacherEmail, teacherContent.subject, teacherContent.html);
        results.push({ to: teacherEmail, status: "sent", data: result });
      } catch (e: any) {
        console.warn(`Failed to send email to teacher ${teacherEmail}:`, e.message);
        results.push({ to: teacherEmail, status: "failed", error: e.message });
      }
    }

    // Delay between emails to respect Resend rate limit (2 req/s)
    if (teacherEmail && studentEmail) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    if (studentEmail) {
      const studentContent = getEmailContent(
        eventType,
        booking,
        booking.teacher.full_name,
        booking.student.full_name,
        false
      );
      try {
        const result = await sendEmail(studentEmail, studentContent.subject, studentContent.html);
        results.push({ to: studentEmail, status: "sent", data: result });
      } catch (e: any) {
        console.warn(`Failed to send email to student ${studentEmail}:`, e.message);
        results.push({ to: studentEmail, status: "failed", error: e.message });
      }
    }

    console.log("Email results:", JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({ success: true, emailsSent: results.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-booking-notification:", error);
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
