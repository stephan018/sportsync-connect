import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  bookingId: string;
  eventType: "created" | "confirmed" | "cancelled";
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
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

  const templates = {
    created: {
      teacher: {
        subject: "New Booking Request",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">New Booking Request!</h1>
            <p>Hi ${teacherName},</p>
            <p>You have a new booking request from <strong>${studentName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> $${booking.total_price}</p>
            </div>
            <p>Please log in to your dashboard to confirm or manage this booking.</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
      student: {
        subject: "Booking Request Submitted",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Booking Request Submitted!</h1>
            <p>Hi ${studentName},</p>
            <p>Your booking request with <strong>${teacherName}</strong> has been submitted successfully.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> $${booking.total_price}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> Pending confirmation</p>
            </div>
            <p>You'll receive another email once your coach confirms the session.</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
    },
    confirmed: {
      teacher: {
        subject: "Booking Confirmed",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Booking Confirmed!</h1>
            <p>Hi ${teacherName},</p>
            <p>You have confirmed the booking with <strong>${studentName}</strong>.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> $${booking.total_price}</p>
            </div>
            <p>The session is now scheduled. See you there!</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
      student: {
        subject: "Your Booking is Confirmed!",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Great News! Your Booking is Confirmed!</h1>
            <p>Hi ${studentName},</p>
            <p><strong>${teacherName}</strong> has confirmed your booking.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
              <p style="margin: 5px 0;"><strong>Price:</strong> $${booking.total_price}</p>
            </div>
            <p>Get ready for your session!</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
    },
    cancelled: {
      teacher: {
        subject: "Booking Cancelled",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Booking Cancelled</h1>
            <p>Hi ${teacherName},</p>
            <p>A booking with <strong>${studentName}</strong> has been cancelled.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
            </div>
            <p>This time slot is now available for other bookings.</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
      student: {
        subject: "Booking Cancelled",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">Booking Cancelled</h1>
            <p>Hi ${studentName},</p>
            <p>Your booking with <strong>${teacherName}</strong> has been cancelled.</p>
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Date:</strong> ${sessionDate}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${sessionTime}</p>
            </div>
            <p>You can browse other available sessions on our platform.</p>
            <p style="color: #6b7280; font-size: 14px;">Best regards,<br>SportSync Team</p>
          </div>
        `,
      },
    },
  };

  const template = templates[eventType as keyof typeof templates];
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
      from: "SportSync <onboarding@resend.dev>",
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

    // Fetch booking with related profiles
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

    // Get user emails from auth.users
    const { data: teacherUser } = await supabaseClient.auth.admin.getUserById(
      booking.teacher.user_id
    );
    const { data: studentUser } = await supabaseClient.auth.admin.getUserById(
      booking.student.user_id
    );

    const teacherEmail = teacherUser?.user?.email;
    const studentEmail = studentUser?.user?.email;

    console.log(`Sending emails to teacher: ${teacherEmail}, student: ${studentEmail}`);

    const emailPromises = [];

    // Send email to teacher
    if (teacherEmail) {
      const teacherContent = getEmailContent(
        eventType,
        booking,
        booking.teacher.full_name,
        booking.student.full_name,
        true
      );
      emailPromises.push(sendEmail(teacherEmail, teacherContent.subject, teacherContent.html));
    }

    // Send email to student
    if (studentEmail) {
      const studentContent = getEmailContent(
        eventType,
        booking,
        booking.teacher.full_name,
        booking.student.full_name,
        false
      );
      emailPromises.push(sendEmail(studentEmail, studentContent.subject, studentContent.html));
    }

    const results = await Promise.all(emailPromises);
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
