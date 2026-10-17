// Supabase Edge Function: send-agency-application-email
// ----------------------------------------------
// Sends an admin notification email when a tour agency submits
// a new CRM application (status = 'submitted').
//
// Security:
//   - Validates the authenticated user via JWT
//   - Confirms the application belongs to the authenticated user
//   - Confirms status is 'submitted'
//   - Reads application data from the database (never trusts frontend input)
//   - Uses Resend API with server-side RESEND_API_KEY
//   - Duplicate protection via admin_notification_sent_at field
//   - If email fails, the application remains submitted (no rollback)
//
// Deploy:
//   supabase functions deploy send-agency-application-email --no-verify-jwt
//
// Required env (set in Supabase dashboard → Edge Functions → Secrets):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY
//
// Optional env:
//   OXEN_ADMIN_EMAIL (defaults to solisulhiddinov@gmail.com)
//   OXEN_SENDER_EMAIL (defaults to crm@oxentravel.com — requires Resend domain verification)
//   OXEN_APP_URL (defaults to https://oxen.app — for admin review link)
//
// Call from client:
//   POST {SUPABASE_URL}/functions/v1/send-agency-application-email
//   Authorization: Bearer {user_jwt}
//   { "applicationId": "uuid" }
// ----------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: CORS_HEADERS,
  });
}

const ADMIN_EMAIL = "solisulhiddinov@gmail.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // ── Env checks ──
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("send-agency-application-email: missing Supabase env vars");
    return json(500, { error: "Server is not configured." });
  }

  if (!resendApiKey) {
    console.error("send-agency-application-email: RESEND_API_KEY not set");
    // Don't fail the request — application is already submitted
    return json(200, { ok: true, message: "Email service not configured. Application was still submitted." });
  }

  const senderEmail = Deno.env.get("OXEN_SENDER_EMAIL") ?? "crm@oxentravel.com";
  const adminEmail = Deno.env.get("OXEN_ADMIN_EMAIL") ?? ADMIN_EMAIL;
  const appUrl = Deno.env.get("OXEN_APP_URL") ?? "https://oxen.app";

  // ── Validate JWT ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Authentication required." });
  }
  const userToken = authHeader.replace("Bearer ", "");

  // Verify the JWT and get user ID
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${userToken}`,
    },
  });
  if (!userRes.ok) {
    return json(401, { error: "Invalid or expired session." });
  }
  const userData = await userRes.json() as { id?: string; email?: string };
  const userId = userData.id;
  const userEmail = userData.email;
  if (!userId) {
    return json(401, { error: "Could not verify user identity." });
  }

  // ── Parse body ──
  let body: { applicationId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const applicationId = typeof body.applicationId === "string" ? body.applicationId : "";
  if (!applicationId) {
    return json(400, { error: "Application ID is required." });
  }

  try {
    // ── Fetch the application from the database (server-side, service role) ──
    const appRes = await fetch(
      `${supabaseUrl}/rest/v1/agency_applications?id=eq.${encodeURIComponent(applicationId)}&select=*`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!appRes.ok) {
      console.error("send-agency-application-email: fetch application failed", appRes.status);
      return json(404, { error: "Application not found." });
    }

    const rows = await appRes.json() as Array<{
      id: string;
      user_id: string;
      agency_name: string;
      legal_name: string | null;
      manager_name: string | null;
      phone: string | null;
      email: string | null;
      country: string | null;
      city: string | null;
      address: string | null;
      website: string | null;
      social_links: Record<string, string> | null;
      license_number: string | null;
      status: string;
      submitted_at: string | null;
      admin_notification_sent_at: string | null;
    }>;

    if (!rows.length) {
      return json(404, { error: "Application not found." });
    }

    const app = rows[0];

    // ── Security: confirm ownership ──
    if (app.user_id !== userId) {
      return json(403, { error: "You do not own this application." });
    }

    // ── Confirm status is submitted ──
    if (app.status !== "submitted") {
      return json(400, { error: `Application status is '${app.status}', not 'submitted'.` });
    }

    // ── Duplicate protection: check admin_notification_sent_at ──
    if (app.admin_notification_sent_at) {
      return json(200, { ok: true, message: "Admin notification already sent for this application." });
    }

    // ── Fetch the applicant's profile for their email ──
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=email,name&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    let profileEmail = userEmail ?? app.email ?? "—";
    let profileName: string | null = null;
    if (profileRes.ok) {
      const profileRows = await profileRes.json() as Array<{ email: string | null; name: string | null }>;
      if (profileRows.length) {
        if (profileRows[0].email) profileEmail = profileRows[0].email;
        profileName = profileRows[0].name;
      }
    }

    // ── Build email content ──
    const social = app.social_links ?? {};
    const submittedDate = app.submitted_at
      ? new Date(app.submitted_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
      : "—";

    const subject = `New OXEN Tour Agency CRM Application — ${app.agency_name}`;

    const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e2e8f0; padding: 32px; border-radius: 16px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="color: #f59e0b; font-size: 22px; margin: 0; letter-spacing: 0.5px;">NEW TOUR AGENCY APPLICATION</h1>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 8px;">OXEN CRM — Agency Access Request</p>
  </div>

  <div style="background: #111827; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <table style="width: 100%; font-size: 14px; line-height: 1.8; border-collapse: collapse;">
      <tr>
        <td style="color: #94a3b8; width: 200px; padding: 4px 0;">Agency:</td>
        <td style="color: #f1f5f9; font-weight: 600; padding: 4px 0;">${app.agency_name ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Official Company Name:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.legal_name ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Applicant / Manager:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.manager_name ?? profileName ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Applicant OXEN Email:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${profileEmail}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Phone:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.phone ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Country:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.country ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">City:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.city ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Address:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.address ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">License Number:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.license_number ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Website:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${app.website ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Instagram:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${social.instagram ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Telegram:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${social.telegram ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">WhatsApp:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${social.whatsapp ?? "—"}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0; padding-top: 12px;">Application Status:</td>
        <td style="color: #f59e0b; font-weight: 700; padding: 4px 0; padding-top: 12px;">SUBMITTED</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Submitted At:</td>
        <td style="color: #f1f5f9; padding: 4px 0;">${submittedDate}</td>
      </tr>
      <tr>
        <td style="color: #94a3b8; padding: 4px 0;">Application ID:</td>
        <td style="color: #64748b; font-family: monospace; font-size: 12px; padding: 4px 0;">${app.id}</td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${appUrl}/owner-admin/agency-applications"
       style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0a0e1a; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; letter-spacing: 0.3px;">
      Review Application in OXEN Admin
    </a>
  </div>

  <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 24px;">
    <p style="color: #64748b; font-size: 11px; line-height: 1.6; margin: 0;">
      This is an automated notification from the OXEN CRM system.<br>
      Review license and registration documents inside the secure OXEN Admin Panel.<br>
      Do not reply to this email — approval/rejection must happen inside the authenticated OXEN Admin system.
    </p>
  </div>
</div>`;

    const textBody = [
      "NEW TOUR AGENCY APPLICATION",
      "",
      `Agency: ${app.agency_name ?? "—"}`,
      `Official Company Name: ${app.legal_name ?? "—"}`,
      `Applicant / Manager: ${app.manager_name ?? profileName ?? "—"}`,
      `Applicant OXEN Email: ${profileEmail}`,
      `Phone: ${app.phone ?? "—"}`,
      `Country: ${app.country ?? "—"}`,
      `City: ${app.city ?? "—"}`,
      `Address: ${app.address ?? "—"}`,
      `License Number: ${app.license_number ?? "—"}`,
      `Website: ${app.website ?? "—"}`,
      `Instagram: ${social.instagram ?? "—"}`,
      `Telegram: ${social.telegram ?? "—"}`,
      `WhatsApp: ${social.whatsapp ?? "—"}`,
      "",
      `Application Status: SUBMITTED`,
      `Submitted At: ${submittedDate}`,
      `Application ID: ${app.id}`,
      "",
      `Review Application in OXEN Admin:`,
      `${appUrl}/owner-admin/agency-applications`,
      "",
      "This is an automated notification. Do not reply.",
    ].join("\n");

    // ── Send email via Resend ──
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `OXEN CRM <${senderEmail}>`,
        to: [adminEmail],
        subject,
        html: htmlBody,
        text: textBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("send-agency-application-email: Resend API error", emailRes.status, errText);
      // Don't fail the request — application is already submitted
      // Log the failure for retry
      return json(200, {
        ok: true,
        message: "Application submitted. Admin email notification could not be sent — logged for retry.",
        emailError: true,
      });
    }

    // ── Mark notification as sent (duplicate protection) ──
    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/agency_applications?id=eq.${encodeURIComponent(app.id)}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          admin_notification_sent_at: new Date().toISOString(),
        }),
      },
    );

    if (!updateRes.ok) {
      console.error("send-agency-application-email: failed to update admin_notification_sent_at", updateRes.status);
      // Email was sent but we couldn't mark it — not critical, the email went through
    }

    return json(200, { ok: true, message: "Admin notification email sent successfully." });
  } catch (err) {
    console.error("send-agency-application-email: unexpected error", err);
    // Don't fail — application is already submitted
    return json(200, {
      ok: true,
      message: "Application submitted. Admin notification encountered an error — logged for retry.",
      emailError: true,
    });
  }
});
